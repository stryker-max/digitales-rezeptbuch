// Migration 1. Additive schema in a separate, private recipe-book database.
export const postgresSchemaV1 = `
CREATE TABLE IF NOT EXISTS rb_jobs (
 id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, source BYTEA NOT NULL,
 name TEXT NOT NULL, mime TEXT NOT NULL, hash TEXT NOT NULL, pages INTEGER NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('queued','processing','needs_review','confirmed','failed','cancelled')),
 result TEXT, error TEXT, model TEXT NOT NULL, created TEXT NOT NULL, started TEXT, confirmed TEXT,
 auth_kind TEXT NOT NULL DEFAULT 'api', profile_id TEXT, prompt_version TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS rb_jobs_pending ON rb_jobs(auth_kind,created) WHERE state='queued';
CREATE TABLE IF NOT EXISTS rb_calls(day TEXT PRIMARY KEY, count INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS rb_chatgpt (
 id INTEGER PRIMARY KEY CHECK(id=1), host_id TEXT NOT NULL,
 encrypted_state BYTEA, provider TEXT, updated_at TEXT NOT NULL
);
`;

export const postgresSchemaV2 = `
CREATE TABLE IF NOT EXISTS rb_owner(id INTEGER PRIMARY KEY CHECK(id=1),salt TEXT NOT NULL,password_hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS rb_login_limits(bucket TEXT PRIMARY KEY,attempts INTEGER NOT NULL);
`;

// Additive: existing passwords, sessions, sources and confirmed recipes stay valid.
export const postgresSchemaV3 = `
CREATE TABLE IF NOT EXISTS rb_auth_limits(bucket TEXT PRIMARY KEY,attempts INTEGER NOT NULL,expires BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS rb_passkeys(id TEXT PRIMARY KEY,public_key BYTEA NOT NULL,counter BIGINT NOT NULL,transports JSONB NOT NULL,created BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS rb_auth_challenges(id TEXT PRIMARY KEY,challenge TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('register','login')),binding TEXT NOT NULL,expires BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS rb_auth_challenges_expiry ON rb_auth_challenges(expires);
`;

// One private household, with separately authenticated, invited members.
// Legacy owner/password and recipe rows remain untouched.
export const postgresSchemaV4 = `
CREATE TABLE IF NOT EXISTS rb_accounts(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('owner','member')),salt TEXT NOT NULL,password_hash TEXT NOT NULL,active BOOLEAN NOT NULL DEFAULT true,created BIGINT NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS rb_account_owner ON rb_accounts(role) WHERE role='owner';
CREATE TABLE IF NOT EXISTS rb_sessions(token_hash TEXT PRIMARY KEY,account_id TEXT NOT NULL REFERENCES rb_accounts(id),expires BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS rb_sessions_account ON rb_sessions(account_id);
CREATE TABLE IF NOT EXISTS rb_invites(token_hash TEXT PRIMARY KEY,expires BIGINT NOT NULL,used BOOLEAN NOT NULL DEFAULT false);
ALTER TABLE rb_passkeys ADD COLUMN IF NOT EXISTS account_id TEXT REFERENCES rb_accounts(id);
CREATE TABLE IF NOT EXISTS rb_household(id INTEGER PRIMARY KEY CHECK(id=1),version INTEGER NOT NULL,state JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS rb_household_history(version INTEGER PRIMARY KEY,state JSONB NOT NULL);
`;
