import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CURL_BIN = process.platform === "win32" ? "curl.exe" : "curl";

const CURL_ARGS_PREFIX = [
  "-s",
  "-S",
  "-H",
  "Referer: https://rainbet.com/",
  "-H",
  "x-requested-with: rb",
  "-H",
  "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
  "-H",
  "Accept: application/json, text/plain, */*",
  "-H",
  'sec-ch-ua-platform: "Windows"',
  "-H",
  'sec-ch-ua: "Not;A=Brand";v="8", "Chromium";v="150", "Google Chrome";v="150"',
  "-H",
  "sec-ch-ua-mobile: ?0",
];

async function fetchViaCurl(url) {
  const { stdout } = await execFileAsync(CURL_BIN, [...CURL_ARGS_PREFIX, url], {
    maxBuffer: 10 * 1024 * 1024,
    timeout: 30000,
    windowsHide: true,
  });
  return stdout;
}

function rainbetMiddleware(req, res, next) {
  if (!req.url?.startsWith("/rainbet-api/")) {
    next();
    return;
  }

  const path = req.url.replace(/^\/rainbet-api/, "");
  const url = `https://services.rainbet.com${path}`;

  fetchViaCurl(url)
    .then((body) => {
      JSON.parse(body);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.statusCode = 200;
      res.end(body);
    })
    .catch((err) => {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err.message || "Rainbet fetch failed" }));
    });
}

/** Vite dev/preview middleware — proxies via curl so Cloudflare sees browser-like headers */
export function rainbetCurlProxyPlugin() {
  return {
    name: "rainbet-curl-proxy",
    configureServer(server) {
      server.middlewares.use(rainbetMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rainbetMiddleware);
    },
  };
}
