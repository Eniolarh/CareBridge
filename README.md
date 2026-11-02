# CareBridge

Transparent patient and humanitarian crowdfunding on Stellar, built with a Soroban
escrow contract and a Next.js dashboard.

CareBridge keeps donated funds inside a smart-contract escrow. An independent
verifier approves medical invoices, and money can only be released to the named
patient or medical provider. Donors can see every balance on-chain; if a campaign
fails to reach its target, the verifier can open refunds and each donor can claim
their full contribution back.

## Why it exists

Traditional medical fundraisers ask donors to trust a platform, a bank account, and
a spreadsheet. CareBridge replaces that with three on-chain roles:

| Role | Responsibility |
| --- | --- |
| Patient | Creates and authorizes the campaign. Can receive released funds. |
| Medical provider | Delivers care and can receive released funds. |
| Independent verifier | Verifies invoices, authorizes releases, opens refunds. |

Donors send the campaign token into the contract. The contract holds it until the
verifier records a matching invoice and signs a release. Neither the patient nor the
provider can move escrowed funds unilaterally.

## Repository layout

```
.
├── contracts/carebridge/       Soroban escrow contract (Rust)
│   ├── src/lib.rs              Contract entry points, storage, errors
│   └── src/test.rs             Unit tests for escrow, invoices, refunds, paging
├── app/                        Next.js 16 + Tailwind dashboard
│   ├── app/                    Routes: campaigns list, create, detail
│   ├── components/             UI, donate dialog, verifier panel, wallet widgets
│   └── lib/                    Contract client, hooks, Stellar/Freighter helpers
├── scripts/generate-bindings.sh
├── deploy.sh                   Testnet deployment for bash
├── deploy.ps1                  Testnet deployment for PowerShell
└── Cargo.toml                  Rust workspace
```

## Campaign lifecycle

1. **Create** — the patient signs `initialize_campaign`, choosing a provider, a
   verifier, a token (XLM or USDC SAC), a target, and public metadata.
2. **Donate** — anyone signs `donate`. The token moves from the donor to the
   contract. Hitting the target marks the campaign `Completed`.
3. **Verify** — the verifier signs `verify_invoice` with an invoice ID and amount.
   An invoice ID can only be verified once.
4. **Release** — the verifier signs `release_funds` for part or all of an invoice.
   The recipient must be the patient or the provider, and the contract must hold
   enough escrow.
5. **Refund** — while a campaign is `Active` and below target, the verifier can
   call `refund_campaign`. Each donor then calls `claim_refund` once.

All amounts are integer token units on-chain (`i128` stroops). The UI treats tokens
as 7-decimal assets and converts to display units.

## Contract API

| Function | Auth | Returns | Notes |
| --- | --- | --- | --- |
| `initialize_campaign(patient, provider, verifier, token, patient_id, title, description, target_amount)` | patient | `u64` | Creates campaign ID `N+1`. |
| `donate(campaign_id, donor, amount)` | donor | `i128` raised | Escrows tokens; completes at target. |
| `verify_invoice(campaign_id, invoice_id, amount)` | verifier | `()` | Rejects duplicate invoice IDs. |
| `release_funds(campaign_id, invoice_id, amount, recipient)` | verifier | `i128` released | Recipient must be patient/provider. |
| `refund_campaign(campaign_id)` | verifier | `()` | Active + below target only. |
| `claim_refund(campaign_id, donor)` | donor | `i128` refunded | Full contribution, once. |
| `get_campaign(campaign_id)` | — | `Campaign` | Metadata and live totals. |
| `get_campaigns(start_id, limit)` | — | `Vec<Campaign>` | Paginated, gap-safe. |
| `get_campaign_count()` | — | `u64` | Next campaign counter. |
| `get_contribution(campaign_id, donor)` | — | `i128` | Remaining donor contribution. |
| `get_invoice(campaign_id, invoice_id)` | — | `Option<Invoice>` | Verified invoice + released amount. |

Contract errors are stable numbers (`1`–`12`) and are mapped to readable messages in
`app/lib/carebridge.ts`.

## Prerequisites

- Rust **1.91+** with the `wasm32v1-none` target:
  ```bash
  rustup target add wasm32v1-none
  ```
- A C/C++ linker for native test builds:
  - Windows: Visual Studio Build Tools with the "Desktop development with C++" workload
  - macOS: `xcode-select --install`
  - Linux: `build-essential`
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli)
- Node.js **20+** and npm
- [Freighter wallet](https://www.freighter.app/) for signing

## Deploy to testnet

The deploy scripts build the contract, create and fund a testnet identity, deploy
the wasm, resolve the XLM/USDC Stellar Asset Contract addresses, and write
`app/.env.local`.

PowerShell:

```powershell
.\deploy.ps1
```

Bash (Git Bash, WSL, macOS, Linux):

```bash
chmod +x deploy.sh
./deploy.sh
```

Optional overrides:

```bash
NETWORK=testnet DEPLOYER=my-key CONTRACT_ID=C... ./deploy.sh
USDC_ISSUER=G... ./deploy.sh
```

If you only want to use an existing contract, set `CONTRACT_ID` and the script skips
the build/deploy step. The default USDC issuer is Circle's testnet issuer; override
`USDC_ISSUER` if you use a different asset.

### Environment variables

`app/.env.example` documents the full set. The important ones:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CONTRACT_ID` | Deployed CareBridge contract. |
| `NEXT_PUBLIC_READ_ACCOUNT` | Funded account used for read-only simulations. |
| `NEXT_PUBLIC_XLM_SAC` | XLM Stellar Asset Contract address. |
| `NEXT_PUBLIC_USDC_SAC` | USDC Stellar Asset Contract address. |
| `NEXT_PUBLIC_DEFAULT_TOKEN` | Token preselected in the create form. |
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` or `public`. |

Read-only Soroban simulations still need an existing source account. The deployer
account works well; you can also set any funded testnet account.

## Run the app

```bash
cd app
npm install
npm run dev
```

Open `http://localhost:3000`. The navbar shows a configuration banner until
`NEXT_PUBLIC_CONTRACT_ID` is set.

Typical walkthrough:

1. Connect Freighter on testnet.
2. Open **Start a campaign**, use your wallet as the patient, and set a provider and
   verifier address.
3. Donate from a different funded wallet.
4. Connect the verifier wallet, verify an invoice, then release part of it.
5. To test refunds, create a small campaign, donate below target, connect the
   verifier and choose **Open refunds**, then connect a donor and **Claim refund**.

## Testing and checks

Contract:

```bash
cargo test
stellar contract build
```

Frontend:

```bash
cd app
npm run typecheck
npm run lint
npm run build
```

The contract tests use Soroban's `testutils` and cover initialization, escrow,
completion, invoice-gated releases, invalid recipients, duplicate invoices, refunds,
pagination, and invalid amounts/targets.

## TypeScript bindings

The dashboard ships with a small hand-written typed client in
`app/lib/carebridge.ts`. It mirrors the contract ABI and normalizes Soroban values
for React. To generate the official Stellar bindings instead:

```bash
cd app
npm run bindings
# or from the repo root:
./scripts/generate-bindings.sh
```

Generated files go to `app/lib/generated`.

## Security and trust model

- The contract has no admin key and no upgrade path. Roles are fixed at creation.
- A release requires a verified invoice **and** the verifier signature.
- Funds can only move to the patient or the provider, never to an arbitrary address.
- The contract tracks `raised`, `released`, and `refunded` totals, and refuses
  releases above the remaining escrow.
- Refunds are pull-based: donors claim individually, so one inactive donor cannot
  block everyone else.
- Campaign metadata is public. Never write names, national IDs, diagnoses, or other
  sensitive medical data on-chain. Use a non-sensitive case reference.

### Known limitations

- No on-chain governance or verifier reputation system.
- Invoice verification is only as trustworthy as the chosen verifier.
- Token decimals are displayed as 7 everywhere; custom tokens with different
  decimals need adjustments in `app/lib/format.ts`.
- The dashboard reads campaigns in pages of 50 simulations; very large deployments
  should use an indexer or events.
- This code is not audited. Use testnet before considering production.

## License

Apache-2.0.
