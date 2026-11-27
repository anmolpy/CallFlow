-- =========================================================
-- CallFlow Development Seed Data (V2)
-- Loaded only in 'dev' profile (classpath:db/seed).
-- Authentication user accounts are seeded via DevDataSeeder
-- using environment variables so no credentials live in SQL.
-- =========================================================

INSERT INTO customers (first_name, last_name, email, phone_number, created_at, updated_at) VALUES
('Elena', 'Rostova', 'elena.rostova@example.com', '+1-555-0101', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),
('Marcus', 'Vance', 'marcus.vance@example.com', '+1-555-0102', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),
('Priya', 'Patel', 'priya.patel@example.com', '+1-555-0103', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
('Liam', 'OConnor', 'liam.oconnor@example.com', '+1-555-0104', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
('Sofia', 'Chen', 'sofia.chen@example.com', '+1-555-0105', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days');

INSERT INTO agents (first_name, last_name, email, availability_status, created_at, updated_at) VALUES
('Jordan', 'Taylor', 'jordan.taylor@callflow.local', 'AVAILABLE', NOW() - INTERVAL '20 days', NOW() - INTERVAL '1 day'),
('Maya', 'Lin', 'maya.lin@callflow.local', 'BUSY', NOW() - INTERVAL '20 days', NOW() - INTERVAL '2 hours'),
('Devon', 'Brooks', 'devon.brooks@callflow.local', 'AWAY', NOW() - INTERVAL '15 days', NOW() - INTERVAL '3 hours'),
('Alex', 'Rivera', 'alex.rivera@callflow.local', 'OFFLINE', NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day');

INSERT INTO calls (customer_id, agent_id, status, started_at, ended_at, duration_seconds, created_at, updated_at) VALUES
(1, 1, 'COMPLETED', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '420 seconds', 420, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
(2, 1, 'COMPLETED', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '315 seconds', 315, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
(3, 2, 'COMPLETED', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '600 seconds', 600, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
(4, 2, 'IN_PROGRESS', NOW() - INTERVAL '15 minutes', NULL, NULL, NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '15 minutes'),
(5, NULL, 'QUEUED', NULL, NULL, NULL, NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '5 minutes'),
(1, 3, 'MISSED', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '30 seconds', 30, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
(2, NULL, 'CANCELLED', NULL, NULL, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');

INSERT INTO call_notes (call_id, author_agent_id, author_name, content, created_at) VALUES
(1, 1, 'Jordan Taylor', 'Verified billing cycle discrepancy and issued $25 credit.', NOW() - INTERVAL '5 days'),
(2, 1, 'Jordan Taylor', 'Assisted customer with MFA device reset.', NOW() - INTERVAL '4 days'),
(3, 2, 'Maya Lin', 'Escalated webhook timeout ticket to Tier 2 engineering; workaround confirmed.', NOW() - INTERVAL '3 days'),
(4, 2, 'Maya Lin', 'Investigating invoice PDF export issue with customer.', NOW() - INTERVAL '10 minutes');
