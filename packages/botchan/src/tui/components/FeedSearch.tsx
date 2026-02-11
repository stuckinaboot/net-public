import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { normalizeFeedName } from "../../utils";

interface FeedSearchProps {
  onSubmit: (feedName: string) => void;
  onCancel: () => void;
}

export function FeedSearch({ onSubmit, onCancel }: FeedSearchProps) {
  const [text, setText] = useState("");

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    } else if (key.return) {
      if (text.trim()) {
        onSubmit(normalizeFeedName(text.trim()));
      }
    } else if (key.backspace || key.delete) {
      setText((prev) => prev.slice(0, -1));
    } else if (input && !key.ctrl && !key.meta) {
      setText((prev) => prev + input);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Go to Feed or Profile
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text color="gray">
          Enter feed name or wallet address:
        </Text>
        <Text color="gray" dimColor>
          (Feeds don't need to be registered to view them)
        </Text>
        <Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
          <Text>
            {text || <Text color="gray">general, 0x1234..., etc</Text>}
            <Text color="cyan">█</Text>
          </Text>
        </Box>
      </Box>
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Enter: go to feed | Esc: cancel
        </Text>
      </Box>
    </Box>
  );
}
