/* ============================================================
 * 排行榜 API（Cloudflare Pages Functions + D1）
 * GET  /api/leaderboard?dan=初段&version=beyond%20the%20Ave.&mode=NORMAL&criterion=score&limit=20
 * POST /api/leaderboard  { player, playerId, dan, version, mode, criterion, scores, rates, passTotal, passRate }
 * ============================================================ */

import appData from "../../data.json";

const ADMIN_PASS_HASH = String(
  (appData && appData.config && appData.config.admin && appData.config.admin.passHash) || ""
);

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(function (b) {
    return ("0" + b.toString(16)).slice(-2);
  }).join("");
}

const MODES = ["EASY", "NORMAL", "HARD"];
const CRITERIA = ["score", "rate", "avg"];
const SCORE_MAX = 1000000;
const NAME_MAX = 20;
const LIMIT_MAX = 50;
const LIMIT_DEFAULT = 20;

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function validNumberArray(arr, min, max) {
  if (!Array.isArray(arr) || !arr.length || arr.length > 10) return false;
  return arr.every(function (v) {
    var n = Number(v);
    return isFinite(n) && n >= min && n <= max;
  });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const dan = (url.searchParams.get("dan") || "").trim();
  const rawLimit = parseInt(url.searchParams.get("limit"), 10);
  const limit = Math.min(Math.max(rawLimit || LIMIT_DEFAULT, 1), LIMIT_MAX);

  /* 管理后台：不传 dan 时返回最近记录（含 id，供排行榜管理使用） */
  if (!dan) {
    const rows = await context.env.DB.prepare(
      "SELECT id, player_id, player, dan, version, mode, criterion, value, scores, rates, created_at " +
      "FROM leaderboard ORDER BY created_at DESC LIMIT ?"
    ).bind(limit).all();
    return json({ entries: rows.results });
  }

  const version = (url.searchParams.get("version") || "").trim();
  const mode = (url.searchParams.get("mode") || "NORMAL").toUpperCase();
  const rawCriterion = url.searchParams.get("criterion");
  const criterion = rawCriterion === "rate" ? "rate" : (rawCriterion === "avg" ? "avg" : "score");

  if (!MODES.includes(mode) || !CRITERIA.includes(criterion)) {
    return json({ error: "invalid params" }, 400);
  }

  let sql =
    "SELECT player, MAX(value) AS value, MIN(created_at) AS achieved_at " +
    "FROM leaderboard WHERE dan = ? AND mode = ? AND criterion = ?";
  const binds = [dan, mode, criterion];
  if (version) {
    sql += " AND version = ?";
    binds.push(version);
  }
  sql += " GROUP BY player_id ORDER BY value DESC, achieved_at ASC LIMIT ?";
  binds.push(limit);
  const { results } = await context.env.DB.prepare(sql).bind(...binds).all();

  return json({
    board: results.map(function (r, i) {
      return { rank: i + 1, player: r.player, value: r.value, achieved_at: r.achieved_at };
    })
  });
}

export async function onRequestPost(context) {
  let body;
  try {
    body = await context.request.json();
  } catch (e) {
    return json({ error: "invalid json" }, 400);
  }

  const player = String(body.player || "").trim();
  const playerId = String(body.playerId || "").trim() || ("legacy:" + player);
  const dan = String(body.dan || "").trim();
  const version = String(body.version || "").trim() || "默认";
  const mode = String(body.mode || "").toUpperCase();
  const criterion = body.criterion === "rate" ? "rate" : (body.criterion === "avg" ? "avg" : "score");
  const scores = Array.isArray(body.scores) ? body.scores : [];
  const rates = Array.isArray(body.rates) ? body.rates : [];
  const fcCount = Number(body.fcCount) || 0;
  const passTotal = Number(body.passTotal);
  const passRate = Number(body.passRate);
  const passAvg = Number(body.passAvg);
  const songMin = Number(body.songMin) || 0;
  const needFc = Number(body.needFc) || 0;

  if (!player || player.length > NAME_MAX) {
    return json({ error: "昵称需为 1-" + NAME_MAX + " 个字符" }, 400);
  }
  if (!playerId || playerId.length > 64) {
    return json({ error: "playerId 无效" }, 400);
  }
  if (!dan || !MODES.includes(mode) || !CRITERIA.includes(criterion)) {
    return json({ error: "invalid dan/mode/criterion" }, 400);
  }
  if (!validNumberArray(scores, 0, SCORE_MAX)) {
    return json({ error: "scores 需为 1-10 个 0-" + SCORE_MAX + " 的数字" }, 400);
  }
  if (!validNumberArray(rates, 0, 100)) {
    return json({ error: "rates 需为 1-10 个 0-100 的数字" }, 400);
  }
  if (scores.length !== rates.length) {
    return json({ error: "scores 与 rates 数量需一致" }, 400);
  }
  if (!isFinite(fcCount) || fcCount < 0 || fcCount > scores.length) {
    return json({ error: "fcCount 无效" }, 400);
  }

  const sql =
    "INSERT INTO leaderboard (player_id, player, dan, version, mode, criterion, value, scores, rates, passed, created_at) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now')) " +
    "ON CONFLICT (player_id, dan, version, mode, criterion) DO UPDATE SET " +
    "player = excluded.player, value = excluded.value, scores = excluded.scores, rates = excluded.rates, " +
    "passed = 1, created_at = excluded.created_at " +
    "WHERE excluded.value > leaderboard.value;";

  if (criterion === "score") {
    const total = scores.reduce(function (a, b) { return a + Number(b); }, 0);
    if (!isFinite(passTotal) || passTotal <= 0 || total < passTotal) {
      return json({ error: "未达标，无法提交" }, 400);
    }
    if (songMin > 0 && scores.some(function (v) { return Number(v) < songMin; })) {
      return json({ error: "存在单曲分数未达线" }, 400);
    }
    if (needFc > 0 && fcCount < needFc) {
      return json({ error: "FULL COMBO 曲数不足" }, 400);
    }
    await context.env.DB.prepare(sql)
      .bind(playerId, player, dan, version, mode, criterion, total, JSON.stringify(scores), JSON.stringify(rates))
      .run();
    return json({ ok: true, value: total });
  }

  if (criterion === "avg") {
    const avg = scores.reduce(function (a, b) { return a + Number(b); }, 0) / scores.length;
    if (!isFinite(passAvg) || passAvg <= 0 || passAvg > SCORE_MAX || avg < passAvg) {
      return json({ error: "未达标，无法提交" }, 400);
    }
    await context.env.DB.prepare(sql)
      .bind(playerId, player, dan, version, mode, criterion, avg, JSON.stringify(scores), JSON.stringify(rates))
      .run();
    return json({ ok: true, value: avg });
  }

  const rateAvg = rates.reduce(function (a, b) { return a + Number(b); }, 0) / rates.length;
  if (!isFinite(passRate) || passRate <= 0 || passRate > 100 || rateAvg < passRate) {
    return json({ error: "未达标，无法提交" }, 400);
  }
  await context.env.DB.prepare(sql)
    .bind(playerId, player, dan, version, mode, criterion, rateAvg, JSON.stringify(scores), JSON.stringify(rates))
    .run();
  return json({ ok: true, value: rateAvg });
}

export async function onRequestDelete(context) {
  let body;
  try {
    body = await context.request.json();
  } catch (e) {
    return json({ error: "invalid json" }, 400);
  }
  const id = Number(body.id);
  const pass = String(body.adminPass || "");
  if (!Number.isInteger(id) || id <= 0) {
    return json({ error: "invalid id" }, 400);
  }
  const hash = await sha256Hex(pass);
  if (ADMIN_PASS_HASH && hash !== ADMIN_PASS_HASH.toLowerCase()) {
    return json({ error: "管理员验证失败" }, 401);
  }
  const result = await context.env.DB.prepare("DELETE FROM leaderboard WHERE id = ?").bind(id).run();
  return json({ ok: true, deleted: result.meta.changes });
}
