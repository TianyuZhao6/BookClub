# BookClub frontend

React 17, Vite, and Vitest. See the repository [README](../README.md) for full setup and backend configuration.

- `npm ci` — install locked dependencies.
- `npm start` — development server on port 3000.
- `npm test` — UI regression tests.
- `npm run build` — production files in `build/`.
- `npm run preview` — inspect the production build locally.

Copy `.env.example` to `.env`; `VITE_API_URL` configures the backend URL at build time. This replaces the previous Create React App tooling.
