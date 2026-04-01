# Watchlist

Personal media tracker for movies and series with a React frontend, Express API, and MongoDB persistence.

## Stack

- Frontend: Next.js app router with React and the existing UI components
- Backend: Express + Mongoose
- Database: MongoDB
- Validation: Zod
- External metadata: OMDb for ratings, TMDb for posters and release metadata

## Features

- Track movies and series in one shared media model
- CRUD for media items and categories
- Many-to-many category assignment on media items
- Server-side filtering, sorting, and title search
- Random category picker
- Random media picker with planned-first default behavior
- Dashboard counts driven by real data
- Add/edit forms for both movies and series
- Conditional series-only fields
- Seed script for your catalog data
- Optional OMDb and TMDb metadata enrichment

## Environment

Copy `.env.example` to `.env` and adjust values if needed.

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/watchlist
PORT=4000
CLIENT_ORIGIN=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
OMDB_API_KEY=your_omdb_api_key
TMDB_READ_ACCESS_TOKEN=your_tmdb_read_access_token
```

## Setup

1. Install dependencies.

```bash
npm install
```

2. Make sure MongoDB is running locally.

3. Seed the database.

```bash
npm run seed
```

4. Optional: backfill ratings and metadata for existing items.

```bash
npm run sync:metadata
```

5. Start the frontend and backend together.

```bash
npm run dev
```

- Frontend: `http://localhost:3000`
- API: `http://localhost:4000`

## Scripts

- `npm run dev`: starts frontend and backend in watch mode
- `npm run dev:client`: starts the Next.js frontend
- `npm run dev:server`: starts the Express server with `tsx`
- `npm run seed`: seeds MongoDB with your configured catalog data
- `npm run sync:metadata`: fetches OMDb ratings and TMDb metadata for existing library items
- `npm run build`: builds the frontend and compiles the server
- `npm run start:client`: starts the production frontend build
- `npm run start:server`: starts the compiled server from `server/dist`

## API

### Categories

- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`

### Media

- `GET /api/media`
- `GET /api/media/:id`
- `POST /api/media`
- `PUT /api/media/:id`
- `DELETE /api/media/:id`
- `POST /api/media/sync-metadata`
- `POST /api/media/:id/sync-metadata`

Supported query params for `GET /api/media`:

- `type=movie|series`
- `status=planned|watching|completed`
- `categoryId=<id>`
- `search=<title text>`
- `sortBy=title|rating|createdAt`
- `sortOrder=asc|desc`

### Random

- `GET /api/random/category`
- `GET /api/random/media`

Supported query params for `GET /api/random/media`:

- `type=movie|series`
- `status=planned|watching|completed`
- `categoryId=<id>`

If `status` is omitted on random media, the API tries planned items first and falls back to any matching item when no planned result exists.

## Notes

- Category deletion removes category references from media items without deleting the media.
- Ratings allow decimal values from 1 to 10 and are only valid for completed items.
- When `OMDB_API_KEY` and `TMDB_READ_ACCESS_TOKEN` are configured, new and updated items are enriched automatically with OMDb ratings and TMDb metadata when fields are missing.
- Use `npm run sync:metadata` to backfill existing library items from OMDb and TMDb.
- Movies and series share one collection and are distinguished by `type`.