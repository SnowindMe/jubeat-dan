/* ============================================================
 * 用户账号接口（Cloudflare Pages Functions + D1）
 * GET  /api/auth                 → 当前登录状态
 * POST /api/auth { action }      → register / login / logout
 * 会话走 HttpOnly Cookie；注册/登录按 IP 限流。
 * ============================================================ */

import { rateLimit } from "./_rate.js";
import { sha256Hex } from "./_admin.js";
import {
  clearSessionCookie,
  cookieFrom,
  createPasswordHash,
  createSession,
  currentUser,
  destroySession,
  ensureSchema,
  isSecureRequest,
  sameOrigin,
  sessionCookie,
  verifyPassword
} from "./_auth.js";

const NAME_MAX = 16;
const PASS_MIN = 6;
const PASS_MAX = 64;

function json(data, status, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }, extraHeaders || {})
  });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch (e) {
    return null;
  }
}

function validName(name) {
  return name.length >= 1 && name.length <= NAME_MAX &&
    /^[\w\u4e00-\u9fa5\-]+$/u.test(name);
}

async function register(context, body) {
  if (!body) return json({ error: "invalid json" }, 400);

  var name = String(body.username || "").trim();
  var pass = String(body.password || "");
  if (!validName(name)) {
    return json({ error: "用户名需为 1-" + NAME_MAX + " 个字符（中英文、数字、下划线、连字符）" }, 400);
  }
  if (pass.length < PASS_MIN || pass.length > PASS_MAX) {
    return json({ error: "密码需为 " + PASS_MIN + "-" + PASS_MAX + " 个字符" }, 400);
  }

  var rl = await rateLimit(context.env, context.request, "reg", 3600, 5);
  if (!rl.allowed) return json({ error: "注册过于频繁，请稍后再试" }, 429);

  await ensureSchema(context.env);
  var passHash = await createPasswordHash(pass);
  try {
    var res = await context.env.DB.prepare(
      "INSERT INTO users (name, name_key, pass) VALUES (?, ?, ?)"
    ).bind(name, name.toLowerCase(), passHash).run();
    var token = await createSession(context.env, res.meta.last_row_id);
    return json({ ok: true, name: name }, 200, {
      "Set-Cookie": sessionCookie(token, isSecureRequest(context.request))
    });
  } catch (e) {
    return json({ error: "该用户名已被注册" }, 409);
  }
}

async function login(context, body) {
  if (!body) return json({ error: "invalid json" }, 400);

  var nameKey = String(body.username || "").trim().toLowerCase();
  var pass = String(body.password || "");
  if (!nameKey || !pass) return json({ error: "请输入用户名和密码" }, 400);

  var rl = await rateLimit(context.env, context.request, "login", 300, 10);
  if (!rl.allowed) return json({ error: "尝试过于频繁，请稍后再试" }, 429);

  await ensureSchema(context.env);
  var row = await context.env.DB.prepare(
    "SELECT id, name, pass FROM users WHERE name_key = ?"
  ).bind(nameKey).first();
  if (!row || !(await verifyPassword(pass, row.pass))) {
    return json({ error: "用户名或密码错误" }, 401);
  }

  var token = await createSession(context.env, row.id);
  return json({ ok: true, name: row.name }, 200, {
    "Set-Cookie": sessionCookie(token, isSecureRequest(context.request))
  });
}

async function logout(context) {
  await destroySession(context.env, context.request);
  return json({ ok: true }, 200, {
    "Set-Cookie": clearSessionCookie(isSecureRequest(context.request))
  });
}

async function changePass(context, body) {
  if (!body) return json({ error: "invalid json" }, 400);

  var oldPass = String(body.oldPass || "");
  var newPass = String(body.newPass || "");
  if (!oldPass) return json({ error: "请输入当前密码" }, 400);
  if (newPass.length < PASS_MIN || newPass.length > PASS_MAX) {
    return json({ error: "密码需为 " + PASS_MIN + "-" + PASS_MAX + " 个字符" }, 400);
  }
  if (newPass === oldPass) {
    return json({ error: "新密码不能与当前密码相同" }, 400);
  }

  var rl = await rateLimit(context.env, context.request, "chpass", 300, 10);
  if (!rl.allowed) return json({ error: "尝试过于频繁，请稍后再试" }, 429);

  var user = await currentUser(context.env, context.request);
  if (!user) return json({ error: "未登录" }, 401);

  var row = await context.env.DB.prepare(
    "SELECT id, pass FROM users WHERE id = ?"
  ).bind(user.user_id).first();
  if (!row || !(await verifyPassword(oldPass, row.pass))) {
    return json({ error: "当前密码不正确" }, 401);
  }

  var passHash = await createPasswordHash(newPass);
  await context.env.DB.prepare("UPDATE users SET pass = ? WHERE id = ?")
    .bind(passHash, row.id).run();

  /* 改密后作废该用户在其他设备的会话，当前设备保持登录 */
  var token = cookieFrom(context.request);
  if (token) {
    await context.env.DB.prepare(
      "DELETE FROM sessions WHERE user_id = ? AND token_hash != ?"
    ).bind(row.id, await sha256Hex(token)).run();
  }
  return json({ ok: true });
}

export async function onRequestGet(context) {
  if (!sameOrigin(context.request)) return json({ error: "forbidden" }, 403);
  var user = await currentUser(context.env, context.request);
  if (!user) return json({ authed: false });
  return json({ authed: true, name: user.name });
}

export async function onRequestPost(context) {
  if (!sameOrigin(context.request)) return json({ error: "forbidden" }, 403);
  var body = await readJson(context.request);
  var action = body ? String(body.action || "") : "";
  if (action === "register") return register(context, body);
  if (action === "login") return login(context, body);
  if (action === "logout") return logout(context);
  if (action === "changepass") return changePass(context, body);
  return json({ error: "unknown action" }, 400);
}
