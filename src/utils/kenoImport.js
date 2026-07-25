import { parseKenoApiResponse } from "../services/kenoApi";

export function normalizeKenoImportItem(item) {
  if (item.betId && Array.isArray(item.results)) {
    return item;
  }
  if (item.id && item.game?.parameters) {
    return parseKenoApiResponse(item);
  }
  if (item.game?.parameters) {
    return parseKenoApiResponse({ ...item, id: item.id || item.betId });
  }
  throw new Error("Unrecognized keno result format");
}

export function parseKenoImportJson(text) {
  const data = JSON.parse(text);
  const items = Array.isArray(data) ? data : data.results || data.rounds;
  if (!Array.isArray(items)) {
    throw new Error("JSON must be an array of Rainbet game-result objects");
  }
  return items.map(normalizeKenoImportItem);
}

export function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
