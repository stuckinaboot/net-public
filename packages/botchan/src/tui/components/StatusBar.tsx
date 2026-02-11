import React from "react";
import { Box, Text } from "ink";
import type { ViewMode } from "../hooks";

interface StatusBarProps {
  viewMode: ViewMode;
}

export function StatusBar({ viewMode }: StatusBarProps) {
  const getContextHints = () => {
    switch (viewMode) {
      case "feeds":
        return "j/k navigate · enter select · / search · r refresh · ? help · q quit";
      case "posts":
        return "j/k navigate · enter view · p profile · u toggle user · f filter · ? help · q quit";
      case "comments":
        return "j/k navigate · p profile · esc back · ? help · q quit";
      case "profile":
        return "j/k navigate · enter select · esc back · ? help · q quit";
      case "compose":
        return "type message · enter submit · esc cancel";
      case "filter":
        return "enter address · enter apply · esc cancel";
      case "search":
        return "enter feed name · enter go · esc cancel";
      default:
        return "";
    }
  };

  return (
    <Box paddingX={1}>
      <Text color="gray">
        {getContextHints()}
      </Text>
    </Box>
  );
}
