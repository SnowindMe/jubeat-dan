import {
  app,
  closeModal,
  defaultState,
  effectiveDans,
  openModal,
  parseRandom,
  saveCustomData,
  saveRandomState,
  saveState
} from "./stores.svelte.js";
import { clampRate, clampScore, danKey } from "./pass.js";

export function exportData() {
  var payload = {
    app: "jubeat-dan-challenge",
    exportedAt: new Date().toISOString(),
    state: app.progress,
    random: app.random,
    custom: app.customDans
  };
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "jubeat-dan-progress.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function importData(file) {
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var parsed = JSON.parse(reader.result);
      if (!parsed || typeof parsed !== "object" || !parsed.state || !parsed.state.d) {
        throw new Error("格式不正确");
      }
      if (parsed.custom === undefined) {
        applyImport(parsed, null);
        return;
      }
      /* 存档带自定义段位数据时，先让用户选择导入方式 */
      openModal("import", { payload: parsed });
    } catch (e) {
      alert("导入失败：" + e.message);
    }
  };
  reader.readAsText(file);
}

export function applyImport(parsed, withCustom) {
  /* 先应用自定义数据，再按当前有效段位构建进度，保证存档的段位与进度能对上 */
  if (withCustom === true) {
    app.customDans = parsed.custom === null
      ? null
      : (Array.isArray(parsed.custom) ? parsed.custom : app.customDans);
    saveCustomData();
  }
  var base = defaultState();
  effectiveDans().forEach(function (dan) {
    var key = danKey(dan);
    var src = parsed.state.d[key] || parsed.state.d[dan.name];
    if (!src) return;
    var t = base.d[key];
    t.cleared = !!src.cleared;
    t.clearedCriterion = src.clearedCriterion || null;
    (src.scores || []).forEach(function (v, i) {
      if (i < t.scores.length) t.scores[i] = clampScore(v);
    });
    (src.rates || []).forEach(function (v, i) {
      if (i < t.rates.length) t.rates[i] = clampRate(v);
    });
    (src.fc || []).forEach(function (v, i) {
      if (i < t.fc.length) t.fc[i] = !!v;
    });
    t.chosen.forEach(function (_, i) {
      t.chosen[i] = Number((src.chosen || [])[i]) || 0;
    });
  });
  if (parsed.state.unlocked && typeof parsed.state.unlocked === "object") {
    Object.keys(parsed.state.unlocked).forEach(function (k) {
      if (parsed.state.unlocked[k]) base.unlocked[k] = true;
    });
  }
  app.progress = base;
  saveState();
  app.random = parseRandom(parsed.random);
  saveRandomState();
  app.editorSelected = 0;
  closeModal();
  alert("导入成功！");
}

export function resetAll() {
  if (!window.confirm("确定清空全部段位进度和分数吗？此操作不可撤销（可先导出存档备份）。")) return;
  app.progress = defaultState();
  saveState();
}
