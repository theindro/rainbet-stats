import { Layout, AutoComplete, Input, Typography, Space, Button } from "antd";
import {
  DashboardOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useBetContext } from "../hooks/useBetContext";
import { rainbetColors } from "../theme/rainbetTheme";
import { useState, useMemo } from "react";

const { Header, Content } = Layout;
const { Text } = Typography;

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { totalRows, allGames, hasData } = useBetContext();
  const [search, setSearch] = useState("");

  const searchOptions = useMemo(() => {
    if (!search.trim()) return [];
    const term = search.toLowerCase();
    return allGames
      .filter((g) => g.toLowerCase().includes(term))
      .slice(0, 8)
      .map((g) => ({ value: g, label: g }));
  }, [allGames, search]);

  const isDashboard = !location.pathname.startsWith("/game");

  const goToGame = (name) => {
    navigate(`/game/${encodeURIComponent(name)}`);
    setSearch("");
  };

  return (
    <Layout style={{ minHeight: "100vh", background: rainbetColors.bgBase }}>
      <Header className="app-header">
        <div className="app-header-left">
          <div className="app-header-brand" onClick={() => navigate("/")}>
            <div className="app-header-logo">
              <ThunderboltOutlined style={{ color: "#fff" }} />
            </div>
            <Text strong className="app-header-title">
              Rainbet Stats
            </Text>
          </div>

          <Button
            type={isDashboard ? "primary" : "text"}
            icon={<DashboardOutlined />}
            onClick={() => navigate("/")}
            className="app-header-nav"
            ghost={!isDashboard}
          >
            Dashboard
          </Button>
        </div>

        <Space size={12} align="center" className="app-header-right">
          {hasData && (
            <AutoComplete
              className="app-header-search"
              popupMatchSelectWidth={280}
              value={search}
              options={searchOptions}
              onChange={setSearch}
              onSelect={goToGame}
              onKeyDown={(e) => {
                if (e.key === "Enter" && search.trim()) {
                  const match =
                    allGames.find((g) => g.toLowerCase() === search.toLowerCase()) ||
                    allGames.find((g) => g.toLowerCase().includes(search.toLowerCase()));
                  if (match) goToGame(match);
                }
              }}
            >
              <Input
                prefix={<SearchOutlined style={{ color: rainbetColors.textMuted }} />}
                placeholder="Search game..."
                allowClear
              />
            </AutoComplete>
          )}
          {totalRows > 0 && (
            <div className="app-header-badge">
              <DatabaseOutlined />
              <span>{totalRows.toLocaleString()} bets</span>
            </div>
          )}
        </Space>
      </Header>

      <Content style={{ padding: "24px 32px", maxWidth: 1440, margin: "0 auto", width: "100%" }}>
        <Outlet />
      </Content>

      <div style={{ textAlign: "center", padding: "16px 0 24px", color: rainbetColors.textMuted, fontSize: 12 }}>
        Created by Indro · All amounts shown in USD
      </div>
    </Layout>
  );
}
