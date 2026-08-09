-- JUBEAT 段位挑战 · 排行榜建表脚本（Cloudflare D1）
-- 在 D1 数据库的 Console 中执行，或：
--   npx wrangler d1 execute jubeat-dan --local --file=./schema.sql

CREATE TABLE IF NOT EXISTS leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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

-- 每个玩家在（版本 × 段位 × 模式 × 过段方式）下只保留一条记录
-- 已部署过旧表的库需先执行：
--   ALTER TABLE leaderboard ADD COLUMN version TEXT NOT NULL DEFAULT '';
--   CREATE UNIQUE INDEX idx_leaderboard_player_unique ON leaderboard (player, dan, version, mode, criterion);
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_player_unique
  ON leaderboard (player, dan, version, mode, criterion);

CREATE INDEX IF NOT EXISTS idx_leaderboard_board
  ON leaderboard (dan, version, mode, criterion, value DESC);
