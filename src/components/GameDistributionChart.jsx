import { Card, Typography } from "antd";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { rainbetColors } from "../theme/rainbetTheme";

const { Text } = Typography;

const COLORS = ["#2099ff", "#06b6d4", "#8b5cf6", "#f59e0b", "#22c55e", "#ef4444", "#ec4899", "#64748b"];

export default function GameDistributionChart({ gameStats, totalRounds }) {
  const data = [...(gameStats || [])]
    .sort((a, b) => b.rounds - a.rounds)
    .slice(0, 8)
    .map((g) => ({
      name: g.name,
      value: g.rounds,
      pct: totalRounds > 0 ? ((g.rounds / totalRounds) * 100).toFixed(1) : 0,
    }));

  return (
    <Card
      title={<Text style={{ color: rainbetColors.textPrimary }}>Game Distribution</Text>}
      extra={<Text style={{ color: rainbetColors.textMuted, fontSize: 11 }}>By Rounds</Text>}
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
        <>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: rainbetColors.bgElevated,
                  border: `1px solid ${rainbetColors.border}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ padding: "8px 8px 0" }}>
            {data.map((item, i) => (
              <div
                key={item.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                  fontSize: 12,
                  color: rainbetColors.textSecondary,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                <span style={{ color: rainbetColors.textMuted }}>{item.pct}%</span>
                <span style={{ minWidth: 40, textAlign: "right" }}>{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
