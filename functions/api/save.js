/* ============================================================
 * 云存档接口（Cloudflare Pages Functions + D1）
 * GET  /api/save  → 读取当前用户云端存档
 * PUT  /api/save  → 覆盖保存（body: { data: {...} }，≤512KB）
 * ============================================================ */

import { rateLimit } from "./_rate.js";
import { currentUser, ensureSchema, sameOrigin } from "./_auth.js";

const SAVE_MAX = 512 * 1024;

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch (e) {
    return null;
  }
}

export async function onRequestGet(context) {
  if (!sameOrigin(context.request)) return json({ error: "forbidden" }, 403);
  var user = await currentUser(context.env, context.request);
  if (!user) return json({ error: "未登录" }, 401);

  var row = await context.env.DB.prepare(
    "SELECT save_data, updated_at FROM users WHERE id = ?"
  ).bind(user.user_id).first();
  if (!row || row.save_data == null) return json({ saved: false });
  try {
    return json({ saved: true, updatedAt: row.updated_at, data: JSON.parse(row.save_data) });
  } catch (e) {
    return json({ saved: false });
  }
}

export async function onRequestPut(context) {
  if (!sameOrigin(context.request)) return json({ error: "forbidden" }, 403);
  var user = await currentUser(context.env, context.request);
  if (!user) return json({ error: "未登录" }, 401);

  var body = await readJson(context.request);
  var data = body && body.data;
  if (!data || typeof data !== "object") return json({ error: "存档数据无效" }, 400);
  var str = JSON.stringify(data);
  if (str.length > SAVE_MAX) return json({ error: "存档过大（超过 512KB）" }, 413);

  var rl = await rateLimit(context.env, context.request, "save", 3600, 60);
  if (!rl.allowed) return json({ error: "上传过于频繁，请稍后再试" }, 429);

  await ensureSchema(context.env);
  await context.env.DB.prepare(
    "UPDATE users SET save_data = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(str, user.user_id).run();
  return json({ ok: true });
}
