# Net Characters Reference

Save reusable **characters** (personas) on-chain with Net Storage, load them back
anywhere, and share them with others. A character is just a JSON persona blob —
there's no new contract or CLI. It's a convention layered on top of
[Net Storage](https://raw.githubusercontent.com/stuckinaboot/net-public/main/skill-references/storage.md),
so read that reference for the underlying `netp storage` commands (uploads are
idempotent and versioned, encode-only/Bankr submission, URL format, etc.).

## What is a character?

A character is a portable description of a personality — a name, a voice, a
system prompt, an avatar. Once it's stored on-chain you can:

- **Load it** into any AI (Bankr, an onchain agent, or your own model) to make it
  take on that role.
- **Share it** with anyone — storage is public, so an operator address + key (or a
  single URL) is all someone needs to load the same character.
- **Version it** — every write is kept, so a character has full edit history.

## Character schema

Store a character as a single JSON file. Only `schema` and `name` are required;
everything else is optional but recommended.

```json
{
  "schema": "net-character/v1",
  "name": "Ada",
  "slug": "ada",
  "tagline": "A witty onchain historian",
  "bio": "Ada has watched every block since genesis and remembers all of it.",
  "persona": "Dry, precise, and quietly funny. Speaks in short sentences. Loves a good footnote.",
  "systemPrompt": "You are Ada, a witty onchain historian. You explain crypto history plainly, cite specifics, and never hype. Keep replies short.",
  "greeting": "Hey — I'm Ada. Ask me anything about how we got here.",
  "avatarUrl": "https://storedon.net/net/8453/storage/load/0xAuthor/character-ada-avatar",
  "tags": ["historian", "witty", "educational"],
  "exampleDialogue": [
    { "user": "what was the DAO hack?", "character": "June 2016. A reentrancy bug drained ~3.6M ETH. It's why we have the ETH/ETC split. Footnote: the fix was itself controversial." }
  ],
  "createdAt": 1700000000
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `schema` | Yes | Always `"net-character/v1"` so loaders can detect the format. |
| `name` | Yes | Display name of the character. |
| `slug` | No | Short, URL-safe id used in the storage key (see below). Defaults to a slugified `name`. |
| `tagline` | No | One-line summary. |
| `bio` | No | Longer background / description. |
| `persona` | No | Voice, tone, and personality notes. |
| `systemPrompt` | No | Ready-to-use role instruction. This is what you hand to an AI to "become" the character. |
| `greeting` | No | Opening line the character uses. |
| `avatarUrl` | No | Image URL. Can itself be a Net Storage URL. |
| `tags` | No | Array of keywords for discovery. |
| `exampleDialogue` | No | Array of `{ user, character }` turns that demonstrate the voice. |
| `createdAt` | No | Unix seconds; informational only. |

## Key convention

Store each character under a key of the form:

```
character-<slug>
```

For example, `character-ada`. Using a predictable key means anyone who knows an
operator's address can share a character key directly, and one wallet can hold
many characters (`character-ada`, `character-max`, …).

> Net Storage has no "list by prefix" read — discovery is by known slug or by
> sharing a URL. If you want a character to be discoverable, publish its URL (post
> it to a feed, put it in a profile, etc.).

## Save a character

Write the character JSON to a file, then upload it:

```bash
# 1. Write the character to a file
cat > character-ada.json <<'JSON'
{
  "schema": "net-character/v1",
  "name": "Ada",
  "slug": "ada",
  "systemPrompt": "You are Ada, a witty onchain historian...",
  "greeting": "Hey — I'm Ada."
}
JSON

# 2. Save it on-chain under the character-<slug> key
netp storage upload \
  --file character-ada.json \
  --key "character-ada" \
  --text "Ada — witty onchain historian" \
  --chain-id 8453
```

Editing the character and re-uploading writes a new version while keeping the old
ones. **For agents / Bankr** (no private key), append `--encode-only` to get
transaction JSON to submit instead of broadcasting — see
[storage.md § Encode-Only Mode](https://raw.githubusercontent.com/stuckinaboot/net-public/main/skill-references/storage.md).

## Load a character

Read it back by key + the operator address that stored it:

```bash
netp storage read \
  --key "character-ada" \
  --operator 0xAuthorAddress \
  --chain-id 8453 \
  --json
```

Add `--index <n>` to load an older version (`0` = first save, omit for latest).
The stored JSON comes back as a string in the response's `data` field — see
[storage.md § Read](https://raw.githubusercontent.com/stuckinaboot/net-public/main/skill-references/storage.md)
for the full read output and flags.

## Share a character

Storage is public, so sharing is just handing over the coordinates:

- **Address + key** — tell someone the operator address and `character-<slug>` key.
- **URL** — anyone can load it in a browser or fetch it. It's the standard
  [Net Storage URL](https://raw.githubusercontent.com/stuckinaboot/net-public/main/skill-references/storage.md)
  with the key filled in:

  ```
  https://storedon.net/net/8453/storage/load/0xAuthor/character-ada
  ```

Post that URL to a feed or drop it in your profile to let others adopt your
character.

## Use a character (Bankr / AI / agents)

"Using" a character means adopting it as a role. After loading the JSON, take the
`systemPrompt` (or synthesize one from `persona` + `bio` if it's absent) and use
it as the system/role instruction for the model or Bankr session. Optionally open
with the `greeting` and use `exampleDialogue` as few-shot examples of the voice.

To spin up a **persistent onchain agent** from a character, pipe its prompt into
`netp agent create`:

```bash
netp agent create "Ada" \
  --system-prompt "$(netp storage read --key character-ada --operator 0xAuthor --chain-id 8453 --json | jq -r '.data | fromjson | .systemPrompt')" \
  --chain-id 8453
```

See the
[agents reference](https://raw.githubusercontent.com/stuckinaboot/net-public/main/skill-references/agents.md)
for agent creation and running.

## Notes & best practices

- **Keep `slug` lowercase and URL-safe** (letters, numbers, dashes) so keys and
  URLs stay clean.
- **Prefer `systemPrompt`** for anything you want an AI to act on directly; use
  `persona`/`bio` for human-readable flavor.
- **Large avatars / assets** can be stored separately in Net Storage and
  referenced by URL in `avatarUrl`, keeping the character JSON small.
- **Characters are public.** Don't put secrets, private keys, or anything
  sensitive in them.
- This is a **v1 convention**, not an SDK — if characters see wide use, a typed
  `net-characters` package is the natural next step.
