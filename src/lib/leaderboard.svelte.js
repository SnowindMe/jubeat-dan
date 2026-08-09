/* 排行榜 API 客户端（Cloudflare Pages Functions + D1） */

export const boardState = $state({
  dan: null,
  version: "",
  mode: "normal",
  criterion: "score"
});

export async function fetchBoard() {
  var qs =
    "dan=" + encodeURIComponent(boardState.dan) +
    "&version=" + encodeURIComponent(boardState.version) +
    "&mode=" + encodeURIComponent(boardState.mode.toUpperCase()) +
    "&criterion=" + encodeURIComponent(boardState.criterion) +
    "&limit=20";
  var r = await fetch("/api/leaderboard?" + qs);
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

export async function fetchManageEntries(limit) {
  var r = await fetch("/api/leaderboard?limit=" + (limit || 100));
  var j = await r.json().catch(function () { return {}; });
  if (!r.ok) throw new Error((j && j.error) || ("HTTP " + r.status));
  return j.entries || [];
}

export async function postBoard(payload) {
  var r = await fetch("/api/leaderboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!r.ok) {
    var j = await r.json().catch(function () { return {}; });
    throw new Error(j.error || "提交失败");
  }
  return r.json();
}

export async function deleteEntry(id, adminPass) {
  var r = await fetch("/api/leaderboard", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: id, adminPass: adminPass })
  });
  var j = await r.json().catch(function () { return {}; });
  return { status: r.status, json: j };
}
