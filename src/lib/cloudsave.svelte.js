/* 云存档状态与 API 客户端（账号由 Pages Function 校验 HttpOnly Cookie） */

import { app } from "./stores.svelte.js";

export const cloud = $state({
  checking: true,
  authed: false,
  name: "",
  saved: false,
  updatedAt: null
});

async function post(body) {
  var r = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  var j = await r.json().catch(function () { return {}; });
  if (!r.ok) throw new Error(j.error || "请求失败");
  return j;
}

export async function checkSession() {
  cloud.checking = true;
  try {
    var r = await fetch("/api/auth");
    var j = await r.json().catch(function () { return {}; });
    cloud.authed = !!j.authed;
    cloud.name = j.name || "";
  } catch (e) {
    cloud.authed = false;
    cloud.name = "";
  } finally {
    cloud.checking = false;
  }
  if (cloud.authed) await refreshSaveInfo();
}

export async function register(username, password) {
  var j = await post({ action: "register", username: username, password: password });
  cloud.authed = true;
  cloud.name = j.name;
  await refreshSaveInfo();
}

export async function login(username, password) {
  var j = await post({ action: "login", username: username, password: password });
  cloud.authed = true;
  cloud.name = j.name;
  await refreshSaveInfo();
}

export async function logout() {
  await post({ action: "logout" });
  cloud.authed = false;
  cloud.name = "";
  cloud.saved = false;
  cloud.updatedAt = null;
}

export async function changePassword(oldPass, newPass) {
  await post({ action: "changepass", oldPass: oldPass, newPass: newPass });
}

export async function refreshSaveInfo() {
  try {
    var r = await fetch("/api/save");
    var j = await r.json().catch(function () { return {}; });
    cloud.saved = !!j.saved;
    cloud.updatedAt = j.updatedAt || null;
  } catch (e) {
    cloud.saved = false;
    cloud.updatedAt = null;
  }
}

export async function uploadSave() {
  var payload = buildSavePayload();
  var r = await fetch("/api/save", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: payload })
  });
  var j = await r.json().catch(function () { return {}; });
  if (!r.ok) throw new Error(j.error || "上传失败");
  cloud.saved = true;
  cloud.updatedAt = new Date().toISOString().slice(0, 19).replace("T", " ");
  return payload;
}

export async function fetchSave() {
  var r = await fetch("/api/save");
  var j = await r.json().catch(function () { return {}; });
  if (!r.ok || !j.saved) throw new Error(j.error || "云端暂无存档");
  return j.data;
}

/* 与「导出存档」相同的完整存档结构（进度 + 随机挑战 + 自定义段位） */
export function buildSavePayload() {
  return {
    app: "jubeat-dan-challenge",
    exportedAt: new Date().toISOString(),
    state: app.progress,
    random: app.random,
    custom: app.customDans
  };
}
