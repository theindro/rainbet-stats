// Browser cannot set Referer/UA headers — Rainbet/Cloudflare blocks localhost.
// Dev/preview proxy adds Rainbet headers server-side (same as curl).
const API_BASE = "/rainbet-api";

export function parseKenoApiResponse(data) {
  const params = data.game?.parameters || {};
  return {
    betId: data.id,
    results: params.results || [],
    selectedNumbers: params.selectedNumbers || [],
    matchCount: params.matchCount ?? 0,
    difficulty: params.difficulty || "",
    boardNumberCount: params.boardNumberCount || 40,
    updatedAt: data.updated_at,
  };
}

export async function fetchKenoResult(betId) {
  const res = await fetch(`${API_BASE}/v1/public/game-results/${betId}`, {
    headers: {
      Accept: "application/json, text/plain, */*",
      "x-requested-with": "rb",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${betId}: HTTP ${res.status}`);
  }

  const data = await res.json();
  return parseKenoApiResponse(data);
}

export async function fetchKenoResultsBatch(betIds, { onProgress, getCached, setCached, concurrency = 6 } = {}) {
  const queue = [...betIds];
  const results = [];
  let done = 0;
  let failed = 0;
  const total = betIds.length;

  async function worker() {
    while (queue.length > 0) {
      const betId = queue.shift();
      try {
        let parsed = await getCached(betId);
        if (!parsed) {
          parsed = await fetchKenoResult(betId);
          await setCached(parsed);
        }
        results.push(parsed);
      } catch {
        failed += 1;
      }
      done += 1;
      onProgress?.({ done, total, failed, fetched: results.length });
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, total || 1) }, () => worker());
  await Promise.all(workers);

  return { results, failed };
}
