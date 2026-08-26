# Cloud Ship 100

High-tech **logistics ERP frontend demo** (React + Vite + JavaScript) with dummy data for road, rail, maritime, and air operations.

## Quick start

```bash
cd CloudShip100
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Demo logins

Use **Login** and pick a role (no real passwords):

- **Operator** → full ERP (`/app/dashboard`)
- **Customer** → account + deliveries portal

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## Deploy on Vercel

1. Push this folder to a Git repo (or import the project in Vercel).
2. Framework preset: **Vite**.
3. `vercel.json` already rewrites SPA routes to `index.html`.

## Stack

- React 19 + Vite
- Tailwind CSS 4
- React Router
- Recharts
- React Leaflet / OpenStreetMap
- Lucide icons

Frontend only — swap `src/services/api.js` later for real APIs.
