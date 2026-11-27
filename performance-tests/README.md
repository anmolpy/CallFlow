# CallFlow Apache JMeter Performance Tests

Dedicated load and performance testing suite for the CallFlow REST API using **Apache JMeter 5.6.3**, **Spring Boot 3.4.5**, and **PostgreSQL (`postgres:16-alpine`)**.

## Directory Structure

```text
performance-tests/
├── test-plans/          # JMeter .jmx test plans (5 scenarios)
├── data/                # CSV Data Set Config inputs (non-conflicting test data)
├── results/             # Generated JTL sample logs (*.jtl)
├── reports/             # Generated JMeter HTML Dashboard Reports (index.html, statistics.json)
├── run-all.ps1          # Automated runner script for all 5 test plans
└── README.md            # Test configuration, measured results, analysis, and reproduction steps
```

## Test Configuration & Scenarios

Each test plan runs a `SetupThreadGroup` (`POST /api/auth/login`) to obtain a JWT bearer token once before the load threads start, attaches `Authorization: Bearer <token>` via an HTTP Header Manager, reads realistic payloads from `data/*.csv`, validates HTTP status codes (`200` / `201`) and JSON response fields, and runs with configurable JMeter properties (`threads`, `rampup`, `duration`, `host`, `port`).

| Scenario | Test Plan | CSV Dataset | Virtual Users | Ramp-Up | Duration | Endpoints Covered |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | `test-plans/01-concurrent-call-creation.jmx` | `data/call_creation.csv` | `25` | `5s` | `30s` | `POST /api/calls` |
| 02 | `test-plans/02-customer-search-retrieval.jmx` | `data/customers_search.csv` | `30` | `5s` | `30s` | `GET /api/customers`, `GET /api/customers?query=...`, `GET /api/customers/{id}`, `GET /api/customers/{id}/calls` |
| 03 | `test-plans/03-call-assignment.jmx` | `data/call_assignment.csv` | `20` | `5s` | `30s` | `POST /api/calls` (`QUEUED`), `PATCH /api/calls/{id}/assign` |
| 04 | `test-plans/04-complete-call-lifecycle.jmx` | `data/call_lifecycle.csv` | `15` | `5s` | `30s` | `POST /api/calls`, `PATCH /assign`, `PATCH /status` (`IN_PROGRESS`), `POST /notes`, `PATCH /status` (`COMPLETED`), `POST /notes`, `GET /api/calls/{id}` |
| 05 | `test-plans/05-analytics-performance.jmx` | *(DB-backed)* | `25` | `5s` | `30s` | `GET /api/analytics/overview`, `GET /api/analytics/calls-by-status`, `GET /api/analytics/agent-performance` |

## Measured Test Results

Executed sequentially against `callflow-backend-1.0.0.jar` (Java `21.0.6`, `dev` profile, HikariCP `maximum-pool-size: 10`) backed by an isolated `postgres:16-alpine` Docker container on `127.0.0.1:5439`.

### Scenario Summary (`statistics.json` `Total`)

| Scenario | Samples | Errors | Error % | Avg (ms) | Median (ms) | P90 (ms) | P95 (ms) | Max (ms) | Throughput (req/s) | HTML Report |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `01-concurrent-call-creation` | 13,668 | 0 | 0.00% | 50.04 | 47.0 | 70.0 | 79.0 | 602.0 | 428.99 | [01 report](reports/01-concurrent-call-creation/index.html) |
| `02-customer-search-retrieval` | 30,570 | 0 | 0.00% | 26.80 | 23.0 | 42.0 | 51.0 | 249.0 | 970.66 | [02 report](reports/02-customer-search-retrieval/index.html) |
| `03-call-assignment` | 23,630 | 0 | 0.00% | 23.05 | 22.0 | 27.0 | 30.0 | 198.0 | 751.42 | [03 report](reports/03-call-assignment/index.html) |
| `04-complete-call-lifecycle` | 29,930 | 0 | 0.00% | 13.63 | 14.0 | 17.0 | 18.0 | 229.0 | 947.81 | [04 report](reports/04-complete-call-lifecycle/index.html) |
| `05-analytics-performance` | 18,450 | 0 | 0.00% | 37.25 | 37.0 | 46.0 | 49.0 | 186.0 | 585.57 | [05 report](reports/05-analytics-performance/index.html) |

### Per-Endpoint Breakdown (`statistics.json`)

#### Scenario 01 — Concurrent Call Creation (25 users, 5s ramp-up, 30s)
| Sampler | Samples | Error % | Avg (ms) | P90 (ms) | P95 (ms) | Throughput (req/s) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `POST /api/auth/login` (setup) | 1 | 0.00% | 602.00 | 602.0 | 602.0 | 1.66 |
| `POST /api/calls` | 13,667 | 0.00% | 50.00 | 70.0 | 79.0 | 455.98 |

#### Scenario 02 — Customer Search and Retrieval (30 users, 5s ramp-up, 30s)
| Sampler | Samples | Error % | Avg (ms) | P90 (ms) | P95 (ms) | Throughput (req/s) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `GET /api/customers (List)` | 7,652 | 0.00% | 24.21 | 39.0 | 48.0 | 255.40 |
| `GET /api/customers?query=...` | 7,645 | 0.00% | 23.79 | 38.0 | 46.7 | 255.74 |
| `GET /api/customers/{id}` | 7,640 | 0.00% | 22.71 | 36.0 | 44.0 | 256.30 |
| `GET /api/customers/{id}/calls` | 7,632 | 0.00% | 36.50 | 54.0 | 64.0 | 256.11 |

#### Scenario 03 — Call Assignment (20 users, 5s ramp-up, 30s)
| Sampler | Samples | Error % | Avg (ms) | P90 (ms) | P95 (ms) | Throughput (req/s) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `POST /api/calls (Queued)` | 11,822 | 0.00% | 23.42 | 29.0 | 33.0 | 394.54 |
| `PATCH /api/calls/{id}/assign` | 11,807 | 0.00% | 22.65 | 29.0 | 32.0 | 394.38 |

#### Scenario 04 — Complete Call Lifecycle (15 users, 5s ramp-up, 30s)
| Sampler | Samples | Error % | Avg (ms) | P90 (ms) | P95 (ms) | Throughput (req/s) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `1. POST /api/calls (Create Queued)` | 4,282 | 0.00% | 15.89 | 19.0 | 20.0 | 142.97 |
| `2. PATCH /api/calls/{id}/assign` | 4,280 | 0.00% | 14.60 | 18.0 | 19.0 | 143.04 |
| `3. PATCH /api/calls/{id}/status (IN_PROGRESS)` | 4,279 | 0.00% | 13.46 | 16.0 | 18.0 | 143.11 |
| `4. POST /api/calls/{id}/notes (Progress Note)` | 4,275 | 0.00% | 14.52 | 17.0 | 19.0 | 143.10 |
| `5. PATCH /api/calls/{id}/status (COMPLETED)` | 4,273 | 0.00% | 13.54 | 16.0 | 18.0 | 143.27 |
| `6. POST /api/calls/{id}/notes (Closing Note)` | 4,272 | 0.00% | 14.57 | 18.0 | 19.0 | 143.27 |
| `7. GET /api/calls/{id} (Verify Final State)` | 4,268 | 0.00% | 8.79 | 11.0 | 12.0 | 143.26 |

#### Scenario 05 — Analytics Performance (25 users, 5s ramp-up, 30s)
*(Executed after Scenarios 01, 03, and 04 inserted ~29,778 calls into PostgreSQL.)*

| Sampler | Samples | Error % | Avg (ms) | P90 (ms) | P95 (ms) | Throughput (req/s) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `GET /api/analytics/overview` | 6,159 | 0.00% | 36.03 | 43.0 | 46.0 | 205.10 |
| `GET /api/analytics/calls-by-status` | 6,149 | 0.00% | 33.47 | 41.0 | 45.0 | 205.26 |
| `GET /api/analytics/agent-performance` | 6,141 | 0.00% | 42.22 | 50.0 | 53.0 | 205.19 |

## Performance Analysis & Identified Bottlenecks

1. **HikariCP Pool Contention at 25+ Concurrent Writers (`maximum-pool-size: 10`)**:
   - In Scenario 01 (`25` virtual users writing `POST /api/calls` with initial notes), average response time was `50.00 ms` (`P95 = 79.0 ms`). In Scenario 04 (`15` virtual users), `POST /api/calls` averaged `15.89 ms` (`P95 = 20.0 ms`). With `25` active writers sharing `10` database connections, threads contend for HikariCP connections and PostgreSQL WAL commits.
2. **Customer Call History Pagination Overhead (`GET /api/customers/{id}/calls`)**:
   - Under `30` virtual users, `GET /api/customers/{id}/calls` averaged `36.50 ms` (`P95 = 64.0 ms`), roughly `60%` slower than `GET /api/customers/{id}` (`22.71 ms`, `P95 = 44.0 ms`), because it performs an existence check (`existsById`), a paginated join query + `COUNT(*)` over ~13k–29k `calls` rows, and a separate `countNotesByCallIds` query.
3. **Full-Table Analytics Aggregations (`GET /api/analytics/agent-performance`)**:
   - Against ~29.8k rows in `calls`, `GET /api/analytics/agent-performance` (`42.22 ms` avg, `P95 = 53.0 ms`) is the slowest analytics endpoint (`~26%` slower than `calls-by-status` at `33.47 ms`) because `CallRepository.fetchAgentPerformance()` performs a `LEFT JOIN calls`, `GROUP BY`, and multi-column `ORDER BY` across all calls on every request. At higher call volumes, a covering index `(agent_id, status, duration_seconds)` or short-TTL caching would reduce aggregation cost.
4. **Per-Request User Lookup & Setup Login Cost**:
   - `POST /api/auth/login` averaged `186–602 ms` on initial warmup/BCrypt verification (expected for BCrypt hashing). Every subsequent authenticated request executes a `users` lookup via `CustomUserDetailsService.loadUserByUsername` (`JwtAuthenticationFilter`), mitigated by `idx_users_email_lower` (`V3`) but still consuming one DB query per API call.

> *Note:* No application code optimizations were applied in this milestone (`baseline measurements only`; no before/after code-change comparison is claimed).

## Reproducing the Tests

### Prerequisites
- **Java 21** (`JAVA_HOME` configured)
- **Apache JMeter 5.6.3** (`jmeter.bat` on `PATH`, `JMETER_HOME` set, or installed at `%USERPROFILE%\.jmeter\apache-jmeter-5.6.3`)
- **Docker** (optional, recommended to keep your local dev PostgreSQL database clean) or local PostgreSQL with `CALLFLOW_DEV_ADMIN_PASSWORD` configured in `.env`

### Option A — Run Against an Isolated Docker PostgreSQL Database (Recommended)
```powershell
# 1. Start an isolated PostgreSQL 16 container on port 5439
docker run -d --name callflow-perf-db -p 5439:5432 `
  -e POSTGRES_DB=callflow -e POSTGRES_USER=callflow_user `
  -e POSTGRES_PASSWORD=callflow_perf_pass postgres:16-alpine

# 2. Build (if needed) and start the backend pointing to port 5439
cd F:\CallFlow\backend
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
$env:DB_HOST = "127.0.0.1"
$env:DB_PORT = "5439"
$env:DB_PASSWORD = "callflow_perf_pass"
& "$env:JAVA_HOME\bin\java.exe" -jar target\callflow-backend-1.0.0.jar

# 3. In another terminal, execute all 5 JMeter plans and regenerate reports
cd F:\CallFlow\performance-tests
.\run-all.ps1 -TargetHost 127.0.0.1 -TargetPort 8080

# 4. Cleanup temporary database container after stopping the backend
docker rm -f callflow-perf-db
```

### Option B — Run an Individual JMeter Test Plan
```powershell
jmeter -n -t F:\CallFlow\performance-tests\test-plans\01-concurrent-call-creation.jmx `
  -l F:\CallFlow\performance-tests\results\01-concurrent-call-creation.jtl `
  -e -o F:\CallFlow\performance-tests\reports\01-concurrent-call-creation `
  -Jhost=127.0.0.1 -Jport=8080 -JauthEmail=admin@callflow.local -JauthPassword=YOUR_ADMIN_PASSWORD
```
