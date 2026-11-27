# CallFlow

CallFlow is a full-stack customer-support call management platform built with Java 21, Spring Boot 3, PostgreSQL, Flyway, Spring Security (JWT), OpenAPI 3, React + TypeScript + Vite + Tailwind CSS, Docker Compose, and GitHub Actions CI/CD.

## Current Status

- **Milestone 1 — Workspace Audit and Foundation Verification**: Completed
- **Milestone 2 — Backend Build and Application Startup**: Completed
  - Official Apache Maven Wrapper (`3.9.9`) configured in `backend/`
  - Java 21 compilation and Spring Boot `3.4.5` packaging verified
  - `.env` auto-loading configured in `backend/src/main/resources/application.yml`
  - PostgreSQL `18.4` connectivity, Flyway migrations, Hibernate schema validation, dev user seeding, and `/actuator/health` startup verified
- **Milestone 3 — Database and Entity Layer**: Completed
  - Verified all 5 JPA entities (`User`, `Customer`, `Agent`, `Call`, `CallNote`) and `BaseTimestampedEntity` against PostgreSQL `18.4` (`ddl-auto: validate`)
  - Verified foreign keys, unique constraints, and check constraints (`chk_users_role`, `chk_agents_availability`, `chk_calls_status`, `chk_calls_duration_nonneg`, `chk_calls_timestamps`, `chk_calls_completed_timestamps`)
  - Added [V3__add_supporting_indexes.sql](backend/src/main/resources/db/migration/V3__add_supporting_indexes.sql) (`idx_users_email_lower`, `idx_agents_email_lower`, `idx_call_notes_author_agent_id`) and verified Flyway migration to `v3`
  - Documented the complete schema, entity mappings, relationships, and indexes in [DATABASE.md](DATABASE.md)
- **Milestone 4 — Customer Management**: Completed
  - Implemented [CustomerController](backend/src/main/java/com/callflow/controller/CustomerController.java) endpoints: `POST /api/customers`, `GET /api/customers/{id}`, `PUT /api/customers/{id}`, and `GET /api/customers` (paginated search via `query`)
  - Added `test` profile configuration in [application-test.yml](backend/src/test/resources/application-test.yml) and verified `CustomerServiceTest`, `CustomerRepositoryTest`, and `CustomerControllerTest` (`15` tests passing)
- **Milestone 5 — Agent Management**: Completed
  - Implemented [AgentController](backend/src/main/java/com/callflow/controller/AgentController.java) endpoints: `POST /api/agents`, `GET /api/agents/{id}`, `PUT /api/agents/{id}`, `PATCH /api/agents/{id}/availability`, and `GET /api/agents` (paginated search with `query` and `availabilityStatus` filters)
  - Added combined query + availability filtering in [AgentRepository](backend/src/main/java/com/callflow/repository/AgentRepository.java) and centralized agent assignment validation (`requireAssignableAgent` / `validateAssignable`) in [AgentService](backend/src/main/java/com/callflow/service/AgentService.java)
  - Verified `AgentServiceTest`, `AgentRepositoryTest`, and `AgentControllerTest` (`29` total backend tests passing)
- **Milestone 6 — Call Management**: Completed
  - Implemented [CallController](backend/src/main/java/com/callflow/controller/CallController.java) endpoints: `POST /api/calls`, `GET /api/calls/{id}`, `GET /api/calls` (paginated filtering by `status`, `agentId`, `customerId`, `search`, `fromDate`, `toDate`), `PATCH /api/calls/{id}/assign`, `PATCH /api/calls/{id}/status`, and `POST /api/calls/{id}/notes`
  - Exposed customer/agent call history endpoints (`GET /api/customers/{id}/calls`, `GET /api/agents/{id}/calls`) and defaulted `endedAt` on `COMPLETED` transitions in [CallService](backend/src/main/java/com/callflow/service/CallService.java)
  - Verified `CallLifecycleValidatorTest`, `CallServiceTest`, and `CallControllerTest` (`44` total backend tests passing)
- **Milestone 7 — Analytics**: Completed
  - Verified [AnalyticsController](backend/src/main/java/com/callflow/controller/AnalyticsController.java) endpoints (`GET /api/analytics/overview`, `GET /api/analytics/calls-by-status`, `GET /api/analytics/agent-performance`), [AnalyticsService](backend/src/main/java/com/callflow/service/AnalyticsService.java), and database-side aggregations in [CallRepository](backend/src/main/java/com/callflow/repository/CallRepository.java)
  - Added and verified `AnalyticsServiceTest`, `AnalyticsRepositoryTest`, and `AnalyticsControllerTest` (`51` total backend tests passing)
- **Milestone 8 — Automated Testing and Quality**: Completed
  - Added [PaginationValidatorTest](backend/src/test/java/com/callflow/validation/PaginationValidatorTest.java), [CallRepositoryTest](backend/src/test/java/com/callflow/repository/CallRepositoryTest.java), and [CallFlowPostgresIT](backend/src/test/java/com/callflow/integration/CallFlowPostgresIT.java) (`PostgreSQLContainer<>("postgres:16-alpine")` with `@ServiceConnection` and [docker-java.properties](backend/src/test/resources/docker-java.properties) `api.version=1.44` for Docker Engine 29+ compatibility)
  - Simplified call lifecycle timestamp/duration handling in [CallService](backend/src/main/java/com/callflow/service/CallService.java) via shared `applyLifecycleState` helper
  - Verified `mvnw.cmd -o verify`: `55` Surefire tests + `1` Testcontainers Failsafe integration test (`CallFlowPostgresIT`) passing (`0` failures, `0` errors, `0` skipped) and JaCoCo coverage gate (`>= 80%`) met (`98.6%` service, `98.8%` mapper, `95.6%` validation line coverage)
- **Milestone 8B — Apache JMeter Performance Testing**: Completed
  - Created 5 JMeter `5.6.3` load-test plans, CSV datasets, runner script (`performance-tests/run-all.ps1`), JTL results, HTML dashboard reports, and analysis in [performance-tests/README.md](performance-tests/README.md)
  - Executed all 5 scenarios against Spring Boot + `postgres:16-alpine`: `116,248` total samples with `0.00%` errors across concurrent call creation (`428.99/s`), customer search/retrieval (`970.66/s`), call assignment (`751.42/s`), full call lifecycle (`947.81/s`), and analytics (`585.57/s`)
- **Milestone 9 — Authentication and Authorization**: Completed
  - Enforced role-based authorization (`@PreAuthorize`) across controllers (`ADMIN`-only agent creation/updates via `POST /api/agents` and `PUT /api/agents/{id}`; `ADMIN` and `AGENT` access for operational endpoints)
  - Verified Spring Security stateless JWT filter chain, `BCryptPasswordEncoder` password hashing, `401 Unauthorized` / `403 Forbidden` JSON error responses, and `JwtServiceTest`, `AuthServiceTest`, `DevDataSeederTest`, and `AuthAndSecurityIntegrationTest` (`65` Surefire tests + `1` Testcontainers IT passing)
- **Milestone 10 — API Documentation**: Completed
  - Enhanced [OpenApiConfig](backend/src/main/java/com/callflow/config/OpenApiConfig.java), controllers, [ApiErrorResponse](backend/src/main/java/com/callflow/exception/ApiErrorResponse.java), and request/response DTOs with OpenAPI 3 schemas, parameter descriptions, JWT bearer opt-out on `/api/auth/login`, and `400`/`401`/`403`/`404`/`409`/`422` error responses
  - Verified [OpenApiDocumentationTest](backend/src/test/java/com/callflow/config/OpenApiDocumentationTest.java) (`67` Surefire tests + `1` Testcontainers IT passing) and live Swagger UI (`/swagger-ui/index.html` -> `200`, `/v3/api-docs` -> `17` paths)
- **Milestone 11 — Frontend Foundation**: Completed
  - Created React `18`, TypeScript `5.6`, Vite `6`, and Tailwind CSS `3.4` workspace in [frontend/](frontend/package.json) with `/api` proxy to `http://127.0.0.1:8080` in [vite.config.ts](frontend/vite.config.ts)
  - Implemented typed API client modules ([client.ts](frontend/src/api/client.ts), [auth.ts](frontend/src/api/auth.ts), [customers.ts](frontend/src/api/customers.ts), [agents.ts](frontend/src/api/agents.ts), [calls.ts](frontend/src/api/calls.ts), [analytics.ts](frontend/src/api/analytics.ts)) and [AuthContext](frontend/src/context/AuthContext.tsx)
  - Built reusable UI primitives (`Badge`, `Button`, `Card`, `EmptyState`, `ErrorBanner`, `LoadingSpinner`, `PageHeader`), [AppShell](frontend/src/components/layout/AppShell.tsx), [ProtectedRoute](frontend/src/routes/ProtectedRoute.tsx), and placeholder application routes in [App.tsx](frontend/src/App.tsx)
  - Verified `npm run typecheck`, `npm run build`, and live Vite dev server startup (`http://127.0.0.1:5173/` -> `200`)
- **Milestone 12 — Frontend Features**: Completed
  - **Login Page**: [LoginPage.tsx](frontend/src/pages/LoginPage.tsx) and [LoginPage.test.tsx](frontend/src/pages/LoginPage.test.tsx) (`6` tests) — email/password validation, password visibility toggle, API error & field-error rendering, post-login redirect restoration
  - **Dashboard Page**: [DashboardPage.tsx](frontend/src/pages/DashboardPage.tsx), [DashboardPage.test.tsx](frontend/src/pages/DashboardPage.test.tsx), and [format.ts](frontend/src/utils/format.ts) (`3` tests) — KPI overview cards, call status breakdown bars, queue snapshot, agent performance table, retryable error recovery
  - **Customer Management & Details**: [CustomersPage.tsx](frontend/src/pages/CustomersPage.tsx), [CustomerDetailPage.tsx](frontend/src/pages/CustomerDetailPage.tsx), [CustomerFormModal.tsx](frontend/src/components/customers/CustomerFormModal.tsx), [Modal.tsx](frontend/src/components/ui/Modal.tsx), [PaginationBar.tsx](frontend/src/components/ui/PaginationBar.tsx) (`4` tests) — paginated directory, search/sort controls, create/edit customer validation & `409` conflict handling, customer profile & call history timeline
  - **Call Management & Details**: [CallsPage.tsx](frontend/src/pages/CallsPage.tsx), [CallDetailPage.tsx](frontend/src/pages/CallDetailPage.tsx), [CreateCallModal.tsx](frontend/src/components/calls/CreateCallModal.tsx) (`2` tests) — multi-filter call queue (search, status, agent, date range, sort), call creation, agent assignment, lifecycle status transitions, and chronological notes timeline
  - **Agent Management**: [AgentsPage.tsx](frontend/src/pages/AgentsPage.tsx), [AgentFormModal.tsx](frontend/src/components/agents/AgentFormModal.tsx) (`2` tests) — agent search, availability filtering, live availability updates, and `ADMIN`-gated agent creation/editing (`17` total passing frontend tests across `7` Vitest suites)
- **Milestone 13 — Docker and CI/CD**: Completed
  - Added multi-stage container builds in [backend/Dockerfile](backend/Dockerfile) (`eclipse-temurin:21-jdk-alpine` -> `21-jre-alpine` non-root user + `/actuator/health` healthcheck) and [frontend/Dockerfile](frontend/Dockerfile) (`node:22-alpine` -> `nginx:1.27-alpine` with SPA fallback and `/api/` reverse proxy in [nginx.conf](frontend/nginx.conf)), plus `.dockerignore` files
  - Added full-stack orchestration in [docker-compose.yml](docker-compose.yml) (`postgres:16-alpine`, `backend`, `frontend`) with healthcheck ordering and verified live container startup (`http://localhost:3000` -> `200`, `http://localhost:8080/actuator/health` -> `UP`, proxied JWT `/api/auth/login` & `/api/analytics/overview`)
  - Configured GitHub Actions CI in [ci.yml](.github/workflows/ci.yml) (`backend` `./mvnw verify`, `frontend` tests/typecheck/build, and `docker compose` validation & image build)
- **Milestone 14 — Documentation and Final Review**: Completed
  - Audited repository files, `.gitignore` rules, OpenAPI/database/performance docs ([DATABASE.md](DATABASE.md), [performance-tests/README.md](performance-tests/README.md)), and finalized [README.md](README.md) with repository layout, API summary, verification commands, and deployment guide
  - Verified full backend suite (`mvnw.cmd verify` unit + Testcontainers IT + JaCoCo coverage gate), frontend suite (`npm test`, `npm run typecheck`, `npm run build`), and `docker compose config -q`

## Architecture & Repository Layout

```text
CallFlow/
├── backend/                 # Spring Boot 3 REST API, Flyway migrations, Security, Tests, Dockerfile
├── frontend/                # React + TypeScript + Vite + Tailwind app, Vitest suite, Nginx Dockerfile
├── performance-tests/       # Apache JMeter 5.6.3 plans, datasets, runner, HTML reports, analysis
├── .github/workflows/       # GitHub Actions CI workflow (backend, frontend, docker build)
├── docker-compose.yml       # Full-stack PostgreSQL + Backend + Frontend orchestration
├── DATABASE.md              # PostgreSQL schema, JPA entity mappings, constraints, and indexes
└── README.md                # Project overview, setup instructions, and milestone records
```

## API & Security Overview

All endpoints except `/api/auth/login`, `/actuator/health`, `/swagger-ui/**`, and `/v3/api-docs/**` require a JWT bearer token (`Authorization: Bearer <token>`). Operational endpoints allow `ADMIN` and `AGENT` roles, while `POST /api/agents` and `PUT /api/agents/{id}` require `ADMIN`.

| Area | Endpoints | Notes |
| --- | --- | --- |
| Auth | `POST /api/auth/login`, `GET /api/auth/me` | Stateless JWT login and current user profile |
| Customers | `POST /api/customers`, `GET /api/customers/{id}`, `PUT /api/customers/{id}`, `GET /api/customers`, `GET /api/customers/{id}/calls` | Search, pagination, and per-customer call history |
| Agents | `POST /api/agents`, `GET /api/agents/{id}`, `PUT /api/agents/{id}`, `PATCH /api/agents/{id}/availability`, `GET /api/agents`, `GET /api/agents/{id}/calls` | Agent roster (`POST`/`PUT` `ADMIN`-only) & live availability updates |
| Calls | `POST /api/calls`, `GET /api/calls/{id}`, `GET /api/calls`, `PATCH /api/calls/{id}/assign`, `PATCH /api/calls/{id}/status`, `POST /api/calls/{id}/notes` | Lifecycle validation (`QUEUED` -> `IN_PROGRESS` -> `COMPLETED`/`MISSED`/`CANCELLED`), duration tracking, and notes |
| Analytics | `GET /api/analytics/overview`, `GET /api/analytics/calls-by-status`, `GET /api/analytics/agent-performance` | Aggregate call volume, completion metrics, and per-agent throughput |

Additional project documentation:
- **Database Schema & JPA Mapping**: [DATABASE.md](DATABASE.md)
- **Interactive API Docs (when backend is running)**: `http://localhost:8080/swagger-ui/index.html` and `http://localhost:8080/v3/api-docs`
- **Load & Performance Testing**: [performance-tests/README.md](performance-tests/README.md)

## Tech Stack

- **Backend**: Java 21, Maven Wrapper (`mvnw` / `mvnw.cmd`), Spring Boot `3.4.5`, PostgreSQL, Spring Data JPA / Hibernate, Flyway, Spring Security, JJWT `0.12.6`, Springdoc OpenAPI `2.8.5`
- **Frontend**: React `18.3`, TypeScript `5.6`, Vite `6`, Tailwind CSS `3.4`, React Router `6`, Lucide icons
- **Testing & Quality**: JUnit 5, Mockito, Testcontainers, JaCoCo `0.8.12`, Apache JMeter `5.6.3`, Vitest, Testing Library
- **Containers & CI/CD**: Docker, Docker Compose, Nginx `1.27`, GitHub Actions

## Prerequisites

- **Java 21** (`JAVA_HOME` pointing to your JDK 21 installation, e.g. `C:\Program Files\Java\jdk-21`)
- **PostgreSQL** running locally (default `localhost:5432`)
- **Node.js 22+** and **npm 10+** (for the `frontend/` React + Vite app)
- **Docker Desktop** (for Testcontainers integration tests `*IT.java` via `mvnw.cmd verify`)

## Local Setup & Running the Backend

1. **Create the PostgreSQL user and database** (run each statement separately in `psql` or pgAdmin 4):
   ```sql
   CREATE USER callflow_user WITH PASSWORD 'your_strong_db_password';
   CREATE DATABASE callflow OWNER callflow_user;
   ```
   Then connect to the `callflow` database and ensure schema permissions:
   ```sql
   GRANT ALL ON SCHEMA public TO callflow_user;
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env` at the repository root and set at least:
   - `DB_PASSWORD` (matching the database user password)
   - `JWT_SECRET` (at least 32 bytes / 256 bits, e.g. 64 hex characters)
   - Optional dev seed passwords (`CALLFLOW_DEV_ADMIN_PASSWORD`, `CALLFLOW_DEV_AGENT_PASSWORD`)

3. **Set `JAVA_HOME` and compile/package**:
   ```powershell
   cd F:\CallFlow\backend
   $env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
   .\mvnw.cmd test-compile
   .\mvnw.cmd package -DskipTests
   ```

4. **Start the Spring Boot backend**:
   ```powershell
   cd F:\CallFlow\backend
   $env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
   .\mvnw.cmd spring-boot:run
   ```
   Or run the packaged JAR directly:
   ```powershell
   cd F:\CallFlow\backend
   & "$env:JAVA_HOME\bin\java.exe" -jar target\callflow-backend-1.0.0.jar
   ```
   Verify health at `http://localhost:8080/actuator/health` (`{"status":"UP"}`).

## Local Setup & Running the Frontend

1. **Install dependencies**:
   ```powershell
   cd F:\CallFlow\frontend
   npm install
   ```

2. **Start the Vite development server** (proxies `/api/*` to `http://127.0.0.1:8080`):
   ```powershell
   cd F:\CallFlow\frontend
   npm run dev
   ```
   Open `http://localhost:5173`.

3. **Run unit tests, typecheck, and build for production**:
   ```powershell
   cd F:\CallFlow\frontend
   npm test
   npm run typecheck
   npm run build
   ```

## Full-Stack Setup with Docker Compose

1. **Copy `.env.example` to `.env`** (or use defaults for local evaluation):
   ```powershell
   Copy-Item .env.example .env
   ```

2. **Build and start PostgreSQL, Spring Boot backend, and Nginx frontend**:
   ```powershell
   docker compose up --build -d
   ```
   - **Frontend App**: `http://localhost:3000` (Nginx serves the React SPA and proxies `/api/*` to `backend:8080`)
   - **Backend Health**: `http://localhost:8080/actuator/health`
   - **Swagger UI**: `http://localhost:8080/swagger-ui/index.html`
   - **PostgreSQL Host Port**: `5433` (configurable via `DOCKER_DB_PORT`)

3. **Stop and clean up**:
   ```powershell
   docker compose down
   ```

## Development Roadmap

1. **Milestone 1** — Workspace Audit and Foundation Verification *(Completed)*
2. **Milestone 2** — Backend Build and Application Startup *(Completed)*
3. **Milestone 3** — Database and Entity Layer *(Completed)*
4. **Milestone 4** — Customer Management *(Completed)*
5. **Milestone 5** — Agent Management *(Completed)*
6. **Milestone 6** — Call Management *(Completed)*
7. **Milestone 7** — Analytics *(Completed)*
8. **Milestone 8** — Automated Testing and Quality *(Completed)*
9. **Milestone 8B** — Apache JMeter Performance Testing *(Completed)*
10. **Milestone 9** — Authentication and Authorization *(Completed)*
11. **Milestone 10** — API Documentation *(Completed)*
12. **Milestone 11** — Frontend Foundation *(Completed)*
13. **Milestone 12** — Frontend Features *(Completed)*
14. **Milestone 13** — Docker and CI/CD *(Completed)*
15. **Milestone 14** — Documentation and Final Review *(Completed)*
