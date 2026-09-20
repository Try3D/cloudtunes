# CloudTunes

A self-hosted music library and streaming app, built for the Big Data Analytics
mini project (Exercise 9 — Cloud-Based Data Management Application).

Upload your own audio files; CloudTunes reads the tags out of them, stores the
audio as objects and the metadata in a relational database, streams the music
back to the browser, and reports on what gets listened to.

| Layer | Local development | On AWS |
|---|---|---|
| Client | Vite dev server `:5173` | Static build served by nginx on EC2 |
| API | Express `:3000` | Express behind nginx on EC2 |
| Database | MySQL 8 in Docker | Amazon RDS for MySQL, private subnet |
| Object storage | MinIO `:9000` | Amazon S3, private bucket |

The two environments run **the same code**. Only environment variables differ,
because MinIO speaks the S3 API and the storage layer talks to both through the
AWS SDK.

Audio is never served straight from the bucket: every byte is proxied by the API,
so the bucket stays private and each request passes the authentication check.

## Features

- **Accounts** — signup and login with bcrypt hashes and server-side sessions.
  The first account registered becomes the admin.
- **Automatic metadata** — title, artist, album, album artist, year, genre, track
  number, duration, bitrate, codec and embedded cover art, read from each file.
- **Streaming with seeking** — HTTP range requests, so the scrubber works.
- **Library views** — search, genre filter, and album and artist pages.
- **Playlists** — drag a track onto a playlist in the sidebar, or use the picker.
- **Duplicate detection** — files are hashed, so the same track can't land twice.
- **Listening analytics** — every play is recorded and aggregated.

## Layout

An npm workspaces monorepo. One `npm install` at the root covers both packages.

```
cloudtunes/
├── package.json              workspace root, scripts for both packages
├── docker-compose.yml        MySQL + MinIO for local development
├── packages/
│   ├── backend/              @cloudtunes/backend — Express API
│   │   ├── src/routes/       auth, library, stream, upload, playlists, analytics
│   │   ├── src/storage/      local and s3 drivers behind one interface
│   │   ├── src/metadata.js   tag extraction and filename fallback
│   │   └── sql/schema.sql
│   └── frontend/             @cloudtunes/frontend — React + Vite client
└── deploy/                   AWS guide, nginx, systemd, setup script
```

## Local development

```bash
npm install                   # installs both workspaces
npm run db:up                 # MySQL + MinIO in Docker, bucket created for you

cp packages/backend/.env.example packages/backend/.env
# set SESSION_SECRET to a random value: openssl rand -hex 32

npm run init-db               # applies packages/backend/sql/schema.sql
npm run dev                   # API on :3000 and client on :5173 together
```

Open <http://localhost:5173> and register. **The first account created becomes
the admin**, which can delete any track and export the play log.

Upload some tracks on the Upload page — drag them in or click to browse. The
analytics dashboard fills in as you listen, since every play is recorded.

Useful extras:

- Run one side only: `npm run dev:api`, `npm run dev:web`
- Browse the bucket: <http://localhost:9001> (`minioadmin` / `minioadmin`)
- Stop the containers: `npm run db:down`

## Configuration

`packages/backend/.env` — see `.env.example` for a working local set.

| Variable | Purpose |
|---|---|
| `PORT` | API port, default 3000 |
| `SESSION_SECRET` | Signs the session cookie. Must be random. |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` | MySQL or RDS connection |
| `DB_SSL_CA` | Path to the RDS CA bundle. Set in production to force TLS. |
| `STORAGE_DRIVER` | `s3` or `local` |
| `S3_BUCKET`, `AWS_REGION` | Bucket to write to |
| `S3_ENDPOINT` | MinIO's address locally. **Leave empty on AWS.** |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | MinIO credentials locally. **Leave empty on AWS** so the SDK uses the instance's IAM role. |
| `MAX_UPLOAD_MB` | Per-file upload limit, default 30 |

## How metadata extraction works

On upload, each file goes through `packages/backend/src/routes/upload.js`:

1. The file is hashed with SHA-256. A matching hash means it's already in the
   library, and the upload is reported as a duplicate instead of stored twice.
2. `music-metadata` reads the embedded tags plus duration, bitrate and codec.
3. Anything missing falls back to the filename. `Artist - Title.mp3` is split on
   the spaced hyphen, and download noise — UUIDs, trailing hashes, leading track
   numbers, slug separators — is stripped, so
   `816_moonlight-sonata-f4a8573c-….mp3` becomes *Moonlight Sonata*.
4. Embedded cover art is extracted and stored as its own object.
5. The audio is stored as `audio/<uuid>.<ext>` and the row is written to MySQL.

Each file is handled independently, so one bad file doesn't abort a batch.

## Storage drivers

`STORAGE_DRIVER` picks the driver. Both implement the same interface — `put`,
`getRange`, `remove`, `healthy` — so nothing else in the app changes.

| Value | Behaviour |
|---|---|
| `s3` | Writes to `S3_BUCKET`. Uses `S3_ENDPOINT` and key pair if set (MinIO), otherwise the EC2 instance's IAM role (Amazon S3). |
| `local` | Writes to `packages/backend/storage/`. No containers needed. |

`GET /api/health` reports which driver is live: `{"db":"ok","storage":"ok","driver":"s3"}`.

## API

All routes are under `/api` and require a session except signup, login and health.

| Method | Route | Notes |
|---|---|---|
| POST | `/signup`, `/login`, `/logout` | bcrypt, session cookie; login is rate-limited to 10 attempts per 15 minutes |
| GET | `/me` | Current user, or `null` |
| GET | `/songs` | `?q=&genre=&artist=&album=&limit=&offset=` |
| GET | `/songs/:id` | Full metadata for one track |
| DELETE | `/songs/:id` | Uploader or admin; removes the objects too |
| GET | `/albums`, `/artists`, `/genres` | Grouped views with counts |
| GET | `/stream/:id` | Audio proxy, supports HTTP range (`206`) |
| GET | `/cover/:id` | Cover art proxy |
| POST | `/play/:id` | Records a play |
| POST | `/upload` | multipart, up to 20 files per request |
| GET/POST | `/playlists` | List and create |
| GET/PATCH/DELETE | `/playlists/:id` | Read, rename, delete — ownership-checked |
| POST/DELETE | `/playlists/:id/songs` | Add or remove a track |
| GET | `/analytics` | Dashboard aggregates |
| POST | `/export` | Admin only; writes the play log as CSV to `exports/` |
| GET | `/health` | `{db, storage, driver}` |

## Analytics

`/api/analytics` runs aggregate SQL over `play_history`: top tracks, top artists,
plays per genre, listening by hour of day, a 30-day trend, the most active
listeners, and library totals.

`POST /api/export` dumps the raw play log to object storage as CSV. That is the
hand-off point for batch processing — a Hadoop MapReduce job over `exports/`
ties this back to Exercises 3 and 4.

## Security

| Concern | Handling |
|---|---|
| Passwords | bcrypt, cost 12; never stored or logged in plain text |
| Sessions | Server-side in MySQL; `httpOnly`, `sameSite=lax`; id regenerated on login |
| Credentials | None in code — MinIO keys come from the env file, AWS from the IAM role |
| Object storage | Bucket private; audio only reachable through an authenticated route |
| Database | Parameterised queries throughout; TLS enforced via `DB_SSL_CA` in production |
| Network (AWS) | RDS in private subnets with no internet route; security groups chained EC2 → RDS |
| Uploads | Extension and size limits, and a rate-limited login path |

HTTPS is deliberately out of scope for this project, so cookies are not `secure`.
