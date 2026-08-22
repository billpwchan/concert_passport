# Contributing

## Product invariants

1. Never present illustrative, community, or machine-extracted data as verified live truth.
2. Store ticket milestones with an explicit venue time zone and source evidence.
3. Only label an outbound destination official after domain and event-level authorization checks.
4. Do not add queue automation, CAPTCHA workarounds, stored seller credentials, or unofficial resale.
5. Keep public Passport output structurally separate from ticket codes, seats, exact future travel, and private notes.

## Before opening a change

For web changes run:

```bash
cd apps/web
npm test
npm run lint
npm run typecheck
npm run build
```

For lifecycle changes also run:

```bash
cd apps/ios
swift test
```

Schema changes require a checked-in Drizzle migration. Source changes require a tier, market list, capability list, host, and an operations note explaining the authority boundary.

## Git

Use focused commits with an imperative subject. Do not commit credentials, local D1 state, generated build output, derived data, or user ticket material.
