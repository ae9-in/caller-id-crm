# Call Intelligence CRM

A production-ready SaaS CRM platform for outreach, sales, and placement teams that make high volumes of calls.

## Features

- 📞 **Call Recording Management** — Upload, transcribe, and analyze call recordings
- 🤖 **AI Transcription** — OpenAI Whisper for transcription + GPT-4o for summaries
- 🏢 **Business CRM** — Full CRM with timeline, notes, follow-ups
- 📊 **Analytics Dashboard** — Charts, leaderboard, team performance
- 🔔 **Notifications** — In-app follow-up reminders and alerts
- 🔒 **Role-Based Access** — Admin, Manager, Agent roles
- 🔍 **Global Search** — Full-text search across businesses, calls, transcripts

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| Backend | Node.js, Express.js |
| Database | PostgreSQL 15 |
| Auth | JWT + bcrypt |
| Storage | AWS S3 / Cloudflare R2 |
| AI | OpenAI Whisper + GPT-4o |

## Prerequisites

- **Node.js** v18+ — [Download](https://nodejs.org)
- **PostgreSQL Database** — (Using Neon DB cloud instance, or local PostgreSQL instance)
- **Git** (optional)

## Quick Start

### 1. Configure Environment

We have pre-configured the database connections to use your **Neon DB** cloud instance.

```bash
# Copy example env file for server if not already done
copy server\.env.example server\.env
```

Ensure `server\.env` has the `DATABASE_URL` configured:
`DATABASE_URL=postgresql://neondb_owner:npg_3iFGCTUj7XEz@ep-proud-band-at863xzm-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`

And fill in additional optional parameters if desired:
- `OPENAI_API_KEY` (optional — AI features disabled without it)
- `AWS_*` or `R2_*` keys (optional — storage disabled without it)

### 2. Initialize the Database

Once Node.js is installed, run the database setup script from the `server` directory to create the tables, indexes, triggers, and populate the database with the realistic placement/education sector seed data:

```bash
cd server
npm run db:setup
```

### 3. Install Dependencies & Start

Once Node.js is installed:

```bash
# In server directory:
npm install

# In client directory:
cd ../client
npm install
```

### 4. Start Development Servers

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
```

Open http://localhost:3000

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@callcrm.com | password |
| Manager | manager@callcrm.com | password |
| Agent | agent1@callcrm.com | password |

> **Note**: The seed data uses bcrypt hash for "password" — update this in production.

## Database Access

- **pgAdmin**: http://localhost:5050
  - Email: admin@callcrm.com
  - Password: admin123
- **PostgreSQL**: localhost:5432
  - Database: callcrm_db
  - User: callcrm / callcrm_secret

## Project Structure

```
AE/
├── client/          # React frontend (Vite)
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── pages/       # Route-level page components
│       ├── context/     # React context (Auth, Notifications)
│       ├── hooks/       # Custom hooks
│       ├── services/    # API service modules
│       └── utils/       # Formatters, constants
├── server/          # Node.js backend (Express)
│   ├── src/
│   │   ├── controllers/ # Route handler logic
│   │   ├── middleware/  # Auth, RBAC, upload, error handling
│   │   ├── routes/      # Express routers
│   │   ├── services/    # AI, storage, email services
│   │   └── jobs/        # Background processing
│   └── database/
│       ├── schema.sql   # PostgreSQL schema
│       └── seed.sql     # Sample data
└── docker-compose.yml
```

## API Documentation

Base URL: `http://localhost:5000/api`

Health check: `GET /health`

### Auth
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | /auth/login | Login |
| GET | /auth/me | Current user |
| POST | /auth/change-password | Change password |
| POST | /auth/forgot-password | Request reset link |

### Businesses
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | /businesses | List (paginated, filtered) |
| POST | /businesses | Create |
| GET | /businesses/:id | Get detail |
| PUT | /businesses/:id | Update |
| DELETE | /businesses/:id | Delete |
| GET | /businesses/:id/timeline | Activity timeline |
| GET | /businesses/:id/calls | Associated calls |
| GET/POST | /businesses/:id/notes | Notes |

### Calls
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | /calls | List with filters |
| POST | /calls/upload | Upload audio file |
| GET | /calls/:id | Detail |
| GET | /calls/:id/transcript | AI transcript |
| GET | /calls/:id/summary | AI summary |
| POST | /calls/:id/reprocess | Re-run AI |

## Environment Variables

See `server/.env.example` for all variables.

Key variables:
- `OPENAI_API_KEY` — Required for AI transcription/analysis
- `AWS_S3_BUCKET` / `R2_BUCKET` — Required for cloud storage
- `JWT_SECRET` — **Change in production!**

## Production Deployment

1. Build frontend: `cd client && npm run build`
2. Set `NODE_ENV=production` on server
3. Use a process manager: `pm2 start server.js`
4. Set up nginx to serve client build and proxy `/api` to server
5. Use managed PostgreSQL (AWS RDS, Supabase, Neon)
6. Configure S3 or R2 for recording storage

## Future AI Features (Placeholders)

- **Pitch Compliance Checker** — Compare transcript vs official pitch
- **Sentiment Analysis** — Real-time conversation sentiment
- **Objection Detection** — Identify budget/vendor objections
- **AI Coaching** — Per-agent improvement suggestions
- **AI Call Scoring** — Pitch, confidence, engagement scores
