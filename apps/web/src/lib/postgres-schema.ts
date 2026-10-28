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
