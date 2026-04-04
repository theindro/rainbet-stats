import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {Upload, Row, Col, message, Button} from "antd";
import { UploadOutlined, RiseOutlined, FallOutlined, DollarOutlined, ThunderboltOutlined, CalendarOutlined, DatabaseOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, ResponsiveContainer, Area, AreaChart,
} from "recharts";

const { Dragger } = Upload;

/* ─── Web Worker source (inline blob) ───────────────────────────────────────
   Handles: parse CSV/XLSX chunks → write to IndexedDB → emit progress + aggregates
*/
const WORKER_SRC = `
importScripts('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');

const DB_NAME  = 'BetAnalytics';
const DB_VER   = 1;
const STORE    = 'rows';

function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { autoIncrement: true });
        os.createIndex('createdAt', 'createdAt');
        os.createIndex('game', 'game');
      }
    };
    req.onsuccess = e => res(e.target.result);
    req.onerror   = e => rej(e.target.error);
  });
}

function clearStore(db) {
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = res;
    tx.onerror    = e => rej(e.target.error);
  });
}

function bulkPut(db, rows) {
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    const os = tx.objectStore(STORE);
    rows.forEach(r => os.put(r));
    tx.oncomplete = res;
    tx.onerror    = e => rej(e.target.error);
  });
}

/* streaming aggregation cursor — never loads all rows */
async function aggregate(db, fromMs, toMs, gamesFilter = []) {
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readonly');
    const idx = tx.objectStore(STORE).index('createdAt');

    let range = null;
    if (fromMs != null && toMs != null) {
      range = IDBKeyRange.bound(fromMs, toMs);
    } else if (fromMs != null) {
      range = IDBKeyRange.lowerBound(fromMs);
    } else if (toMs != null) {
      range = IDBKeyRange.upperBound(toMs);
    }

    const req = idx.openCursor(range);

    let totalBet = 0, totalPayout = 0, count = 0, wins = 0;
    const gameMap = {};
    const dailyBuckets = {};      // daily profit delta (optional)
    const cumulativeBuckets = {}; // ← NEW: running cumulative profit
    let runningProfit = 0;        // ← NEW: tracks cumulative P&L
    let minMs = Infinity, maxMs = -Infinity;

    req.onsuccess = e => {
      const cursor = e.target.result;
      if (!cursor) {
      
      // Add this inside aggregate() function, before res({ ... })
      const allGamesList = Object.keys(gameMap).sort();

        // Build profitOverTime as CUMULATIVE (this fixes your issue)
        const profitOverTime = Object.keys(cumulativeBuckets)
          .sort()                    // ensures chronological order
          .map(k => ({
            name: k,
            profit: cumulativeBuckets[k]   // now it's running total
          }));

        const gameDistribution = Object.entries(gameMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);

        res({
          totalBet,
          totalPayout,
          count,
          wins,
          gameDistribution,
          profitOverTime,
          minMs,
          maxMs,
          allGames: allGamesList 
        });
        return;
      }

      const r = cursor.value;

      // NEW: Game filter
      if (gamesFilter.length > 0 && !gamesFilter.includes(r.game || 'Unknown')) {
        cursor.continue();
        return;
      }

      // Core aggregates
      totalBet += r.amount || 0;
      totalPayout += r.payout || 0;
      count++;
      if (r.profit > 0) wins++;
      gameMap[r.game || 'Unknown'] = (gameMap[r.game || 'Unknown'] || 0) + 1;

      if (r.createdAt < minMs) minMs = r.createdAt;
      if (r.createdAt > maxMs) maxMs = r.createdAt;

      // Determine time bucket key (day or hour)
      const spanDays = (toMs && fromMs) ? (toMs - fromMs) / 86400000 : 0;
      const useDayOnly = spanDays > 3 || fromMs == null;
      const fmt = useDayOnly ? 'YYYY-MM-DD' : 'MM/DD HH:00';
      const sliceEnd = useDayOnly ? 10 : 13;
      const key = new Date(r.createdAt).toISOString().slice(0, sliceEnd);

      // Daily delta (kept for potential future use)
      dailyBuckets[key] = (dailyBuckets[key] || 0) + (r.profit || 0);

      // === CUMULATIVE PROFIT (This is the important fix) ===
      runningProfit += (r.profit || 0);
      cumulativeBuckets[key] = Number(runningProfit.toFixed(2));

      cursor.continue();
    };

    req.onerror = e => rej(e.target.error);
  });
}

self.onmessage = async ({ data }) => {
  if (data.type === 'parse') {
    try {
      const db = await openDB();
      await clearStore(db);

      const ab    = data.buffer;  // ArrayBuffer
      const fname = data.name;
      const isXlsx = /\\.xlsx?$/i.test(fname);

      const CHUNK = 5000;
      let total = 0;

      if (isXlsx) {
        // SheetJS parse — whole file but we stream writes
        const wb = XLSX.read(ab, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const batchCount = Math.ceil(raw.length / CHUNK);
        for (let b = 0; b < batchCount; b++) {
          const slice = raw.slice(b * CHUNK, (b + 1) * CHUNK);
          const rows = slice.map(r => {
            const ts = r['Created At'] instanceof Date
              ? r['Created At'].getTime()
              : new Date(r['Created At']).getTime();
            const amount = parseFloat(r.Amount || 0);
            const payout = parseFloat(r.Payout || 0);
            return { createdAt: isNaN(ts) ? 0 : ts, amount, payout, profit: payout - amount, game: r.Game || 'Unknown' };
          }).filter(r => r.createdAt > 0);
          await bulkPut(db, rows);
          total += rows.length;
          self.postMessage({ type: 'progress', loaded: total, total: raw.length });
        }
      } else {
        // CSV — parse text in chunks
        const text   = new TextDecoder().decode(ab);
        const lines  = text.split('\\n');
        const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const idxCA  = header.indexOf('Created At');
        const idxAmt = header.indexOf('Amount');
        const idxPay = header.indexOf('Payout');
        const idxGame= header.indexOf('Game');

        for (let i = 1; i < lines.length; i += CHUNK) {
          const slice = lines.slice(i, i + CHUNK);
          const rows = [];
          for (const line of slice) {
            if (!line.trim()) continue;
            const cols = line.split(',');
            const ts = new Date(cols[idxCA]?.replace(/^"|"$/g, '') || '').getTime();
            if (isNaN(ts)) continue;
            const amount = parseFloat(cols[idxAmt] || 0);
            const payout = parseFloat(cols[idxPay] || 0);
            rows.push({ createdAt: ts, amount, payout, profit: payout - amount, game: (cols[idxGame] || 'Unknown').replace(/^"|"$/g, '') });
          }
          await bulkPut(db, rows);
          total += rows.length;
          self.postMessage({ type: 'progress', loaded: total, total: lines.length });
        }
      }

      self.postMessage({ type: 'done', total });

    } catch (err) {
      self.postMessage({ type: 'error', message: err.message });
    }
  }

  if (data.type === 'aggregate') {
    try {
      const db     = await openDB();
      const result = await aggregate(db, data.fromMs ?? null, data.toMs ?? null, data.games || []);
      self.postMessage({ type: 'aggregated', ...result });
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message });
    }
  }
};
`;

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;800&display=swap');

  :root {
    --bg-base:#080c12; --bg-panel:#0d1320; --bg-card:#111827; --bg-card-hover:#141f30;
    --border:#1e2d45; --border-glow:#2563eb44;
    --accent-blue:#3b82f6; --accent-cyan:#06b6d4; --accent-green:#22c55e;
    --accent-red:#ef4444; --accent-amber:#f59e0b;
    --text-primary:#f0f6ff; --text-secondary:#8ba4c0; --text-muted:#3d5470;
    --glow-blue:0 0 24px #3b82f620,0 0 60px #3b82f608;
  }
  * { box-sizing:border-box; }
  body { background:var(--bg-base) !important; font-family:'Syne',sans-serif; color:var(--text-primary); }

  .dr { min-height:100vh; background:var(--bg-base); padding:0; position:relative; overflow:hidden; }
  .dr::before { content:''; position:fixed; inset:0;
    background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
    pointer-events:none; z-index:0; }
  .dr::after { content:''; position:fixed; inset:0;
    background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);
    background-size:48px 48px; opacity:.18; pointer-events:none; z-index:0; }

  .dc { position:relative; z-index:1; padding:32px 40px; max-width:1400px; margin:0 auto; }

  .dash-hdr { display:flex; align-items:center; justify-content:space-between; margin-bottom:36px; padding-bottom:24px; border-bottom:1px solid var(--border); }
  .dash-logo { display:flex; align-items:center; gap:14px; }
  .dash-logo-icon { width:40px; height:40px; border-radius:10px; background:linear-gradient(135deg,#3b82f6,#06b6d4); display:flex; align-items:center; justify-content:center; font-size:18px; box-shadow:var(--glow-blue); }
  .dash-title { font-family:'Syne',sans-serif; font-weight:800; font-size:22px; letter-spacing:-.02em; color:var(--text-primary); margin:0; }
  .dash-sub { font-family:'Space Mono',monospace; font-size:10px; color:var(--text-muted); letter-spacing:.12em; text-transform:uppercase; margin:2px 0 0; }
  .dash-badge { font-family:'Space Mono',monospace; font-size:10px; padding:4px 10px; border-radius:20px; background:#1a2d1a; color:var(--accent-green); border:1px solid #22c55e30; letter-spacing:.08em; }

  .section-label { font-family:'Space Mono',monospace; font-size:10px; letter-spacing:.16em; text-transform:uppercase; color:var(--text-muted); margin:32px 0 16px; display:flex; align-items:center; gap:12px; }
  .section-label::after { content:''; flex:1; height:1px; background:var(--border); }

  /* Upload */
  .upload-zone .ant-upload-drag { background:var(--bg-panel) !important; border:1.5px dashed var(--border) !important; border-radius:16px !important; padding:48px 24px !important; transition:all .3s ease !important; }
  .upload-zone .ant-upload-drag:hover { border-color:var(--accent-blue) !important; background:#0d1a2e !important; box-shadow:var(--glow-blue); }
  .upload-icon-wrap { width:56px; height:56px; border-radius:14px; background:linear-gradient(135deg,#1e3a5f,#0f2440); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; margin:0 auto 16px; font-size:22px; color:var(--accent-blue); }
  .upload-text-main { font-family:'Syne',sans-serif; font-size:15px; font-weight:600; color:var(--text-primary); margin-bottom:4px; }
  .upload-text-sub { font-family:'Space Mono',monospace; font-size:11px; color:var(--text-muted); letter-spacing:.06em; }

  /* Progress bar */
  .progress-wrap { margin-top:20px; }
  .progress-bar-bg { background:var(--bg-card); border:1px solid var(--border); border-radius:8px; height:8px; overflow:hidden; }
  .progress-bar-fill { height:100%; background:linear-gradient(90deg,var(--accent-blue),var(--accent-cyan)); border-radius:8px; transition:width .15s ease; }
  .progress-label { font-family:'Space Mono',monospace; font-size:10px; color:var(--text-muted); margin-top:6px; letter-spacing:.06em; }

  /* Time selector */
  .time-bar { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .time-lbl { font-family:'Space Mono',monospace; font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:var(--text-muted); display:flex; align-items:center; gap:6px; margin-right:4px; }
  .tbtn { font-family:'Space Mono',monospace; font-size:10px; letter-spacing:.08em; text-transform:uppercase; padding:6px 14px; border-radius:8px; border:1px solid var(--border); background:var(--bg-card); color:var(--text-secondary); cursor:pointer; transition:all .18s ease; }
  .tbtn:hover { border-color:var(--accent-blue); color:var(--text-primary); background:#111e35; }
  .tbtn.active { background:#1a2d4a; border-color:var(--accent-blue); color:var(--accent-blue); box-shadow:0 0 12px #3b82f618; }
  .range-info { font-family:'Space Mono',monospace; font-size:10px; color:var(--text-muted); padding:4px 10px; border-radius:6px; background:#0d1320; border:1px solid var(--border); white-space:nowrap; margin-left:auto; }
  .custom-row { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:10px; padding:14px 16px; background:var(--bg-card); border:1px solid var(--border); border-radius:12px; animation:fadeUp .2s ease both; }
  .di-lbl { font-family:'Space Mono',monospace; font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.1em; white-space:nowrap; }
  .di { font-family:'Space Mono',monospace; font-size:11px; background:var(--bg-panel); border:1px solid var(--border); border-radius:8px; padding:6px 10px; color:var(--text-primary); outline:none; transition:border-color .2s; color-scheme:dark; }
  .di:focus { border-color:var(--accent-blue); }
  .apply-btn { font-family:'Space Mono',monospace; font-size:10px; letter-spacing:.08em; text-transform:uppercase; padding:7px 16px; border-radius:8px; border:1px solid var(--accent-blue); background:#1a2d4a; color:var(--accent-blue); cursor:pointer; transition:all .18s ease; }
  .apply-btn:hover { background:var(--accent-blue); color:#fff; box-shadow:0 0 16px #3b82f640; }

  /* Stat cards */
  .stat-card { background:var(--bg-card); border:1px solid var(--border); border-radius:16px; padding:24px 28px; transition:all .25s ease; position:relative; overflow:hidden; animation:fadeUp .4s ease both; }
  .stat-card::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; border-radius:16px 16px 0 0; }
  .stat-card.blue::before { background:linear-gradient(90deg,#3b82f6,transparent); }
  .stat-card.green::before { background:linear-gradient(90deg,#22c55e,transparent); }
  .stat-card.red::before   { background:linear-gradient(90deg,#ef4444,transparent); }
  .stat-card.amber::before { background:linear-gradient(90deg,#f59e0b,transparent); }
  .stat-card:hover { background:var(--bg-card-hover); border-color:var(--border-glow); transform:translateY(-2px); }
  .stat-label { font-family:'Space Mono',monospace; font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:var(--text-muted); margin-bottom:10px; display:flex; align-items:center; gap:8px; }
  .stat-dot { width:6px; height:6px; border-radius:50%; display:inline-block; }
  .stat-value { font-family:'Space Mono',monospace; font-size:28px; font-weight:700; letter-spacing:-.02em; line-height:1; margin-bottom:8px; }
  .stat-meta { font-family:'Space Mono',monospace; font-size:10px; color:var(--text-muted); }

  /* Chart panels */
  .chart-panel { background:var(--bg-card); border:1px solid var(--border); border-radius:16px; overflow:hidden; }
  .chart-hdr { padding:20px 24px 0; display:flex; align-items:center; justify-content:space-between; margin-bottom:4px; }
  .chart-title { font-family:'Syne',sans-serif; font-weight:700; font-size:14px; color:var(--text-primary); letter-spacing:-.01em; }
  .chart-tag { font-family:'Space Mono',monospace; font-size:9px; letter-spacing:.1em; text-transform:uppercase; padding:3px 8px; border-radius:4px; background:#1a2035; color:var(--text-secondary); border:1px solid var(--border); }
  .chart-body { padding:16px 8px; }
  .pie-legend { display:flex; flex-direction:column; gap:10px; padding:8px 24px 20px; }
  .pli { display:flex; align-items:center; gap:10px; font-family:'Space Mono',monospace; font-size:11px; color:var(--text-secondary); }
  .pld { width:8px; height:8px; border-radius:2px; flex-shrink:0; }
  .plb { flex:1; height:2px; background:var(--border); border-radius:2px; overflow:hidden; }
  .plf { height:100%; border-radius:2px; }
  .plc { color:var(--text-muted); min-width:28px; text-align:right; }

  .no-data { font-family:'Space Mono',monospace; font-size:11px; color:var(--text-muted); text-align:center; padding:48px 0; letter-spacing:.08em; }

  /* DB info badge */
  .db-info { font-family:'Space Mono',monospace; font-size:10px; color:var(--text-muted); display:flex; align-items:center; gap:6px; padding:6px 12px; background:var(--bg-card); border:1px solid var(--border); border-radius:8px; }

  @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
`;

const PIE_COLORS = ["#3b82f6","#06b6d4","#8b5cf6","#f59e0b","#22c55e","#ef4444","#ec4899"];

const PERIOD_OPTIONS = [
  { label:"1H",     hours:1 },
  { label:"6H",     hours:6 },
  { label:"24H",    hours:24 },
  { label:"7D",     hours:24*7 },
  { label:"30D",    hours:24*30 },
  { label:"All",    hours:null },
  { label:"Custom", hours:"custom" },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    const v = payload[0].value;
    return (
        <div style={{ background:"#0d1a2e", border:"1px solid #1e2d45", borderRadius:8, padding:"10px 14px", fontFamily:"'Space Mono',monospace", fontSize:11 }}>
          <div style={{ color:"#8ba4c0", marginBottom:4 }}>{label}</div>
          <div style={{ color: v >= 0 ? "#22c55e":"#ef4444", fontWeight:700, fontSize:13 }}>
            {v >= 0 ? "+" : ""}${Math.abs(v).toFixed(2)}
          </div>
        </div>
    );
  }
  return null;
};

/* ─── Main component ──────────────────────────────────────────────────────── */
export default function App() {
  const workerRef   = useRef(null);
  const [status, setStatus]         = useState("idle"); // idle | parsing | aggregating | ready
  const [progress, setProgress]     = useState({ loaded: 0, total: 0 });
  const [totalRows, setTotalRows]   = useState(0);
  const [aggregated, setAggregated] = useState(null);   // result of aggregate()
  const [activePeriod, setActivePeriod] = useState("All");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [appliedFrom, setAppliedFrom] = useState(null);
  const [appliedTo, setAppliedTo]   = useState(null);
  const [showCustom, setShowCustom] = useState(false);
  const [dataRange, setDataRange]   = useState(null);   // { minMs, maxMs }
  const [selectedGames, setSelectedGames] = useState([]); // array of game names
  const [allGames, setAllGames] = useState([]);           // list of unique games
  const [gameSearch, setGameSearch] = useState("");
  const [confirmedGames, setConfirmedGames] = useState([]);   // ← NEW

// Filtered games for search + top 10
  const filteredGames = useMemo(() => {
    if (!allGames.length) return [];

    let result = [...allGames];

    // Apply search filter
    if (gameSearch.trim()) {
      const term = gameSearch.toLowerCase().trim();
      result = result.filter(game =>
          game.toLowerCase().includes(term)
      );
    }

    // Sort by popularity if we have aggregated data (optional but nice)
    if (aggregated?.gameDistribution) {
      const popularityOrder = new Map(
          aggregated.gameDistribution.map((g, idx) => [g.name, idx])
      );
      result.sort((a, b) => {
        const idxA = popularityOrder.get(a) ?? 999;
        const idxB = popularityOrder.get(b) ?? 999;
        return idxA - idxB;
      });
    }

    return result;
  }, [allGames, gameSearch, aggregated]);

  /* spin up worker once */
  useEffect(() => {
    const blob   = new Blob([WORKER_SRC], { type: "application/javascript" });
    const url    = URL.createObjectURL(blob);
    const worker = new Worker(url);
    workerRef.current = worker;

    worker.onmessage = ({ data }) => {
      if (data.type === "progress") {
        setProgress({ loaded: data.loaded, total: data.total });
      }
      if (data.type === "done") {
        setTotalRows(data.total);
        setStatus("aggregating");
        requestAggregate(null, null, []);
      }
      if (data.type === "aggregated") {
        setAggregated(data);
        setDataRange({ minMs: data.minMs, maxMs: data.maxMs });
        setAllGames(data.allGames || []);
        setSelectedGames([]);        // reset filter when new data loaded
        setStatus("ready");
      }
      if (data.type === "error") {
        message.error("Worker error: " + data.message);
        setStatus("idle");
      }
    };

    return () => { worker.terminate(); URL.revokeObjectURL(url); };
  }, []);


  const requestAggregate = useCallback((fromMs, toMs, games = []) => {
    workerRef.current?.postMessage({ type: "aggregate", fromMs, toMs, games });
  }, []);

  // Re-aggregate when game selection OR time filter changes
// Re-aggregate ONLY when time filter or confirmed game selection changes
  useEffect(() => {
    if (!workerRef.current) return;
    if (status === "parsing") return;

    let fromMs = null;
    let toMs = null;

    if (appliedFrom !== null && appliedTo !== null) {
      fromMs = appliedFrom;
      toMs = appliedTo;
    } else if (activePeriod !== "All" && activePeriod !== "Custom") {
      const period = PERIOD_OPTIONS.find(p => p.label === activePeriod);
      if (period?.hours) {
        fromMs = Date.now() - period.hours * 3600000;
      }
    }

    setStatus("aggregating");
    requestAggregate(fromMs, toMs, confirmedGames);   // Use confirmedGames
  }, [confirmedGames, appliedFrom, appliedTo, activePeriod, requestAggregate]);

  /* ── file upload ── */
  const handleFile = useCallback((file) => {
    setStatus("parsing");
    setProgress({ loaded: 0, total: 0 });
    setAggregated(null);
    setActivePeriod("All");
    setAppliedFrom(null); setAppliedTo(null); setShowCustom(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      workerRef.current?.postMessage({ type: "parse", buffer: e.target.result, name: file.name }, [e.target.result]);
    };
    reader.readAsArrayBuffer(file);
    return false;
  }, []);

  /* ── period selection ── */
  const handlePeriodClick = useCallback((opt) => {
    if (opt.hours === "custom") {
      setShowCustom(true);
      setActivePeriod("Custom");
      return;
    }

    setShowCustom(false);
    setActivePeriod(opt.label);
    setAppliedFrom(null);
    setAppliedTo(null);

    const fromMs = opt.hours ? Date.now() - opt.hours * 3600000 : null;
    setStatus("aggregating");
    requestAggregate(fromMs, null, selectedGames);
  }, [requestAggregate, selectedGames]);

  const applyCustomRange = useCallback(() => {
    if (!customFrom || !customTo) {
      message.warning("Set both dates.");
      return;
    }
    const from = new Date(customFrom).getTime();
    const to   = new Date(customTo + "T23:59:59").getTime();
    setAppliedFrom(from);
    setAppliedTo(to);
    setStatus("aggregating");
    requestAggregate(from, to, selectedGames);   // ← Pass selectedGames
  }, [customFrom, customTo, requestAggregate, selectedGames]);

  /* ── derived ── */
  const stats = useMemo(() => {
    if (!aggregated) return null;
    const { totalBet, totalPayout, count, wins } = aggregated;
    const profit = totalPayout - totalBet;
    return {
      totalBet:    totalBet.toFixed(2),
      totalPayout: totalPayout.toFixed(2),
      profit:      profit.toFixed(2),
      totalRounds: count,
      winRate:     count > 0 ? ((wins / count) * 100).toFixed(1) : "0.0",
    };
  }, [aggregated]);

  const gameDistribution = useMemo(() => {
    if (!aggregated?.gameDistribution) return [];
    const total = aggregated.count;
    return aggregated.gameDistribution.map(g => ({
      ...g,
      pct: ((g.value / total) * 100).toFixed(1),
    }));
  }, [aggregated]);

  const profitOverTime = aggregated?.profitOverTime ?? [];

  const rangeLabel = useMemo(() => {
    if (!aggregated || !dataRange) return null;
    if (aggregated.minMs === Infinity) return null;
    return `${dayjs(aggregated.minMs).format("MMM D, HH:mm")} → ${dayjs(aggregated.maxMs).format("MMM D, HH:mm")}`;
  }, [aggregated, dataRange]);

  const profit      = stats ? parseFloat(stats.profit) : 0;
  const isLoading   = status === "parsing" || status === "aggregating";
  const hasData     = status === "ready" || status === "aggregating";
  const pct         = progress.total > 0 ? Math.min(100, (progress.loaded / progress.total) * 100) : 0;

  return (
      <>
        <style>{styles}</style>
        <div className="dr">
          <div className="dc">

            {/* Header */}
            <div className="dash-hdr">
              <div className="dash-logo">
                <div className="dash-logo-icon">⚡</div>
                <div>
                  <div className="dash-title">RAINBET ANALYTICS</div>
                  <div className="dash-sub">Session Intelligence Dashboard</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                {totalRows > 0 && (
                    <div className="db-info">
                      <DatabaseOutlined />
                      {totalRows.toLocaleString()} rows · IndexedDB
                    </div>
                )}
                <div className="dash-badge">● LIVE</div>
              </div>
            </div>

            {/* Upload */}
            <div className="section-label">Data Import</div>
            <div className="upload-zone">
              <Dragger beforeUpload={handleFile} accept=".csv,.xlsx,.xls" showUploadList={false} disabled={status === "parsing"}>
                <div className="upload-icon-wrap"><UploadOutlined /></div>
                <div className="upload-text-main">
                  {status === "parsing" ? "Parsing file…" : "Drop your CSV or Excel file here"}
                </div>
                <div className="upload-text-sub">
                  {status === "parsing"
                      ? `${progress.loaded.toLocaleString()} rows written — click to browse a new file`
                      : "Handles millions of rows · .csv .xlsx .xls · click to browse"}
                </div>
              </Dragger>

              {status === "parsing" && (
                  <div className="progress-wrap">
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width:`${pct}%` }} />
                    </div>
                    <div className="progress-label">
                      {progress.loaded.toLocaleString()} / {progress.total > 0 ? progress.total.toLocaleString() : "?"} rows · {pct.toFixed(0)}% written to IndexedDB
                    </div>
                  </div>
              )}
              {status === "aggregating" && (
                  <div className="progress-wrap">
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width:"100%", animation:"none", opacity:.6 }} />
                    </div>
                    <div className="progress-label">Aggregating {totalRows.toLocaleString()} rows via cursor…</div>
                  </div>
              )}
            </div>

            {/* Time period */}
            {hasData && (
                <>
                  <div className="section-label" style={{ marginTop:36 }}>Time Period</div>
                  <div>
                    <div className="time-bar">
                      <span className="time-lbl"><CalendarOutlined /> Filter</span>
                      {PERIOD_OPTIONS.map(opt => (
                          <button
                              key={opt.label}
                              className={`tbtn${activePeriod === opt.label ? " active" : ""}`}
                              onClick={() => handlePeriodClick(opt)}
                              disabled={isLoading}
                          >
                            {opt.label}
                          </button>
                      ))}
                      {rangeLabel && <span className="range-info">{rangeLabel}</span>}
                    </div>
                    {showCustom && (
                        <div className="custom-row">
                          <span className="di-lbl">From</span>
                          <input type="date" className="di" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
                          <span style={{ color:"var(--text-muted)", fontFamily:"monospace" }}>—</span>
                          <span className="di-lbl">To</span>
                          <input type="date" className="di" value={customTo} onChange={e => setCustomTo(e.target.value)} />
                          <button className="apply-btn" onClick={applyCustomRange} disabled={isLoading}>Apply Range</button>
                        </div>
                    )}
                  </div>
                </>
            )}


            {/* Game Filter */}
            {/* Game Filter - Improved */}
            {/* Game Filter - Optimized */}
            {hasData && allGames.length > 0 && (
                <>
                  <div className="section-label" style={{ marginTop: 36 }}>
                    Game Filter
                    <span style={{ marginLeft: 'auto', fontSize: '9px', color: '#3d5470' }}>
        {confirmedGames.length > 0 ? `${confirmedGames.length} selected` : `${allGames.length} total games`}
      </span>
                  </div>

                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>

                    {/* Search + Controls */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                      <input
                          type="text"
                          placeholder="Search games..."
                          value={gameSearch}
                          onChange={(e) => setGameSearch(e.target.value)}
                          style={{
                            flex: 1,
                            background: 'var(--bg-panel)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            color: 'var(--text-primary)',
                            fontFamily: "'Space Mono', monospace",
                            fontSize: '13px',
                            outline: 'none'
                          }}
                      />

                      <button className="tbtn" onClick={() => { setConfirmedGames([]); setSelectedGames([]); }} disabled={isLoading}>
                        All Games
                      </button>

                      {confirmedGames.length > 0 && (
                          <button
                              className="tbtn"
                              onClick={() => { setConfirmedGames([]); setSelectedGames([]); }}
                              style={{ color: '#ef4444', borderColor: '#ef444444' }}
                              disabled={isLoading}
                          >
                            Clear ({confirmedGames.length})
                          </button>
                      )}
                    </div>

                    {/* Game Buttons */}
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                      maxHeight: '260px',
                      overflowY: 'auto',
                      paddingRight: '8px'
                    }}>
                      {filteredGames.length > 0 ? (
                          filteredGames.slice(0, 10).map(game => (
                              <button
                                  key={game}
                                  className={`tbtn ${confirmedGames.includes(game) ? "active" : ""}`}
                                  onClick={() => {
                                    let newSelection;
                                    if (confirmedGames.includes(game)) {
                                      newSelection = confirmedGames.filter(g => g !== game);
                                    } else {
                                      newSelection = [...confirmedGames, game];
                                    }
                                    setSelectedGames(newSelection);     // temporary for UI
                                  }}
                                  disabled={isLoading}
                                  style={{ whiteSpace: 'nowrap' }}
                              >
                                {game}
                              </button>
                          ))
                      ) : (
                          <div className="no-data" style={{ width: '100%', padding: '40px 0' }}>
                            No games found
                          </div>
                      )}
                    </div>

                    {filteredGames.length > 10 && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '12px', textAlign: 'center' }}>
                          Showing top 10 • {filteredGames.length - 10} more
                        </div>
                    )}

                    {/* Apply Button - This is the key fix for performance */}
                    {selectedGames.length > 0 && (
                        <Button type="primary"
                                style={{marginTop: 20}}
                            onClick={() => setConfirmedGames(selectedGames)}
                            disabled={isLoading}
                        >
                          Apply Filter ({selectedGames.length} games)
                        </Button>
                    )}
                  </div>

                  {confirmedGames.length > 0 && (
                      <div style={{ fontSize: 11, color: '#8ba4c0', marginTop: 10, paddingLeft: 4 }}>
                        Filtered by: <strong>{confirmedGames.join(", ")}</strong>
                      </div>
                  )}
                </>
            )}

            {/* Stats */}
            {stats && (
                <>
                  <div className="section-label" style={{ marginTop:36 }}>Session Overview</div>
                  <Row gutter={[16,16]}>
                    {[
                      { label:"Total Wagered",  value:`$${stats.totalBet}`,    color:"blue",  dot:"#3b82f6", icon:<DollarOutlined />,    meta:"Cumulative stake" },
                      { label:"Total Returned", value:`$${stats.totalPayout}`, color:"amber", dot:"#f59e0b", icon:<RiseOutlined />,       meta:"Cumulative payout" },
                      {
                        label:"Net P&L",
                        value:`${profit >= 0 ? "+" : ""}$${stats.profit}`,
                        color: profit >= 0 ? "green":"red",
                        dot:   profit >= 0 ? "#22c55e":"#ef4444",
                        valueColor: profit >= 0 ? "#22c55e":"#ef4444",
                        icon:  profit >= 0 ? <RiseOutlined /> : <FallOutlined />,
                        meta:  profit >= 0 ? "Profitable session":"Net loss",
                      },
                      { label:"Win Rate", value:`${stats.winRate}%`, color:"blue", dot:"#06b6d4", icon:<ThunderboltOutlined />, meta:`${stats.totalRounds.toLocaleString()} rounds` },
                    ].map((s, i) => (
                        <Col xs={24} sm={12} lg={6} key={i}>
                          <div className={`stat-card ${s.color}`} style={{ animationDelay:`${i * 0.06}s` }}>
                            <div className="stat-label">
                              <span className="stat-dot" style={{ background:s.dot }} />
                              {s.label}
                            </div>
                            <div className="stat-value" style={{ color: s.valueColor || "var(--text-primary)" }}>{s.value}</div>
                            <div className="stat-meta">{s.icon}&nbsp;&nbsp;{s.meta}</div>
                          </div>
                        </Col>
                    ))}
                  </Row>

                  <div className="section-label" style={{ marginTop:36 }}>Performance Charts</div>
                  <Row gutter={[16,16]}>
                    <Col xs={24} lg={14}>
                      <div className="chart-panel">
                        <div className="chart-hdr">
                          <div className="chart-title">Cumulative Profit / Loss</div>
                          <div className="chart-tag">Time Series</div>
                        </div>
                        <div className="chart-body">
                          <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={profitOverTime} margin={{ top:8, right:16, left:0, bottom:0 }}>
                              <defs>
                                <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%"   stopColor={profit >= 0 ? "#22c55e":"#ef4444"} stopOpacity={0.25} />
                                  <stop offset="100%" stopColor={profit >= 0 ? "#22c55e":"#ef4444"} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="2 4" stroke="#1e2d45" />
                              <XAxis dataKey="name" tick={{ fontFamily:"'Space Mono',monospace", fontSize:9, fill:"#3d5470" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                              <YAxis tick={{ fontFamily:"'Space Mono',monospace", fontSize:9, fill:"#3d5470" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                              <Tooltip content={<CustomTooltip />} />
                              <Area type="monotone" dataKey="profit" stroke={profit >= 0 ? "#22c55e":"#ef4444"} strokeWidth={2} fill="url(#pg)" dot={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </Col>

                    <Col xs={24} lg={10}>
                      <div className="chart-panel">
                        <div className="chart-hdr">
                          <div className="chart-title">Game Distribution</div>
                          <div className="chart-tag">Breakdown</div>
                        </div>
                        <div style={{ display:"flex", justifyContent:"center", paddingTop:12 }}>
                          <PieChart width={180} height={180}>
                            <Pie data={gameDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={82} paddingAngle={2} strokeWidth={0}>
                              {gameDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background:"#0d1a2e", border:"1px solid #1e2d45", borderRadius:8, fontFamily:"'Space Mono',monospace", fontSize:11 }} itemStyle={{ color:"#f0f6ff" }} />
                          </PieChart>
                        </div>
                        <div className="pie-legend">
                          {gameDistribution.slice(0, 8).map((item, i) => (
                              <div className="pli" key={i}>
                                <div className="pld" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                <span style={{ minWidth:80, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</span>
                                <div className="plb"><div className="plf" style={{ width:`${item.pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} /></div>
                                <span className="plc">{item.value.toLocaleString()}</span>
                              </div>
                          ))}
                        </div>
                      </div>
                    </Col>
                  </Row>
                </>
            )}

            {/* Biggest Loser / Worst Game */}
            {false && (
                <div style={{ margin: '24px 0 16px' }}>
                  <div className="section-label">
                    {selectedGames.length === 1 ? "Game Performance" : "Biggest Loser"}
                  </div>
                  <div className="stat-card red" style={{ maxWidth: 420 }}>
                    <div className="stat-label">
                      <span className="stat-dot" style={{ background: "#ef4444" }} />
                      {selectedGames.length === 1 ? selectedGames[0] : "DOWN THE MOST"}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#ef4444", marginBottom: 8 }}>
                      {gameDistribution[0]?.name || '—'}
                    </div>
                    <div style={{ color: "#ef4444", fontFamily: "'Space Mono', monospace", fontSize: 13 }}>
                      Net P&L: <strong>-${Math.abs(aggregated.totalPayout - aggregated.totalBet).toFixed(2)}</strong>
                      {' • '}{gameDistribution[0]?.pct}% of rounds
                    </div>
                  </div>
                </div>
            )}
          </div>
        </div>
      </>
  );
}