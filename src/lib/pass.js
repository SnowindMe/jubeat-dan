/* ---------- 通过判定与数值工具（纯函数） ---------- */

import { DAN_PALETTE } from "./constants.js";

let config = { pass: { total: 2100000, rate: 85 }, scoreMax: 1000000 };

export function initConfig(cfg) {
  config = cfg || config;
}

export function scoreMax() {
  return config.scoreMax;
}

export function passDefaults() {
  return (config.pass) ? config.pass : { total: 2100000, rate: 85 };
}

/* 默认总分达标线按“每首 700,000 分”换算，段位曲目数不为 3 时依然合理 */
export function defaultPassTotalFor(dan) {
  var n = (dan.songs && dan.songs.length) || 3;
  return Math.round((passDefaults().total / 3) * n);
}

export function passTotalFor(dan) {
  return dan.passTotal != null ? dan.passTotal : defaultPassTotalFor(dan);
}

/* 默认平均分达标线按每首 700,000 分换算（与总分线一致） */
export function defaultPassAvgFor() {
  return Math.round(passDefaults().total / 3);
}

export function passAvgFor(dan) {
  return dan.passAvg != null ? dan.passAvg : defaultPassAvgFor();
}

export function passRateFor(dan) {
  return dan.passRate != null ? dan.passRate : passDefaults().rate;
}

export function clampRate(v) {
  v = Number(v);
  if (isNaN(v)) return null;
  return Math.min(100, Math.max(0, v));
}

export function clampScore(v) {
  v = Math.round(Number(v));
  if (isNaN(v)) return null;
  return Math.min(scoreMax(), Math.max(0, v));
}

export function fmtLevel(v) {
  var n = Number(v);
  return isNaN(n) ? "" : String(n);
}

export function computePassed(dan, st) {
  var songMin = dan.songMin != null ? Number(dan.songMin) : null;
  var needFc = dan.needFc != null ? Number(dan.needFc) : 0;
  var gate = songGate(dan);
  if (dan.criterion === "rate") {
    var filled = st.rates.filter(function (v) { return v != null; });
    if (filled.length !== st.rates.length) return false;
    var avg = filled.reduce(function (a, b) { return a + b; }, 0) / filled.length;
    var target = passRateFor(dan);
    if (avg < target) return false;
    if (songMin != null && st.rates.some(function (v) { return v < songMin; })) return false;
    if (needFc > 0) {
      var fcCount = (st.fc || []).filter(function (v) { return v; }).length;
      if (fcCount < needFc) return false;
    }
    return true;
  }
  if (dan.criterion === "avg") {
    if (st.scores.some(function (v) { return v == null; })) return false;
    if (gate != null && st.scores.some(function (v) { return v < gate; })) return false;
    var avg2 = st.scores.reduce(function (a, v) { return a + v; }, 0) / st.scores.length;
    if (avg2 < passAvgFor(dan)) return false;
    if (songMin != null && st.scores.some(function (v) { return v < songMin; })) return false;
    if (needFc > 0) {
      var fcCount2 = (st.fc || []).filter(function (v) { return v; }).length;
      if (fcCount2 < needFc) return false;
    }
    return true;
  }
  if (st.scores.some(function (v) { return v == null; })) return false;
  if (gate != null && st.scores.some(function (v) { return v < gate; })) return false;
  var sum = st.scores.reduce(function (a, v) { return a + v; }, 0);
  var target2 = passTotalFor(dan);
  if (sum < target2) return false;
  if (songMin != null && st.scores.some(function (v) { return v < songMin; })) return false;
  if (needFc > 0) {
    var fcCount3 = (st.fc || []).filter(function (v) { return v; }).length;
    if (fcCount3 < needFc) return false;
  }
  return true;
}

/* ---------- 隐藏曲 & 顺序解锁 ---------- */

// 单曲关卡线：score/avg 默认 700,000（机台基础过关分）；rate 用 songMin（无则不设）
export function songGate(dan) {
  if (dan.criterion === "rate") {
    return dan.songMin != null ? Number(dan.songMin) : null;
  }
  return dan.songMin != null ? Number(dan.songMin) : 700000;
}

export function songValue(st, dan, i) {
  return dan.criterion === "rate" ? st.rates[i] : st.scores[i];
}

export function songMet(st, dan, i) {
  var v = songValue(st, dan, i);
  var gate = songGate(dan);
  return v != null && (gate == null || v >= gate);
}

// 任一已填分数低于关卡线 → 段位失败（excludeIndex 用于输入过程中跳过正在输入的曲目）
export function danFailed(st, dan, excludeIndex) {
  for (var i = 0; i < dan.songs.length; i++) {
    if (i === excludeIndex) continue;
    var v = songValue(st, dan, i);
    var gate = songGate(dan);
    if (v != null && gate != null && v < gate) return true;
  }
  return false;
}

// 段位失败提示文案：单曲未达分数线，挑战已关闭
export function danFailMessage(dan, isRate) {
  var gate = songGate(dan);
  return "存在单曲未达分数线（" +
    (gate != null ? (isRate ? gate + "%" : Number(gate).toLocaleString()) : "—") +
    "），无法通过段位，挑战已关闭。";
}

// 第 i 首是否锁定：前面有任一未达标/未填，或段位已失败
export function songLocked(st, dan, i, excludeIndex) {
  if (danFailed(st, dan, excludeIndex)) return true;
  for (var j = 0; j < i; j++) {
    if (!songMet(st, dan, j)) return true;
  }
  return false;
}

export function songOrdinal(i, total) {
  var n = i + 1;
  var suffix = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  var label = n + suffix;
  if (total > 1 && i === total - 1) label = "FINAL";
  return label;
}

export function versionLabel(dan) {
  return (dan.version || "").trim() || "默认";
}

export function danKey(dan) {
  return dan.id || versionLabel(dan) + "|" + dan.name;
}

export function paletteColor(i) {
  return DAN_PALETTE[i % DAN_PALETTE.length];
}

export function deepCopy(o) {
  return JSON.parse(JSON.stringify(o));
}
