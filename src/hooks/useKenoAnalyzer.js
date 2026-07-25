import { useState, useCallback, useRef, useEffect } from "react";
import { message } from "antd";
import { fetchKenoResultsBatch } from "../services/kenoApi";
import { getCachedKenoResult, cacheKenoResult } from "../utils/kenoDb";
import { analyzeKenoNumbers, analyzeSelectedNumbers } from "../utils/kenoAnalysis";
import { parseKenoImportJson } from "../utils/kenoImport";

const IS_DEV = import.meta.env.DEV;

export function useKenoAnalyzer(getKenoBetIds) {
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0, fetched: 0 });
  const [analysis, setAnalysis] = useState(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState([]);
  const [roundLimit, setRoundLimit] = useState(500);
  const [totalKenoBets, setTotalKenoBets] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const abortRef = useRef(false);

  useEffect(() => {
    if (!getKenoBetIds) return;
    getKenoBetIds(null).then((ids) => setTotalKenoBets(ids.length));
  }, [getKenoBetIds]);

  const applyResults = useCallback(async (results) => {
    for (const r of results) {
      await cacheKenoResult(r);
    }
    setImportedCount(results.length);
    setAnalysis(analyzeKenoNumbers(results));
    setSelectedAnalysis(analyzeSelectedNumbers(results));
    setStatus("ready");
  }, []);

  const analyzeFromImport = useCallback(
    async (file) => {
      setStatus("importing");
      setAnalysis(null);
      setSelectedAnalysis([]);
      try {
        const text = await file.text();
        const results = parseKenoImportJson(text);
        await applyResults(results);
        message.success(`Imported ${results.length.toLocaleString()} Keno rounds`);
      } catch (err) {
        setStatus("error");
        message.error(err.message || "Invalid JSON file");
      }
    },
    [applyResults]
  );

  const exportBetIds = useCallback(async () => {
    if (!getKenoBetIds) return;
    const allIds = await getKenoBetIds(null);
    if (allIds.length === 0) {
      message.warning("No Keno bet IDs found. Re-upload your CSV.");
      return;
    }
    const { downloadTextFile } = await import("../utils/kenoImport");
    downloadTextFile("keno-bet-ids.txt", allIds.map((b) => b.betId).join("\n"));
    message.success(`Exported ${allIds.length.toLocaleString()} bet IDs`);
  }, [getKenoBetIds]);

  const analyzeLive = useCallback(async () => {
    if (!getKenoBetIds) return;
    if (!IS_DEV) {
      message.info("Live fetch only works in local dev. Use Export IDs + script, then Import JSON.");
      return;
    }

    abortRef.current = false;
    setStatus("loading-ids");
    setAnalysis(null);
    setSelectedAnalysis([]);

    try {
      const allIds = await getKenoBetIds(null);
      setTotalKenoBets(allIds.length);

      if (allIds.length === 0) {
        setStatus("no-ids");
        message.warning("No Keno bet IDs found. Re-upload your CSV to index bet IDs.");
        return;
      }

      const limited = roundLimit ? allIds.slice(0, roundLimit) : allIds;
      setStatus("fetching");
      setProgress({ done: 0, total: limited.length, failed: 0, fetched: 0 });

      const { results, failed } = await fetchKenoResultsBatch(
        limited.map((b) => b.betId),
        {
          concurrency: 4,
          getCached: getCachedKenoResult,
          setCached: cacheKenoResult,
          onProgress: (p) => {
            if (!abortRef.current) setProgress(p);
          },
        }
      );

      if (abortRef.current) return;

      if (results.length === 0) {
        setStatus("fetch-failed");
        message.error("Could not fetch Keno results.");
        return;
      }

      await applyResults(results);

      if (failed > 0) {
        message.warning(`${failed} rounds failed (${results.length} succeeded).`);
      }
    } catch (err) {
      setStatus("error");
      message.error(err.message);
    }
  }, [getKenoBetIds, roundLimit, applyResults]);

  const cancel = useCallback(() => {
    abortRef.current = true;
    setStatus("idle");
  }, []);

  return {
    status,
    progress,
    analysis,
    selectedAnalysis,
    roundLimit,
    setRoundLimit,
    totalKenoBets,
    importedCount,
    canLiveFetch: IS_DEV,
    analyzeLive,
    analyzeFromImport,
    exportBetIds,
    cancel,
    isLoading: status === "loading-ids" || status === "fetching" || status === "importing",
  };
}
