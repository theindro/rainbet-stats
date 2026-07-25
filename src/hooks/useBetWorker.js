import { useState, useRef, useEffect, useCallback } from "react";
import { message } from "antd";
import { fetchExchangeRates } from "../utils/currency";

export function useBetWorker() {
  const workerRef = useRef(null);
  const [status, setStatus] = useState("restoring");
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const [totalRows, setTotalRows] = useState(0);
  const [aggregated, setAggregated] = useState(null);
  const [dataRange, setDataRange] = useState(null);
  const [allGames, setAllGames] = useState([]);
  const [exchangeRates, setExchangeRates] = useState(null);
  const pendingAggregate = useRef(null);
  const aggregateRequestId = useRef(0);
  const kenoRequestId = useRef(0);
  const kenoResolvers = useRef(new Map());

  useEffect(() => {
    fetchExchangeRates().then(setExchangeRates);

    const worker = new Worker(new URL("../worker/betWorker.js", import.meta.url));
    workerRef.current = worker;

    worker.onmessage = ({ data }) => {
      if (data.type === "progress") {
        setProgress({ loaded: data.loaded, total: data.total });
      }
      if (data.type === "done") {
        setTotalRows(data.total);
        setStatus("parsed");
      }
      if (data.type === "restored") {
        if (data.total > 0) {
          setTotalRows(data.total);
          setStatus("parsed");
        } else {
          setStatus("idle");
        }
      }
      if (data.type === "aggregated") {
        if (data.requestId !== aggregateRequestId.current) return;
        setAggregated(data);
        setDataRange({ minMs: data.minMs, maxMs: data.maxMs });
        if (!data.singleGame) {
          setAllGames(data.allGames || []);
        }
        setStatus("ready");
      }
      if (data.type === "kenoBetIds") {
        const resolve = kenoResolvers.current.get(data.requestId);
        if (resolve) {
          kenoResolvers.current.delete(data.requestId);
          resolve(data.ids);
        }
      }
      if (data.type === "error") {
        message.error("Worker error: " + data.message);
        setStatus("idle");
      }
    };

    worker.postMessage({ type: "restore" });

    return () => worker.terminate();
  }, []);

  const requestAggregate = useCallback((fromMs, toMs, games = [], singleGame = null) => {
    const requestId = ++aggregateRequestId.current;
    pendingAggregate.current = { fromMs, toMs, games, singleGame, requestId };
    setAggregated(null);
    setStatus("aggregating");
    workerRef.current?.postMessage({
      type: "aggregate",
      fromMs,
      toMs,
      games,
      singleGame,
      requestId,
    });
  }, []);

  const getKenoBetIds = useCallback((limit = null) => {
    return new Promise((resolve) => {
      const requestId = ++kenoRequestId.current;
      kenoResolvers.current.set(requestId, resolve);
      workerRef.current?.postMessage({ type: "getKenoBetIds", limit, requestId });
    });
  }, []);

  const parseFile = useCallback(
    async (file) => {
      setStatus("parsing");
      setProgress({ loaded: 0, total: 0 });
      setAggregated(null);
      setTotalRows(0);
      pendingAggregate.current = { fromMs: null, toMs: null, games: [], singleGame: null };

      const rates = exchangeRates || (await fetchExchangeRates());
      setExchangeRates(rates);

      const reader = new FileReader();
      reader.onload = (e) => {
        workerRef.current?.postMessage(
          { type: "parse", buffer: e.target.result, name: file.name, rates },
          [e.target.result]
        );
      };
      reader.readAsArrayBuffer(file);
    },
    [exchangeRates]
  );

  const isLoading = status === "parsing" || status === "aggregating" || status === "restoring";
  const isAggregating = status === "aggregating";
  const hasData = totalRows > 0 || status === "ready" || status === "aggregating" || status === "parsed";

  return {
    status,
    progress,
    totalRows,
    aggregated,
    dataRange,
    allGames,
    exchangeRates,
    isLoading,
    isAggregating,
    hasData,
    parseFile,
    requestAggregate,
    getKenoBetIds,
    setStatus,
  };
}
