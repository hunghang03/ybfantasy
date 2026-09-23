# Deployment

The app is a **static export** (`output: 'export'` in `next.config.ts`). It needs no server, no API routes, no database and no environment variables. It fits the Vercel Hobby (free) tier.

## Vercel

1. Import the GitHub repository in Vercel. The framework (Next.js) is auto-detected.
2. Build command: `npm run build`. Output: handled by Next (static export to `out/`).
3. No environment variables are needed (see `.env.example`).
4. `vercel.json` adds security headers:
   - CSP (`default-src 'self'`, no third-party origins)
   - `X-Frame-Options: DENY`, `nosniff`, referrer and permissions policies
   - `no-cache` for `sw.js`
5. Deploy. The app registers its service worker on first load. After that, the draft works offline.

## Any static host

```bash
npm ci
npm run build          # → out/
npx serve out          # or upload out/ to any static host
```

## Before a draft

1. Open the deployed app on the laptop you will draft on.
2. Import data (or restore a backup), then open **Draft** once so everything is cached.
3. Export a backup (Leagues → Export full backup) as a safety copy.
4. During the draft, a network outage does not matter. The badge must read **Saved locally**.

## Security notes

- There are no secrets. There is nothing server-side.
- Imports are parsed as data only, with size/row limits, schema validation and text sanitization.
- React escaping is used everywhere. No `dangerouslySetInnerHTML`.
- `npm audit` currently reports 0 vulnerabilities.
- Phase 2 Supabase would use the anon key only, plus RLS (see ARCHITECTURE.md).
