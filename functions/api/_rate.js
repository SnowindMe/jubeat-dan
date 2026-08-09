/* ============================================================
 * 轻量 IP 限流（Cloudflare Pages Functions + D1 rate_limits 表）
 * 固定窗口计数：同一 IP 在窗口内达到 limit 即拒绝。
 * 每个 IP 每个 scope 只保留一条记录，窗口翻转时自动重置。
 * ============================================================ */

export async function rateLimit(env, request, scope, windowSec, limit) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = scope + ":" + ip;
  const now = Math.floor(Date.now() / 1000);
  const windowId = Math.floor(now / windowSec);

  try {
    const row = await env.DB.prepare(
      "SELECT c, w FROM rate_limits WHERE k = ?"
    ).bind(key).first();

    if (!row || row.w !== windowId) {
      /* 新窗口：重置计数为 1（INSERT 或覆盖旧窗口残留） */
      await env.DB.prepare(
        "INSERT INTO rate_limits (k, c, w, expires_at) VALUES (?, 1, ?, ?) " +
        "ON CONFLICT(k) DO UPDATE SET c = 1, w = excluded.w, expires_at = excluded.expires_at"
      ).bind(key, windowId, now + windowSec).run();
      return { allowed: true, remaining: Math.max(limit - 1, 0) };
    }

    if (row.c >= limit) {
      return { allowed: false, remaining: 0 };
    }

    await env.DB.prepare(
      "UPDATE rate_limits SET c = c + 1 WHERE k = ?"
    ).bind(key).run();
    return { allowed: true, remaining: Math.max(limit - row.c - 1, 0) };
  } catch (e) {
    /* rate_limits 表未迁移或数据库异常时放行，不影响正常功能 */
    return { allowed: true, remaining: limit };
  }
}
