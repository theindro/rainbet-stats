import { useState, useCallback, useRef, useEffect } from "react";
import { message } from "antd";
import { fetchKenoResultsBatch } from "../services/kenoApi";
import { getCachedKenoResult, cacheKenoResult } from "../utils/kenoDb";
import { analyzeKenoNumbers, analyzeSelectedNumbers } from "../utils/kenoAnalysis";

export function useKenoAnalyzer(getKenoBetIds) {
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0, fetched: 0 });
  const [analysis, setAnalysis] = useState(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState([]);
  const [roundLimit, setRoundLimit] = useState(500);
  const [totalKenoBets, setTotalKenoBets] = useState(0);
  const abortRef = useRef(false);

  useEffect(() => {
    if (!getKenoBetIds) return;
    getKenoBetIds(null).then((ids) => setTotalKenoBets(ids.length));
  }, [getKenoBetIds]);

  const analyze = useCallback(async () => {
    if (!getKenoBetIds) return;

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
        message.error("Could not fetch Keno results. Restart dev server (npm run dev) and ensure curl is installed.");
        return;
      }

      setAnalysis(analyzeKenoNumbers(results));
      setSelectedAnalysis(analyzeSelectedNumbers(results));
      setStatus("ready");

      if (failed > 0) {
        message.warning(`${failed} rounds failed to fetch (${results.length} succeeded).`);
      }
    } catch (err) {
      setStatus("error");
      message.error(err.message);
    }
  }, [getKenoBetIds, roundLimit]);

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
    analyze,
    cancel,
    isLoading: status === "loading-ids" || status === "fetching",
  };
}
