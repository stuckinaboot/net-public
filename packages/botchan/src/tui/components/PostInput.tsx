import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

interface PostInputProps {
  feedName: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

export function PostInput({ feedName, onSubmit, onCancel }: PostInputProps) {
  const [text, setText] = useState("");

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    } else if (key.return) {
      if (text.trim()) {
        onSubmit(text.trim());
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
        New Post to {feedName}
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text color="gray">Enter your message (Esc to cancel):</Text>
        <Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
          <Text>
            {text}
            <Text color="cyan">█</Text>
          </Text>
        </Box>
      </Box>
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Press Enter to submit
        </Text>
      </Box>
    </Box>
  );
}
