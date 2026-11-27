# CallFlow

CallFlow is an incrementally developed customer-support call management application built with Java 21, Spring Boot 3, PostgreSQL, Flyway, and Spring Security (with React + TypeScript + Vite frontend and Docker/CI planned in upcoming milestones).

## Current Status

- **Milestone 1 — Workspace Audit and Foundation Verification**: Completed
- **Milestone 2 — Backend Build and Application Startup**: Completed
  - Official Apache Maven Wrapper (`3.9.9`) configured in `backend/`
  - Java 21 compilation and Spring Boot `3.4.5` packaging verified
  - `.env` auto-loading configured in `backend/src/main/resources/application.yml`
  - PostgreSQL `18.4` connectivity, Flyway migrations (`V1__init_schema.sql`, `V2__dev_seed_data.sql`), Hibernate schema validation, dev user seeding, and `/actuator/health` startup verified

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
3. **Milestone 3** — Database and Entity Layer
4. **Milestone 4** — Customer Management
5. **Milestone 5** — Agent Management
6. **Milestone 6** — Call Management
7. **Milestone 7** — Analytics
8. **Milestone 8** — Automated Testing and Quality
9. **Milestone 8B** — Apache JMeter Performance Testing
10. **Milestone 9** — Authentication and Authorization
11. **Milestone 10** — API Documentation
12. **Milestone 11** — Frontend Foundation
13. **Milestone 12** — Frontend Features
14. **Milestone 13** — Docker and CI/CD
15. **Milestone 14** — Documentation and Final Review
