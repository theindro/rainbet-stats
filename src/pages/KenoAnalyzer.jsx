import {
  Typography,
  Card,
  Button,
  Select,
  Progress,
  Row,
  Col,
  Table,
  Tag,
  Space,
  Empty,
  Alert,
} from "antd";
import { DotChartOutlined, PlayCircleOutlined, StopOutlined } from "@ant-design/icons";
import { useBetContext } from "../hooks/useBetContext";
import { useKenoAnalyzer } from "../hooks/useKenoAnalyzer";
import KenoNumberGrid from "../components/KenoNumberGrid";
import { rainbetColors } from "../theme/rainbetTheme";

const { Title, Text } = Typography;

const ROUND_OPTIONS = [
  { value: 100, label: "Last 100 rounds" },
  { value: 500, label: "Last 500 rounds" },
  { value: 1000, label: "Last 1,000 rounds" },
  { value: 2000, label: "Last 2,000 rounds" },
  { value: 0, label: "All Keno rounds" },
];

export default function KenoAnalyzer() {
  const { hasData, getKenoBetIds } = useBetContext();
  const {
    status,
    progress,
    analysis,
    selectedAnalysis,
    roundLimit,
    setRoundLimit,
    totalKenoBets,
    analyze,
    cancel,
    isLoading,
  } = useKenoAnalyzer(getKenoBetIds);

  const numberColumns = [
    {
      title: "#",
      dataIndex: "number",
      key: "number",
      width: 60,
      sorter: (a, b) => a.number - b.number,
    },
    {
      title: "Hits",
      dataIndex: "hits",
      key: "hits",
      align: "right",
      sorter: (a, b) => a.hits - b.hits,
      defaultSortOrder: "descend",
      render: (v, r) => (
        <Text style={{ color: r.neverHit ? rainbetColors.red : rainbetColors.textPrimary, fontWeight: 600 }}>
          {v.toLocaleString()}
        </Text>
      ),
    },
    {
      title: "Hit %",
      dataIndex: "hitRate",
      key: "hitRate",
      align: "right",
      sorter: (a, b) => a.hitRate - b.hitRate,
      render: (v) => `${v.toFixed(1)}%`,
    },
    {
      title: "Expected",
      dataIndex: "expected",
      key: "expected",
      align: "right",
      render: (v) => v.toFixed(1),
    },
    {
      title: "vs Expected",
      dataIndex: "delta",
      key: "delta",
      align: "right",
      sorter: (a, b) => a.delta - b.delta,
      render: (v) => (
        <Text style={{ color: v > 0 ? rainbetColors.green : v < 0 ? rainbetColors.red : rainbetColors.textMuted }}>
          {v > 0 ? "+" : ""}
          {v.toFixed(1)}
        </Text>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_, r) =>
        r.neverHit ? (
          <Tag color="red">Never hit</Tag>
        ) : r.delta > 2 ? (
          <Tag color="green">Hot</Tag>
        ) : r.delta < -2 ? (
          <Tag color="orange">Cold</Tag>
        ) : (
          <Tag>Average</Tag>
        ),
    },
  ];

  const pct = progress.total > 0 ? (progress.done / progress.total) * 100 : 0;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ color: rainbetColors.textPrimary, margin: 0 }}>
          <DotChartOutlined style={{ marginRight: 8 }} />
          Keno Analyzer
        </Title>
        <Text style={{ color: rainbetColors.textSecondary }}>
          Fetches drawn numbers from Rainbet using bet IDs in your CSV (cached locally after first fetch)
        </Text>
      </div>

      {!hasData && (
        <Empty description="Upload your bet history on the Dashboard first" style={{ marginTop: 48 }} />
      )}

      {hasData && (
        <>
          <Card
            bordered={false}
            style={{
              background: rainbetColors.bgCard,
              border: `1px solid ${rainbetColors.border}`,
              borderRadius: 12,
              marginBottom: 20,
            }}
          >
            <Space wrap align="center" style={{ width: "100%", justifyContent: "space-between" }}>
              <Space wrap>
                <Text style={{ color: rainbetColors.textMuted }}>Analyze</Text>
                <Select
                  value={roundLimit}
                  onChange={setRoundLimit}
                  style={{ width: 180 }}
                  options={ROUND_OPTIONS}
                  disabled={isLoading}
                />
                {totalKenoBets > 0 && (
                  <Tag color="blue">{totalKenoBets.toLocaleString()} Keno bets in CSV</Tag>
                )}
              </Space>
              <Space>
                {isLoading && (
                  <Button icon={<StopOutlined />} onClick={cancel}>
                    Cancel
                  </Button>
                )}
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={analyze}
                  loading={isLoading}
                >
                  {isLoading ? "Fetching..." : "Run Analysis"}
                </Button>
              </Space>
            </Space>

            {isLoading && (
              <div style={{ marginTop: 16 }}>
                <Progress percent={Math.round(pct)} status="active" />
                <Text style={{ color: rainbetColors.textMuted, fontSize: 12 }}>
                  {progress.done.toLocaleString()} / {progress.total.toLocaleString()} fetched
                  {progress.failed > 0 && ` · ${progress.failed} failed`}
                  {progress.fetched > 0 && ` · ${progress.fetched} cached/new`}
                </Text>
              </div>
            )}
          </Card>

          {status === "no-ids" && (
            <Alert
              type="warning"
              showIcon
              message="No Keno bet IDs found"
              description="Re-upload your CSV export so bet IDs (ID column) are indexed. Existing data from before this update needs a fresh upload."
              style={{ marginBottom: 20 }}
            />
          )}

          {analysis && (
            <>
              <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                <Col xs={24} sm={8}>
                  <Card bordered={false} className="keno-stat-card">
                    <Text className="keno-stat-label">Rounds analyzed</Text>
                    <div className="keno-stat-value">{analysis.totalRounds.toLocaleString()}</div>
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card bordered={false} className="keno-stat-card">
                    <Text className="keno-stat-label">Expected hits per number</Text>
                    <div className="keno-stat-value">{analysis.expectedHitsPerNumber.toFixed(1)}</div>
                    <Text style={{ color: rainbetColors.textMuted, fontSize: 11 }}>
                      {analysis.drawsPerRound} drawn / {analysis.boardSize} board
                    </Text>
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card bordered={false} className="keno-stat-card">
                    <Text className="keno-stat-label">Never hit</Text>
                    <div className="keno-stat-value" style={{ color: rainbetColors.red }}>
                      {analysis.neverHit.length}
                    </div>
                    <Text style={{ color: rainbetColors.textMuted, fontSize: 11 }}>numbers with 0 hits</Text>
                  </Card>
                </Col>
              </Row>

              <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                <Col xs={24} md={12}>
                  <Card
                    title="Hottest numbers"
                    bordered={false}
                    style={{ background: rainbetColors.bgCard, border: `1px solid ${rainbetColors.border}`, borderRadius: 12 }}
                  >
                    {analysis.hot.map((n) => (
                      <div key={n.number} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <Text strong>#{n.number}</Text>
                        <Text style={{ color: rainbetColors.green }}>
                          {n.hits} hits (+{n.delta.toFixed(1)} vs expected)
                        </Text>
                      </div>
                    ))}
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card
                    title="Coldest numbers (with hits)"
                    bordered={false}
                    style={{ background: rainbetColors.bgCard, border: `1px solid ${rainbetColors.border}`, borderRadius: 12 }}
                  >
                    {analysis.cold.map((n) => (
                      <div key={n.number} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <Text strong>#{n.number}</Text>
                        <Text style={{ color: rainbetColors.amber }}>
                          {n.hits} hits ({n.delta.toFixed(1)} vs expected)
                        </Text>
                      </div>
                    ))}
                  </Card>
                </Col>
              </Row>

              <Card
                title="Number heatmap (drawn results)"
                bordered={false}
                style={{
                  background: rainbetColors.bgCard,
                  border: `1px solid ${rainbetColors.border}`,
                  borderRadius: 12,
                  marginBottom: 20,
                }}
              >
                <KenoNumberGrid numbers={analysis.numbers} expectedHits={analysis.expectedHitsPerNumber} />
              </Card>

              <Card
                title="All numbers breakdown"
                bordered={false}
                style={{
                  background: rainbetColors.bgCard,
                  border: `1px solid ${rainbetColors.border}`,
                  borderRadius: 12,
                  marginBottom: 20,
                }}
              >
                <Table
                  columns={numberColumns}
                  dataSource={analysis.numbers.map((n) => ({ ...n, key: n.number }))}
                  pagination={{ pageSize: 40, hideOnSinglePage: true }}
                  size="small"
                />
              </Card>

              {selectedAnalysis.length > 0 && (
                <Card
                  title="Your frequently picked numbers"
                  extra={<Text type="secondary">When you selected this number, how often it was drawn</Text>}
                  bordered={false}
                  style={{
                    background: rainbetColors.bgCard,
                    border: `1px solid ${rainbetColors.border}`,
                    borderRadius: 12,
                  }}
                >
                  <Table
                    size="small"
                    pagination={false}
                    dataSource={selectedAnalysis.slice(0, 15).map((n) => ({ ...n, key: n.number }))}
                    columns={[
                      { title: "#", dataIndex: "number", key: "number" },
                      { title: "Times picked", dataIndex: "picked", key: "picked", align: "right" },
                      { title: "Times drawn", dataIndex: "matched", key: "matched", align: "right" },
                      {
                        title: "Match %",
                        dataIndex: "matchRate",
                        key: "matchRate",
                        align: "right",
                        render: (v) => `${v.toFixed(1)}%`,
                      },
                    ]}
                  />
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
