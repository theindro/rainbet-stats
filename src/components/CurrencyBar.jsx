import { Card, Space, Typography, Tag, Select } from "antd";
import { useBetContext } from "../hooks/useBetContext";
import { DISPLAY_CURRENCIES } from "../utils/currency";
import { rainbetColors } from "../theme/rainbetTheme";

const { Text } = Typography;

export default function CurrencyBar({ currencyBreakdown }) {
  const { displayCurrency, setDisplayCurrency } = useBetContext();

  return (
    <Card
      size="small"
      bordered={false}
      style={{
        background: rainbetColors.bgElevated,
        border: `1px solid ${rainbetColors.border}`,
        borderRadius: 10,
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Space wrap align="center">
          <Text style={{ color: rainbetColors.textMuted, fontSize: 12 }}>Display currency</Text>
          <Select
            value={displayCurrency}
            onChange={setDisplayCurrency}
            style={{ width: 100 }}
            options={DISPLAY_CURRENCIES.map((c) => ({ value: c, label: c }))}
          />
        </Space>

        {currencyBreakdown?.length > 0 && (
          <Space wrap align="center">
            <Text style={{ color: rainbetColors.textMuted, fontSize: 12 }}>Bets by currency</Text>
            {currencyBreakdown.map((c) => (
              <Tag key={c.name} color="blue">
                {c.name}: {c.rounds.toLocaleString()} bets
              </Tag>
            ))}
          </Space>
        )}
      </div>
    </Card>
  );
}
