/* ============================================================
 * 管理员密码统一校验（Cloudflare Pages Functions + D1）
 * 只认 D1 admin_config 表中的 pass_hash；
 * 不再回退 data.json 内置 hash（避免默认密码公开可被利用）。
 * ============================================================ */

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
    return row && row.value ? String(row.value).toLowerCase() : null;
  } catch (e) {
    /* admin_config 表未迁移或异常时视为未设置密码 */
    return null;
  }
}

export async function verifyAdmin(env, pass) {
  if (!pass) return false;
  const hash = await sha256Hex(pass);
  if (!hash) return false;
  const stored = await getAdminHash(env);
  return !!stored && hash === stored;
}
