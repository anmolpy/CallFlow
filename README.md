# CallFlow

Full-stack customer-support call management platform built with **Java 21**, **Spring Boot 3**, **PostgreSQL**, **Flyway**, **Spring Security (JWT)**, **OpenAPI 3**, **React + TypeScript + Vite + Tailwind CSS**, **Docker Compose**, and **GitHub Actions**.

---

## Hosted Live Site vs. Local Development

### What a Live User on the Hosted Frontend Can Use
When `frontend/` is deployed as a static SPA (for example via [frontend/vercel.json](frontend/vercel.json)) **without** a publicly hosted CallFlow backend URL configured:

- **Available live**:
  - The interactive 3D telephone-era landing showcase at `/` (`LandingPage`)
  - Below-the-fold product capability tour, live preview card, and static API overview (`#api-overview`)
  - Client-side navigation to `/login`
- **Limitations without a connected backend**:
  - **Authentication & console pages do not persist or load live data**: Signing in at `/login` and accessing `/dashboard`, `/customers`, `/customers/:id`, `/calls`, `/calls/:id`, or `/agents` requires a reachable Spring Boot API and PostgreSQL database (`VITE_API_BASE_URL` pointing to a deployed backend or a reverse proxy under `/api`).
  - With no backend deployed remotely, login requests (`POST /api/auth/login`) fail because there is no API server or database behind the static site.

### What You Can Use Running Locally
Running CallFlow locally (via Docker Compose or Maven + Vite) spins up the complete stack — **PostgreSQL + Spring Boot API + React UI** — giving you every feature end to end:

- **Full Authenticated Operations Console**:
  - **Login (`/login`)**: Stateless JWT authentication (`POST /api/auth/login`, `GET /api/auth/me`) with automatic `dev` user seeding when enabled in `.env`
  - **Dashboard (`/dashboard`)**: Call KPIs, completion/missed rates, status breakdown bars, live queue snapshot, and per-agent performance table
  - **Customers (`/customers`, `/customers/:id`)**: Searchable, sortable, paginated customer directory, create/edit customer modals with validation & conflict detection, and chronological customer call histories
  - **Calls (`/calls`, `/calls/:id`)**: Multi-filter call queue (keyword, status, agent, UTC date range, sort), call logging modal, agent assignment, lifecycle transitions (`QUEUED -> IN_PROGRESS -> COMPLETED / MISSED / CANCELLED`), duration calculation, and chronological call notes
  - **Agents (`/agents`)**: Agent directory, live availability updates (`AVAILABLE`, `BUSY`, `AWAY`, `OFFLINE`), and `ADMIN`-restricted agent creation/editing
- **Interactive API Docs & Health**:
  - Swagger UI at `http://localhost:8080/swagger-ui/index.html` and OpenAPI 3 JSON at `http://localhost:8080/v3/api-docs`
  - Actuator health at `http://localhost:8080/actuator/health`
- **Automated Test & Load-Test Suites**:
  - Backend unit/integration/Testcontainers + JaCoCo (`>= 80%` coverage gate)
  - Frontend Vitest + Testing Library unit/integration suite
  - Apache JMeter 5.6.3 performance suite in [performance-tests/](performance-tests/README.md)

---

## Quick Start (Recommended: Docker Compose)

Runs **PostgreSQL 16**, **Spring Boot backend**, and **Nginx frontend** with one command.

**Prerequisites:** Docker Desktop (or Docker Engine + Compose v2)

1. **Create your `.env` file** at the repo root:
   ```powershell
   Copy-Item .env.example .env
   ```
   *(Optional: customize DB passwords, `JWT_SECRET`, or dev seed passwords in `.env`.)*

2. **Build and start all services**:
   ```powershell
   docker compose up --build -d
   ```

3. **Open the app & docs**:
   - **Frontend App**: `http://localhost:3000` (Nginx serves the React SPA and proxies `/api/*` to `backend:8080`)
   - **Swagger UI**: `http://localhost:8080/swagger-ui/index.html`
   - **Health Check**: `http://localhost:8080/actuator/health`
   - **PostgreSQL (host port)**: `localhost:5433` (configurable via `DOCKER_DB_PORT`)

4. **Sign in locally** (seeded in `dev` profile when `CALLFLOW_DEV_SEED_USERS=true` and password env vars are set in `.env`):
   - **Admin**: `CALLFLOW_DEV_ADMIN_EMAIL` (default `admin@callflow.local`) / `CALLFLOW_DEV_ADMIN_PASSWORD`
   - **Agent**: `CALLFLOW_DEV_AGENT_EMAIL` (default `agent@callflow.local`) / `CALLFLOW_DEV_AGENT_PASSWORD`

5. **Stop containers**:
   ```powershell
   docker compose down
   ```

---

## Local Development Setup (Without Full Docker Stack)

Use this mode if you want hot-reload on the Vite frontend (`5173`) and direct JVM/IDE debugging on the Spring Boot backend (`8080`).

### Prerequisites
- **Java 21** (`JAVA_HOME` set to JDK 21)
- **PostgreSQL** running locally on `localhost:5432`
- **Node.js 22+** and **npm 10+**
- **Docker Desktop** *(required for running Testcontainers `*IT.java` tests)*

### 1. Database & Environment Setup
Create the database and user in PostgreSQL (`psql` or pgAdmin 4):
```sql
CREATE USER callflow_user WITH PASSWORD 'your_strong_db_password';
CREATE DATABASE callflow OWNER callflow_user;
GRANT ALL ON SCHEMA public TO callflow_user;
```

Copy `.env.example` to `.env` at the repository root and set:
- `DB_PASSWORD` (matching the database user password)
- `JWT_SECRET` (at least 32 bytes / 256 bits)
- Optional dev seed passwords (`CALLFLOW_DEV_ADMIN_PASSWORD`, `CALLFLOW_DEV_AGENT_PASSWORD`)

### 2. Run the Backend (`http://localhost:8080`)
```powershell
cd F:\CallFlow\backend
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
.\mvnw.cmd spring-boot:run
```
Verify startup at `http://localhost:8080/actuator/health` (`{"status":"UP"}`).

### 3. Run the Frontend (`http://localhost:5173`)
```powershell
cd F:\CallFlow\frontend
npm install
npm run dev
```
Vite proxies `/api/*` requests to `http://127.0.0.1:8080`. Open `http://localhost:5173`.

---

## Testing & Verification

### Backend (`backend/`)
Requires local PostgreSQL (or `TEST_DB_HOST`/`DB_PORT`/`DB_PASSWORD` env vars) and Docker for Testcontainers `CallFlowPostgresIT`:
```powershell
cd F:\CallFlow\backend
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
.\mvnw.cmd verify
```
Runs `67` Surefire unit/slice/integration tests, `1` Testcontainers PostgreSQL IT (`CallFlowPostgresIT`), and enforces the JaCoCo `>= 80%` line-coverage gate across service, mapper, and validation packages.

### Frontend (`frontend/`)
```powershell
cd F:\CallFlow\frontend
npm test          # Vitest + Testing Library suite (17 tests across 7 files)
npm run typecheck # TypeScript check (tsc -b --noEmit)
npm run build     # Production Vite bundle
```

### CI/CD
GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs on pushes and pull requests to `main`:
- **Backend job**: `./mvnw verify -B` against a `postgres:16-alpine` service container + Testcontainers + JaCoCo check
- **Frontend job**: `npm ci`, `npm test`, `npm run typecheck`, `npm run build`
- **Docker job**: `docker compose config -q` + `docker compose build`

---

## Architecture & Key Links

```text
CallFlow/
├── backend/                 # Spring Boot 3 REST API, Flyway migrations, Security, Tests, Dockerfile
├── frontend/                # React + TypeScript + Vite + Tailwind SPA, Vitest suite, Nginx Dockerfile
├── performance-tests/       # Apache JMeter 5.6.3 plans, datasets, runner, HTML reports
├── .github/workflows/ci.yml # CI pipeline (backend, frontend, Docker build)
├── docker-compose.yml       # PostgreSQL 16 + Spring Boot + Nginx orchestration
├── DATABASE.md              # PostgreSQL schema, JPA entity mappings, constraints, and indexes
└── MILESTONES.md            # Historical build log across Milestones 1–14
```

- **Database Schema & JPA Mapping**: [DATABASE.md](DATABASE.md)
- **Load & Performance Testing**: [performance-tests/README.md](performance-tests/README.md)
- **Milestone History (1–14)**: [MILESTONES.md](MILESTONES.md)
