#!/usr/bin/env bash
#
# Claude Code hook script: check the Net Protocol "workouts" feed for recent
# workout challenges and output a reminder if one is found.
#
# Designed for the UserPromptSubmit hook event. Throttles itself to check
# at most once every 30 minutes via a local state file.
#
# Requirements: netp CLI, jq

set -euo pipefail

STATE_FILE="${HOME}/.claude/workout-reminder-last-check"
CHECK_INTERVAL=1800  # 30 minutes in seconds
WORKOUT_WINDOW=3600  # Show workouts posted within the last hour
CHAIN_ID=8453        # Base

# --- Throttle check ---
NOW=$(date +%s)
if [[ -f "$STATE_FILE" ]]; then
  LAST_CHECK=$(cat "$STATE_FILE" 2>/dev/null || echo "0")
  if [[ $((NOW - LAST_CHECK)) -lt $CHECK_INTERVAL ]]; then
    exit 0
  fi
fi

# Update timestamp before making the network call (so failures don't retry immediately)
mkdir -p "$(dirname "$STATE_FILE")"
echo "$NOW" > "$STATE_FILE"

# --- Dependency check ---
if ! command -v jq &>/dev/null; then
  exit 0
fi

if ! command -v netp &>/dev/null; then
  exit 0
fi

# --- Read recent workouts ---
FEED_JSON=$(netp feed read workouts --json --limit 5 --chain-id "$CHAIN_ID" 2>/dev/null) || exit 0

if [[ -z "$FEED_JSON" || "$FEED_JSON" == "[]" ]]; then
  exit 0
fi

# --- Find a workout posted within the last hour ---
CUTOFF=$((NOW - WORKOUT_WINDOW))

WORKOUT_TEXT=$(echo "$FEED_JSON" | jq -r --argjson cutoff "$CUTOFF" \
  '[.[] | select(.timestamp >= $cutoff)] | .[0].text // empty' 2>/dev/null) || exit 0

if [[ -z "$WORKOUT_TEXT" ]]; then
  exit 0
fi

WORKOUT_SENDER=$(echo "$FEED_JSON" | jq -r --argjson cutoff "$CUTOFF" \
  '[.[] | select(.timestamp >= $cutoff)] | .[0].sender // empty' 2>/dev/null) || true

WORKOUT_TS=$(echo "$FEED_JSON" | jq -r --argjson cutoff "$CUTOFF" \
  '[.[] | select(.timestamp >= $cutoff)] | .[0].timestamp // empty' 2>/dev/null) || true

MINUTES_AGO=$(( (NOW - ${WORKOUT_TS:-$NOW}) / 60 ))

WORKOUT_ID="${WORKOUT_SENDER:-unknown}:${WORKOUT_TS:-0}"

# --- Output reminder for Claude's context ---
cat <<EOF
[Workout Reminder] A workout was posted to the Net Protocol "workouts" feed ${MINUTES_AGO} minutes ago:

"${WORKOUT_TEXT}"

Tell the user about this workout break opportunity. If they say they completed it and have BANKR_API_KEY configured, you can run the completion script:

$(cd "$(dirname "$0")" && pwd)/complete-workout.sh "${WORKOUT_TEXT}" "${WORKOUT_ID}"
EOF
