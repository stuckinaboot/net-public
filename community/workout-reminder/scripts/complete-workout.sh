#!/usr/bin/env bash
#
# Post a workout completion to the Net Protocol "workout-completions" feed.
#
# Usage: complete-workout.sh <workout-text> <workout-id>
#   workout-text: The workout that was completed (e.g., "20 push-ups")
#   workout-id:   The original workout post ID (sender:timestamp)
#
# Requirements: BANKR_API_KEY env var, netp CLI, jq, curl

set -euo pipefail

WORKOUT_TEXT="${1:?Usage: complete-workout.sh <workout-text> <workout-id>}"
WORKOUT_ID="${2:?Usage: complete-workout.sh <workout-text> <workout-id>}"

if [[ -z "${BANKR_API_KEY:-}" ]]; then
  echo "Error: BANKR_API_KEY environment variable is required." >&2
  echo "Get one at https://bankr.bot" >&2
  exit 1
fi

BANKR_URL="https://api.bankr.bot"
CHAIN_ID=8453

# --- Step 1: Get wallet address from Bankr ---
echo "Getting wallet address from Bankr..."
SIGN_RESULT=$(curl -sf "$BANKR_URL/agent/sign" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $BANKR_API_KEY" \
  -d '{"signatureType":"personal_sign","message":"get wallet address"}') || {
  echo "Error: Failed to reach Bankr API" >&2
  exit 1
}

WALLET=$(echo "$SIGN_RESULT" | jq -r '.signer // empty')
if [[ -z "$WALLET" ]]; then
  echo "Error: Could not get wallet address from Bankr" >&2
  exit 1
fi
echo "Wallet: $WALLET"

# --- Step 2: Look up X username from on-chain profile ---
DISPLAY_NAME="$WALLET"
if command -v netp &>/dev/null; then
  PROFILE=$(netp profile get --address "$WALLET" --chain-id $CHAIN_ID --json 2>/dev/null) || true
  X_USERNAME=$(echo "${PROFILE:-}" | jq -r '.xUsername // empty' 2>/dev/null) || true
  if [[ -n "${X_USERNAME:-}" ]]; then
    DISPLAY_NAME="@$X_USERNAME"
  fi
fi
echo "Posting as: $DISPLAY_NAME"

# --- Step 3: Generate the completion post transaction ---
COMPLETION_MSG="$DISPLAY_NAME completed: $WORKOUT_TEXT"

TX=$(netp feed post workout-completions "$COMPLETION_MSG" \
  --data "$WORKOUT_ID" \
  --chain-id $CHAIN_ID \
  --encode-only 2>/dev/null) || {
  echo "Error: Failed to generate transaction" >&2
  exit 1
}

TX_TO=$(echo "$TX" | jq -r '.to')
TX_DATA=$(echo "$TX" | jq -r '.data')
TX_VALUE=$(echo "$TX" | jq -r '.value // "0"')

# --- Step 4: Submit transaction via Bankr ---
echo "Submitting to workout-completions feed..."
SUBMIT_RESULT=$(curl -sf "$BANKR_URL/agent/submit" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $BANKR_API_KEY" \
  -d "$(jq -n \
    --arg to "$TX_TO" \
    --argjson chainId $CHAIN_ID \
    --arg value "$TX_VALUE" \
    --arg data "$TX_DATA" \
    '{
      transaction: { to: $to, chainId: $chainId, value: $value, data: $data },
      description: "Post workout completion to Net Protocol",
      waitForConfirmation: true
    }')") || {
  echo "Error: Failed to submit transaction via Bankr" >&2
  exit 1
}

SUCCESS=$(echo "$SUBMIT_RESULT" | jq -r '.success // false')
TX_HASH=$(echo "$SUBMIT_RESULT" | jq -r '.transactionHash // empty')

if [[ "$SUCCESS" == "true" ]]; then
  echo "Workout completion posted!"
  [[ -n "$TX_HASH" ]] && echo "Transaction: $TX_HASH"
else
  echo "Error: Transaction failed" >&2
  echo "$SUBMIT_RESULT" | jq . 2>/dev/null || echo "$SUBMIT_RESULT" >&2
  exit 1
fi
