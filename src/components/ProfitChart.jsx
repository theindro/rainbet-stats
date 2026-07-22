import { Card, Typography } from "antd";
import {
  XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Area, AreaChart,
} from "recharts";
import { rainbetColors } from "../theme/rainbetTheme";

const { Text } = Typography;

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
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
      <div style={{ color: rainbetColors.textSecondary, marginBottom: 4 }}>{label}</div>
      <div style={{ color: v >= 0 ? rainbetColors.green : rainbetColors.red, fontWeight: 700, fontSize: 14 }}>
        {v >= 0 ? "+" : ""}${Math.abs(v).toFixed(2)}
      </div>
    </div>
  );
}

export default function ProfitChart({ data, profit }) {
  const color = profit >= 0 ? rainbetColors.green : rainbetColors.red;

  return (
    <Card
      title={<Text style={{ color: rainbetColors.textPrimary }}>Cumulative Profit / Loss</Text>}
      extra={<Text style={{ color: rainbetColors.textMuted, fontSize: 11 }}>USD · Time Series</Text>}
      bordered={false}
      style={{
        background: rainbetColors.bgCard,
        border: `1px solid ${rainbetColors.border}`,
        borderRadius: 12,
        height: "100%",
      }}
    >
      {data.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: rainbetColors.textMuted }}>No data</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
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
              tick={{ fontSize: 10, fill: rainbetColors.textMuted }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="profit" stroke={color} strokeWidth={2} fill="url(#profitGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
