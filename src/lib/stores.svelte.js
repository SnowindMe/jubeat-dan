import { APP_CONFIG, DEFAULT_DANS } from "./data.svelte.js";
import {
  ADMIN_KEY,
  ADMIN_PASS_KEY,
  AVATARS,
  CUSTOM_KEY,
  FRAMES,
  NAME_PLATES,
  MODES,
  PLAYER_KEY,
  POOLS,
  RANDOM_KEY
} from "./constants.js";
import {
  clampRate,
  clampScore,
  danKey,
  deepCopy,
  versionLabel
} from "./pass.js";

/* 集中式响应状态：Svelte 5 不允许跨模块整体重赋值导出的 $state，
 * 因此把所有可重赋值字段放在一个对象里，只做属性级修改。 */
export const app = $state({
  playerName: "",
  playerAvatar: "",
  playerFrame: "none",
  playerPlate: "base",
  customDans: null,
  progress: null,
  random: null,
  filter: "all",
  editorSelected: 0,
  versionOpen: {}
});

/* ---------- 玩家 ---------- */

function defaultAvatar() {
  return AVATARS[0];
}

function loadProfile() {
  var name = "";
  var avatar = defaultAvatar();
  var frame = "none";
  var plate = "base";
  try {
    var raw = localStorage.getItem(PLAYER_KEY);
    if (!raw) return { name: name, avatar: avatar, frame: frame, plate: plate };
    var parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && typeof parsed.name === "string") {
      var savedAvatar = String(parsed.avatar || "");
      return {
        name: parsed.name,
        avatar: (AVATARS.includes(savedAvatar) || savedAvatar.startsWith("data:image")) ? savedAvatar : avatar,
        frame: FRAMES.some(function (f) { return f.id === parsed.frame; }) ? parsed.frame : frame,
        plate: NAME_PLATES.some(function (p) { return p.id === parsed.plate; }) ? parsed.plate : plate
      };
    }
    /* 旧格式：纯昵称字符串 */
    name = String(raw);
  } catch (e) {
    /* 旧格式：非 JSON 视为纯昵称 */
    try {
      name = String(localStorage.getItem(PLAYER_KEY) || "");
    } catch (e2) {
      name = "";
    }
  }
  return { name: name, avatar: avatar, frame: frame };
}

var profile = loadProfile();
app.playerName = profile.name;
app.playerAvatar = profile.avatar;
app.playerFrame = profile.frame;
app.playerPlate = profile.plate;

export function saveProfile(name, avatar, frame, plate) {
  app.playerName = name;
  app.playerAvatar = avatar || defaultAvatar();
  app.playerFrame = FRAMES.some(function (f) { return f.id === frame; }) ? frame : "none";
  app.playerPlate = NAME_PLATES.some(function (p) { return p.id === plate; }) ? plate : "base";
  try {
    localStorage.setItem(PLAYER_KEY, JSON.stringify({
      name: app.playerName,
      avatar: app.playerAvatar,
      frame: app.playerFrame,
      plate: app.playerPlate
    }));
  } catch (e) {
    /* ignore */
  }
}

/* ---------- 自定义段位数据 ---------- */

function loadCustomData() {
  try {
    var raw = localStorage.getItem(CUSTOM_KEY);
    if (raw == null) return null;
    var arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : null;
  } catch (e) {
    return null;
  }
}

app.customDans = loadCustomData();

export function effectiveDans() {
  return app.customDans !== null ? app.customDans : DEFAULT_DANS;
}

export function ensureCustom() {
  if (app.customDans === null) {
    app.customDans = deepCopy(DEFAULT_DANS);
    saveCustomData();
  }
}

let customSaveTimer = null;

export function saveCustomData() {
  try {
    if (app.customDans === null) {
      localStorage.removeItem(CUSTOM_KEY);
    } else {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(app.customDans));
    }
  } catch (e) {
    showNotice("⚠️ 本地存储空间不足，自定义段位数据可能未完整保存");
  }
}

export function scheduleCustomSave() {
  if (customSaveTimer) clearTimeout(customSaveTimer);
  customSaveTimer = setTimeout(function () {
    customSaveTimer = null;
    saveCustomData();
  }, 300);
}

export function flushCustomSave() {
  if (customSaveTimer) {
    clearTimeout(customSaveTimer);
    customSaveTimer = null;
    saveCustomData();
  }
}

/* ---------- 段位进度 ---------- */

export function defaultState() {
  var s = { d: {}, unlocked: {} };
  effectiveDans().forEach(function (dan) {
    s.d[danKey(dan)] = {
      cleared: false,
      clearedCriterion: null,
      scores: dan.songs.map(function () { return null; }),
      rates: dan.songs.map(function () { return null; }),
      fc: dan.songs.map(function () { return false; }),
      chosen: dan.songs.map(function () { return 0; })
    };
  });
  return s;
}

function loadState() {
  var base = defaultState();
  try {
    var raw = localStorage.getItem(APP_CONFIG.storageKey);
    if (!raw) return base;
    var parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.d) return base;
    effectiveDans().forEach(function (dan) {
      var key = danKey(dan);
      var src = parsed.d[key] || parsed.d[dan.name];
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
    /* 清理存档中已不存在的段位 key（旧版本遗留），并写回存储 */
    var known = {};
    effectiveDans().forEach(function (dan) {
      known[danKey(dan)] = 1;
      if (dan.name) known[dan.name] = 1;
    });
    var dropped = false;
    Object.keys(parsed.d).forEach(function (k) {
      if (!known[k]) {
        delete parsed.d[k];
        dropped = true;
      }
    });
    if (dropped) {
      localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(parsed));
    }
    base.unlocked = {};
    if (parsed.unlocked && typeof parsed.unlocked === "object") {
      Object.keys(parsed.unlocked).forEach(function (k) {
        if (parsed.unlocked[k]) base.unlocked[k] = true;
      });
    }
    return base;
  } catch (e) {
    return base;
  }
}

app.progress = loadState();

export function saveState() {
  try {
    localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(app.progress));
  } catch (e) {
    showNotice("⚠️ 本地存储空间不足，进度可能未保存");
  }
}

export function danState(dan) {
  var key = danKey(dan);
  var st = app.progress.d[key];
  if (!st) {
    st = app.progress.d[key] = {
      cleared: false,
      clearedCriterion: null,
      scores: [],
      rates: [],
      chosen: []
    };
  }
  /* 编辑器增删曲目后，进度数组长度与当前曲目数对齐（保留已有值） */
  var n = dan.songs.length;
  ["scores", "rates", "fc"].forEach(function (k) {
    if (!st[k]) st[k] = [];
    while (st[k].length < n) st[k].push(null);
    st[k].length = n;
  });
  /* 仅当存在旧格式非布尔值时重写，避免在 effect 中无谓触发更新 */
  if (st.fc.some(function (v) { return typeof v !== "boolean"; })) {
    st.fc = st.fc.map(function (v) { return !!v; });
  }
  while (st.chosen.length < n) st.chosen.push(0);
  st.chosen.length = n;
  return st;
}

/* 渲染期只读访问：不创建、不对齐数组（创建/对齐由 seedProgress 负责） */
export function readDanState(dan) {
  var st = app.progress.d[danKey(dan)];
  return st || { cleared: false, scores: [], rates: [], fc: [], chosen: [] };
}

/* 确保所有段位都有进度条目（导入/恢复默认后调用） */
export function seedProgress() {
  effectiveDans().forEach(function (d) {
    danState(d);
  });
  pruneStateKeys();
}

export function isDanUnlocked(dan) {
  return !dan.hidden || !!(app.progress.unlocked && app.progress.unlocked[versionLabel(dan)]);
}

/* 删除/改名段位后，清理 state 中已不存在的进度 key（保留旧版按段位名存的 key） */
export function pruneStateKeys() {
  if (!app.progress) return;
  var keep = {};
  effectiveDans().forEach(function (d) {
    keep[danKey(d)] = 1;
    if (d.name) keep[d.name] = 1;
  });
  var changed = false;
  Object.keys(app.progress.d).forEach(function (k) {
    if (!keep[k]) {
      delete app.progress.d[k];
      changed = true;
    }
  });
  if (changed) saveState();
}

/* ---------- 随机挑战 ---------- */

function defaultRandomState() {
  return { pool: "all", challenge: null, passedCount: 0 };
}

export function parseRandom(obj) {
  var base = defaultRandomState();
  if (!obj || typeof obj !== "object") return base;
  if (obj.pool && POOLS[obj.pool]) base.pool = obj.pool;
  if (typeof obj.passedCount === "number" && obj.passedCount >= 0) base.passedCount = obj.passedCount;
  if (obj.challenge && Array.isArray(obj.challenge.songs) && obj.challenge.songs.length) {
    base.challenge = {
      id: obj.challenge.id || Date.now(),
      songs: obj.challenge.songs.slice(0, 3).map(function (s) {
        return { title: s.title, image: s.image || "", level: Number(s.level) || 0 };
      }),
      scores: (obj.challenge.scores || []).slice(0, 3).map(clampScore),
      rates: (obj.challenge.rates || []).slice(0, 3).map(clampRate),
      cleared: !!obj.challenge.cleared,
      counted: !!obj.challenge.counted,
      clearedCriterion: obj.challenge.clearedCriterion || null,
      criterion: obj.challenge.criterion === "rate" ? "rate" : "score",
      modes: (function () {
        var arr = (obj.challenge.modes || []).slice(0, 3).map(function (m) {
          return MODES[m] ? m : "normal";
        });
        while (arr.length < 3) arr.push("normal");
        return arr;
      })()
    };
  }
  return base;
}

function loadRandomState() {
  try {
    return parseRandom(JSON.parse(localStorage.getItem(RANDOM_KEY)));
  } catch (e) {
    return defaultRandomState();
  }
}

app.random = loadRandomState();

export function saveRandomState() {
  try {
    localStorage.setItem(RANDOM_KEY, JSON.stringify(app.random));
  } catch (e) {
    /* ignore */
  }
}

export function slotSongs(slot) {
  return Array.isArray(slot) ? slot : [slot];
}

export function songPoolFor(poolKey) {
  var match = POOLS[poolKey].match;
  var seen = {};
  var pool = [];
  effectiveDans().forEach(function (dan) {
    dan.songs.forEach(function (slot) {
      slotSongs(slot).forEach(function (s) {
        var key = s.title + "|" + s.level;
        if (seen[key]) return;
        if (s.hidden) return;
        seen[key] = 1;
        if (match(s)) {
          pool.push({
            title: s.title,
            image: s.image || "",
            level: s.level,
            diff: s.diff || "bsc",
            mode: s.mode || "normal",
            hidden: !!s.hidden
          });
        }
      });
    });
  });
  return pool;
}

export function generateChallenge(poolKey) {
  var pool = songPoolFor(poolKey);
  if (pool.length < 3) pool = songPoolFor("all");
  if (!pool.length) {
    alert("曲目池为空，请先在 data.json 中添加曲目。");
    return false;
  }
  for (var i = pool.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
  }
  app.random.pool = poolKey;
  app.random.challenge = {
    id: Date.now() + "-" + Math.floor(Math.random() * 1000),
    songs: pool.slice(0, 3),
    scores: [null, null, null],
    rates: [null, null, null],
    cleared: false,
    counted: false,
    clearedCriterion: null,
    criterion: "score",
    modes: pool.slice(0, 3).map(function (s) {
      return (s.mode && MODES[s.mode]) ? s.mode : "normal";
    })
  };
  saveRandomState();
  return true;
}

export function openRandomModal() {
  if (!app.random.challenge) {
    if (!generateChallenge(app.random.pool)) return;
  }
  openModal("random");
}

/* ---------- 弹窗 / 应用内提示 ---------- */

export const modal = $state({ mode: null, dan: null, index: 0, payload: null });

export function openModal(mode, opts = {}) {
  modal.mode = mode;
  modal.dan = opts.dan ?? null;
  modal.index = opts.index ?? 0;
  modal.payload = opts.payload ?? null;
}

export function closeModal() {
  modal.mode = null;
  modal.dan = null;
  modal.index = 0;
  modal.payload = null;
  flushCustomSave();
}

export const notice = $state({ msg: "", id: 0 });

export function showNotice(msg) {
  notice.msg = msg;
  notice.id++;
}

/* ---------- 管理员验证 ---------- */

export function adminConfig() {
  return (APP_CONFIG && APP_CONFIG.admin) ? APP_CONFIG.admin : null;
}

export function adminLocked() {
  var a = adminConfig();
  return !!(a && a.passHash);
}

export function isAdminAuthed() {
  try {
    return sessionStorage.getItem(ADMIN_KEY) === "1";
  } catch (e) {
    return false;
  }
}

export function getAdminPass() {
  try {
    return sessionStorage.getItem(ADMIN_PASS_KEY) || "";
  } catch (e) {
    return "";
  }
}

export function clearAdminSession() {
  try {
    sessionStorage.removeItem(ADMIN_KEY);
  } catch (e) {
    /* ignore */
  }
}
