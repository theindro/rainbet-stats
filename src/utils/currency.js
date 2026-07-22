const FALLBACK_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.52,
  BRL: 5.05,
  ARS: 1050,
  MXN: 17.2,
  CLP: 920,
  COP: 4100,
  PEN: 3.75,
  INR: 83.5,
  JPY: 149,
  KRW: 1350,
  TRY: 32,
  PLN: 3.95,
  RUB: 92,
  UAH: 41,
  PHP: 56,
  THB: 35,
  VND: 25400,
  IDR: 15800,
  MYR: 4.45,
  SGD: 1.34,
  HKD: 7.82,
  CNY: 7.24,
  NZD: 1.65,
  CHF: 0.88,
  SEK: 10.5,
  NOK: 10.7,
  DKK: 6.88,
  CZK: 23.2,
  HUF: 365,
  RON: 4.58,
  BGN: 1.8,
  ZAR: 18.5,
  NGN: 1550,
  KES: 129,
  EGP: 49,
  USDT: 1,
  USDC: 1,
  BTC: 0.0000095,
  ETH: 0.00029,
  LTC: 0.0095,
  DOGE: 4.2,
  TRX: 7.8,
  XRP: 1.85,
  SOL: 0.0055,
};

let cachedRates = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000;

export async function fetchExchangeRates() {
  if (cachedRates && Date.now() - cacheTime < CACHE_TTL) {
    return cachedRates;
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!res.ok) throw new Error("Rate fetch failed");
    const data = await res.json();
    if (data.result === "success" && data.rates) {
      cachedRates = { ...FALLBACK_RATES, ...data.rates, USD: 1 };
      cacheTime = Date.now();
      return cachedRates;
    }
  } catch {
    /* use fallback */
  }

  cachedRates = { ...FALLBACK_RATES };
  cacheTime = Date.now();
  return cachedRates;
}

/** Convert amount in given currency to USD */
export function toUsd(amount, currency, rates) {
  const cur = (currency || "USD").toUpperCase().trim();
  if (!amount || isNaN(amount)) return 0;
  if (cur === "USD") return amount;

  const rate = rates[cur];
  if (!rate || rate <= 0) return amount;
  return amount / rate;
}

export function getUniqueCurrencies(rows) {
  const set = new Set();
  for (const r of rows) {
    if (r.currency) set.add(r.currency.toUpperCase());
  }
  return [...set];
}
