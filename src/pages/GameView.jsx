import { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Card, Typography, Tag, Button, Breadcrumb, Empty, Spin } from "antd";
import { ArrowLeftOutlined, TrophyOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useBetContext } from "../hooks/useBetContext";
import PeriodFilter from "../components/PeriodFilter";
import CurrencyBar from "../components/CurrencyBar";
import StatsOverview from "../components/StatsOverview";
import { deriveStats } from "../utils/stats";
import ProfitChart from "../components/ProfitChart";
import { useFormatMoney } from "../hooks/useFormatMoney";
import {
  StatsSkeleton,
  MetricCardsSkeleton,
  ChartSkeleton,
  PnlBadgeSkeleton,
} from "../components/LoadingSkeletons";
import { rainbetColors } from "../theme/rainbetTheme";

const { Title, Text } = Typography;

export default function GameView() {
  const { gameName } = useParams();
  const decodedName = decodeURIComponent(gameName || "");
  const navigate = useNavigate();

  const {
    aggregated,
    hasData,
    isLoading,
    isAggregating,
    totalRows,
    allGames,
    getTimeRange,
    requestAggregate,
    activePeriod,
    appliedFrom,
    appliedTo,
    exchangeRates,
  } = useBetContext();
  const { formatMoney } = useFormatMoney();

  const gameExists = allGames.includes(decodedName);
  const showSkeletons = isAggregating || !aggregated;

  useEffect(() => {
    if (!totalRows || !decodedName) return;
    const { fromMs, toMs } = getTimeRange();
    requestAggregate(fromMs, toMs, [], decodedName);
  }, [decodedName, totalRows, activePeriod, appliedFrom, appliedTo, getTimeRange, requestAggregate]);

  const stats = useMemo(() => deriveStats(aggregated), [aggregated]);
  const profit = stats ? parseFloat(stats.profit) : 0;
  const gameStat = aggregated?.gameStats?.[0];

  const rangeLabel = useMemo(() => {
    if (!aggregated || aggregated.minMs === Infinity) return null;
    return `${dayjs(aggregated.minMs).format("MMM D, HH:mm")} → ${dayjs(aggregated.maxMs).format("MMM D, HH:mm")}`;
  }, [aggregated]);

  if (isLoading && !hasData) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin size="large" tip="Loading saved stats..." />
      </div>
    );
  }

  if (!hasData) {
    return (
      <Empty description="Upload bet history on the dashboard first" style={{ marginTop: 80 }}>
        <Button type="primary" onClick={() => navigate("/")}>
          Go to Dashboard
        </Button>
      </Empty>
    );
  }

  if (!gameExists && !isLoading && allGames.length > 0) {
    return (
      <Empty description={`Game "${decodedName}" not found in your data`} style={{ marginTop: 80 }}>
        <Button type="primary" onClick={() => navigate("/")}>
          Back to Dashboard
        </Button>
      </Empty>
    );
  }

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <a onClick={() => navigate("/")}>Dashboard</a> },
          { title: decodedName },
        ]}
      />

      <div
        style={{
          marginBottom: 24,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/")}
            style={{ color: rainbetColors.textSecondary, padding: 0, marginBottom: 8 }}
          >
            Back
          </Button>
          <Title level={3} style={{ color: rainbetColors.textPrimary, margin: 0 }}>
            {decodedName}
          </Title>
          {!showSkeletons && (
            <SpaceTags
              provider={aggregated?.gameProvider || gameStat?.provider}
              betCount={gameStat?.rounds}
            />
          )}
        </div>
        {showSkeletons ? (
          <PnlBadgeSkeleton />
        ) : (
          gameStat && (
            <Card
              size="small"
              bordered={false}
              style={{
                background: profit >= 0 ? `${rainbetColors.green}15` : `${rainbetColors.red}15`,
                border: `1px solid ${profit >= 0 ? rainbetColors.green : rainbetColors.red}44`,
                borderRadius: 10,
                minWidth: 180,
              }}
            >
              <Text style={{ color: rainbetColors.textMuted, fontSize: 11 }}>SESSION P&L</Text>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: profit >= 0 ? rainbetColors.green : rainbetColors.red,
                }}
              >
                {formatMoney(profit, { signed: true })}
              </div>
              <Text style={{ color: rainbetColors.textMuted, fontSize: 11, display: "block", marginTop: 4 }}>
                {gameStat.rounds.toLocaleString()} bets
              </Text>
            </Card>
          )
        )}
      </div>

      <PeriodFilter rangeLabel={showSkeletons ? null : rangeLabel} />

      {!showSkeletons && exchangeRates && (
        <CurrencyBar currencyBreakdown={aggregated?.currencyBreakdown} />
      )}

      {showSkeletons ? (
        <>
          <div style={{ marginBottom: 24 }}>
            <StatsSkeleton count={7} />
          </div>
          <MetricCardsSkeleton />
          <ChartSkeleton />
        </>
      ) : (
        <>
          {stats && (
            <div style={{ marginBottom: 24 }}>
              <StatsOverview
                stats={stats}
                extra={{
                  winRate: stats.winRate,
                  winCount: stats.winCount,
                  biggestWin: stats.biggestWin,
                  biggestLoss: stats.biggestLoss,
                }}
              />
            </div>
          )}

          {gameStat && (
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={6}>
                <MetricCard label="Total Bets" value={gameStat.rounds.toLocaleString()} />
              </Col>
              <Col xs={24} sm={6}>
                <MetricCard label="Avg Bet Size" value={formatMoney(gameStat.bet / gameStat.rounds)} />
              </Col>
              <Col xs={24} sm={6}>
                <MetricCard label="Avg Return" value={formatMoney(gameStat.payout / gameStat.rounds)} />
              </Col>
              <Col xs={24} sm={6}>
                <MetricCard
                  label="Expected vs Actual"
                  value={
                    gameStat.rtp >= 96 ? "Running hot" : gameStat.rtp >= 90 ? "Near average" : "Running cold"
                  }
                  icon={<TrophyOutlined />}
                  color={
                    gameStat.rtp >= 96
                      ? rainbetColors.green
                      : gameStat.rtp >= 90
                        ? rainbetColors.amber
                        : rainbetColors.red
                  }
                />
              </Col>
            </Row>
          )}

          <ProfitChart data={aggregated?.profitOverTime ?? []} profit={profit} />
        </>
      )}
    </>
  );
}

function SpaceTags({ provider, betCount }) {
  return (
    <div style={{ marginTop: 4 }}>
      {provider && <Tag color="blue">{provider}</Tag>}
      {betCount != null && <Tag color="purple">{betCount.toLocaleString()} bets</Tag>}
    </div>
  );
}

function MetricCard({ label, value, icon, color }) {
  return (
    <Card
      bordered={false}
      style={{
        background: rainbetColors.bgCard,
        border: `1px solid ${rainbetColors.border}`,
        borderRadius: 12,
        textAlign: "center",
      }}
    >
      <Text style={{ color: rainbetColors.textMuted, fontSize: 11, textTransform: "uppercase" }}>{label}</Text>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || rainbetColors.textPrimary, marginTop: 4 }}>
        {icon} {value}
      </div>
    </Card>
  );
}
