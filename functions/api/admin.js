/* ============================================================
 * 管理员接口（Cloudflare Pages Functions + D1）
 * POST /api/admin  { action: "verify", pass }
 * POST /api/admin  { action: "password", oldPass, newPass }
 * POST /api/admin  { action: "resetpass", username, newPass }（X-Admin-Pass 头鉴权）
 * GET  /api/admin  → 用户列表（X-Admin-Pass 头鉴权）
 * ============================================================ */

import { getAdminHash, sha256Hex, verifyAdmin } from "./_admin.js";
import { createPasswordHash } from "./_auth.js";
import { rateLimit } from "./_rate.js";

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export async function onRequestPost(context) {
  let body;
  try {
    body = await context.request.json();
  } catch (e) {
    return json({ error: "invalid json" }, 400);
  }

  /* 防爆破：同一 IP 每分钟最多 5 次验证/改密尝试 */
  const rl = await rateLimit(context.env, context.request, "admin", 60, 5);
  if (!rl.allowed) {
    return json({ error: "尝试过于频繁，请稍后再试" }, 429);
  }

  const action = String(body.action || "");

  if (action === "verify") {
    const ok = await verifyAdmin(context.env, String(body.pass || ""));
    return json({ ok: ok });
  }

  if (action === "password") {
    const oldPass = String(body.oldPass || "");
    const newPass = String(body.newPass || "");
    if (!(await verifyAdmin(context.env, oldPass))) {
      return json({ error: "当前密码不正确" }, 401);
    }
    if (newPass.length < 4 || newPass.length > 64) {
      return json({ error: "新密码需为 4-64 个字符" }, 400);
    }
    if (newPass === oldPass) {
      return json({ error: "新密码不能与当前密码相同" }, 400);
    }
    const hash = await sha256Hex(newPass);
    try {
      await context.env.DB.prepare(
        "INSERT INTO admin_config (key, value) VALUES ('pass_hash', ?) " +
        "ON CONFLICT (key) DO UPDATE SET value = excluded.value"
      ).bind(hash).run();
    } catch (e) {
      return json({ error: "数据库未迁移：请先在 D1 Console 执行 schema.sql" }, 500);
    }
    return json({ ok: true });
  }

  if (action === "resetpass") {
    const adminPass = context.request.headers.get("x-admin-pass") || "";
    if (!(await verifyAdmin(context.env, adminPass))) {
      return json({ error: "管理员验证失败" }, 401);
    }
    const username = String(body.username || "").trim();
    const newPass = String(body.newPass || "");
    if (!username) return json({ error: "请输入用户名" }, 400);
    if (newPass.length < 6 || newPass.length > 64) {
      return json({ error: "新密码需为 6-64 个字符" }, 400);
    }
    const row = await context.env.DB.prepare(
      "SELECT id FROM users WHERE name_key = ?"
    ).bind(username.toLowerCase()).first();
    if (!row) return json({ error: "用户不存在" }, 404);
    const passHash = await createPasswordHash(newPass);
    await context.env.DB.prepare("UPDATE users SET pass = ? WHERE id = ?")
      .bind(passHash, row.id).run();
    /* 重置后强制该用户所有设备重新登录 */
    await context.env.DB.prepare("DELETE FROM sessions WHERE user_id = ?")
      .bind(row.id).run();
    return json({ ok: true });
  }

  return json({ error: "unknown action" }, 400);
}

export async function onRequestGet(context) {
  const adminPass = context.request.headers.get("x-admin-pass") || "";
  if (!(await verifyAdmin(context.env, adminPass))) {
    return json({ error: "管理员验证失败" }, 401);
  }
  const rl = await rateLimit(context.env, context.request, "admin", 60, 5);
  if (!rl.allowed) {
    return json({ error: "尝试过于频繁，请稍后再试" }, 429);
  }
  const { results } = await context.env.DB.prepare(
    "SELECT id, name, created_at, (save_data IS NOT NULL) AS has_save " +
    "FROM users ORDER BY id DESC LIMIT 200"
  ).all();
  return json({ users: results });
}
