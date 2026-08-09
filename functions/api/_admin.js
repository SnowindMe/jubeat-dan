/* ============================================================
 * 管理员密码统一校验（Cloudflare Pages Functions + D1）
 * 优先读取 D1 admin_config 表中的 pass_hash；
 * 未迁移或未改过密码时回退到 data.json 内置 hash。
 * ============================================================ */

import appData from "../../data.json";

const DEFAULT_HASH = String(
  (appData && appData.config && appData.config.admin && appData.config.admin.passHash) || ""
).toLowerCase();

export async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(function (b) {
    return ("0" + b.toString(16)).slice(-2);
  }).join("");
}

export async function getAdminHash(env) {
  try {
    const row = await env.DB.prepare(
      "SELECT value FROM admin_config WHERE key = 'pass_hash'"
    ).first();
    if (row && row.value) return String(row.value).toLowerCase();
  } catch (e) {
    /* admin_config 表未迁移时回退默认 hash */
  }
  return DEFAULT_HASH;
}

export async function verifyAdmin(env, pass) {
  if (!pass) return false;
  const hash = await sha256Hex(pass);
  if (!hash) return false;
  const stored = await getAdminHash(env);
  return !!stored && hash === stored;
}
