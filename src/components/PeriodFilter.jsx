import { Segmented, DatePicker, Button, Space, Typography, Card } from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { PERIOD_OPTIONS } from "../utils/stats";
import { useBetContext } from "../hooks/useBetContext";
import { rainbetColors } from "../theme/rainbetTheme";
import { message } from "antd";

const { Text } = Typography;
const { RangePicker } = DatePicker;

export default function PeriodFilter({ rangeLabel }) {
  const {
    activePeriod,
    showCustom,
    customFrom,
    customTo,
    setCustomFrom,
    setCustomTo,
    handlePeriodChange,
    applyCustomRange,
    isLoading,
  } = useBetContext();

  const periodLabels = PERIOD_OPTIONS.filter((p) => p.hours !== "custom").map((p) => p.label);

  return (
    <Card
      bordered={false}
      size="small"
      style={{
        background: rainbetColors.bgCard,
        border: `1px solid ${rainbetColors.border}`,
        borderRadius: 12,
        marginBottom: 20,
      }}
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Space wrap align="center" style={{ width: "100%", justifyContent: "space-between" }}>
          <Space align="center">
            <CalendarOutlined style={{ color: rainbetColors.textMuted }} />
            <Text style={{ color: rainbetColors.textSecondary, fontSize: 13 }}>Time Period</Text>
            <Segmented
              options={[...periodLabels, "Custom"]}
              value={activePeriod}
              onChange={(val) => {
                const opt = PERIOD_OPTIONS.find((p) => p.label === val) || { label: "Custom", hours: "custom" };
                handlePeriodChange(opt);
              }}
              disabled={isLoading}
            />
          </Space>
          {rangeLabel && (
            <Text style={{ color: rainbetColors.textMuted, fontSize: 12 }}>{rangeLabel}</Text>
          )}
        </Space>

        {(showCustom || activePeriod === "Custom") && (
          <Space wrap>
            <RangePicker
              value={customFrom && customTo ? [dayjs(customFrom), dayjs(customTo)] : null}
              onChange={(dates) => {
                if (dates) {
                  setCustomFrom(dates[0].format("YYYY-MM-DD"));
                  setCustomTo(dates[1].format("YYYY-MM-DD"));
                } else {
                  setCustomFrom("");
                  setCustomTo("");
                }
              }}
              disabled={isLoading}
            />
            <Button
              type="primary"
              onClick={() => {
                if (!applyCustomRange()) message.warning("Select both dates");
              }}
              disabled={isLoading}
            >
              Apply Range
            </Button>
          </Space>
        )}
      </Space>
    </Card>
  );
}
