import { Table, Tag, Typography, Input } from "antd";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { rainbetColors } from "../theme/rainbetTheme";

const { Text } = Typography;

export default function GamesTable({ gameStats, loading }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return gameStats;
    const term = search.toLowerCase();
    return gameStats.filter((g) => g.name.toLowerCase().includes(term));
  }, [gameStats, search]);

  const columns = [
    {
      title: "Game",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name, record) => (
        <div>
          <Text
            style={{ color: rainbetColors.primary, cursor: "pointer", fontWeight: 500 }}
            onClick={() => navigate(`/game/${encodeURIComponent(name)}`)}
          >
            {name}
          </Text>
          {record.provider && (
            <div>
              <Tag style={{ marginTop: 4, fontSize: 10 }}>{record.provider}</Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Rounds",
      dataIndex: "rounds",
      key: "rounds",
      align: "right",
      sorter: (a, b) => a.rounds - b.rounds,
      defaultSortOrder: "descend",
      render: (v) => v.toLocaleString(),
    },
    {
      title: "Wagered",
      dataIndex: "bet",
      key: "bet",
      align: "right",
      sorter: (a, b) => a.bet - b.bet,
      render: (v) => `$${v.toFixed(2)}`,
    },
    {
      title: "Returned",
      dataIndex: "payout",
      key: "payout",
      align: "right",
      sorter: (a, b) => a.payout - b.payout,
      render: (v) => `$${v.toFixed(2)}`,
    },
    {
      title: "Profit",
      dataIndex: "profit",
      key: "profit",
      align: "right",
      sorter: (a, b) => a.profit - b.profit,
      render: (v) => (
        <Text style={{ color: v >= 0 ? rainbetColors.green : rainbetColors.red, fontWeight: 600 }}>
          {v >= 0 ? "+" : ""}${v.toFixed(2)}
        </Text>
      ),
    },
    {
      title: "RTP",
      dataIndex: "rtp",
      key: "rtp",
      align: "right",
      sorter: (a, b) => a.rtp - b.rtp,
      render: (v) => {
        const color = v >= 100 ? rainbetColors.green : v >= 95 ? rainbetColors.amber : rainbetColors.red;
        return <Text style={{ color }}>{v}%</Text>;
      },
    },
    {
      title: "Win Rate",
      key: "winRate",
      align: "right",
      sorter: (a, b) => (a.wins / a.rounds) - (b.wins / b.rounds),
      render: (_, r) => `${r.rounds > 0 ? ((r.wins / r.rounds) * 100).toFixed(1) : 0}%`,
    },
  ];

  return (
    <div>
      <Input.Search
        placeholder="Filter games..."
        allowClear
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 12, maxWidth: 320 }}
      />
      <Table
        columns={columns}
        dataSource={filtered.map((g, i) => ({ ...g, key: i }))}
        loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `${t} games` }}
        size="middle"
        onRow={(record) => ({
          onClick: () => navigate(`/game/${encodeURIComponent(record.name)}`),
          style: { cursor: "pointer" },
        })}
        scroll={{ x: 800 }}
      />
    </div>
  );
}
