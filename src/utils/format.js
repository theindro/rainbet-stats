export function fmtUsd(value, { signed = false, decimals = 2 } = {}) {
  const n = Number(value) || 0;
  const prefix = signed && n > 0 ? "+" : "";
  return `${prefix}$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function fmtPct(value, decimals = 1) {
  return `${Number(value).toFixed(decimals)}%`;
}

export function fmtNum(value) {
  return Number(value || 0).toLocaleString("en-US");
}
