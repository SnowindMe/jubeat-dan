/* ============================================================
 * 反馈接口（Cloudflare Pages Functions + D1）
 * POST   /api/feedback            { content, player }
 * GET    /api/feedback?pass=xxx   管理后台查看（管理员密码）
 * DELETE /api/feedback            { id, adminPass }
 * ============================================================ */

import { verifyAdmin } from "./_admin.js";
import { rateLimit } from "./_rate.js";

const CONTENT_MAX = 1000;
const NAME_MAX = 20;

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const pass = String(url.searchParams.get("pass") || "");
  if (!(await verifyAdmin(context.env, pass))) {
    return json({ error: "管理员验证失败" }, 401);
  }
  const rawLimit = parseInt(url.searchParams.get("limit"), 10);
  const limit = Math.min(Math.max(rawLimit || 100, 1), 200);
  const { results } = await context.env.DB.prepare(
    "SELECT id, player, content, created_at FROM feedback " +
    "ORDER BY created_at DESC, id DESC LIMIT ?"
  ).bind(limit).all();
  return json({ entries: results });
}

export async function onRequestPost(context) {
  let body;
  try {
    body = await context.request.json();
  } catch (e) {
    return json({ error: "invalid json" }, 400);
  }

  /* 防刷：同一 IP 每小时最多 5 条反馈 */
  const rl = await rateLimit(context.env, context.request, "fb", 3600, 5);
  if (!rl.allowed) {
    return json({ error: "反馈提交过于频繁，请稍后再试" }, 429);
  }

  const content = String(body.content || "").trim();
  const player = String(body.player || "").trim();
  if (!content) {
    return json({ error: "反馈内容不能为空" }, 400);
  }
  if (content.length > CONTENT_MAX) {
    return json({ error: "反馈内容最多 " + CONTENT_MAX + " 字" }, 400);
  }
  if (player.length > NAME_MAX) {
    return json({ error: "昵称最多 " + NAME_MAX + " 个字符" }, 400);
  }

  await context.env.DB.prepare(
    "INSERT INTO feedback (player, content, created_at) VALUES (?, ?, datetime('now'))"
  ).bind(player, content).run();
  return json({ ok: true });
}

export async function onRequestDelete(context) {
  let body;
  try {
    body = await context.request.json();
  } catch (e) {
    return json({ error: "invalid json" }, 400);
  }
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return json({ error: "invalid id" }, 400);
  }
  if (!(await verifyAdmin(context.env, String(body.adminPass || "")))) {
    return json({ error: "管理员验证失败" }, 401);
  }
  const result = await context.env.DB.prepare("DELETE FROM feedback WHERE id = ?").bind(id).run();
  return json({ ok: true, deleted: result.meta.changes });
}
