import { ConfigProvider, theme } from "antd";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useBetWorker } from "./hooks/useBetWorker";
import { BetProvider } from "./context/BetContext";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import GameView from "./pages/GameView";
import KenoAnalyzer from "./pages/KenoAnalyzer";
import { antTheme } from "./theme/rainbetTheme";

export default function App() {
  const worker = useBetWorker();

  return (
    <ConfigProvider
      theme={{
        ...antTheme,
        algorithm: theme.darkAlgorithm,
      }}
    >
      <BetProvider worker={worker}>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="game/:gameName" element={<GameView />} />
              <Route path="keno" element={<KenoAnalyzer />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </BetProvider>
    </ConfigProvider>
  );
}
