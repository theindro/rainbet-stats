import { Card, Typography } from "antd";
import {
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Bar,
} from "recharts";
import { rainbetColors } from "../theme/rainbetTheme";
import { useFormatMoney } from "../hooks/useFormatMoney";

const { Text } = Typography;

function CustomTooltip({ active, payload, label, formatMoney }) {
  if (!active || !payload?.length) return null;

  const profitEntry = payload.find((p) => p.dataKey === "profit");
  const betsEntry = payload.find((p) => p.dataKey === "bets");
  const profit = profitEntry?.value ?? 0;

  return (
    <div
      style={{
        background: rainbetColors.bgElevated,
        border: `1px solid ${rainbetColors.border}`,
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 12,
      }}
    >
      <div style={{ color: rainbetColors.textSecondary, marginBottom: 6 }}>{label}</div>
      <div style={{ color: profit >= 0 ? rainbetColors.green : rainbetColors.red, fontWeight: 700, fontSize: 14 }}>
        {formatMoney(profit, { signed: true })}
      </div>
      {betsEntry != null && (
        <div style={{ color: rainbetColors.textMuted, marginTop: 4 }}>
          {Number(betsEntry.value).toLocaleString()} bets in period
        </div>
      )}
    </div>
  );
}

export default function ProfitChart({ data, profit }) {
  const { formatMoney, displayCurrency } = useFormatMoney();
  const color = profit >= 0 ? rainbetColors.green : rainbetColors.red;

  const chartData = data.map((d) => ({
    name: d.name,
    profit: d.profit,
    bets: d.bets ?? 0,
  }));

  return (
    <Card
      title={<Text style={{ color: rainbetColors.textPrimary }}>Cumulative Profit / Loss</Text>}
      extra={
        <Text style={{ color: rainbetColors.textMuted, fontSize: 11 }}>
          {displayCurrency} · cumulative P&L · bets per period
        </Text>
      }
      bordered={false}
      style={{
        background: rainbetColors.bgCard,
        border: `1px solid ${rainbetColors.border}`,
        borderRadius: 12,
        height: "100%",
      }}
    >
      {chartData.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: rainbetColors.textMuted }}>No data</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke={rainbetColors.border} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: rainbetColors.textMuted }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="profit"
              tick={{ fontSize: 10, fill: rainbetColors.textMuted }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatMoney(v, { decimals: 0 })}
            />
            <YAxis
              yAxisId="bets"
              orientation="right"
              tick={{ fontSize: 10, fill: rainbetColors.cyan }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip formatMoney={formatMoney} />} />
            <Area
              yAxisId="profit"
              type="monotone"
              dataKey="profit"
              stroke={color}
              strokeWidth={2}
              fill="url(#profitGrad)"
              dot={false}
            />
            <Bar
              yAxisId="bets"
              dataKey="bets"
              fill={rainbetColors.cyan}
              opacity={0.35}
              radius={[2, 2, 0, 0]}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
