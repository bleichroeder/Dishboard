# Dishboard

Restaurant menu display + editor designed to run on a Raspberry Pi in kiosk mode, with responsive support so the same menu works on a phone.

## What's different from the original

The original Dishboard was a flat `sections[]` array rendered in a fixed 3-column grid. This rebuild introduces two new primitives:

1. **Templates with named regions.** A menu picks a template (e.g. `classic-3col`, `featured-strip`, `dense-single`, `quad`), and each template declares its own grid layout for kiosk / tablet / phone. Slots assign to a region by name, not coordinates. Responsiveness is baked into the template, not retrofitted per menu.
2. **Slots with rotating variants.** A slot holds one section variant (static — same as before) or many that rotate on a timer. Used surgically — typically only for a "Featured" or "Specials" slot — it adds dynamic capability without churning the parts of the menu customers are actively reading.

```
Menu (templateId)
 └─ Slot (regionId, order, optional rotation)
     └─ SectionVariant[]  (1 = static, N = rotating)
         └─ Item[]  (with optional Square link)
```

Between the two: breakfast can switch templates to relieve overflow ("dense-single" or "featured-strip") without the customer experience degrading, and the editor never asks anyone to type grid coordinates.

## Workspaces

| Package           | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `apps/server`     | Fastify API + SQLite, Square sync, schedule resolver |
| `apps/viewer`     | React/Vite menu display (responsive: phone → kiosk)  |
| `apps/editor`     | React/Vite admin UI (login-gated)                    |
| `packages/shared` | Zod schemas + TS types shared by all three apps      |

## Layout model

Menus pick a **template**, not a grid. Each template defines a set of named **regions** and a CSS-grid layout for kiosk / tablet / phone breakpoints. Slots reference a region by ID; responsiveness comes for free from the template. Starter templates live in [`packages/shared/src/templates.ts`](./packages/shared/src/templates.ts):

| Template ID      | Shape                                          |
| ---------------- | ---------------------------------------------- |
| `classic-3col`   | 3 columns × 2 rows. Mirrors the legacy layout. |
| `featured-strip` | Full-width hero on top, 3 columns below.       |
| `dense-single`   | One tall column. Pair with `list` / `compact`. |
| `quad`           | 2×2 grid of four large equal regions.          |

## Dev quickstart

```bash
npm install
cp apps/server/.env.example apps/server/.env   # fill in ADMIN_PASSWORD_HASH + COOKIE_SECRET
npm run dev                                    # runs server + viewer + editor in parallel
```

Ports:

- `:3000` — server API
- `:5173` — viewer
- `:5174` — editor

If port 3000 is reserved on your machine (common on Windows with WSL2/Docker port exclusions), run the server on another port and point the dev clients at it:

```bash
# server
PORT=3001 npm run dev -w @dishboard/server
# viewer / editor
VITE_SERVER_URL=http://localhost:3001 npm run dev -w @dishboard/viewer
```

### Generating admin credentials

```bash
node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" "yourpassword"
```

### Importing data from the legacy Dishboard

```bash
cd apps/server
npm run migrate:legacy                                              # default path
npm run migrate:legacy -- "C:\path\to\legacy\Dishboard"             # custom path
```

The migration reads `Menus/*/menu.json` and `schedule.json`, builds menus using the `classic-3col` template (mapping `gridPosition` 1–6 to regions r1–r6), and seeds the SQLite database. Re-running is safe — it upserts by menu ID, so a fresh run produces fresh IDs and won't overwrite existing menus.

## API

| Method | Path                       | Auth | Notes                       |
| ------ | -------------------------- | ---- | --------------------------- |
| GET    | `/health`                  |      | liveness probe              |
| GET    | `/api/templates`           |      | static template registry    |
| GET    | `/api/menus`               |      | list                        |
| GET    | `/api/menus/:slug`         |      | full menu                   |
| POST   | `/api/menus`               | ✓    | create                      |
| PUT    | `/api/menus/:slug`         | ✓    | replace                     |
| DELETE | `/api/menus/:slug`         | ✓    |                             |
| GET    | `/api/schedule`            |      | full schedule               |
| GET    | `/api/schedule/current`    |      | resolve menu for now        |
| PUT    | `/api/schedule`            | ✓    | replace                     |
| GET    | `/api/integrations`        |      | status (no secrets leaked)  |
| PUT    | `/api/integrations/square` | ✓    | save Square access token    |
| DELETE | `/api/integrations/square` | ✓    | remove Square token         |
| GET    | `/api/square/search?q=`    | ✓    | proxy Square catalog search |
| POST   | `/api/square/sync`         | ✓    | trigger immediate sync      |
| POST   | `/api/auth/login`          |      | sets signed session cookie  |
| POST   | `/api/auth/logout`         |      |                             |
| GET    | `/api/auth/me`             |      | check session               |

## Project status

In active rebuild. The legacy version lives at `C:\Users\David\Desktop\Dishboard` and is read-only reference for data migration.

### Roadmap

- [x] Phase 0 — Repo scaffold, workspaces, CI
- [x] Phase 1 — Server, SQLite, slot+template schema, legacy migration, env-configured auth
- [x] Phase 2 — Viewer: template renderer, slot rendering (static + rotating), daypart polling
- [x] Phase 3 — Editor: menu CRUD, slot/variant editing, schedule UI
- [x] Phase 4 — Square integration: token settings, item picker, background price/availability sync
- [ ] Phase 5 — Raspberry Pi deploy: systemd unit, kiosk autostart, build pipeline

## License

MIT — see [LICENSE](./LICENSE).
