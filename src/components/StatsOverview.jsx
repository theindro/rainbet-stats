import { Row, Col, Card, Statistic, Typography } from "antd";
import {
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  FireOutlined,
} from "@ant-design/icons";
import { rainbetColors } from "../theme/rainbetTheme";
import { useFormatMoney } from "../hooks/useFormatMoney";

const { Text } = Typography;

function StatCard({ title, value, formatter, suffix, icon, color, sub }) {
  return (
    <Card
      bordered={false}
      style={{
        background: rainbetColors.bgCard,
        border: `1px solid ${rainbetColors.border}`,
        borderRadius: 12,
        height: "100%",
        borderTop: `2px solid ${color}`,
      }}
    >
      <Statistic
        title={
          <Text style={{ color: rainbetColors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {title}
          </Text>
        }
        value={value}
        formatter={formatter}
        suffix={suffix}
        valueStyle={{ color, fontWeight: 700, fontSize: 26 }}
      />
      <div style={{ marginTop: 8, color: rainbetColors.textMuted, fontSize: 12 }}>
        {icon} {sub}
      </div>
    </Card>
  );
}

export default function StatsOverview({ stats, extra }) {
  const { formatMoney, displayCurrency } = useFormatMoney();

  if (!stats) return null;

  const profit = parseFloat(stats.profit);
  const isProfit = profit >= 0;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <StatCard
          title="Total Wagered"
          value={parseFloat(stats.totalBet)}
          formatter={(v) => formatMoney(v)}
          color={rainbetColors.primary}
          icon={<DollarOutlined />}
          sub={`Cumulative stake (${displayCurrency})`}
        />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <StatCard
          title="Total Returned"
          value={parseFloat(stats.totalPayout)}
          formatter={(v) => formatMoney(v)}
          color={rainbetColors.amber}
          icon={<RiseOutlined />}
          sub={`Cumulative payout (${displayCurrency})`}
        />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <StatCard
          title="Net P&L"
          value={profit}
          formatter={(v) => formatMoney(v, { signed: true })}
          color={isProfit ? rainbetColors.green : rainbetColors.red}
          icon={isProfit ? <RiseOutlined /> : <FallOutlined />}
          sub={isProfit ? "Profitable session" : "Net loss"}
        />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <StatCard
          title="Overall RTP"
          value={stats.rtp}
          suffix="%"
          color={rainbetColors.cyan}
          icon={<ThunderboltOutlined />}
          sub={`${stats.totalRounds.toLocaleString()} rounds`}
        />
      </Col>
      {extra?.winRate != null && (
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Win Rate"
            value={extra.winRate}
            suffix="%"
            color={rainbetColors.green}
            icon={<TrophyOutlined />}
            sub={`${extra.winCount?.toLocaleString()} winning rounds`}
          />
        </Col>
      )}
      {extra?.biggestWin != null && (
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Biggest Win"
            value={extra.biggestWin}
            formatter={(v) => formatMoney(v, { signed: true })}
            color={rainbetColors.green}
            icon={<FireOutlined />}
            sub="Single round profit"
          />
        </Col>
      )}
      {extra?.biggestLoss != null && (
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Biggest Loss"
            value={extra.biggestLoss}
            formatter={(v) => formatMoney(v, { signed: true })}
            color={rainbetColors.red}
            icon={<FallOutlined />}
            sub="Single round loss"
          />
        </Col>
      )}
    </Row>
  );
}
