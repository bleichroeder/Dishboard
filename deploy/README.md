# Dishboard — Raspberry Pi deploy

Templates for running Dishboard on a Pi connected to a TV.

| File                      | What it is                                                           |
| ------------------------- | -------------------------------------------------------------------- |
| `dishboard.service`       | systemd unit that runs the Fastify server (serves API + UI + viewer) |
| `dishboard-kiosk.desktop` | LXDE/XDG autostart entry that boots Chromium into kiosk mode         |

Both files use `__INSTALL_DIR__` and `__USER__` placeholders — substitute them with `sed` during install. See the **Raspberry Pi deploy** section in the top-level README for the full walkthrough.
