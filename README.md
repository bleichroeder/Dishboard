# Dishboard

Restaurant menu display + editor designed to run on a Raspberry Pi in kiosk mode, with responsive support so the same menu works on a phone.

## What's different from the original

The original Dishboard was a flat `sections[]` array rendered in a fixed grid. This rebuild introduces a **slot model**: every position on a menu is a _slot_, and a slot can hold one section (static — same as before) or many section variants that rotate on a timer. That single primitive solves both the "I've run out of space on breakfast" problem and the "I want a Specials section that rotates every 30s" feature, without making the customer experience worse for static content.

```
Menu
 └─ Slot (with position + optional rotation)
     └─ SectionVariant[]  (1 = static, N = rotating)
         └─ Item[]  (with optional Square link)
```

## Workspaces

| Package           | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `apps/server`     | Fastify API + SQLite, Square sync, schedule resolver |
| `apps/viewer`     | React/Vite menu display (responsive: phone → kiosk)  |
| `apps/editor`     | React/Vite admin UI (login-gated)                    |
| `packages/shared` | Zod schemas + TS types shared by all three apps      |

## Dev quickstart

```bash
npm install
npm run dev   # runs server + viewer + editor in parallel
```

Conventional ports (will be locked in during Phase 1):

- `:3000` — server API
- `:5173` — viewer
- `:5174` — editor

## Project status

In active rebuild. See the roadmap below. The legacy version lives at `C:\Users\David\Desktop\Dishboard` and is referenced only for data migration.

### Roadmap

- [x] Phase 0 — Repo scaffold, workspaces, CI
- [ ] Phase 1 — Server, SQLite schema, migration from legacy `menu.json`, env-configured auth
- [ ] Phase 2 — Viewer: responsive grid, slot rendering (static + rotating), daypart polling
- [ ] Phase 3 — Editor: menu CRUD, slot/variant editing, Square item picker, schedule UI
- [ ] Phase 4 — Square background sync (price + availability)
- [ ] Phase 5 — Raspberry Pi deploy: systemd unit, kiosk autostart, build pipeline

## License

MIT — see [LICENSE](./LICENSE).
