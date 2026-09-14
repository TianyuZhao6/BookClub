# BookClub

A React and Express application for discovering books, saving a personal library, tracking read/unread status, and rating books. Recommendations use Google Books and your selected genres.

## Hosted preview and single-process development

The optional Sites target in `hosted/` serves the existing React frontend and its API on the same origin. It uses a persistent D1 SQLite database; the original Express/MongoDB deployment below remains available. The hosted database starts empty and does not copy or replace any existing MongoDB data.

Requires Node.js **22.13 or newer** (the development adapter uses `node:sqlite`):

```sh
npm ci
npm ci --prefix frontend
npm run dev
```

Open **http://localhost:4173**. This runs both the Vite frontend and the real hosted API with a persistent local database in `.sites-runtime/bookclub.sqlite`. To use the original Express API, follow the separate setup below. Do not run both development targets on the same frontend port.

```sh
npm run test:hosted
npm run build
```

The hosted build produces `dist/client` and `dist/server/index.js` with the API URL fixed to `/api`. Sites uses the existing `.openai/hosting.json` project and its `DB` D1 binding. Drizzle migrations under `drizzle/` are included in the build and applied by hosting during deployment. Run `npm run db:generate` after schema changes; do not edit applied migrations. Runtime API handlers never create tables.

`GOOGLE_API_KEY` is optional. When Google Books times out or rejects a request, the hosted target supplies a clearly labeled collection of real classic books. These books still use real account/library/rating operations. There are no demo accounts or fabricated user ratings. For broader live discovery, configure your own Google Books API key and quota in the hosting environment. No email delivery is implemented or required.

## Run locally with Express and MongoDB

Requires **Node.js 22.12 or newer**, npm, and MongoDB 7 (local installation, Docker, or an Atlas connection).

```sh
npm run setup
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Set a random `SESSION_SECRET` in `backend/.env` (generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). Set `MONGODB_URI` to your own database. Never commit credentials.

If using Docker, start the included local database:

```sh
docker compose up -d mongo
```

Start the API and frontend in separate terminals:

```sh
npm run dev --prefix backend
```

```sh
npm start --prefix frontend
```

Open **http://localhost:3000**. The API listens on **http://localhost:3001**; `/health` returns JSON once startup succeeds. Create an account, select at least five genres, and return Home to discover books. Accounts and libraries persist in MongoDB. Login persists in the current browser tab across refreshes, with a 24-hour server session expiry.

`GOOGLE_API_KEY` is optional for limited anonymous Google Books access. For reliable use, configure your own enabled Google Books API key and quota. Search failures show a retry message instead of crashing the application.

## Features

- Create/login/logout/delete an account; change password with current-password confirmation.
- View account information and update genre preferences.
- Discover books, flip cards for details, accept or reject recommendations, undo a rejection.
- Persist accepted books once, filter by genre and reading status, remove books without stale entries.
- Mark library books read/unread; rate read books with one editable 1–5 star rating per user.
- Private endpoints enforce session validity and account ownership; API responses never contain password hashes.

## Verification

```sh
npm test
npm run build:frontend
```

Backend tests start and stop a disposable MongoDB using `mongodb-memory-server`; they do not use `MONGODB_URI` or modify your real database. The first run needs network access to download the MongoDB binary, and the host must permit running MongoDB. Google search responses are stubbed in integration tests so upstream quota/network availability does not affect repeatability. Frontend tests exercise signup/session persistence, protected routes, rejection/undo, library refresh/removal, logout, and error recovery.

GitHub Actions runs the MongoDB, frontend, and hosted SQLite test suites, the production frontend build, and production dependency audit checks. Historical Cucumber feature files and step definitions are preserved in `backend/tests/features` as reference material; the old steps shared database state, skipped assertions, and depended on a live server/Google API. The executable regression suite is now `backend/tests/integration`.

## Deployment configuration

For a separate Express deployment, run `npm run build:frontend` with `VITE_API_URL=https://your-api-host` set **at build time**, then serve `frontend/build`. Configure your static host to rewrite non-file routes to `index.html` so links such as `/myLibrary` work on refresh. The API needs a Node host and MongoDB; static hosting alone cannot run it.

Set `NODE_ENV=production`, `SESSION_SECRET`, `MONGODB_URI`, `FRONTEND_ORIGIN` (the exact frontend origin), optional `GOOGLE_API_KEY`, and optional `PORT` on the API host. Use HTTPS and one trusted reverse proxy (the server trusts one proxy hop). `npm start --prefix backend` runs the API; it exits with a useful error if required configuration or the database is unavailable.

Existing users and books are retained. Existing login sessions must sign in again because sessions now bind to the account ID. The original book-title identity is retained for compatibility: separate editions with the same title share a library entry. Historical aggregate ratings remain visible until the book receives new per-user ratings; old anonymous aggregates cannot be attributed to users.
