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
    /* 单条原子 UPSERT：窗口未变则计数 +1，窗口翻转则重置为 1，返回新计数 */
    const { results } = await env.DB.prepare(
      "INSERT INTO rate_limits (k, c, w, expires_at) VALUES (?, 1, ?, ?) " +
      "ON CONFLICT(k) DO UPDATE SET " +
      "c = CASE WHEN rate_limits.w = excluded.w THEN rate_limits.c + 1 ELSE 1 END, " +
      "w = CASE WHEN rate_limits.w = excluded.w THEN rate_limits.w ELSE excluded.w END, " +
      "expires_at = CASE WHEN rate_limits.w = excluded.w THEN rate_limits.expires_at ELSE excluded.expires_at END " +
      "RETURNING c"
    ).bind(key, windowId, now + windowSec).all();
    const c = Number(results && results[0] ? results[0].c : 1);
    return { allowed: c <= limit, remaining: Math.max(limit - c, 0) };
  } catch (e) {
    /* rate_limits 表未迁移或数据库异常时放行，不影响正常功能 */
    return { allowed: true, remaining: limit };
  }
}
