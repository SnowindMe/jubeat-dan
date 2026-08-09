import { esc } from "./utils.js";
import {
  passAvgFor,
  passRateFor,
  passTotalFor,
  songGate
} from "./pass.js";

export function passSummaryHtml(dan, st) {
  var songMin = dan.songMin != null ? Number(dan.songMin) : null;
  var needFc = dan.needFc != null ? Number(dan.needFc) : 0;
  var fcCount = (st.fc || []).filter(function (v) { return v; }).length;
  var extra = [];
  var gate = songGate(dan);
  if (gate != null) extra.push("单曲 ≥ " + (dan.criterion === "rate" ? gate + "%" : Number(gate).toLocaleString()));
  if (needFc > 0) extra.push("FC " + fcCount + "/" + needFc);
  var extraHtml = extra.length ? '<span class="pass-extra">（' + extra.join(" · ") + "）</span>" : "";
  if (dan.criterion === "rate") {
    var filled = st.rates.filter(function (v) { return v != null; });
    var missing = st.rates.length - filled.length;
    var avg = filled.length
      ? filled.reduce(function (a, b) { return a + b; }, 0) / filled.length
      : null;
    var target = passRateFor(dan);
    var ok = missing === 0 && avg != null && avg >= target;
    var rateLabel = dan.criterionLabel || "music rate";
    return '<div class="pass-summary' + (ok ? " ok" : "") + '">平均 ' + esc(rateLabel) + "：<b>" +
      (avg == null ? "--" : avg.toFixed(2) + "%") + "</b> / 目标 " + target + "%" +
      (missing > 0 ? "（还需 " + missing + " 首）" : (ok ? " · 达标" : "")) + extraHtml + "</div>";
  }
  if (dan.criterion === "avg") {
    var missing2 = st.scores.filter(function (v) { return v == null; }).length;
    var filled2 = st.scores.filter(function (v) { return v != null; });
    var avg2 = filled2.length
      ? Math.round(filled2.reduce(function (a, v) { return a + v; }, 0) / filled2.length)
      : null;
    var target2 = passAvgFor(dan);
    var ok2 = missing2 === 0 && avg2 != null && avg2 >= target2;
    return '<div class="pass-summary' + (ok2 ? " ok" : "") + '">平均分：<b>' +
      (avg2 == null ? "--" : avg2.toLocaleString()) + "</b> / 目标 " + target2.toLocaleString() +
      (missing2 > 0 ? "（还需 " + missing2 + " 首）" : (ok2 ? " · 达标" : "")) + extraHtml + "</div>";
  }
  var sum = st.scores.reduce(function (a, v) { return a + (v || 0); }, 0);
  var missing3 = st.scores.filter(function (v) { return v == null; }).length;
  var filled3 = st.scores.filter(function (v) { return v != null; });
  var avg3 = filled3.length ? Math.round(sum / filled3.length) : null;
  var target3 = passTotalFor(dan);
  var ok3 = missing3 === 0 && sum >= target3;
  return '<div class="pass-summary' + (ok3 ? " ok" : "") + '">任务曲总得分：<b>' +
    sum.toLocaleString() + "</b> / 目标 " + target3.toLocaleString() +
    (avg3 != null ? "（平均 " + avg3.toLocaleString() + "）" : "") +
    (missing3 > 0 ? " · 还需 " + missing3 + " 首" : (ok3 ? " · 达标" : "")) + extraHtml + "</div>";
}

export function medalRowHtml(dan, st) {
  var m = dan.medals;
  if (!m) return "";
  var basis = dan.medalBasis ||
    (dan.criterion === "rate" ? "rate" : (dan.criterion === "avg" ? "avg" : "total"));
  var value = null;
  if (basis === "rate") {
    var filled = st.rates.filter(function (v) { return v != null; });
    if (filled.length === st.rates.length && filled.length) {
      value = filled.reduce(function (a, b) { return a + b; }, 0) / filled.length;
    }
  } else if (basis === "avg") {
    if (!st.scores.some(function (v) { return v == null; }) && st.scores.length) {
      value = st.scores.reduce(function (a, v) { return a + v; }, 0) / st.scores.length;
    }
  } else {
    if (!st.scores.some(function (v) { return v == null; })) {
      value = st.scores.reduce(function (a, v) { return a + (v || 0); }, 0);
    }
  }
  var basisLabel = dan.medalLabel || (basis === "rate" ? "music rate" : (basis === "avg" ? "平均分" : "总分数"));
  var chips = [
    ["gold", "🥇"],
    ["silver", "🥈"],
    ["bronze", "🥉"]
  ].map(function (k) {
    var v = m[k[0]];
    if (typeof v !== "number") return "";
    var reached = value != null && value >= v;
    return '<span class="medal-chip' + (reached ? " reached" : "") + '" data-medal="' + k[0] + '">' +
      k[1] + " " + (basis === "rate" ? v + "%" : Number(v).toLocaleString()) +
      "</span>";
  }).filter(function (s) { return s; }).join("");
  if (!chips) return "";
  return '<div class="medal-row-wrap"><div class="medal-row"><span class="medal-label">奖牌 · ' + basisLabel + "</span>" +
    chips + "</div></div>";
}
