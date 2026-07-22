import { useState, useCallback, useMemo } from "react";
import { BetContext } from "../hooks/useBetContext";
import { PERIOD_OPTIONS } from "../utils/stats";

export function BetProvider({ children, worker }) {
  const [activePeriod, setActivePeriod] = useState("All");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState(null);
  const [appliedTo, setAppliedTo] = useState(null);
  const [showCustom, setShowCustom] = useState(false);

  const getTimeRange = useCallback(() => {
    if (appliedFrom !== null && appliedTo !== null) {
      return { fromMs: appliedFrom, toMs: appliedTo };
    }
    if (activePeriod !== "All" && activePeriod !== "Custom") {
      const period = PERIOD_OPTIONS.find((p) => p.label === activePeriod);
      if (period?.hours) {
        return { fromMs: Date.now() - period.hours * 3600000, toMs: null };
      }
    }
    return { fromMs: null, toMs: null };
  }, [activePeriod, appliedFrom, appliedTo]);

  const handlePeriodChange = useCallback((opt) => {
    if (opt.hours === "custom") {
      setShowCustom(true);
      setActivePeriod("Custom");
      return;
    }
    setShowCustom(false);
    setActivePeriod(opt.label);
    setAppliedFrom(null);
    setAppliedTo(null);
  }, []);

  const applyCustomRange = useCallback(() => {
    if (!customFrom || !customTo) return false;
    setAppliedFrom(new Date(customFrom).getTime());
    setAppliedTo(new Date(customTo + "T23:59:59").getTime());
    setActivePeriod("Custom");
    return true;
  }, [customFrom, customTo]);

  const value = useMemo(
    () => ({
      ...worker,
      activePeriod,
      customFrom,
      customTo,
      appliedFrom,
      appliedTo,
      showCustom,
      setCustomFrom,
      setCustomTo,
      handlePeriodChange,
      applyCustomRange,
      getTimeRange,
    }),
    [worker, activePeriod, customFrom, customTo, appliedFrom, appliedTo, showCustom, handlePeriodChange, applyCustomRange, getTimeRange]
  );

  return <BetContext.Provider value={value}>{children}</BetContext.Provider>;
}
