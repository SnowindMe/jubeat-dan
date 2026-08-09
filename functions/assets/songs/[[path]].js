/* ============================================================
 * 曲图资源代理：从 R2 bucket 读取 /assets/songs/* 并做边缘缓存。
 * 依赖 Pages 项目绑定：R2 bucket 绑定变量名 SONG_IMAGES。
 * 对象 key 为 songs/<文件名>（兼容直接放在 bucket 根目录的旧结构）。
 * ============================================================ */

const TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml"
};

function contentType(name) {
  const ext = (name.split("?")[0].match(/\.([a-zA-Z0-9]+)$/) || [, ""])[1].toLowerCase();
  return TYPES[ext] || "application/octet-stream";
}

export async function onRequestGet(context) {
  const rel = (context.params.path || []).join("/");
  if (!rel || !context.env.SONG_IMAGES) {
    return new Response("Not Found", { status: 404 });
  }

  const key = "songs/" + rel;
  const cache = caches.default;
  const cacheKey = new Request(context.request.url);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let obj = await context.env.SONG_IMAGES.get(key);
  if (!obj) obj = await context.env.SONG_IMAGES.get(rel);
  if (!obj) return new Response("Not Found", { status: 404 });

  const headers = new Headers();
  headers.set("Content-Type", contentType(rel));
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  if (obj.httpEtag) headers.set("ETag", obj.httpEtag);
  const res = new Response(obj.body, { headers });
  context.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
