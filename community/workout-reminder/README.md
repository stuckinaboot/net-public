# Workout Reminder Hook for Claude Code

Take workout breaks while coding. This Claude Code hook reads from a community-curated
Net Protocol feed and periodically nudges you to exercise.

## Product Concept

Developers sit too much. This hook taps into the `workouts` feed on Net Protocol —
an on-chain, censorship-resistant feed on Base where anyone can post workout challenges
like "20 push-ups" or "1 minute plank." While you code with Claude Code, the hook
quietly checks the feed every ~30 minutes. When it finds a recent workout (posted
within the last hour), Claude mentions it in its next response.

Optionally, if you have a [Bankr](https://bankr.bot) API key, you can tell Claude
"I completed the workout" and it posts your completion on-chain to the
`workout-completions` feed, tagged with your X/Twitter handle.

## How It Works

```
User codes with Claude Code
        |
        v
  [UserPromptSubmit hook fires]
        |
  +-----+------+
  | Last check  |--- < 30 min ago ---> exit silently (no RPC call)
  | < 30 min?   |
  +-----+------+
        | (time to check)
        v
  [Read "workouts" feed on Base via netp CLI]
        |
  +-----+------+
  | Workout in  |--- no recent workout ---> exit silently
  | last hour?  |
  +-----+------+
        | (found one)
        v
  Claude tells user: "Workout break! Do 20 push-ups!"
        |
        v  (optional, requires BANKR_API_KEY)
  User: "I completed the workout"
        |
        v
  [complete-workout.sh]
    1. Gets wallet address from Bankr API
    2. Looks up X username from on-chain profile
    3. Posts "@username completed 20 push-ups!" to workout-completions feed
    4. Submits transaction via Bankr
```

## Feeds

| Feed | Topic | Purpose |
|------|-------|---------|
| `workouts` | `feed-workouts` | Workout challenges posted by community members |
| `workout-completions` | `feed-workout-completions` | Completed workout logs (optional) |

## Investigation: What's Already Supported

Everything needed for this hook is built into the existing Net Protocol SDK and tooling.
**No new packages or features are needed.**

| Capability | Status | How |
|-----------|--------|-----|
| Read from feeds | Supported | `netp feed read` / `FeedClient.getFeedPosts()` |
| Post to feeds | Supported | `netp feed post` / `FeedClient.preparePostToFeed()` |
| Get wallet address from Bankr | Supported | `POST /agent/sign` with `personal_sign` returns `signer` |
| Look up X username for a wallet | Supported | `netp profile get --address 0x... --json` returns `xUsername` |
| Submit transactions via Bankr | Supported | `POST /agent/submit` with encoded transaction data |
| Claude Code hooks | Supported | `settings.json` `UserPromptSubmit` event |
| Attach data to feed posts | Supported | `--data` flag on `netp feed post` (stores workout ID reference) |
| JSON output for scripting | Supported | `--json` flag on all read commands |

### Key implementation details

- **Feed JSON format**: `netp feed read workouts --json` returns an array of objects with
  `sender`, `text`, `timestamp` (Unix seconds as number), `topic`, `commentCount`
- **Bankr wallet lookup**: `POST https://api.bankr.bot/agent/sign` with
  `{"signatureType":"personal_sign","message":"get wallet address"}` returns `{"signer":"0x..."}`
- **Profile lookup**: `netp profile get --address 0x... --chain-id 8453 --json` returns
  `{"xUsername":"handle",...}` (username stored without @ prefix)
- **Transaction encode**: `netp feed post <feed> <msg> --encode-only` returns
  `{"to":"0x...","data":"0x...","chainId":8453,"value":"0"}` ready for Bankr submission
- **Bankr submit**: `POST https://api.bankr.bot/agent/submit` with the encoded transaction

## Prerequisites

- **Required**: [netp CLI](https://www.npmjs.com/package/@net-protocol/cli) — `npm install -g @net-protocol/cli`
- **Required**: [jq](https://jqlang.github.io/jq/) — `brew install jq` / `apt install jq`
- **Optional**: `BANKR_API_KEY` environment variable for posting workout completions

## Setup

### 1. Install dependencies

```bash
npm install -g @net-protocol/cli
```

### 2. Make scripts executable

```bash
chmod +x community/workout-reminder/scripts/check-workout.sh
chmod +x community/workout-reminder/scripts/complete-workout.sh
```

### 3. Add the hook to Claude Code settings

Copy the hook configuration into your Claude Code settings. You can add it to:
- `~/.claude/settings.json` — applies to all projects
- `.claude/settings.json` — applies to one project (committed to repo)
- `.claude/settings.local.json` — applies to one project (gitignored)

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/absolute/path/to/community/workout-reminder/scripts/check-workout.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

Replace `/absolute/path/to/` with wherever you cloned this repo.

See `claude-settings-example.json` for a complete example.

### 4. (Optional) Enable workout completions

Set your Bankr API key as an environment variable:

```bash
export BANKR_API_KEY=bk_your_api_key_here
```

When Claude shows a workout reminder, tell it "I completed the workout" and it will
run the completion script automatically.

## Posting Workouts

Anyone can post workout challenges to the feed:

```bash
# With Bankr (recommended)
netp feed post workouts "20 push-ups" --chain-id 8453 --encode-only
# Then submit the output via Bankr

# With a private key
netp feed post workouts "30 squats" --chain-id 8453 --private-key 0x...

# With botchan
botchan post workouts "1 minute plank" --encode-only
```

## Reading Workouts

```bash
netp feed read workouts --json --limit 10 --chain-id 8453
```

## How Throttling Works

The hook uses a local state file (`~/.claude/workout-reminder-last-check`) to track
when it last checked the feed. It only makes an RPC call to Base every 30 minutes.
The other ~29 minutes, the hook exits immediately with no network calls — just a
local file timestamp comparison.
