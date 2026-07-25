import { BET_ID_RE, fetchRainbetGameResult } from "../_rainbet.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { betId } = req.query;

  if (!betId || !BET_ID_RE.test(betId)) {
    res.status(400).json({ error: "Invalid bet ID" });
    return;
  }

  try {
    const upstream = await fetchRainbetGameResult(betId);
    const body = await upstream.text();

    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
    res.send(body);
  } catch (err) {
    res.status(502).json({ error: err.message || "Rainbet fetch failed" });
  }
}
