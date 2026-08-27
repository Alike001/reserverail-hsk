# ReserveRail Web

Static React/TypeScript client built with Vite.

```bash
pnpm install --frozen-lockfile
pnpm --dir apps/web dev
pnpm --dir apps/web typecheck
pnpm --dir apps/web lint
pnpm --dir apps/web test
pnpm --dir apps/web build
```

The scaffold does not contain a deployed pilot or simulated chain state. Public HSK reads and
wallet actions will be enabled only through checked configuration and verified manifests.

`VITE_` environment variables are public browser configuration. Never store a private key,
wallet secret, or service credential in them.
