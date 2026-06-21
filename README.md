# Fluxi

Live URL switcher — a minimal, self-hosted system that displays any embeddable website on a screen and lets you change it remotely via a Chrome Extension, with zero page refresh.

## How it works

```
Chrome Extension  ──POST /api/url──►  Backend (Node.js)
                                          │
                                     saves state (current-url.json)
                                          │
                                     broadcasts via WebSocket
                                          │
                                          ▼
                                    Frontend (iframe)
                                    src updated in real time
```

- **Backend** — single Node.js process, no framework. Exposes `POST /api/url` (API Key auth), serves the static frontend, and pushes updates via WebSocket.
- **Frontend** — static HTML page with a full-viewport `<iframe>`. Connects via WebSocket and updates `iframe.src` on every `url-update` event.
- **Chrome Extension** — Manifest V3 popup to send the current tab URL or a manual URL to the backend.
- **State** — persisted to `current-url.json` (atomic writes). Survives restarts.
- **Deployment** — single Docker container on a Raspberry Pi.

## Quick start

```bash
cp .env.example .env
# edit FLUXI_API_KEY in .env
docker compose up -d
```

Load the extension from `chrome://extensions/` (Developer mode → Load unpacked → `extension/`).

## API

```
POST /api/url
Content-Type: application/json
X-API-Key: <secret>

{"url": "https://example.com"}
```

Responses: `200` ok, `400` bad URL, `401` bad key, `429` rate limited.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `FLUXI_API_KEY` | — | Secret for API authentication (min 32 chars) |
| `FLUXI_CORS_ORIGINS` | `*` | Comma-separated allowed origins (`*.domain.com` wildcard supported) |
| `PORT` | `3000` | Server port |
