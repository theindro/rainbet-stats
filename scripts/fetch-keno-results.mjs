import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const input = process.argv[2] || "keno-bet-ids.txt";
const output = process.argv[3] || "keno-results.json";
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = process.argv.includes("--all") ? Infinity : Number(limitArg?.split("=")[1] || 500);

const curl = process.platform === "win32" ? "curl.exe" : "curl";
const curlHeaders = [
  "-H",
  "Referer: https://rainbet.com/",
  "-H",
  "x-requested-with: rb",
  "-H",
  "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
  "-H",
  "Accept: application/json, text/plain, */*",
];

const ids = readFileSync(input, "utf8")
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean)
  .slice(0, limit);

if (ids.length === 0) {
  console.error("No bet IDs in input file.");
  process.exit(1);
}

const results = [];
let failed = 0;

for (let i = 0; i < ids.length; i++) {
  const id = ids[i];
  process.stderr.write(`\rFetching ${i + 1}/${ids.length}...`);
  try {
    const url = `https://services.rainbet.com/v1/public/game-results/${id}`;
    const body = execFileSync(curl, ["-s", "-S", ...curlHeaders, url], {
      encoding: "utf8",
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });
    results.push(JSON.parse(body));
  } catch {
    failed += 1;
  }
}

process.stderr.write("\n");
writeFileSync(output, JSON.stringify(results, null, 2));
console.log(`Done: ${results.length} saved, ${failed} failed → ${output}`);
