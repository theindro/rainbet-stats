export const PERIOD_OPTIONS = [
  { label: "1H", hours: 1 },
  { label: "6H", hours: 6 },
  { label: "24H", hours: 24 },
  { label: "7D", hours: 24 * 7 },
  { label: "30D", hours: 24 * 30 },
  { label: "All", hours: null },
  { label: "Custom", hours: "custom" },
];

export function deriveStats(aggregated) {
  if (!aggregated) return null;
  const { totalBet, totalPayout, count, winCount } = aggregated;
  const profit = totalPayout - totalBet;
  const rtp = totalBet > 0 ? ((totalPayout / totalBet) * 100).toFixed(1) : "0.0";
  const winRate = count > 0 ? ((winCount / count) * 100).toFixed(1) : "0.0";

  return {
    totalBet: totalBet.toFixed(2),
    totalPayout: totalPayout.toFixed(2),
    profit: profit.toFixed(2),
    totalRounds: count,
    rtp,
    winRate,
    winCount,
    biggestWin: aggregated.biggestWin || 0,
    biggestLoss: aggregated.biggestLoss || 0,
  };
}
