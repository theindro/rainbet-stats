export const rainbetColors = {
  bgBase: "#0a0e17",
  bgElevated: "#111827",
  bgCard: "#151d2e",
  bgHover: "#1a2540",
  border: "#1e2d45",
  borderLight: "#2a3f5f",
  primary: "#2099ff",
  primaryHover: "#4db3ff",
  cyan: "#06b6d4",
  green: "#22c55e",
  red: "#ef4444",
  amber: "#f59e0b",
  textPrimary: "#f0f6ff",
  textSecondary: "#8ba4c0",
  textMuted: "#4a6280",
};

export const antTheme = {
  algorithm: undefined,
  token: {
    colorPrimary: rainbetColors.primary,
    colorBgBase: rainbetColors.bgBase,
    colorBgContainer: rainbetColors.bgCard,
    colorBgElevated: rainbetColors.bgElevated,
    colorBorder: rainbetColors.border,
    colorBorderSecondary: rainbetColors.border,
    colorText: rainbetColors.textPrimary,
    colorTextSecondary: rainbetColors.textSecondary,
    colorTextTertiary: rainbetColors.textMuted,
    borderRadius: 10,
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    fontSize: 14,
    controlHeight: 38,
  },
  components: {
    Layout: {
      headerBg: rainbetColors.bgElevated,
      bodyBg: rainbetColors.bgBase,
      siderBg: rainbetColors.bgElevated,
      triggerBg: rainbetColors.bgCard,
    },
    Menu: {
      darkItemBg: "transparent",
      darkSubMenuItemBg: "transparent",
      darkItemSelectedBg: "rgba(32, 153, 255, 0.15)",
      darkItemHoverBg: "rgba(32, 153, 255, 0.08)",
    },
    Card: {
      colorBgContainer: rainbetColors.bgCard,
      colorBorderSecondary: rainbetColors.border,
    },
    Table: {
      headerBg: rainbetColors.bgElevated,
      rowHoverBg: rainbetColors.bgHover,
      borderColor: rainbetColors.border,
      colorBgContainer: rainbetColors.bgCard,
    },
    Upload: {
      colorFillAlter: rainbetColors.bgElevated,
    },
    Segmented: {
      itemSelectedBg: "rgba(32, 153, 255, 0.2)",
      itemSelectedColor: rainbetColors.primary,
      trackBg: rainbetColors.bgElevated,
    },
    Statistic: {
      contentFontSize: 28,
    },
  },
};
