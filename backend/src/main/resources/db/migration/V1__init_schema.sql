-- =========================================================
-- CallFlow Database Schema (V1)
-- Normalized PostgreSQL schema for customers, agents, calls,
-- call_notes, and security users.
-- =========================================================

CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL,
    full_name       VARCHAR(150) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20)  NOT NULL,
    enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_role CHECK (role IN ('ADMIN', 'AGENT'))
);

CREATE TABLE customers (
    id              BIGSERIAL PRIMARY KEY,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    phone_number    VARCHAR(30)  NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_customers_email UNIQUE (email),
    CONSTRAINT uq_customers_phone UNIQUE (phone_number)
);

CREATE INDEX idx_customers_name ON customers (LOWER(last_name), LOWER(first_name));
CREATE INDEX idx_customers_email_lower ON customers (LOWER(email));

CREATE TABLE agents (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT,
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    email               VARCHAR(255) NOT NULL,
    availability_status VARCHAR(20)  NOT NULL DEFAULT 'AVAILABLE',
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_agents_user_id UNIQUE (user_id),
    CONSTRAINT uq_agents_email UNIQUE (email),
    CONSTRAINT fk_agents_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_agents_availability CHECK (availability_status IN ('AVAILABLE', 'BUSY', 'AWAY', 'OFFLINE'))
);

CREATE INDEX idx_agents_availability ON agents (availability_status);
CREATE INDEX idx_agents_name ON agents (LOWER(last_name), LOWER(first_name));

CREATE TABLE calls (
    id                  BIGSERIAL PRIMARY KEY,
    customer_id         BIGINT      NOT NULL,
    agent_id            BIGINT,
    status              VARCHAR(20) NOT NULL,
    started_at          TIMESTAMPTZ,
    ended_at            TIMESTAMPTZ,
    duration_seconds    BIGINT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_calls_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE RESTRICT,
    CONSTRAINT fk_calls_agent FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE SET NULL,
    CONSTRAINT chk_calls_status CHECK (status IN ('QUEUED', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'CANCELLED')),
    CONSTRAINT chk_calls_duration_nonneg CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    CONSTRAINT chk_calls_timestamps CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at),
    CONSTRAINT chk_calls_completed_timestamps CHECK (status <> 'COMPLETED' OR (started_at IS NOT NULL AND ended_at IS NOT NULL))
);

CREATE INDEX idx_calls_customer_id ON calls (customer_id);
CREATE INDEX idx_calls_agent_id ON calls (agent_id);
CREATE INDEX idx_calls_status ON calls (status);
CREATE INDEX idx_calls_started_at ON calls (started_at);
CREATE INDEX idx_calls_created_at ON calls (created_at DESC);
CREATE INDEX idx_calls_status_created ON calls (status, created_at DESC);

CREATE TABLE call_notes (
    id              BIGSERIAL PRIMARY KEY,
    call_id         BIGINT       NOT NULL,
    author_agent_id BIGINT,
    author_name     VARCHAR(150) NOT NULL,
    content         TEXT         NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_call_notes_call FOREIGN KEY (call_id) REFERENCES calls (id) ON DELETE CASCADE,
    CONSTRAINT fk_call_notes_agent FOREIGN KEY (author_agent_id) REFERENCES agents (id) ON DELETE SET NULL
);

CREATE INDEX idx_call_notes_call_id ON call_notes (call_id, created_at ASC);
