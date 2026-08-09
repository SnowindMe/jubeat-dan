-- JUBEAT 段位挑战 · 排行榜建表脚本（Cloudflare D1）
-- 在 D1 数据库的 Console 中执行，或：
--   npx wrangler d1 execute jubeat-dan --local --file=./schema.sql

CREATE TABLE IF NOT EXISTS leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL DEFAULT '',
  player TEXT NOT NULL,
  dan TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL,
  criterion TEXT NOT NULL,
  value REAL NOT NULL,
  scores TEXT NOT NULL,
  rates TEXT NOT NULL,
  passed INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 每个设备（player_id）在（版本 × 段位 × 模式 × 过段方式）下只保留一条记录；
-- 改名会原地更新 player，不会产生新的榜位。
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_player_unique
  ON leaderboard (player_id, dan, version, mode, criterion);

CREATE INDEX IF NOT EXISTS idx_leaderboard_board
  ON leaderboard (dan, version, mode, criterion, value DESC);

-- 用户反馈表
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 站点配置表（目前存管理员密码 hash，key='pass_hash'）
CREATE TABLE IF NOT EXISTS admin_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 独立访客计数表（visitor 为 IP+UA 的匿名哈希）
CREATE TABLE IF NOT EXISTS visitors (
  visitor TEXT PRIMARY KEY,
  first_seen TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 旧库迁移（已部署过旧表的 D1 数据库，在 Console 执行一次即可）：
-- 旧表按 player 去重；迁移后旧记录以 'legacy:' + player 作为 player_id，
-- 新提交按浏览器设备 ID 去重。
-- ============================================================
-- ALTER TABLE leaderboard RENAME TO leaderboard_old;
-- CREATE TABLE leaderboard (
--   id INTEGER PRIMARY KEY AUTOINCREMENT,
--   player_id TEXT NOT NULL DEFAULT '',
--   player TEXT NOT NULL,
--   dan TEXT NOT NULL,
--   version TEXT NOT NULL DEFAULT '',
--   mode TEXT NOT NULL,
--   criterion TEXT NOT NULL,
--   value REAL NOT NULL,
--   scores TEXT NOT NULL,
--   rates TEXT NOT NULL,
--   passed INTEGER NOT NULL DEFAULT 1,
--   created_at TEXT NOT NULL DEFAULT (datetime('now'))
-- );
-- INSERT INTO leaderboard (id, player_id, player, dan, version, mode, criterion, value, scores, rates, passed, created_at)
--   SELECT id, 'legacy:' || player, player, dan, version, mode, criterion, value, scores, rates, passed, created_at
--   FROM leaderboard_old;
-- DROP TABLE leaderboard_old;
-- CREATE UNIQUE INDEX idx_leaderboard_player_unique
--   ON leaderboard (player_id, dan, version, mode, criterion);
-- CREATE INDEX idx_leaderboard_board
--   ON leaderboard (dan, version, mode, criterion, value DESC);
--
-- 新增功能（反馈 + 管理员改密码）迁移，任意时刻执行一次即可：
-- CREATE TABLE IF NOT EXISTS feedback (
--   id INTEGER PRIMARY KEY AUTOINCREMENT,
--   player TEXT NOT NULL DEFAULT '',
--   content TEXT NOT NULL,
--   created_at TEXT NOT NULL DEFAULT (datetime('now'))
-- );
-- CREATE TABLE IF NOT EXISTS admin_config (
--   key TEXT PRIMARY KEY,
--   value TEXT NOT NULL
-- );
--
-- 访客计数迁移（任意时刻执行一次即可）：
-- CREATE TABLE IF NOT EXISTS visitors (
--   visitor TEXT PRIMARY KEY,
--   first_seen TEXT NOT NULL DEFAULT (datetime('now'))
-- );
