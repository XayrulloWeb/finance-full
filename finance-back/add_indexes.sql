-- Add missing indexes for better performance
-- Run this script on your PostgreSQL database

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, type);

-- Index for filtering by category
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON transactions(user_id, category_id);

-- Index for filtering by counterparty
CREATE INDEX IF NOT EXISTS idx_transactions_user_counterparty ON transactions(user_id, counterparty_id);

-- Index for account + date filtering (for account history)
CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id, date DESC);

-- Index for counterparty joins
CREATE INDEX IF NOT EXISTS idx_transactions_counterparty ON transactions(counterparty_id);

-- Analyze tables for query planner
ANALYZE transactions;