export const RAINBET_FETCH_HEADERS = {
  Accept: "application/json, text/plain, */*",
  Referer: "https://rainbet.com/",
  Origin: "https://rainbet.com",
  "x-requested-with": "rb",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
  "sec-ch-ua": '"Not;A=Brand";v="8", "Chromium";v="150", "Google Chrome";v="150"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
};

export const BET_ID_RE = /^[a-f0-9-]{36}$/i;

export async function fetchRainbetGameResult(betId) {
  const res = await fetch(`https://services.rainbet.com/v1/public/game-results/${betId}`, {
    headers: RAINBET_FETCH_HEADERS,
  });
  return res;
}
