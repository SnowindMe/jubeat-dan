/* ============================================================
 * 访客计数（Cloudflare Pages Functions + D1）
 * GET /api/visit
 * 以（IP + User-Agent）哈希作为匿名访客标识，去重后累计独立访客数。
 * ============================================================ */

const SALT = "jubeat-dan-visitor-v1";

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(function (b) {
    return ("0" + b.toString(16)).slice(-2);
  }).join("");
}

export async function onRequestGet(context) {
  const ip = context.request.headers.get("CF-Connecting-IP") || "";
  const ua = context.request.headers.get("User-Agent") || "";
  const visitor = (await sha256Hex(SALT + "|" + ip + "|" + ua)).slice(0, 32);

  await context.env.DB.prepare(
    "INSERT OR IGNORE INTO visitors (visitor) VALUES (?)"
  ).bind(visitor).run();

  const { results } = await context.env.DB.prepare(
    "SELECT COUNT(*) AS total FROM visitors"
  ).all();
  const total = Number(results && results[0] ? results[0].total : 0);
  return json({ total: total });
}
