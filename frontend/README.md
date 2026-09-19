# CloudShip frontend

React + Vite operator, customer, and driver portals for the CloudShip logistics API.

## Quick start

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_URL` to the backend origin (default `http://localhost:3000/v1`). Open the URL Vite prints, usually `http://localhost:5173`.

## Accounts

Signup, login, email verification, and password reset are live against the backend.

- **Customer** — register, verify email, then book and track shipments.
- **Driver** — register, wait for operator approval, then receive assignments and share phone GPS.
- **Operator** — invited by an administrator. There is no public operator signup.

SMTP must be configured on the API in production so verification and reset emails can send.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## Deploy on Vercel

1. Import the `frontend` folder (or the repo with the Vite root set to `frontend`).
2. Framework preset: **Vite**.
3. `vercel.json` already rewrites SPA routes to `index.html`.
4. Set `VITE_API_URL` to the deployed API.

## Stack

- React 19 + Vite
- Tailwind CSS 4
- React Router
- Recharts
- React Leaflet / OpenStreetMap
- Lucide icons

The UI talks to the CloudShip backend. Dummy demo logins and in-memory sample tables are not used.
