import { useCallback } from "react";
import { useBetContext } from "./useBetContext";
import { fromUsd } from "../utils/currency";
import { formatCurrency } from "../utils/format";

export function useFormatMoney() {
  const { displayCurrency, exchangeRates } = useBetContext();

  const convert = useCallback(
    (usdAmount) => fromUsd(usdAmount, displayCurrency, exchangeRates || { USD: 1 }),
    [displayCurrency, exchangeRates]
  );

  const formatMoney = useCallback(
    (usdAmount, options = {}) => {
      const converted = convert(usdAmount);
      return formatCurrency(converted, displayCurrency, options);
    },
    [convert, displayCurrency]
  );

  return { formatMoney, convert, displayCurrency };
}
