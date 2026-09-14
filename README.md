# BookClub

A React and Express application for discovering books, saving a personal library, tracking read/unread status, and rating books. Recommendations use Open Library and your selected genres, with search by title or author.

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

Discovery uses the public Open Library subject/search and work APIs without a key. Requests are cached briefly and have timeouts. A configured `GOOGLE_API_KEY` provides a secondary provider; if live providers fail, a clearly labeled collection of 36 classics remains browsable. Curated descriptions are original summaries; cover images and work links come from Open Library. Missing or unavailable covers use the existing local placeholder, and unavailable summaries are stated explicitly. No demo accounts or fabricated user ratings are created. No email delivery is implemented or required.

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

The catalog uses the same Open Library adapter as the hosted target. `GOOGLE_API_KEY` is optional as a secondary provider. Existing legacy API calls without catalog parameters retain their prior response shape.

## Features

- Create/login/logout/delete an account; change password with current-password confirmation.
- View account information and update genre preferences.
- Browse real book covers, titles, authors and summaries; search, filter genres, and page through results.
- Open details from any cover, move between books, hide recommendations, and undo a rejection.
- Watch the cover wall scroll automatically. Hover or keyboard focus pauses that column; leaving resumes it. Opening details pauses the whole wall. The Pause/Resume control stops all columns, and reduced-motion preferences disable animation.
- Save favourites using **Save to my library**. Favourites and the reading list share the existing personal library; repeated saves do not create duplicate entries.
- Create an account from either the login page or login popup.
- Persist accepted books once, filter by genre and reading status, remove books without stale entries.
- Mark library books read/unread; rate read books with one editable 1–5 star rating per user.
- Private endpoints enforce session validity and account ownership; API responses never contain password hashes.

## Verification

```sh
npm test
npm run build:frontend
```

Backend tests start and stop a disposable MongoDB using `mongodb-memory-server`; they do not use `MONGODB_URI` or modify your real database. The first run needs network access to download the MongoDB binary, and the host must permit running MongoDB. Google search responses are stubbed in integration tests so upstream quota/network availability does not affect repeatability. Frontend tests exercise signup/session persistence, protected routes, rejection/undo, library refresh/removal, logout, and error recovery.

GitHub Actions runs the MongoDB, frontend, hosted SQLite and catalog adapter suites, both production builds, and production dependency audit checks. Chromium end-to-end checks start the real hosted API and frontend, exercise hover pause/resume and clickable details, account creation, saving/removing books, library persistence, responsive layout, and reduced motion. Browser screenshots and failure traces are uploaded with the workflow run. Historical Cucumber feature files and step definitions are preserved in `backend/tests/features` as reference material; the old steps shared database state, skipped assertions, and depended on a live server/Google API. The executable regression suite is now `backend/tests/integration`.

## Deployment configuration

For a separate Express deployment, run `npm run build:frontend` with `VITE_API_URL=https://your-api-host` set **at build time**, then serve `frontend/build`. Configure your static host to rewrite non-file routes to `index.html` so links such as `/myLibrary` work on refresh. The API needs a Node host and MongoDB; static hosting alone cannot run it.

Set `NODE_ENV=production`, `SESSION_SECRET`, `MONGODB_URI`, `FRONTEND_ORIGIN` (the exact frontend origin), optional `GOOGLE_API_KEY`, and optional `PORT` on the API host. Use HTTPS and one trusted reverse proxy (the server trusts one proxy hop). `npm start --prefix backend` runs the API; it exits with a useful error if required configuration or the database is unavailable.

Existing users and books are retained. Existing login sessions must sign in again because sessions now bind to the account ID. The original book-title identity is retained for compatibility: separate editions with the same title share a library entry. Historical aggregate ratings remain visible until the book receives new per-user ratings; old anonymous aggregates cannot be attributed to users.

## Catalog API and browser checks

The existing discovery endpoints accept `catalog=1&page=1&search=title-or-author`; authenticated recommendations also accept `genre=Fiction`. Catalog responses contain `data.book` (an array), `source`, `page`, `hasMore`, and `total`. Recommendations omit saved and rejected titles from each provider page, so a page can be empty while another page remains available. Book details are loaded on demand through the existing book endpoint using `?work=OL66554W`. No database migration or replacement authentication system is required.

The automated browser suite can also be run locally after the normal hosted installation:

```sh
npm install --no-save --package-lock=false @playwright/test@1.55.0
npx playwright install chromium
npx playwright test
```

Tests create disposable accounts in the local development database. Use a disposable checkout/database for browser tests; hosted unit tests use isolated temporary databases. A passing GitHub build does not deploy a new Sites version automatically.
