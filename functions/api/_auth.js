/* ============================================================
 * 用户账号 / 云存档 共享认证模块（Cloudflare Pages Functions + D1）
 * - 密码：PBKDF2-SHA256（WebCrypto，Workers 内置），每用户随机盐
 * - 会话：32 字节随机 token，只存 SHA-256 哈希，HttpOnly Cookie
 * - 表结构缺失时自动 CREATE TABLE IF NOT EXISTS（幂等，可自愈）
 * ============================================================ */

import { sha256Hex } from "./_admin.js";

export const SESSION_COOKIE = "jubeat_dan_session";
const SESSION_SECONDS = 30 * 24 * 3600;
const PBKDF2_ITERATIONS = 100000;

let schemaEnsured = false;

export async function ensureSchema(env) {
  if (schemaEnsured) return;
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS users (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "name TEXT NOT NULL, " +
    "name_key TEXT NOT NULL UNIQUE, " +
    "pass TEXT NOT NULL, " +
    "save_data TEXT, " +
    "created_at TEXT NOT NULL DEFAULT (datetime('now')))"
  ).run();
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS sessions (" +
    "token_hash TEXT PRIMARY KEY, " +
    "user_id INTEGER NOT NULL, " +
    "created_at TEXT NOT NULL DEFAULT (datetime('now')), " +
    "expires_at INTEGER NOT NULL)"
  ).run();
  schemaEnsured = true;
}

function bytesToHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map(function (b) { return ("0" + b.toString(16)).slice(-2); })
    .join("");
}

function hexToBytes(hex) {
  var out = new Uint8Array(hex.length / 2);
  for (var i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function derive(password, saltHex, iterations) {
  var enc = new TextEncoder();
  var key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  var bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(saltHex), iterations: iterations },
    key,
    256
  );
  return bytesToHex(bits);
}

export async function createPasswordHash(password) {
  var salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  var hash = await derive(password, salt, PBKDF2_ITERATIONS);
  return PBKDF2_ITERATIONS + "$" + salt + "$" + hash;
}

export async function verifyPassword(password, stored) {
  var parts = String(stored || "").split("$");
  if (parts.length !== 3) return false;
  var iterations = parseInt(parts[0], 10);
  if (!isFinite(iterations) || iterations < 10000) return false;
  var hash = await derive(password, parts[1], iterations);
  return hash === parts[2];
}

function parseCookies(header) {
  var out = {};
  String(header || "").split(";").forEach(function (part) {
    var i = part.indexOf("=");
    if (i < 0) return;
    var k = part.slice(0, i).trim();
    var v = part.slice(i + 1).trim();
    if (k) {
      try {
        out[k] = decodeURIComponent(v);
      } catch (e) {
        out[k] = v;
      }
    }
  });
  return out;
}

export function cookieFrom(request) {
  return parseCookies(request.headers.get("Cookie") || "")[SESSION_COOKIE] || null;
}

export async function createSession(env, userId) {
  var token = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  var tokenHash = await sha256Hex(token);
  var expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  await env.DB.prepare(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)"
  ).bind(tokenHash, userId, expiresAt).run();
  return token;
}

export async function destroySession(env, request) {
  var token = cookieFrom(request);
  if (!token) return;
  await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
    .bind(await sha256Hex(token)).run();
}

export async function currentUser(env, request) {
  var token = cookieFrom(request);
  if (!token) return null;
  var tokenHash = await sha256Hex(token);
  try {
    var row = await env.DB.prepare(
      "SELECT s.user_id, u.name FROM sessions s " +
      "JOIN users u ON u.id = s.user_id " +
      "WHERE s.token_hash = ? AND s.expires_at > ?"
    ).bind(tokenHash, Math.floor(Date.now() / 1000)).first();
    return row || null;
  } catch (e) {
    return null;
  }
}

export function isSecureRequest(request) {
  var proto = request.headers.get("X-Forwarded-Proto") || new URL(request.url).protocol;
  return proto === "https" || proto === "https:";
}

export function sameOrigin(request) {
  var origin = request.headers.get("Origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch (e) {
    return false;
  }
}

export function sessionCookie(token, secure) {
  return SESSION_COOKIE + "=" + token +
    "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" + SESSION_SECONDS +
    (secure ? "; Secure" : "");
}

export function clearSessionCookie(secure) {
  return SESSION_COOKIE + "=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" +
    (secure ? "; Secure" : "");
}
