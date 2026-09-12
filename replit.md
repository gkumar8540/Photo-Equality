# Luma local

Luma local is a browser-only photo editor that lets people adjust, crop, filter, rotate, and export images without uploading them anywhere.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/photo-editor run dev` — run the photo editor preview
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS
- Image processing: browser-side Canvas APIs only
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/photo-editor/src/App.tsx` — single-page editor experience and Canvas editing state
- `artifacts/photo-editor/src/index.css` — editor theme, layout utilities, slider styling, and responsive rules
- `artifacts/photo-editor/public/` — static favicon and robots assets
- `artifacts/api-server/` — shared API server scaffold; the photo editor does not depend on it

## Architecture decisions

- Image files are kept local with object URLs and drawn into a Canvas; no backend or external image service is required.
- The editor keeps the original file untouched and derives the live preview from current controls, rotation, and crop state.
- The app exports the current Canvas as a PNG so adjustments and crop are reflected in the downloaded output.
- The root artifact is a static Vite app and is intentionally compatible with Vercel-style static deployment.

## Product

- Drag/drop or choose an image from the device
- Live brightness, contrast, saturation, and blur controls
- Customizable Original, Noir, Warm, Cool, Vintage, Fade, and Drama filters
- Pointer/touch crop overlay and 90-degree rotation controls
- Full-size PNG download with reset and local privacy messaging

## User preferences

- Keep the editor responsive, clean, fast, and professional.
- Keep image processing browser-side with no backend, API, or database.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
