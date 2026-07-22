import { Upload, Progress, Typography, Card } from "antd";
import { InboxOutlined, CloudUploadOutlined } from "@ant-design/icons";
import { useBetContext } from "../hooks/useBetContext";
import { rainbetColors } from "../theme/rainbetTheme";

const { Dragger } = Upload;
const { Text, Title } = Typography;

export default function UploadSection() {
  const { status, progress, parseFile } = useBetContext();
  const pct = progress.total > 0 ? Math.min(100, (progress.loaded / progress.total) * 100) : 0;
  const isParsing = status === "parsing";
  const isAggregating = status === "aggregating";

  return (
    <Card
      bordered={false}
      style={{
        background: rainbetColors.bgCard,
        border: `1px solid ${rainbetColors.border}`,
        borderRadius: 12,
      }}
    >
      <Dragger
        beforeUpload={(file) => {
          parseFile(file);
          return false;
        }}
        accept=".csv,.xlsx,.xls"
        showUploadList={false}
        disabled={isParsing}
        style={{
          background: rainbetColors.bgElevated,
          border: `1.5px dashed ${rainbetColors.borderLight}`,
          borderRadius: 12,
        }}
      >
        <p className="ant-upload-drag-icon">
          {isParsing ? <CloudUploadOutlined style={{ color: rainbetColors.primary, fontSize: 48 }} /> : <InboxOutlined style={{ color: rainbetColors.primary, fontSize: 48 }} />}
        </p>
        <Title level={5} style={{ color: rainbetColors.textPrimary, margin: "8px 0 4px" }}>
          {isParsing ? "Processing your bet history..." : "Drop Rainbet CSV or Excel export here"}
        </Title>
        <Text style={{ color: rainbetColors.textMuted, fontSize: 13 }}>
          {isParsing
            ? `${progress.loaded.toLocaleString()} rows indexed`
            : "Supports .csv · .xlsx · multi-currency auto-converted to USD"}
        </Text>
      </Dragger>

      {(isParsing || isAggregating) && (
        <div style={{ marginTop: 16 }}>
          <Progress
            percent={isAggregating ? 100 : pct}
            status={isAggregating ? "active" : "normal"}
            strokeColor={{ from: rainbetColors.primary, to: rainbetColors.cyan }}
            trailColor={rainbetColors.bgElevated}
            showInfo
          />
          <Text style={{ color: rainbetColors.textMuted, fontSize: 12 }}>
            {isAggregating ? "Computing aggregates..." : `${pct.toFixed(0)}% written to IndexedDB`}
          </Text>
        </div>
      )}
    </Card>
  );
}
