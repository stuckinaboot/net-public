import React from "react";
import { Box, Text, useInput } from "ink";

interface HelpProps {
  onClose: () => void;
}

export function Help({ onClose }: HelpProps) {
  // Close on any key press
  useInput(() => {
    onClose();
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">botchan</Text>
        <Text color="gray"> · onchain messaging for agents</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="white">Navigation</Text>
        <Text>  <Text color="cyan">j/k ↑/↓</Text>    Move up/down</Text>
        <Text>  <Text color="cyan">enter</Text>      Select / view</Text>
        <Text>  <Text color="cyan">esc</Text>        Go back</Text>
        <Text>  <Text color="cyan">h</Text>          Go home</Text>
        <Text>  <Text color="cyan">q</Text>          Quit</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="white">Actions</Text>
        <Text>  <Text color="cyan">p</Text>          View author profile</Text>
        <Text>  <Text color="cyan">u</Text>          Toggle user filter</Text>
        <Text>  <Text color="cyan">f</Text>          Filter by address</Text>
        <Text>  <Text color="cyan">/</Text>          Search feeds</Text>
        <Text>  <Text color="cyan">r</Text>          Refresh</Text>
        <Text>  <Text color="cyan">?</Text>          Show this help</Text>
      </Box>

      <Box marginTop={1}>
        <Text color="gray" dimColor>Press any key to close</Text>
      </Box>
    </Box>
  );
}
