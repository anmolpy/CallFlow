# CallFlow Development Milestones

Historical record of the incremental build and verification of CallFlow from Milestone 1 through Milestone 14. For setup, live vs. local scope, and architecture, see [README.md](README.md).

## Completed Milestones

- **Milestone 1 — Workspace Audit and Foundation Verification**: Completed
- **Milestone 2 — Backend Build and Application Startup**: Completed
  - Official Apache Maven Wrapper (`3.9.9`) configured in `backend/`
  - Java 21 compilation and Spring Boot `3.4.5` packaging verified
  - `.env` auto-loading configured in [application.yml](backend/src/main/resources/application.yml)
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
  - Verified `mvnw.cmd verify`: `55` Surefire tests + `1` Testcontainers Failsafe integration test (`CallFlowPostgresIT`) passing and JaCoCo coverage gate (`>= 80%`) met (`98.6%` service, `98.8%` mapper, `95.6%` validation line coverage)
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
  - Implemented typed API client modules (`client.ts`, `auth.ts`, `customers.ts`, `agents.ts`, `calls.ts`, `analytics.ts`), `AuthContext`, reusable UI primitives, `AppShell`, and `ProtectedRoute`
  - Verified `npm run typecheck`, `npm run build`, and live Vite dev server startup
- **Milestone 12 — Frontend Features**: Completed
  - Implemented `LoginPage`, `DashboardPage`, `CustomersPage`, `CustomerDetailPage`, `CallsPage`, `CallDetailPage`, and `AgentsPage` with `17` passing Vitest/Testing Library tests across `7` suites
- **Milestone 13 — Docker and CI/CD**: Completed
  - Added multi-stage [backend/Dockerfile](backend/Dockerfile) and [frontend/Dockerfile](frontend/Dockerfile) with [nginx.conf](frontend/nginx.conf), [docker-compose.yml](docker-compose.yml), and [ci.yml](.github/workflows/ci.yml)
  - Verified full Docker Compose stack startup (`postgres`, `backend`, `frontend` healthy) and end-to-end proxied auth + analytics requests
- **Milestone 14 — Documentation and Final Review**: Completed
  - Finalized documentation ([README.md](README.md), [MILESTONES.md](MILESTONES.md), [DATABASE.md](DATABASE.md), [performance-tests/README.md](performance-tests/README.md)), added CI PostgreSQL service support, and verified all `67` Surefire tests + `1` Testcontainers IT + JaCoCo gate + `17` frontend tests
