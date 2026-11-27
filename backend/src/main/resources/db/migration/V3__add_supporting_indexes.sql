-- =========================================================
-- CallFlow Supporting Indexes (V3)
-- Aligns case-insensitive email indexing across users and
-- agents with customers, and indexes call_notes.author_agent_id
-- to support the fk_call_notes_agent foreign key.
-- =========================================================

CREATE INDEX idx_users_email_lower ON users (LOWER(email));
CREATE INDEX idx_agents_email_lower ON agents (LOWER(email));
CREATE INDEX idx_call_notes_author_agent_id ON call_notes (author_agent_id);
