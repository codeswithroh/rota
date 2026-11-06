import { runMigrations } from "@agent-native/core/db";

const TENANT = `owner_email TEXT NOT NULL,
  org_id TEXT`;

export default runMigrations(
  [
    {
      version: 1,
      name: "rota-core",
      sql: `CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('barista', 'kitchen', 'floor')),
  hourly_rate_cents INTEGER NOT NULL CHECK (hourly_rate_cents >= 0),
  max_hours INTEGER NOT NULL CHECK (max_hours > 0),
  color TEXT,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TEXT NOT NULL DEFAULT (now()),
  ${TENANT}
);
CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  staff_id TEXT,
  role TEXT NOT NULL CHECK (role IN ('barista', 'kitchen', 'floor')),
  date TEXT NOT NULL,
  start_min INTEGER NOT NULL CHECK (start_min >= 0 AND start_min < 1440),
  end_min INTEGER NOT NULL CHECK (end_min <= 1440),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'proposed')),
  change TEXT CHECK (change IN ('add', 'replace', 'remove')),
  replaces_id TEXT,
  proposal_id TEXT,
  created_at TEXT NOT NULL DEFAULT (now()),
  ${TENANT},
  CHECK (end_min > start_min)
);
CREATE TABLE IF NOT EXISTS time_off (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL,
  date TEXT NOT NULL,
  reason TEXT,
  message_id TEXT,
  created_at TEXT NOT NULL DEFAULT (now()),
  ${TENANT}
);
CREATE TABLE IF NOT EXISTS coverage (
  id TEXT PRIMARY KEY,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  role TEXT NOT NULL CHECK (role IN ('barista', 'kitchen', 'floor')),
  start_min INTEGER NOT NULL,
  end_min INTEGER NOT NULL,
  needed INTEGER NOT NULL CHECK (needed > 0),
  ${TENANT},
  CHECK (end_min > start_min)
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  staff_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'handled')),
  proposal_id TEXT,
  created_at TEXT NOT NULL,
  ${TENANT}
);
CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  week TEXT NOT NULL,
  title TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message_id TEXT,
  created_at TEXT NOT NULL,
  decided_at TEXT,
  ${TENANT}
);
CREATE TABLE IF NOT EXISTS weeks (
  id TEXT PRIMARY KEY,
  week TEXT NOT NULL,
  budget_cents INTEGER NOT NULL CHECK (budget_cents >= 0),
  published_at TEXT,
  ${TENANT}
);
CREATE INDEX IF NOT EXISTS staff_tenant_idx ON staff (owner_email, org_id);
CREATE INDEX IF NOT EXISTS shifts_tenant_date_idx ON shifts (owner_email, org_id, date);
CREATE INDEX IF NOT EXISTS time_off_tenant_date_idx ON time_off (owner_email, org_id, date);
CREATE INDEX IF NOT EXISTS coverage_tenant_idx ON coverage (owner_email, org_id);
CREATE INDEX IF NOT EXISTS messages_tenant_created_idx ON messages (owner_email, org_id, created_at);
CREATE INDEX IF NOT EXISTS proposals_tenant_week_idx ON proposals (owner_email, org_id, week, status);
CREATE INDEX IF NOT EXISTS weeks_tenant_week_idx ON weeks (owner_email, org_id, week)`,
    },
  ],
  { table: "rota_app_migrations" },
);
