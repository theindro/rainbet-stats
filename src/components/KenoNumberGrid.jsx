import { Typography, Tooltip } from "antd";
import { rainbetColors } from "../theme/rainbetTheme";

const { Text } = Typography;

function heatColor(hits, maxHits, neverHit) {
  if (neverHit || hits === 0) return rainbetColors.bgElevated;
  const t = maxHits > 0 ? hits / maxHits : 0;
  if (t > 0.85) return "rgba(239, 68, 68, 0.75)";
  if (t > 0.65) return "rgba(245, 158, 11, 0.65)";
  if (t > 0.45) return "rgba(32, 153, 255, 0.55)";
  return "rgba(34, 197, 94, 0.45)";
}

export default function KenoNumberGrid({ numbers, expectedHits }) {
  if (!numbers?.length) return null;

  const maxHits = Math.max(...numbers.map((n) => n.hits), 1);
  const cols = numbers.length <= 40 ? 8 : 10;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 8,
      }}
    >
      {[...numbers].sort((a, b) => a.number - b.number).map((n) => (
        <Tooltip
          key={n.number}
          title={
            <div>
              <div>#{n.number}</div>
              <div>{n.hits.toLocaleString()} hits in {n.hitRate.toFixed(1)}% of rounds</div>
              <div>Expected ~{expectedHits.toFixed(1)}</div>
              {n.neverHit && <div style={{ color: rainbetColors.red }}>Never hit</div>}
            </div>
          }
        >
          <div
            style={{
              background: heatColor(n.hits, maxHits, n.neverHit),
              border: `1px solid ${n.neverHit ? rainbetColors.red + "66" : rainbetColors.border}`,
              borderRadius: 8,
              padding: "10px 4px",
              textAlign: "center",
              cursor: "default",
            }}
          >
            <Text strong style={{ color: rainbetColors.textPrimary, fontSize: 14, display: "block" }}>
              {n.number}
            </Text>
            <Text style={{ color: rainbetColors.textSecondary, fontSize: 11 }}>{n.hits}</Text>
          </div>
        </Tooltip>
      ))}
    </div>
  );
}
