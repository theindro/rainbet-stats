import { useEffect, useMemo } from "react";
import { Row, Col, Card, Typography, Empty, Spin, Skeleton } from "antd";
import dayjs from "dayjs";
import { useBetContext } from "../hooks/useBetContext";
import UploadSection from "../components/UploadSection";
import PeriodFilter from "../components/PeriodFilter";
import CurrencyBar from "../components/CurrencyBar";
import StatsOverview from "../components/StatsOverview";
import { deriveStats } from "../utils/stats";
import ProfitChart from "../components/ProfitChart";
import GameDistributionChart from "../components/GameDistributionChart";
import GamesTable from "../components/GamesTable";
import { useFormatMoney } from "../hooks/useFormatMoney";
import {
  StatsSkeleton,
  ChartSkeleton,
  HighlightCardsSkeleton,
  TableSkeleton,
} from "../components/LoadingSkeletons";
import { rainbetColors } from "../theme/rainbetTheme";

const { Title, Text } = Typography;

export default function Dashboard() {
  const {
    aggregated,
    hasData,
    isLoading,
    isAggregating,
    totalRows,
    getTimeRange,
    requestAggregate,
    exchangeRates,
    activePeriod,
    appliedFrom,
    appliedTo,
  } = useBetContext();
  const { formatMoney } = useFormatMoney();

  const showSkeletons = isAggregating || (hasData && !aggregated);

  useEffect(() => {
    if (!totalRows) return;
    const { fromMs, toMs } = getTimeRange();
    requestAggregate(fromMs, toMs, [], null);
  }, [totalRows, activePeriod, appliedFrom, appliedTo, getTimeRange, requestAggregate]);

  const stats = useMemo(() => deriveStats(aggregated), [aggregated]);
  const profit = stats ? parseFloat(stats.profit) : 0;

  const rangeLabel = useMemo(() => {
    if (!aggregated || aggregated.minMs === Infinity) return null;
    return `${dayjs(aggregated.minMs).format("MMM D, HH:mm")} → ${dayjs(aggregated.maxMs).format("MMM D, HH:mm")}`;
  }, [aggregated]);

  const bestGame = aggregated?.gameStats?.[0];
  const worstGame = aggregated?.gameStats?.[aggregated.gameStats.length - 1];

  if (isLoading && !hasData) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin size="large" tip="Loading saved stats..." />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ color: rainbetColors.textPrimary, margin: 0 }}>
          Dashboard
        </Title>
        <Text style={{ color: rainbetColors.textSecondary }}>
          Upload your Rainbet bet history and track your session performance
        </Text>
      </div>

      <UploadSection />

      {!hasData && (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Text style={{ color: rainbetColors.textMuted }}>
              Upload a CSV export from Rainbet to get started
            </Text>
          }
          style={{ marginTop: 48 }}
        />
      )}

      {hasData && (
        <>
          <div style={{ marginTop: 24 }}>
            <PeriodFilter rangeLabel={showSkeletons ? null : rangeLabel} />
          </div>

          {showSkeletons ? (
            <>
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
                <Skeleton active paragraph={false} title={{ width: 280 }} />
              </Card>
              <div style={{ marginBottom: 24 }}>
                <StatsSkeleton count={7} />
              </div>
              <HighlightCardsSkeleton />
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={14}>
                  <ChartSkeleton />
                </Col>
                <Col xs={24} lg={10}>
                  <ChartSkeleton height={200} />
                </Col>
              </Row>
              <TableSkeleton />
            </>
          ) : (
            <>
              {exchangeRates && (
                <CurrencyBar currencyBreakdown={aggregated?.currencyBreakdown} />
              )}

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

              {(bestGame || worstGame) && (
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  {bestGame && (
                    <Col xs={24} md={12}>
                      <Card
                        bordered={false}
                        style={{
                          background: rainbetColors.bgCard,
                          border: `1px solid ${rainbetColors.green}44`,
                          borderRadius: 12,
                          borderLeft: `3px solid ${rainbetColors.green}`,
                        }}
                      >
                        <Text
                          style={{
                            color: rainbetColors.textMuted,
                            fontSize: 11,
                            textTransform: "uppercase",
                          }}
                        >
                          Best Performer
                        </Text>
                        <Title level={5} style={{ color: rainbetColors.textPrimary, margin: "4px 0" }}>
                          {bestGame.name}
                        </Title>
                        <Text style={{ color: rainbetColors.green, fontWeight: 600 }}>
                          {formatMoney(bestGame.profit, { signed: true })} · {bestGame.rtp}% RTP
                        </Text>
                      </Card>
                    </Col>
                  )}
                  {worstGame && worstGame !== bestGame && (
                    <Col xs={24} md={12}>
                      <Card
                        bordered={false}
                        style={{
                          background: rainbetColors.bgCard,
                          border: `1px solid ${rainbetColors.red}44`,
                          borderRadius: 12,
                          borderLeft: `3px solid ${rainbetColors.red}`,
                        }}
                      >
                        <Text
                          style={{
                            color: rainbetColors.textMuted,
                            fontSize: 11,
                            textTransform: "uppercase",
                          }}
                        >
                          Biggest Loser
                        </Text>
                        <Title level={5} style={{ color: rainbetColors.textPrimary, margin: "4px 0" }}>
                          {worstGame.name}
                        </Title>
                        <Text style={{ color: rainbetColors.red, fontWeight: 600 }}>
                          {formatMoney(worstGame.profit, { signed: true })} · {worstGame.rtp}% RTP
                        </Text>
                      </Card>
                    </Col>
                  )}
                </Row>
              )}

              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={14}>
                  <ProfitChart data={aggregated?.profitOverTime ?? []} profit={profit} />
                </Col>
                <Col xs={24} lg={10}>
                  <GameDistributionChart gameStats={aggregated?.gameStats} totalRounds={aggregated?.count} />
                </Col>
              </Row>

              {aggregated?.gameStats?.length > 0 && (
                <Card
                  title={<Text style={{ color: rainbetColors.textPrimary }}>All Games</Text>}
                  extra={
                    <Text style={{ color: rainbetColors.textMuted, fontSize: 12 }}>
                      Click a row to view details
                    </Text>
                  }
                  bordered={false}
                  style={{
                    background: rainbetColors.bgCard,
                    border: `1px solid ${rainbetColors.border}`,
                    borderRadius: 12,
                  }}
                >
                  <GamesTable gameStats={aggregated.gameStats} loading={false} />
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
