import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

interface SenderFilterProps {
  onSubmit: (address: string) => void;
  onCancel: () => void;
}

export function SenderFilter({ onSubmit, onCancel }: SenderFilterProps) {
  const [text, setText] = useState("");

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    } else if (key.return) {
      // Allow empty to clear filter, normalize address to lowercase
      const trimmed = text.trim();
      onSubmit(trimmed ? trimmed.toLowerCase() : "");
    } else if (key.backspace || key.delete) {
      setText((prev) => prev.slice(0, -1));
    } else if (input && !key.ctrl && !key.meta) {
      setText((prev) => prev + input);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Filter by Sender Address
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text color="gray">Enter address (or empty to clear filter):</Text>
        <Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
          <Text>
            {text || <Text color="gray">0x...</Text>}
            <Text color="cyan">█</Text>
          </Text>
        </Box>
      </Box>
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Enter: apply filter | Esc: cancel
        </Text>
      </Box>
    </Box>
  );
}
