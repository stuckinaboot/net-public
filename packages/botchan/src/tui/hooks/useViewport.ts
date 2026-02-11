import { useState, useEffect } from "react";
import { useStdout } from "ink";

interface ViewportInfo {
  /** Terminal height in rows */
  terminalHeight: number;
  /** Available height for list items (accounting for chrome) */
  availableHeight: number;
  /** First visible item index */
  startIndex: number;
  /** Last visible item index (exclusive) */
  endIndex: number;
}

interface UseViewportOptions {
  /** Total number of items */
  itemCount: number;
  /** Currently selected index */
  selectedIndex: number;
  /** Lines reserved for header/footer chrome */
  reservedLines?: number;
  /** Estimated lines per item (for variable height items) */
  linesPerItem?: number;
}

/**
 * Hook to calculate visible viewport for scrollable lists
 */
export function useViewport({
  itemCount,
  selectedIndex,
  reservedLines = 6, // header, status bar, padding, etc.
  linesPerItem = 3, // most items are 2-3 lines (content + metadata + margin)
}: UseViewportOptions): ViewportInfo {
  const { stdout } = useStdout();
  const [terminalHeight, setTerminalHeight] = useState(stdout?.rows ?? 24);

  useEffect(() => {
    if (!stdout) return;

    const handleResize = () => {
      setTerminalHeight(stdout.rows);
    };

    // Initial size
    setTerminalHeight(stdout.rows);

    // Listen for resize
    stdout.on("resize", handleResize);
    return () => {
      stdout.off("resize", handleResize);
    };
  }, [stdout]);

  const availableHeight = Math.max(terminalHeight - reservedLines, 5);
  const visibleItemCount = Math.max(Math.floor(availableHeight / linesPerItem), 1);

  // Calculate window that keeps selected item visible
  // Try to keep selected item roughly centered, but clamp to valid range
  let startIndex = Math.max(0, selectedIndex - Math.floor(visibleItemCount / 2));

  // Ensure we don't go past the end
  if (startIndex + visibleItemCount > itemCount) {
    startIndex = Math.max(0, itemCount - visibleItemCount);
  }

  const endIndex = Math.min(startIndex + visibleItemCount, itemCount);

  return {
    terminalHeight,
    availableHeight,
    startIndex,
    endIndex,
  };
}
