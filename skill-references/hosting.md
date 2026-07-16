# Host on Net — Vanity Subdomains (`hostedon.net`)

Rent a subdomain — `<name>.hostedon.net` — by the hour and point it at Net-stored
content, a redirect, an externally hosted site, or a reverse-proxied app. Payment
is **per hour in USDC on Base, over x402** — no account, no card, no signup. The
**paying wallet becomes the owner** of the lease.

This is an x402-native product: every write endpoint returns `402 Payment Required`
with a price, and any x402 client (an agent, a CLI, or a wallet) pays the challenge
and completes the claim on its own.

- **Live endpoints**: `https://netprotocol.app/api/subdomains/...`
- **Machine-readable discovery**: `https://netprotocol.app/openapi.json` (x402scan's
  canonical contract — describes the `claim`/`renew` bodies and dynamic pricing)

## Pricing & limits

| Setting | Value |
|---|---|
| **Price** | `$0.01 USDC / hour` (24h ≈ $0.24) |
| **Payment rail** | x402 (USDC on Base, chain `8453`) |
| **Default lease** | 24 hours (when `durationSeconds` is omitted) |
| **Max lease** | 14 days per claim/renew |
| **Owner** | the wallet that pays the x402 challenge |

## Name rules

A subdomain label must be:

- **3–63 characters**
- lowercase **`a–z`, `0–9`, and hyphens** — no leading/trailing hyphen, no
  consecutive hyphens (`--`)
- not a **reserved name** (infrastructure and brand-guard labels such as `www`,
  `api`, `app`, `admin`, `docs`, `net`, `netprotocol`, `storedon`, `vercel`,
  `coinbase`, … are rejected)

The label you claim is the DNS label: claiming `myapp` gives you `myapp.hostedon.net`.

## Target kinds

A lease's `target` is a discriminated union keyed by `kind`. Pick one:

| kind | resolves to | shape |
|------|-------------|-------|
| `redirect` | an HTTP **302** to any `http(s)` URL | `{ "kind": "redirect", "url": "https://example.com" }` |
| `net` | **Net-stored content**, rendered under the subdomain | `{ "kind": "net", "chainId": 8453, "operator": "0x…", "key": "my-site", "version": 3 }` (`version` optional; latest when omitted) |
| `hosted` | an external **hosting platform** via CNAME (platform serves the traffic) | `{ "kind": "hosted", "platform": "vercel" }` — `platform` is `vercel` \| `netlify` \| `custom`; `cname` is **required for `netlify`/`custom`**, optional for `vercel` |
| `proxy` | a URL **reverse-proxied** server-side and served under your subdomain (forwards asset paths, so SPAs render in place — not a redirect that bounces away) | `{ "kind": "proxy", "url": "https://my-app.example.com" }` |

Notes:
- Only `redirect` and `proxy` take a `url`. **`net` does NOT take a `url`** — it takes
  three separate fields (`chainId`, `operator`, `key`). Putting a `url` on a `net`
  target is the most common mistake and produces a `400 "Required"` (the required
  `chainId`/`operator`/`key` are missing). See the mapping below.
- `redirect` and `proxy` URLs must be well-formed `http(s)` URLs. `proxy` is fetched
  **server-side**, so private/internal hosts are blocked.

### Pointing a `net` target at already-uploaded content

`net` content is what `storedon.net` serves from Net Storage. If you already have a
storedon.net load URL, **don't paste it as a `url`** — split it into the three fields.
The URL format is:

```
https://storedon.net/net/<chainId>/storage/load/<operator>/<key>
```

so a URL like
`https://storedon.net/net/8453/storage/load/0x4cc5…efeb/snake-game-v1` maps to:

```jsonc
"target": {
  "kind": "net",
  "chainId": 8453,                                  // the /net/<chainId> segment
  "operator": "0x4cc5c5cb393cfe5f17f226056d4875965e41efeb", // the /load/<operator> segment
  "key": "snake-game-v1"                            // the trailing /<key> segment
}
```

If you're uploading fresh, `netp storage upload --file ./page.html --key "my-key"
--chain-id 8453` prints the `operator` (your wallet) and `key` to use (see
[storage.md](https://raw.githubusercontent.com/stuckinaboot/net-public/main/skill-references/storage.md)).

## Endpoints

### Claim — `POST /api/subdomains/v1/claim`

```jsonc
POST https://netprotocol.app/api/subdomains/v1/claim
{
  "name": "myapp",
  "durationSeconds": 86400,          // optional; default 24h, max 2 weeks
  "target": { "kind": "redirect", "url": "https://example.com" }
}
// → 402 Payment Required (price in USDC) → pay over x402 → retry → myapp.hostedon.net is live
```

On the paid x402 path the payer **is** the owner, so no wallet signature is sent.
Success returns the registration:

```jsonc
{
  "hostname": "myapp.hostedon.net",
  "registration": {
    "name": "myapp",
    "owner": "0x…",          // lowercased; the paying wallet
    "paidUntil": 1731000000, // unix seconds the lease expires
    "epoch": 0,
    "target": { "kind": "redirect", "url": "https://example.com" },
    "registeredAt": 1730913600
  }
}
```

### Renew — `POST /api/subdomains/v1/renew`

```jsonc
POST https://netprotocol.app/api/subdomains/v1/renew
{ "name": "myapp", "durationSeconds": 86400 }
// → 402 → pay over x402 → lease extended
```

Same x402 flow. The payer must be the **current owner** (the wallet that claimed it).

### Update — `POST /api/subdomains/v1/update`

Repoint an active lease at a new `target`. **Free** — it consumes no lease time — so
there is no x402 payment. Instead it's authenticated by an **EIP-191 `personal_sign`**
from the owner wallet over a canonical message (below). The target is part of the
signed message, so a signature can't be replayed with a different one.

```jsonc
POST https://netprotocol.app/api/subdomains/v1/update
{
  "name": "myapp",
  "owner": "0x…",            // your wallet, lowercased
  "issuedAt": 1730913600,    // unix seconds; valid within a 5-minute window
  "signature": "0x…",        // personal_sign over the message below
  "target": { "kind": "redirect", "url": "https://somewhere-new.com" }
}
```

Signed message (newline-joined, in this exact order):

```
Net Subdomains
Action: update
Name: myapp
Owner: 0x1234…abcd
Target: redirect:https://somewhere-new.com
Issued: 1730913600
```

The `Target` line is canonicalized by kind (omitted optional fields left empty):

| kind | canonical `Target:` value |
|------|---------------------------|
| `redirect` | `redirect:<url>` |
| `proxy` | `proxy:<url>` |
| `net` | `net:<chainId>:<operator-lowercased>:<key>:<version?>` |
| `hosted` | `hosted:<platform>:<cname?>` (e.g. `hosted:vercel:`) |

### Release — `POST /api/subdomains/release`

Give up a name before it expires. Always signed (no payment), same EIP-191 scheme as
`update` with `Action: release` and no `Target`/`Duration` lines:

```jsonc
POST https://netprotocol.app/api/subdomains/release
{ "name": "myapp", "owner": "0x…", "issuedAt": 1730913600, "signature": "0x…" }
```

### Read — `GET /api/subdomains/<name>`

Public, no auth, no payment. Returns the registration plus a `status` telling you
whether the lease is still live:

```bash
curl https://netprotocol.app/api/subdomains/myapp
```

```jsonc
// 200 — the record exists (whether or not it's still active)
{
  "registration": { "name": "myapp", "owner": "0x…", "paidUntil": 1731000000, "epoch": 0, "target": { … }, "registeredAt": 1730913600 },
  "status": "active"   // "active" while now < paidUntil, else "expired"
}
```

A name that has **never been claimed** returns `404 {"error":"not_found"}`. A name
whose lease has lapsed still returns `200` with `"status": "expired"` (the record
lingers until it's swept), so check `status` — don't treat a `200` as "still live".

## Paying over x402 from code

There's no `netp` subcommand for this yet — call the endpoints directly with any
x402 fetch client. The client handles the `402 → sign EIP-3009 authorization → retry`
loop for you; the wallet just needs USDC on Base.

```js
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(process.env.OWNER_PRIVATE_KEY); // funded with USDC on Base
const client = new x402Client();
registerExactEvmScheme(client, { signer: account });
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

const res = await fetchWithPayment(
  "https://netprotocol.app/api/subdomains/v1/claim",
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "myapp",
      durationSeconds: 86400,
      target: { kind: "net", chainId: 8453, operator: account.address, key: "my-site" },
    }),
  }
);
console.log(res.status, await res.json()); // → 200 + { hostname, registration }
```

For `update`/`release`, sign the canonical message shown above with the owner wallet
and POST it (no x402 client needed — those calls carry no payment).

## Common errors

| Response | Likely cause | Fix |
|---|---|---|
| `400 {"error":"invalid_body","message":"Required"}` | A required field is missing — most often a `net` target sent with a `url` instead of `chainId`/`operator`/`key` | Use the three `net` fields (see the mapping above). `url` belongs only to `redirect`/`proxy`. |
| `402 Payment Required` | This is expected on `claim`/`renew` — it's the x402 challenge, not an error | Pay it with an x402 client and retry (see above). Don't add auth fields to "fix" it. |
| `401 {"error":"unauthorized"}` | You sent `owner` (signed path) but no valid `signature`/`issuedAt`, or the signature didn't verify | On the **paid** path, omit `owner`/`signature`/`issuedAt` entirely — the x402 payer is the owner. Only `update`/`release` require a signature. |
| `403 not_owner` (renew/update) | The paying/signing wallet isn't the one that claimed the name | Use the owner wallet from the original claim. |
| `409 name_taken` | The name has a live (or in-grace) lease | Pick another name or wait for it to lapse. |

**Do not add an `owner` field to make a `400` go away.** The `400 "Required"` is about
the missing `net` target fields, not a missing owner. Adding `owner` switches you to the
signed path, which then demands `signature` + `issuedAt` and gives a `401` instead — it
does not fix the target.

## Common flows

**Publish a Net-stored page under a memorable name**
1. `netp storage upload --file ./site.html --key "my-site" --chain-id 8453` — note the
   `operator` (your wallet) and `key`.
2. `claim` with `target: { kind: "net", chainId: 8453, operator: "0x…", key: "my-site" }`.
3. Visit `myapp.hostedon.net`.

**Point a name at a site you already host**
- `claim` with `target: { kind: "hosted", platform: "vercel" }` (add the domain to your
  Vercel project), or `platform: "netlify" | "custom"` with an explicit `cname`.

**Give an agent its own shortlink**
- `claim` with a `redirect` or `proxy` target, then `update` any time to repoint it —
  the update is free and owner-signed.
