import { Row, Col, Card, Skeleton } from "antd";
import { rainbetColors } from "../theme/rainbetTheme";

function StatCardSkeleton() {
  return (
    <Card
      bordered={false}
      style={{
        background: rainbetColors.bgCard,
        border: `1px solid ${rainbetColors.border}`,
        borderRadius: 12,
        height: "100%",
      }}
    >
      <Skeleton active paragraph={{ rows: 2 }} title={{ width: "60%" }} />
    </Card>
  );
}

export function StatsSkeleton({ count = 4 }) {
  return (
    <Row gutter={[16, 16]}>
      {Array.from({ length: count }, (_, i) => (
        <Col xs={24} sm={12} lg={6} key={i}>
          <StatCardSkeleton />
        </Col>
      ))}
    </Row>
  );
}

export function MetricCardsSkeleton({ count = 3 }) {
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      {Array.from({ length: count }, (_, i) => (
        <Col xs={24} sm={8} key={i}>
          <Card
            bordered={false}
            style={{
              background: rainbetColors.bgCard,
              border: `1px solid ${rainbetColors.border}`,
              borderRadius: 12,
            }}
          >
            <Skeleton active paragraph={{ rows: 1 }} title={{ width: "50%" }} />
          </Card>
        </Col>
      ))}
    </Row>
  );
}

export function ChartSkeleton({ height = 300 }) {
  return (
    <Card
      bordered={false}
      style={{
        background: rainbetColors.bgCard,
        border: `1px solid ${rainbetColors.border}`,
        borderRadius: 12,
        height: "100%",
      }}
    >
      <Skeleton active title={{ width: 180 }} paragraph={false} style={{ marginBottom: 16 }} />
      <Skeleton.Button active block style={{ height, width: "100%" }} />
    </Card>
  );
}

export function HighlightCardsSkeleton() {
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      {[0, 1].map((i) => (
        <Col xs={24} md={12} key={i}>
          <Card
            bordered={false}
            style={{
              background: rainbetColors.bgCard,
              border: `1px solid ${rainbetColors.border}`,
              borderRadius: 12,
            }}
          >
            <Skeleton active paragraph={{ rows: 2 }} title={{ width: "40%" }} />
          </Card>
        </Col>
      ))}
    </Row>
  );
}

export function PnlBadgeSkeleton() {
  return (
    <Card
      size="small"
      bordered={false}
      style={{
        background: rainbetColors.bgCard,
        border: `1px solid ${rainbetColors.border}`,
        borderRadius: 10,
        minWidth: 180,
      }}
    >
      <Skeleton active paragraph={false} title={{ width: "80%" }} />
      <Skeleton.Button active size="large" style={{ width: 120, marginTop: 8 }} />
    </Card>
  );
}

export function TableSkeleton() {
  return (
    <Card
      bordered={false}
      style={{
        background: rainbetColors.bgCard,
        border: `1px solid ${rainbetColors.border}`,
        borderRadius: 12,
      }}
    >
      <Skeleton active paragraph={{ rows: 8 }} title={{ width: "30%" }} />
    </Card>
  );
}
