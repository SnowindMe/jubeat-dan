/* ============================================================
 * 管理员接口（Cloudflare Pages Functions + D1）
 * POST /api/admin  { action: "verify", pass }
 * POST /api/admin  { action: "password", oldPass, newPass }
 * ============================================================ */

import { getAdminHash, sha256Hex, verifyAdmin } from "./_admin.js";

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

  return json({ error: "unknown action" }, 400);
}
