import { getCurrencySymbol } from "./currency";

export function formatCurrency(amount, currency, { signed = false, decimals = 2 } = {}) {
  const n = Number(amount) || 0;
  const sym = getCurrencySymbol(currency);
  const sign = signed ? (n > 0 ? "+" : n < 0 ? "-" : "") : n < 0 ? "-" : "";
  const abs = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${sign}${sym}${abs}`;
}

export function fmtUsd(value, { signed = false, decimals = 2 } = {}) {
  return formatCurrency(value, "USD", { signed, decimals });
}

export function fmtPct(value, decimals = 1) {
  return `${Number(value).toFixed(decimals)}%`;
}

export function fmtNum(value) {
  return Number(value || 0).toLocaleString("en-US");
}
