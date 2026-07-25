importScripts("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");

const DB_NAME = "BetAnalytics";
const DB_VER = 3;
const STORE = "rows";
const KENO_STORE = "kenoResults";

function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      const tx = e.target.transaction;

      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { autoIncrement: true });
        os.createIndex("createdAt", "createdAt");
        os.createIndex("game", "game");
        os.createIndex("betId", "betId", { unique: false });
      } else if (e.oldVersion < 3) {
        const os = tx.objectStore(STORE);
        if (!os.indexNames.contains("betId")) {
          os.createIndex("betId", "betId", { unique: false });
        }
      }

      if (!db.objectStoreNames.contains(KENO_STORE)) {
        db.createObjectStore(KENO_STORE, { keyPath: "betId" });
      }
    };
    req.onsuccess = (e) => res(e.target.result);
    req.onerror = (e) => rej(e.target.error);
  });
}

function clearStore(db) {
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = res;
    tx.onerror = (e) => rej(e.target.error);
  });
}

function bulkPut(db, rows) {
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    const os = tx.objectStore(STORE);
    rows.forEach((r) => os.put(r));
    tx.oncomplete = res;
    tx.onerror = (e) => rej(e.target.error);
  });
}

function toUsd(amount, currency, rates) {
  const cur = (currency || "USD").toUpperCase().trim();
  if (!amount || isNaN(amount)) return 0;
  if (cur === "USD") return amount;
  const rate = rates[cur];
  if (!rate || rate <= 0) return amount;
  return amount / rate;
}

function parseCsvLine(line) {
  const cols = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      cols.push(cur.trim().replace(/^"|"$/g, ""));
      cur = "";
    } else {
      cur += ch;
    }
  }
  cols.push(cur.trim().replace(/^"|"$/g, ""));
  return cols;
}

function buildRow(fields, rates) {
  const currency = (fields.currency || "USD").toUpperCase().trim();
  const ts = new Date(fields.createdAt || "").getTime();
  if (isNaN(ts) || ts <= 0) return null;

  const origAmount = parseFloat(fields.amount || 0);
  const origPayout = parseFloat(fields.payout || 0);
  const amount = toUsd(origAmount, currency, rates);
  const payout = toUsd(origPayout, currency, rates);

  return {
    betId: fields.betId || null,
    createdAt: ts,
    amount,
    payout,
    profit: payout - amount,
    game: fields.game || "Unknown",
    provider: fields.provider || "Unknown",
    currency,
    origAmount,
    origPayout,
    multiplier: parseFloat(fields.multiplier || 0),
    status: fields.status || "",
  };
}

function countRows(db) {
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => res(req.result);
    req.onerror = (e) => rej(e.target.error);
  });
}

function getKenoBetIds(db, limit) {
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const idx = tx.objectStore(STORE).index("createdAt");
    const req = idx.openCursor(null, "prev");
    const ids = [];

    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (!cursor) return res(ids);

      const row = cursor.value;
      if (row.game === "Keno" && row.betId) {
        ids.push({ betId: row.betId, createdAt: row.createdAt });
        if (limit && ids.length >= limit) return res(ids);
      }
      cursor.continue();
    };

    req.onerror = (e) => rej(e.target.error);
  });
}

async function aggregate(db, fromMs, toMs, gamesFilter = [], singleGame = null) {
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const idx = tx.objectStore(STORE).index("createdAt");

    let range = null;
    if (fromMs != null && toMs != null) range = IDBKeyRange.bound(fromMs, toMs);
    else if (fromMs != null) range = IDBKeyRange.lowerBound(fromMs);
    else if (toMs != null) range = IDBKeyRange.upperBound(toMs);

    const req = idx.openCursor(range);

    let totalBet = 0;
    let totalPayout = 0;
    let count = 0;
    let winCount = 0;
    let biggestWin = 0;
    let biggestLoss = 0;
    const gameMap = {};
    const providerMap = {};
    const currencyMap = {};
    const cumulativeBuckets = {};
    let runningProfit = 0;
    let minMs = Infinity;
    let maxMs = -Infinity;
    let gameProvider = null;

    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (!cursor) {
        const allGamesList = Object.keys(gameMap).sort();

        const profitOverTime = Object.keys(cumulativeBuckets)
          .sort()
          .map((k) => ({ name: k, ...cumulativeBuckets[k] }));

        const gameStats = Object.entries(gameMap)
          .map(([name, stats]) => {
            const rtp = stats.bet > 0 ? (stats.payout / stats.bet) * 100 : 0;
            return {
              name,
              provider: stats.provider,
              bet: Number(stats.bet.toFixed(2)),
              payout: Number(stats.payout.toFixed(2)),
              profit: Number(stats.profit.toFixed(2)),
              rounds: stats.rounds,
              wins: stats.wins,
              rtp: Number(rtp.toFixed(2)),
            };
          })
          .sort((a, b) => b.profit - a.profit);

        res({
          totalBet,
          totalPayout,
          count,
          winCount,
          biggestWin,
          biggestLoss,
          gameStats,
          profitOverTime,
          minMs,
          maxMs,
          allGames: allGamesList,
          providerBreakdown: Object.entries(providerMap)
            .map(([name, s]) => ({ name, rounds: s.rounds, profit: Number(s.profit.toFixed(2)) }))
            .sort((a, b) => b.rounds - a.rounds),
          currencyBreakdown: Object.entries(currencyMap)
            .map(([name, s]) => ({ name, rounds: s.rounds, origBet: Number(s.origBet.toFixed(2)) }))
            .sort((a, b) => b.rounds - a.rounds),
          gameProvider,
        });
        return;
      }

      const r = cursor.value;
      const gameName = r.game || "Unknown";

      if (singleGame && gameName !== singleGame) {
        cursor.continue();
        return;
      }

      if (gamesFilter.length > 0 && !gamesFilter.includes(gameName)) {
        cursor.continue();
        return;
      }

      const amount = r.amount || 0;
      const payout = r.payout || 0;
      const profit = payout - amount;

      totalBet += amount;
      totalPayout += payout;
      count++;

      if (payout > amount) winCount++;
      if (profit > biggestWin) biggestWin = profit;
      if (profit < biggestLoss) biggestLoss = profit;

      if (!gameMap[gameName]) {
        gameMap[gameName] = { bet: 0, payout: 0, rounds: 0, profit: 0, wins: 0, provider: r.provider };
      }
      gameMap[gameName].bet += amount;
      gameMap[gameName].payout += payout;
      gameMap[gameName].rounds += 1;
      gameMap[gameName].profit += profit;
      if (payout > amount) gameMap[gameName].wins += 1;
      if (!gameMap[gameName].provider && r.provider) gameMap[gameName].provider = r.provider;

      const prov = r.provider || "Unknown";
      if (!providerMap[prov]) providerMap[prov] = { rounds: 0, profit: 0 };
      providerMap[prov].rounds += 1;
      providerMap[prov].profit += profit;

      const cur = r.currency || "USD";
      if (!currencyMap[cur]) currencyMap[cur] = { rounds: 0, origBet: 0 };
      currencyMap[cur].rounds += 1;
      currencyMap[cur].origBet += r.origAmount || amount;

      if (singleGame && !gameProvider && r.provider) gameProvider = r.provider;

      if (r.createdAt < minMs) minMs = r.createdAt;
      if (r.createdAt > maxMs) maxMs = r.createdAt;

      const spanDays = toMs && fromMs ? (toMs - fromMs) / 86400000 : 0;
      const useDayOnly = spanDays > 3 || fromMs == null;
      const sliceEnd = useDayOnly ? 10 : 13;
      const key = new Date(r.createdAt).toISOString().slice(0, sliceEnd);

      runningProfit += profit;

      if (!cumulativeBuckets[key]) {
        cumulativeBuckets[key] = { profit: 0, bets: 0 };
      }
      cumulativeBuckets[key].bets += 1;
      cumulativeBuckets[key].profit = Number(runningProfit.toFixed(2));

      cursor.continue();
    };

    req.onerror = (e) => rej(e.target.error);
  });
}

self.onmessage = async ({ data }) => {
  if (data.type === "parse") {
    try {
      const db = await openDB();
      await clearStore(db);

      const ab = data.buffer;
      const fname = data.name;
      const rates = data.rates || { USD: 1 };
      const isXlsx = /\.xlsx?$/i.test(fname);
      const CHUNK = 5000;
      let total = 0;

      if (isXlsx) {
        const wb = XLSX.read(ab, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const batchCount = Math.ceil(raw.length / CHUNK);

        for (let b = 0; b < batchCount; b++) {
          const slice = raw.slice(b * CHUNK, (b + 1) * CHUNK);
          const rows = slice
            .map((r) =>
              buildRow(
                {
                  betId: r.ID || r["ID"] || null,
                  createdAt: r["Created At"] instanceof Date ? r["Created At"].toISOString() : r["Created At"],
                  amount: r.Amount,
                  payout: r.Payout,
                  game: r.Game,
                  provider: r.Provider,
                  currency: r.Currency,
                  multiplier: r.Multiplier,
                  status: r.Status,
                },
                rates
              )
            )
            .filter(Boolean);

          await bulkPut(db, rows);
          total += rows.length;
          self.postMessage({ type: "progress", loaded: total, total: raw.length });
        }
      } else {
        const text = new TextDecoder().decode(ab);
        const lines = text.split("\n");
        const header = parseCsvLine(lines[0]).map((h) => h.trim());
        const idxId = header.indexOf("ID");
        const idxCA = header.indexOf("Created At");
        const idxAmt = header.indexOf("Amount");
        const idxPay = header.indexOf("Payout");
        const idxGame = header.indexOf("Game");
        const idxProv = header.indexOf("Provider");
        const idxCur = header.indexOf("Currency");
        const idxMult = header.indexOf("Multiplier");
        const idxStatus = header.indexOf("Status");

        for (let i = 1; i < lines.length; i += CHUNK) {
          const slice = lines.slice(i, i + CHUNK);
          const rows = [];
          for (const line of slice) {
            if (!line.trim()) continue;
            const cols = parseCsvLine(line);
            const row = buildRow(
              {
                betId: idxId !== -1 ? cols[idxId] : "",
                createdAt: cols[idxCA] || "",
                amount: cols[idxAmt],
                payout: cols[idxPay],
                game: cols[idxGame],
                provider: idxProv !== -1 ? cols[idxProv] : "",
                currency: idxCur !== -1 ? cols[idxCur] : "USD",
                multiplier: idxMult !== -1 ? cols[idxMult] : 0,
                status: idxStatus !== -1 ? cols[idxStatus] : "",
              },
              rates
            );
            if (row) rows.push(row);
          }
          await bulkPut(db, rows);
          total += rows.length;
          self.postMessage({ type: "progress", loaded: total, total: lines.length - 1 });
        }
      }

      self.postMessage({ type: "done", total });
    } catch (err) {
      self.postMessage({ type: "error", message: err.message });
    }
  }

  if (data.type === "restore") {
    try {
      const db = await openDB();
      const total = await countRows(db);
      self.postMessage({ type: "restored", total });
    } catch (err) {
      self.postMessage({ type: "error", message: err.message });
    }
  }

  if (data.type === "aggregate") {
    try {
      const db = await openDB();
      const result = await aggregate(
        db,
        data.fromMs ?? null,
        data.toMs ?? null,
        data.games || [],
        data.singleGame || null
      );
      self.postMessage({ type: "aggregated", requestId: data.requestId, singleGame: data.singleGame ?? null, ...result });
    } catch (err) {
      self.postMessage({ type: "error", message: err.message });
    }
  }

  if (data.type === "getKenoBetIds") {
    try {
      const db = await openDB();
      const ids = await getKenoBetIds(db, data.limit ?? null);
      self.postMessage({ type: "kenoBetIds", requestId: data.requestId, ids });
    } catch (err) {
      self.postMessage({ type: "error", message: err.message });
    }
  }
};
