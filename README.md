# CallFlow

CallFlow is an incrementally developed customer-support call management application built with Java 21, Spring Boot 3, PostgreSQL, Flyway, and Spring Security (with React + TypeScript + Vite frontend and Docker/CI planned in upcoming milestones).

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

## Tech Stack (Backend Foundation)

- **Language & Build**: Java 21, Maven Wrapper (`mvnw` / `mvnw.cmd`), Spring Boot `3.4.5`
- **Database & Migrations**: PostgreSQL, Spring Data JPA / Hibernate, Flyway
- **Security & API Docs**: Spring Security, JJWT `0.12.6`, Springdoc OpenAPI `2.8.5`
- **Testing & Quality (configured in `pom.xml`)**: JUnit 5, Mockito, Testcontainers, JaCoCo `0.8.12`

## Prerequisites

- **Java 21** (`JAVA_HOME` pointing to your JDK 21 installation, e.g. `C:\Program Files\Java\jdk-21`)
- **PostgreSQL** running locally (default `localhost:5432`)

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

## Development Roadmap

1. **Milestone 1** — Workspace Audit and Foundation Verification *(Completed)*
2. **Milestone 2** — Backend Build and Application Startup *(Completed)*
3. **Milestone 3** — Database and Entity Layer *(Completed)*
4. **Milestone 4** — Customer Management *(Completed)*
5. **Milestone 5** — Agent Management *(Completed)*
6. **Milestone 6** — Call Management *(Completed)*
7. **Milestone 7** — Analytics *(Completed)*
8. **Milestone 8** — Automated Testing and Quality
9. **Milestone 8B** — Apache JMeter Performance Testing
10. **Milestone 9** — Authentication and Authorization
11. **Milestone 10** — API Documentation
12. **Milestone 11** — Frontend Foundation
13. **Milestone 12** — Frontend Features
14. **Milestone 13** — Docker and CI/CD
15. **Milestone 14** — Documentation and Final Review
