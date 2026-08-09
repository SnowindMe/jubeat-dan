/* 排行榜 API 客户端（Cloudflare Pages Functions + D1） */

import { getAdminPass } from "./stores.svelte.js";

const PLAYER_ID_KEY = "jubeat-dan-player-id-v1";

/* 匿名设备身份：本地生成并持久化，排行榜以它为准做去重，
 * 改名不会产生新的榜位。 */
export function getPlayerId() {
  try {
    var id = localStorage.getItem(PLAYER_ID_KEY);
    if (id) return id;
  } catch (e) {
    /* ignore */
  }
  var newId = "";
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      newId = crypto.randomUUID();
    }
  } catch (e) {
    /* ignore */
  }
  if (!newId) {
    newId = "pid-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
  }
  try {
    localStorage.setItem(PLAYER_ID_KEY, newId);
  } catch (e) {
    /* ignore */
  }
  return newId;
}

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
  var r = await fetch("/api/leaderboard?limit=" + (limit || 100), {
    headers: { "X-Admin-Pass": getAdminPass() }
  });
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
