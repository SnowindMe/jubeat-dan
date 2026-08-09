(function () {
  "use strict";

  var PAGE_ADMIN = false;
  try {
    PAGE_ADMIN = !!(document.body && document.body.dataset && document.body.dataset.page === "admin");
  } catch (e) { /* ignore */ }

  var SITE_INFO = null;
  var APP_CONFIG = null;
  var DAN_DATA = null;
  var CONFIG = null;
  var scoreMax = 1000000;
  var state = null;

  var CUSTOM_KEY = "jubeat-dan-custom-v1";
  var customDanData = null;
  var DIFF_LABEL = { bsc: "BSC", adv: "ADV", ext: "EXT" };
  var DAN_PALETTE = [
    "#4FC3F7", "#38B6F2", "#2FA8F0", "#2E8BF0", "#3B72F5", "#5B62F4",
    "#7C58F0", "#9A56EC", "#B45AEA", "#CF5CE8", "#E056D4", "#F04A9E"
  ];

  var MODES = { easy: "EASY", normal: "NORMAL", hard: "HARD" };

  function passDefaults() {
    return (CONFIG && CONFIG.pass) ? CONFIG.pass : { total: 2100000, rate: 85 };
  }

  /* 默认总分达标线按“每首 700,000 分”换算，段位曲目数不为 3 时依然合理 */
  function defaultPassTotalFor(dan) {
    var n = (dan.songs && dan.songs.length) || 3;
    return Math.round((passDefaults().total / 3) * n);
  }

  function passTotalFor(dan) {
    return dan.passTotal != null ? dan.passTotal : defaultPassTotalFor(dan);
  }

  /* 默认平均分达标线按每首 700,000 分换算（与总分线一致） */
  function defaultPassAvgFor() {
    return Math.round(passDefaults().total / 3);
  }

  function passAvgFor(dan) {
    return dan.passAvg != null ? dan.passAvg : defaultPassAvgFor();
  }

  function passRateFor(dan) {
    return dan.passRate != null ? dan.passRate : passDefaults().rate;
  }

  function clampRate(v) {
    v = Number(v);
    if (isNaN(v)) return null;
    return Math.min(100, Math.max(0, v));
  }

  function fmtLevel(v) {
    var n = Number(v);
    return isNaN(n) ? "" : String(n);
  }

  function fileToDataThumb(file, cb) {
    function compress(img) {
      try {
        var MAX = 240;
        var scale = Math.min(1, MAX / Math.max(img.width, img.height));
        var w = Math.max(1, Math.round(img.width * scale));
        var h = Math.max(1, Math.round(img.height * scale));
        var canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        cb(canvas.toDataURL("image/jpeg", 0.82));
      } catch (e) {
        alert("图片处理失败：" + e.message);
      }
    }
    function fallbackRead() {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () { compress(img); };
        img.onerror = function () { alert("图片读取失败，请换一张图片。"); };
        img.src = reader.result;
      };
      reader.onerror = function () { alert("图片读取失败，请换一张图片。"); };
      reader.readAsDataURL(file);
    }
    if (window.createImageBitmap) {
      /* createImageBitmap 会自动应用 EXIF 方向，避免手机竖拍图被旋转 */
      createImageBitmap(file, { imageOrientation: "from-image" })
        .then(compress)
        .catch(fallbackRead);
    } else {
      fallbackRead();
    }
  }

  /* ---------- player ---------- */

  var PLAYER_KEY = "jubeat-dan-player-v1";

  function loadPlayerName() {
    try {
      return localStorage.getItem(PLAYER_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  var playerName = loadPlayerName();

  function savePlayer(name) {
    playerName = name;
    try {
      localStorage.setItem(PLAYER_KEY, name);
    } catch (e) {
      /* ignore */
    }
    updatePlayerButton();
  }

  function updatePlayerButton() {
    var btn = document.getElementById("loginBtn");
    if (btn) btn.textContent = playerName ? "👤 " + playerName : "👤 登录";
  }

  var CANDY_COLORS = ["#FF7EB6", "#35E0FF", "#FFD166", "#7BE0A0", "#A46BFF", "#FF9F5C"];

  function candyBurst(scale) {
    if (typeof confetti === "undefined") return;
    confetti({
      particleCount: Math.round(70 * (scale || 1)),
      spread: 80,
      startVelocity: 40,
      origin: { y: 0.6 },
      colors: CANDY_COLORS,
      disableForReducedMotion: true
    });
  }

  /* ---------- 背景装饰（随机生成，避免单调） ---------- */

  var DECOR_COLORS = ["#FF7EB6", "#35E0FF", "#FFD166", "#7BE0A0", "#A46BFF", "#FF9F5C"];

  function decorRand(min, max) {
    return min + Math.random() * (max - min);
  }

  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.min(255, Math.max(0, (n >> 16) + amt));
    var g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amt));
    var b = Math.min(255, Math.max(0, (n & 0xff) + amt));
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  /* 蝴蝶状糖果：中间椭圆糖体 + 两端锯齿扭结包装纸（参考图样式） */
  function candySvg(c) {
    var dark = shade(c, -45);
    var light = shade(c, 55);
    return '<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M16 18 L4 14 L2 19 L7 23 L2 27 L7 31 L2 35 L7 39 L4 44 L16 42 Z" fill="' + dark + '"/>' +
      '<rect x="16" y="18" width="68" height="24" rx="12" fill="' + c + '" stroke="' + dark + '" stroke-width="1"/>' +
      '<rect x="32" y="18" width="5" height="24" fill="rgba(255,255,255,0.40)"/>' +
      '<rect x="63" y="18" width="5" height="24" fill="rgba(255,255,255,0.40)"/>' +
      '<rect x="46" y="18" width="8" height="24" fill="' + light + '" opacity="0.45"/>' +
      '<ellipse cx="50" cy="21" rx="25" ry="5" fill="rgba(255,255,255,0.55)"/>' +
      '<path d="M84 18 L96 14 L98 19 L93 23 L98 27 L93 31 L98 35 L93 39 L96 44 L84 42 Z" fill="' + dark + '"/>' +
    "</svg>";
  }

  function initDecorations() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var field = document.querySelector(".candy-field");
    var hero = document.querySelector(".hero");
    if (!field || !hero) return;

    /* 全屏背景：3 个棒棒糖 + 6 个蝴蝶糖果，位置/角度/速度随机 */
    var fieldFrag = document.createDocumentFragment();
    for (var i = 0; i < 9; i++) {
      var el = document.createElement("span");
      var candy = i >= 3; /* 前 3 个是棒棒糖，后 6 个是蝴蝶糖果 */
      var color = DECOR_COLORS[Math.floor(Math.random() * DECOR_COLORS.length)];
      el.className = candy ? "candy-wrapped" : "lollipop";
      if (candy) {
        el.innerHTML = candySvg(color);
      } else {
        el.innerHTML = '<i class="lp-body"></i>';
      }
      el.style.cssText =
        "--c:" + color +
        ";--size:" + Math.round(decorRand(36, 58)) + "px" +
        ";--rot:" + Math.round(decorRand(-55, 55)) + "deg" +
        ";--dur:" + decorRand(18, 30).toFixed(1) + "s" +
        ";--spin-dur:" + decorRand(8, 16).toFixed(1) + "s" +
        ";--delay:-" + decorRand(0, 26).toFixed(1) + "s" +
        ";--op:" + decorRand(0.18, 0.34).toFixed(2) +
        ";left:" + decorRand(2, 86).toFixed(1) + "%;top:" + decorRand(8, 86).toFixed(1) + "%";
      fieldFrag.appendChild(el);
    }
    field.appendChild(fieldFrag);

    /* 顶部 Hero：3 个棒棒糖 + 1 个蝴蝶糖果，位置固定、参数随机 */
    var heroFrag = document.createDocumentFragment();
    var spots = [
      { left: "3%", top: "14px", size: 46 },
      { right: "6%", top: "28px", size: 52 },
      { left: "11%", bottom: "10px", size: 34 }
    ];
    spots.forEach(function (s, i) {
      var el = document.createElement("span");
      el.className = "lollipop";
      el.innerHTML = '<i class="lp-body"></i>';
      el.style.cssText =
        "--c:" + DECOR_COLORS[(i * 2 + 1) % DECOR_COLORS.length] +
        ";--size:" + s.size + "px" +
        ";--rot:" + Math.round(decorRand(-40, 40)) + "deg" +
        ";--dur:" + decorRand(14, 22).toFixed(1) + "s" +
        ";--spin-dur:" + decorRand(9, 15).toFixed(1) + "s" +
        ";--delay:-" + decorRand(0, 16).toFixed(1) + "s" +
        ";--op:0.95" +
        (s.left ? ";left:" + s.left : "") +
        (s.right ? ";right:" + s.right : "") +
        ";top:" + (s.top || "auto") +
        ";bottom:" + (s.bottom || "auto");
      heroFrag.appendChild(el);
    });
    var bf = document.createElement("span");
    bf.className = "candy-wrapped";
    bf.innerHTML = candySvg("#A46BFF");
    bf.style.cssText =
      "--c:#A46BFF;--size:54px;--rot:-24deg;--dur:17s;--spin-dur:9s;--delay:-6s;--op:0.95;right:16%;bottom:12%";
    heroFrag.appendChild(bf);
    hero.appendChild(heroFrag);
  }

  function computePassed(dan, st) {
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

  /* ---------- helpers ---------- */

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function clampScore(v) {
    v = Math.round(Number(v));
    if (isNaN(v)) return null;
    return Math.min(scoreMax, Math.max(0, v));
  }

  /* ---------- state ---------- */

  function defaultState() {
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
      var raw = localStorage.getItem(CONFIG.storageKey);
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
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(parsed));
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

  function saveState() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
    } catch (e) {
      /* storage unavailable – progress simply won't persist */
    }
  }

  /* ---------- custom dan data ---------- */

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

  function saveCustomData() {
    try {
      if (customDanData === null) {
        localStorage.removeItem(CUSTOM_KEY);
      } else {
        localStorage.setItem(CUSTOM_KEY, JSON.stringify(customDanData));
      }
    } catch (e) {
      /* ignore */
    }
  }

  var customSaveTimer = null;

  function scheduleCustomSave() {
    if (customSaveTimer) clearTimeout(customSaveTimer);
    customSaveTimer = setTimeout(function () {
      customSaveTimer = null;
      saveCustomData();
    }, 300);
  }

  function flushCustomSave() {
    if (customSaveTimer) {
      clearTimeout(customSaveTimer);
      customSaveTimer = null;
      saveCustomData();
    }
  }

  function effectiveDans() {
    return customDanData !== null ? customDanData : DAN_DATA;
  }

  function deepCopy(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function paletteColor(i) {
    return DAN_PALETTE[i % DAN_PALETTE.length];
  }

  function versionLabel(dan) {
    return (dan.version || "").trim() || "默认";
  }

  /* 版本大类 Logo（主页版本头展示；管理界面仍用文字） */
  var VERSION_LOGOS = {
    "festo": "assets/version-festo.svg",
    "jubeat prop": "assets/version-prop.svg",
    "clan": "assets/version-clan.svg"
  };

  function versionLogoHtml(v) {
    var src = VERSION_LOGOS[v];
    if (!src) return '<span class="version-name">' + esc(v) + "</span>";
    var cls = "version-logo-img logo-" + String(v).replace(/\s+/g, "-");
    return '<img class="' + cls + '" src="' + esc(src) + '" alt="' + esc(v) + '" decoding="async">';
  }

  function danKey(dan) {
    return dan.id || versionLabel(dan) + "|" + dan.name;
  }

  function isDanUnlocked(dan) {
    return !dan.hidden || !!(state && state.unlocked && state.unlocked[versionLabel(dan)]);
  }

  function danState(dan) {
    var key = danKey(dan);
    var st = state.d[key];
    if (!st) {
      st = state.d[key] = {
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
    st.fc = st.fc.map(function (v) { return !!v; });
    while (st.chosen.length < n) st.chosen.push(0);
    st.chosen.length = n;
    return st;
  }

  /* ---------- random challenge ---------- */

  var RANDOM_KEY = "jubeat-dan-random-v1";
  var POOLS = {
    all:  { label: "全曲池",    match: function (s) { return true; } },
    low:  { label: "入門 Lv≤7",  match: function (s) { return s.level <= 7; } },
    mid:  { label: "上級 Lv8-9", match: function (s) { return s.level >= 8 && s.level < 10; } },
    high: { label: "超上級 Lv10", match: function (s) { return s.level >= 10; } }
  };

  function defaultRandomState() {
    return { pool: "all", challenge: null, passedCount: 0 };
  }

  function parseRandom(obj) {
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

  var randomState = loadRandomState();

  function saveRandomState() {
    try {
      localStorage.setItem(RANDOM_KEY, JSON.stringify(randomState));
    } catch (e) {
      /* ignore */
    }
  }

  function slotSongs(slot) {
    return Array.isArray(slot) ? slot : [slot];
  }

  function songPoolFor(poolKey) {
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

  function generateChallenge(poolKey) {
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
    randomState.pool = poolKey;
    randomState.challenge = {
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

  /* ---------- render ---------- */

  function passSummaryHtml(dan, st) {
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

  /* ---------- 隐藏曲 & 顺序解锁 ---------- */

  // 单曲关卡线：score/avg 默认 700,000（机台基础过关分）；rate 用 songMin（无则不设）
  function songGate(dan) {
    if (dan.criterion === "rate") {
      return dan.songMin != null ? Number(dan.songMin) : null;
    }
    return dan.songMin != null ? Number(dan.songMin) : 700000;
  }

  function songValue(st, dan, i) {
    return dan.criterion === "rate" ? st.rates[i] : st.scores[i];
  }

  function songMet(st, dan, i) {
    var v = songValue(st, dan, i);
    var gate = songGate(dan);
    return v != null && (gate == null || v >= gate);
  }

  // 任一已填分数低于关卡线 → 段位失败（excludeIndex 用于输入过程中跳过正在输入的曲目）
  function danFailed(st, dan, excludeIndex) {
    for (var i = 0; i < dan.songs.length; i++) {
      if (i === excludeIndex) continue;
      var v = songValue(st, dan, i);
      var gate = songGate(dan);
      if (v != null && gate != null && v < gate) return true;
    }
    return false;
  }

  // 段位失败提示文案：单曲未达分数线，挑战已关闭
  function danFailMessage(dan, isRate) {
    var gate = songGate(dan);
    return "存在单曲未达分数线（" +
      (gate != null ? (isRate ? gate + "%" : Number(gate).toLocaleString()) : "—") +
      "），无法通过段位，挑战已关闭。";
  }

  // 第 i 首是否锁定：前面有任一未达标/未填，或段位已失败
  function songLocked(st, dan, i, excludeIndex) {
    if (danFailed(st, dan, excludeIndex)) return true;
    for (var j = 0; j < i; j++) {
      if (!songMet(st, dan, j)) return true;
    }
    return false;
  }

  // 隐藏曲遮罩：未打分前显示模糊遮罩 + ？？？/锁
  function hiddenSongMaskHtml(song, revealed) {
    if (!song.hidden || revealed) return "";
    return '<span class="hidden-mask" aria-hidden="true">' +
      '<span class="hidden-icon">🔒</span><span class="hidden-text">？？？</span>' +
    "</span>";
  }

  function criterionToggleHtml(current) {
    return '<div class="criterion-toggle">' +
      '<button type="button" class="cchip' + (current === "score" ? " active" : "") + '" data-criterion="score">总分数</button>' +
      '<button type="button" class="cchip' + (current === "avg" ? " active" : "") + '" data-criterion="avg">平均分</button>' +
      '<button type="button" class="cchip' + (current === "rate" ? " active" : "") + '" data-criterion="rate">music rate</button>' +
    "</div>";
  }

  function modeSelectHtml(mode, i) {
    var opts = Object.keys(MODES).map(function (m) {
      return '<option value="' + m + '"' + (mode === m ? " selected" : "") + ">" + MODES[m] + "</option>";
    }).join("");
    return '<select class="song-mode" data-song="' + i + '" aria-label="歌曲模式">' + opts + "</select>";
  }

  function diffBadgeHtml(song) {
    var d = DIFF_LABEL[song.diff] ? song.diff : "bsc";
    return '<span class="diff-badge" data-diff="' + d + '">' + DIFF_LABEL[d] + "</span>";
  }

  function songThumbHtml(song, revealed) {
    var show = song.image && (!song.hidden || revealed);
    return '<span class="song-thumb' + (show ? "" : " empty") + '">' +
      (show ? '<img src="' + esc(song.image) + '" alt="" decoding="async">' : "♪") +
    "</span>";
  }

  function songOrdinal(i, total) {
    var n = i + 1;
    var suffix = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
    var label = n + suffix;
    if (total > 1 && i === total - 1) label = "FINAL";
    return label;
  }

  function songBadgesHtml(song, modeHtml) {
    return '<span class="song-badges">' +
      diffBadgeHtml(song) +
      '<span class="song-level">Lv.' + fmtLevel(song.level) + "</span>" +
      (modeHtml || "") +
    "</span>";
  }

  function scoreFieldHtml(inputHtml, isRate) {
    return '<label class="score-field">' +
      inputHtml +
      '<span class="score-unit">' + (isRate ? "%" : "分") + "</span>" +
    "</label>";
  }

  function medalRowHtml(dan, st) {
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

  function createDanCard(dan, index) {
    var st = danState(dan);
    st.cleared = computePassed(dan, st);
    st.clearedCriterion = st.cleared ? dan.criterion : null;
    var isRate = dan.criterion === "rate";
    var failed = danFailed(st, dan);
    var gate = songGate(dan);
    var passLabel = dan.criterionLabel ||
      (isRate ? "music rate" : (dan.criterion === "avg" ? "平均分" : "总分数"));
    var danMode = (dan.mode && MODES[dan.mode])
      ? dan.mode
      : ((dan.songs[0] && MODES[dan.songs[0].mode]) ? dan.songs[0].mode : "normal");
    var card = document.createElement("article");
    card.className = "dan-card" + (st.cleared ? " cleared" : "") + (failed ? " failed" : "");
    card.dataset.cleared = st.cleared ? "1" : "0";
    card.style.setProperty("--dan-color", dan.color);

    var songsHtml = dan.songs.map(function (slot, i) {
      var opts = slotSongs(slot);
      var chosenIdx = Math.min(st.chosen[i] || 0, opts.length - 1);
      var song = opts[chosenIdx];
      var value = isRate
        ? (st.rates[i] == null ? "" : st.rates[i])
        : (st.scores[i] == null ? "" : st.scores[i]);
      var locked = songLocked(st, dan, i);
      var revealed = !song.hidden || songValue(st, dan, i) != null || !locked;
      var below = songValue(st, dan, i) != null && gate != null && songValue(st, dan, i) < gate;
      var input = isRate
        ? '<input class="score-input" type="number" min="0" max="100" step="0.01" ' +
          'inputmode="decimal" placeholder="' + (dan.criterionLabel ? "Perfect %" : "Rate %") + '" data-song="' + i + '"' +
          (locked ? " disabled" : "") + ' value="' + esc(value) + '">'
        : '<input class="score-input" type="number" min="0" max="' + scoreMax + '" ' +
          'step="1" inputmode="numeric" placeholder="分数" data-song="' + i + '"' +
          (locked ? " disabled" : "") + ' value="' + esc(value) + '">';
      var fcToggle = (dan.needFc || dan.songMin != null || (dan.note && dan.note.indexOf("FC") >= 0))
        ? '<button type="button" class="fc-toggle' + (st.fc[i] ? " on" : "") + '" data-song="' + i +
          '" title="本曲 FULL COMBO" aria-pressed="' + (st.fc[i] ? "true" : "false") + '"' +
          (locked ? " disabled" : "") + '>FC</button>'
        : "";
      var choiceHtml = opts.length > 1
        ? '<span class="choice-chips" role="group" aria-label="该位置选曲">' +
          opts.map(function (opt, j) {
            return '<button type="button" class="choice-chip' + (j === chosenIdx ? " active" : "") + '"' +
              (locked ? " disabled" : "") +
              ' data-slot="' + i + '" data-choice="' + j + '" title="选择第 ' + (j + 1) + ' 首">' +
              (j + 1) + "</button>";
          }).join("") +
        "</span>"
        : "";
      var titleHtml = song.hidden
        ? (revealed ? esc(song.title) : "？？？")
        : esc(song.title);
      return (
        '<li class="song-row' + (locked ? " locked" : "") + (below ? " below" : "") + '">' +
          songThumbHtml(song, revealed) +
          '<div class="song-info">' +
            '<span class="song-title-line">' +
              '<span class="song-ordinal">' + songOrdinal(i, dan.songs.length) + "</span>" +
              '<span class="song-title">' + titleHtml + "</span>" +
            "</span>" +
            songBadgesHtml(song) +
            choiceHtml +
            hiddenSongMaskHtml(song, revealed) +
          "</div>" +
          scoreFieldHtml(input, isRate) +
          fcToggle +
        "</li>"
      );
    }).join("");

    card.innerHTML =
      '<div class="card-head">' +
        '<span class="rank-badge">' + esc(dan.lv != null ? "Lv." + dan.lv + " · " + dan.name : dan.name) + "</span>" +
        '<span class="card-status">' + (st.cleared ? "已通过 ✓" : "未通过") + "</span>" +
      "</div>" +
      '<div class="criterion-row">' +
        '<span class="criterion-label">过段方式</span>' +
        '<span class="criterion-value">' + esc(passLabel) + "</span>" +
        '<span class="mode-badge" data-mode="' + danMode + '">' + MODES[danMode] + "</span>" +
      "</div>" +
      (failed
        ? '<div class="fail-banner">⚠️ ' + danFailMessage(dan, isRate) +
          '<button type="button" class="btn btn-small" id="retryDanBtn">↻ 重开挑战</button></div>'
        : "") +
      '<ul class="song-list">' + songsHtml + "</ul>" +
      '<div class="pass-summary-wrap">' + passSummaryHtml(dan, st) + "</div>" +
      medalRowHtml(dan, st) +
      (dan.note ? '<div class="dan-note">ℹ️ ' + esc(dan.note) + "</div>" : "") +
      '<div class="submit-row">' +
        '<button class="btn" id="submitBoardBtn"' + (st.cleared ? "" : " disabled") + '>🏆 提交到排行榜</button>' +
        '<span class="submit-msg" id="submitMsg"></span>' +
      "</div>";

    card.querySelectorAll(".choice-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        if (chip.disabled) return;
        var slot = Number(chip.dataset.slot);
        var choice = Number(chip.dataset.choice);
        if ((st.chosen[slot] || 0) === choice) return;
        st.chosen[slot] = choice;
        st.scores[slot] = null;
        st.rates[slot] = null;
        saveState();
        refreshModalCard(dan, index);
      });
    });

    card.querySelectorAll(".score-input").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var i = Number(inp.dataset.song);
        if (isRate) {
          st.rates[i] = inp.value === "" ? null : clampRate(inp.value);
        } else {
          st.scores[i] = inp.value === "" ? null : clampScore(inp.value);
        }
        var wasCleared = st.cleared;
        st.cleared = computePassed(dan, st);
        st.clearedCriterion = st.cleared ? dan.criterion : null;
        saveState();
        refreshHomeStatus(dan);
        if (!wasCleared && st.cleared) {
          candyBurst(1);
          if (effectiveDans().every(function (d) { return danState(d).cleared; })) {
            setTimeout(function () { candyBurst(1.6); }, 500);
          }
        }
        refreshDanCardUI(card, dan, st, isRate, i);
      });
    });

    card.querySelectorAll(".score-input").forEach(function (inp) {
      inp.addEventListener("change", function () {
        refreshDanCardUI(card, dan, st, isRate);
        // 分数提交后若已失败：自动退出段位并提示挑战已关闭
        if (danFailed(st, dan)) {
          closeModal();
          showNotice("⚠️ " + danFailMessage(dan, isRate));
        }
      });
    });

    card.querySelectorAll(".fc-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.disabled) return;
        var i = Number(btn.dataset.song);
        st.fc[i] = !st.fc[i];
        var wasCleared = st.cleared;
        st.cleared = computePassed(dan, st);
        st.clearedCriterion = st.cleared ? dan.criterion : null;
        saveState();
        refreshHomeStatus(dan);
        if (!wasCleared && st.cleared) {
          candyBurst(1);
          if (effectiveDans().every(function (d) { return danState(d).cleared; })) {
            setTimeout(function () { candyBurst(1.6); }, 500);
          }
        }
        refreshDanCardUI(card, dan, st, isRate);
      });
    });

    var retryBtn = card.querySelector("#retryDanBtn");
    if (retryBtn) {
      retryBtn.addEventListener("click", function () {
        for (var k = 0; k < dan.songs.length; k++) {
          st.scores[k] = null;
          st.rates[k] = null;
          st.fc[k] = false;
        }
        st.cleared = false;
        st.clearedCriterion = null;
        saveState();
        refreshModalCard(dan, index);
      });
    }

    var submitBtn = card.querySelector("#submitBoardBtn");
    var submitMsg = card.querySelector("#submitMsg");
    if (submitBtn) {
      submitBtn.addEventListener("click", function () {
        if (!st.cleared) return;
        if (!playerName) {
          openLoginModal();
          return;
        }
        submitScore(dan, st, submitMsg, submitBtn);
      });
    }

    return card;
  }

  function updateSummary() {
    /* 主页不再展示全局进度，保留空实现以兼容调用 */
  }

  function cssEsc(s) {
    return (window.CSS && CSS.escape) ? CSS.escape(String(s)) : String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function refreshHomeStatus(dan) {
    var st = danState(dan);
    var key = danKey(dan);
    var locked = dan.hidden && !isDanUnlocked(dan);
    var card = document.querySelector('.folder-card[data-dankey="' + cssEsc(key) + '"]');
    if (card) {
      card.classList.toggle("cleared", !locked && !!st.cleared);
      card.classList.toggle("failed", !locked && danFailed(st, dan));
      var statusEl = card.querySelector(".folder-status");
      if (statusEl) {
        statusEl.textContent = locked
          ? "🔒 未解锁"
          : (st.cleared ? "已通过 ✓" : (danFailed(st, dan) ? "挑战失败" : "未通过"));
      }
    }
    updateSummary();
  }

  var activeFilter = "all";
  var versionOpen = {};
  var modalDan = null;
  var modalMode = null; /* "dan" | "random" */
  var editorSelected = 0;
  var renderTimer = null;

  function scheduleRender() {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(function () {
      renderTimer = null;
      render();
    }, 200);
  }

  function createFolderCard(dan, index) {
    var st = danState(dan);
    var locked = dan.hidden && !isDanUnlocked(dan);

    var card = document.createElement("button");
    card.type = "button";
    card.className = "folder-card" + (locked ? " locked" : "") + (st.cleared ? " cleared" : "");
    card.style.setProperty("--dan-color", dan.color);
    card.dataset.dankey = danKey(dan);

    card.innerHTML =
      (locked
        ? '<span class="folder-icon lock" aria-hidden="true">🔒</span>'
        : '<svg class="folder-icon" viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="currentColor" opacity=".28"/>' +
        '<path d="M3 8.5A1.5 1.5 0 0 1 4.5 7H9l2 2h8.5A1.5 1.5 0 0 1 21 10.5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="currentColor"/>' +
      "</svg>") +
      '<span class="folder-name">' + esc(locked ? "？？？" : dan.name) + "</span>" +
      '<span class="folder-num">' + (locked ? "隐藏段位" : (dan.lv != null ? "Lv." + dan.lv : "第 " + (index + 1) + " 段")) + "</span>" +
      '<span class="folder-status">' + (locked ? "🔒 未解锁" : (st.cleared ? "已通过 ✓" : "未通过")) + "</span>";

    card.addEventListener("click", function () {
      if (dan.hidden && !isDanUnlocked(dan)) openUnlockModal(dan, index);
      else openModal(dan, index);
    });
    return card;
  }

  function createRandomFolderCard() {
    var card = document.createElement("button");
    card.type = "button";
    card.className = "folder-card random-folder";
    card.style.setProperty("--dan-color", "#E056D4");
    card.innerHTML =
      '<span class="folder-icon">🎲</span>' +
      '<span class="folder-name">随机挑战</span>' +
      '<span class="folder-num">' + esc(POOLS[randomState.pool].label) + " · 已通过 " + randomState.passedCount + " 组</span>" +
      '<span class="folder-status">随时可玩</span>';
    card.addEventListener("click", function () { openRandomModal(); });
    return card;
  }

  function createVersionFolderCard(v, cleared, total) {
    var card = document.createElement("button");
    card.type = "button";
    card.className = "version-card";
    card.title = "查看「" + v + "」大类详情";
    card.innerHTML =
      '<span class="version-card-logo">' + versionLogoHtml(v) + "</span>" +
      '<span class="version-card-meta">' + cleared + "/" + total + " 已通过</span>" +
      '<span class="version-card-cta">查看详情 ▸</span>';
    card.addEventListener("click", function () {
      openVersionModal(v);
    });
    return card;
  }

  function openModal(dan, index) {
    modalMode = "dan";
    modalDan = dan.name;
    var content = document.getElementById("modalContent");
    content.innerHTML = "";
    content.appendChild(createDanCard(dan, index));
    document.getElementById("danModal").classList.add("open");
    document.body.style.overflow = "hidden";
    document.getElementById("modalClose").focus();
  }

  function closeModal() {
    modalMode = null;
    modalDan = null;
    var backdrop = document.getElementById("danModal");
    var modal = backdrop.querySelector(".modal");
    backdrop.classList.remove("open", "editor-full");
    modal.classList.remove("editor-mode", "login-mode", "board-mode");
    document.body.style.overflow = "";
    flushCustomSave();
    if (renderTimer) {
      clearTimeout(renderTimer);
      renderTimer = null;
      render();
    }
  }

  var noticeTimer = null;

  // 轻量应用内提示弹窗：不阻塞页面操作，超时自动消失
  function showNotice(msg) {
    var old = document.querySelector(".app-notice");
    if (old) old.remove();
    if (noticeTimer) {
      clearTimeout(noticeTimer);
      noticeTimer = null;
    }
    var el = document.createElement("div");
    el.className = "app-notice";
    el.setAttribute("role", "alert");
    el.innerHTML =
      '<div class="app-notice-card">' +
        '<span class="app-notice-msg"></span>' +
        '<button type="button" class="app-notice-close" aria-label="关闭提示">×</button>' +
      "</div>";
    el.querySelector(".app-notice-msg").textContent = msg;
    var dismissed = false;
    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      if (noticeTimer) {
        clearTimeout(noticeTimer);
        noticeTimer = null;
      }
      el.classList.remove("show");
      el.classList.add("hide");
      var gone = false;
      function removeEl() {
        if (gone) return;
        gone = true;
        el.remove();
      }
      el.addEventListener("transitionend", removeEl);
      setTimeout(removeEl, 400); // 兜底：过渡未触发时也移除
    }
    el.querySelector(".app-notice-close").addEventListener("click", dismiss);
    document.body.appendChild(el);
    // 下一帧再进入显示态，让进场过渡生效且不卡首帧
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.classList.add("show");
      });
    });
    noticeTimer = setTimeout(dismiss, 4000);
  }

  function refreshModalCard(dan, index) {
    var content = document.getElementById("modalContent");
    content.innerHTML = "";
    content.appendChild(createDanCard(dan, index));
  }

  // 输入后原地刷新卡片状态（不重建，保留输入焦点）；excludeIndex 用于输入过程中跳过正在输入的曲目
  function refreshDanCardUI(card, dan, st, isRate, excludeIndex) {
    var failed = danFailed(st, dan, excludeIndex);
    card.classList.toggle("failed", failed);
    var statusEl = card.querySelector(".card-status");
    if (statusEl) statusEl.textContent = st.cleared ? "已通过 ✓" : (failed ? "挑战失败" : "未通过");
    var sumWrap = card.querySelector(".pass-summary-wrap");
    if (sumWrap) sumWrap.innerHTML = passSummaryHtml(dan, st);
    var medalWrap = card.querySelector(".medal-row-wrap");
    if (medalWrap) medalWrap.outerHTML = medalRowHtml(dan, st);
    var submitBtn = card.querySelector("#submitBoardBtn");
    if (submitBtn) submitBtn.disabled = !st.cleared;
    var banner = card.querySelector(".fail-banner");
    if (failed && !banner) {
      var ins = card.querySelector(".criterion-row");
      if (ins) {
        var div = document.createElement("div");
        div.className = "fail-banner";
        div.innerHTML = "⚠️ " + danFailMessage(dan, isRate) +
          '<button type="button" class="btn btn-small" id="retryDanBtn">↻ 重开挑战</button>';
        ins.insertAdjacentElement("afterend", div);
        div.querySelector("#retryDanBtn").addEventListener("click", function () {
          for (var k = 0; k < dan.songs.length; k++) {
            st.scores[k] = null;
            st.rates[k] = null;
            st.fc[k] = false;
          }
          st.cleared = false;
          st.clearedCriterion = null;
          saveState();
          refreshModalCard(dan, index);
        });
      }
    } else if (!failed && banner) {
      banner.remove();
    }
    // 逐行刷新锁定状态（后面的曲目随前面达标解锁/加锁）
    var rows = card.querySelectorAll(".song-row");
    rows.forEach(function (row, i) {
      var locked = songLocked(st, dan, i, excludeIndex);
      row.classList.toggle("locked", locked);
      // 隐藏曲在到达该曲（前面曲目全部达标）后揭示曲名并移除遮罩
      var song = slotSongs(dan.songs[i])[Math.min(st.chosen[i] || 0, slotSongs(dan.songs[i]).length - 1)];
      if (song && song.hidden && (songValue(st, dan, i) != null || !locked)) {
        var mask = row.querySelector(".hidden-mask");
        if (mask) mask.remove();
        var title = row.querySelector(".song-title");
        if (title) title.textContent = song.title;
        var thumb = row.querySelector(".song-thumb");
        if (thumb) thumb.outerHTML = songThumbHtml(song, true);
      }
      var inp = row.querySelector(".score-input");
      if (inp) inp.disabled = locked;
      var fcBtn = row.querySelector(".fc-toggle");
      if (fcBtn) {
        fcBtn.disabled = locked;
        fcBtn.classList.toggle("on", !!st.fc[i]);
        fcBtn.setAttribute("aria-pressed", st.fc[i] ? "true" : "false");
      }
      var chips = row.querySelectorAll(".choice-chip");
      chips.forEach(function (c) { c.disabled = locked; });
    });
  }

  function createRandomCard() {
    var c = randomState.challenge;
    c.cleared = computePassed({ criterion: c.criterion }, c);
    c.clearedCriterion = c.cleared ? c.criterion : null;
    var isRate = c.criterion === "rate";
    var card = document.createElement("article");
    card.className = "dan-card random-card" + (c.cleared ? " cleared" : "");
    card.style.setProperty("--dan-color", "#2FA8F0");

    var songsHtml = c.songs.map(function (s, i) {
      var value = isRate
        ? (c.rates[i] == null ? "" : c.rates[i])
        : (c.scores[i] == null ? "" : c.scores[i]);
      var input = isRate
        ? '<input class="score-input" type="number" min="0" max="100" step="0.01" ' +
          'inputmode="decimal" placeholder="Rate %" data-song="' + i + '" value="' + esc(value) + '">'
        : '<input class="score-input" type="number" min="0" max="' + scoreMax + '" ' +
          'step="1" inputmode="numeric" placeholder="分数" data-song="' + i + '" value="' + esc(value) + '">';
      return (
        '<li class="song-row">' +
          songThumbHtml(s) +
          '<div class="song-info">' +
            '<span class="song-title-line">' +
              '<span class="song-ordinal">' + songOrdinal(i, c.songs.length) + "</span>" +
              '<span class="song-title">' + esc(s.title) + "</span>" +
            "</span>" +
            songBadgesHtml(s, modeSelectHtml(c.modes[i] || "normal", i)) +
          "</div>" +
          scoreFieldHtml(input, isRate) +
        "</li>"
      );
    }).join("");

    card.innerHTML =
      '<div class="card-head">' +
        '<span class="rank-badge">随机挑战</span>' +
        '<span class="card-status">' + (c.cleared ? "已通过 ✓" : "未通过") + "</span>" +
      "</div>" +
      '<div class="criterion-row">' +
        '<span class="criterion-label">过段</span>' + criterionToggleHtml(c.criterion) +
      "</div>" +
      '<div class="random-meta">难度：' + POOLS[randomState.pool].label +
        (songPoolFor(randomState.pool).length < 3 ? "（曲池不足，已从全曲池抽取）" : "") +
        " · 已通过 " + randomState.passedCount + " 组</div>" +
      '<div class="pool-chips">' +
        Object.keys(POOLS).map(function (k) {
          return '<button class="chip pool-chip' + (randomState.pool === k ? " active" : "") +
            '" data-pool="' + k + '">' + POOLS[k].label + "</button>";
        }).join("") +
      "</div>" +
      '<ul class="song-list">' + songsHtml + "</ul>" +
      '<div class="pass-summary-wrap">' + passSummaryHtml({ criterion: c.criterion }, c) + "</div>" +
      '<div class="random-actions">' +
        '<button class="btn" id="rerollBtn">🎲 换一组</button>' +
      "</div>";

    card.querySelectorAll(".pool-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        generateChallenge(chip.dataset.pool);
        renderRandomModal();
      });
    });

    card.querySelectorAll(".criterion-toggle .cchip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        c.criterion = chip.dataset.criterion;
        saveRandomState();
        renderRandomModal();
      });
    });

    card.querySelectorAll(".song-mode").forEach(function (sel) {
      sel.addEventListener("change", function () {
        var i = Number(sel.dataset.song);
        c.modes[i] = sel.value;
        c.scores[i] = null;
        c.rates[i] = null;
        saveRandomState();
        renderRandomModal();
      });
    });

    card.querySelectorAll(".score-input").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var i = Number(inp.dataset.song);
        if (isRate) {
          c.rates[i] = inp.value === "" ? null : clampRate(inp.value);
        } else {
          c.scores[i] = inp.value === "" ? null : clampScore(inp.value);
        }
        recountRandomCleared(card);
      });
    });

    card.querySelector("#rerollBtn").addEventListener("click", function () {
      generateChallenge(randomState.pool);
      renderRandomModal();
    });

    return card;
  }

  function openRandomModal() {
    if (!randomState.challenge) {
      if (!generateChallenge(randomState.pool)) return;
    }
    modalMode = "random";
    modalDan = null;
    var content = document.getElementById("modalContent");
    content.innerHTML = "";
    content.appendChild(createRandomCard());
    document.getElementById("danModal").classList.add("open");
    document.body.style.overflow = "hidden";
    document.getElementById("modalClose").focus();
  }

  function renderRandomModal() {
    var content = document.getElementById("modalContent");
    content.innerHTML = "";
    content.appendChild(createRandomCard());
  }

  function recountRandomCleared(card) {
    var c = randomState.challenge;
    var wasCleared = c.cleared;
    c.cleared = computePassed({ criterion: c.criterion }, c);
    c.clearedCriterion = c.cleared ? c.criterion : null;
    if (!wasCleared && c.cleared) {
      if (!c.counted) {
        c.counted = true;
        randomState.passedCount++;
      }
      candyBurst(1);
    } else if (!c.cleared) {
      c.counted = false;
    }
    saveRandomState();
    if (card) {
      var statusEl = card.querySelector(".card-status");
      if (statusEl) statusEl.textContent = c.cleared ? "已通过 ✓" : "未通过";
      var sumWrap = card.querySelector(".pass-summary-wrap");
      if (sumWrap) sumWrap.innerHTML = passSummaryHtml({ criterion: c.criterion }, c);
    }
  }

  /* ---------- admin ---------- */

  var ADMIN_KEY = "jubeat-dan-admin-session";
  var ADMIN_PASS_KEY = "jubeat-dan-admin-pass";

  function adminConfig() {
    return (CONFIG && CONFIG.admin) ? CONFIG.admin : null;
  }

  function adminLocked() {
    var a = adminConfig();
    return !!(a && a.passHash);
  }

  function isAdminAuthed() {
    try {
      return sessionStorage.getItem(ADMIN_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function sha256Hex(str) {
    if (!window.crypto || !crypto.subtle) {
      return Promise.resolve(null);
    }
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then(function (buf) {
      var bytes = new Uint8Array(buf);
      var hex = "";
      for (var i = 0; i < bytes.length; i++) {
        hex += ("0" + bytes[i].toString(16)).slice(-2);
      }
      return hex;
    });
  }

  function openAdminLogin() {
    modalMode = "admin";
    modalDan = null;
    var content = document.getElementById("modalContent");
    content.innerHTML = "";
    content.appendChild(createAdminCard());
    var backdrop = document.getElementById("danModal");
    var modal = backdrop.querySelector(".modal");
    modal.classList.add("login-mode");
    backdrop.classList.add("open");
    document.body.style.overflow = "hidden";
    var input = content.querySelector("#adminPass");
    if (input) input.focus();
  }

  function createAdminCard() {
    var card = document.createElement("div");
    card.className = "login-card";
    card.innerHTML =
      '<div class="login-title">🔑 管理员验证</div>' +
      '<p class="login-hint">段位管理仅对管理员开放，请输入管理员密码</p>' +
      '<input class="login-input" id="adminPass" type="password" placeholder="管理员密码" autocomplete="current-password">' +
      '<div class="login-actions">' +
        '<button class="btn primary" id="adminSubmit">验证</button>' +
      "</div>" +
      '<div class="login-msg" id="adminMsg"></div>';

    var submit = function () {
      var input = card.querySelector("#adminPass");
      var msg = card.querySelector("#adminMsg");
      var pass = input.value;
      if (!pass) {
        msg.textContent = "请输入密码";
        return;
      }
      sha256Hex(pass).then(function (hash) {
        var a = adminConfig();
        if (!hash || !a || hash.toLowerCase() !== String(a.passHash).toLowerCase()) {
          msg.textContent = "密码错误";
          return;
        }
        try {
          sessionStorage.setItem(ADMIN_KEY, "1");
          sessionStorage.setItem(ADMIN_PASS_KEY, pass);
        } catch (e) { /* ignore */ }
        closeModal();
        adminReady();
      });
    };
    card.querySelector("#adminSubmit").addEventListener("click", submit);
    card.querySelector("#adminPass").addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") submit();
    });
    return card;
  }

  /* ---------- 管理后台（/admin） ---------- */

  var adminPending = "editor";

  function adminReady() {
    if (PAGE_ADMIN && adminPending === "board") {
      openBoardManage();
    } else {
      openEditorModal();
    }
  }

  function getAdminPass() {
    try {
      return sessionStorage.getItem(ADMIN_PASS_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function openBoardManage() {
    var panel = document.getElementById("adminBoardPanel");
    if (!panel) return;
    panel.hidden = false;
    if (panel.scrollIntoView) panel.scrollIntoView({ behavior: "smooth", block: "start" });
    loadBoardManage();
  }

  function loadBoardManage() {
    var body = document.getElementById("boardManageBody");
    if (!body) return;
    var note = document.getElementById("boardManageNote");
    body.innerHTML = '<div class="board-loading">加载中…</div>';
    if (note) note.textContent = "";
    fetch("/api/leaderboard?limit=100")
      .then(function (res) {
        return res.json().then(function (j) { return { res: res, json: j }; });
      })
      .then(function (r) {
        if (!r.res.ok) throw new Error((r.json && r.json.error) || ("HTTP " + r.res.status));
        renderBoardManage(r.json.entries || []);
      })
      .catch(function (err) {
        body.innerHTML = '<div class="board-empty">加载失败：' + esc(err.message) + "</div>";
        if (note) note.textContent = "排行榜服务未连接（需部署 Cloudflare Pages Functions）。";
      });
  }

  function renderBoardManage(entries) {
    var body = document.getElementById("boardManageBody");
    if (!body) return;
    if (!entries.length) {
      body.innerHTML = '<div class="board-empty">暂无排行榜记录。</div>';
      return;
    }
    var criterionLabel = { score: "总分数", avg: "平均分", rate: "music rate" };
    var rows = entries.map(function (e) {
      var valueTxt = e.criterion === "rate"
        ? Number(e.value).toFixed(1) + "%"
        : Math.round(Number(e.value)).toLocaleString("zh-CN");
      return "<tr>" +
        "<td>" + esc(e.player) + "</td>" +
        "<td>" + esc((e.version || "") + " · " + e.dan) + "</td>" +
        "<td>" + esc(e.mode) + "</td>" +
        "<td>" + esc(criterionLabel[e.criterion] || e.criterion) + "</td>" +
        "<td>" + valueTxt + "</td>" +
        "<td>" + esc(String(e.created_at || "").replace("T", " ").slice(0, 19)) + "</td>" +
        '<td><button type="button" class="btn danger" data-del="' + Number(e.id) + '">删除</button></td>' +
        "</tr>";
    }).join("");
    body.innerHTML =
      '<div class="board-scroll"><table class="board-manage-table">' +
      "<thead><tr><th>玩家</th><th>段位</th><th>模式</th><th>依据</th><th>成绩</th><th>时间</th><th></th></tr></thead>" +
      "<tbody>" + rows + "</tbody></table></div>";
    body.querySelectorAll("[data-del]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        deleteBoardEntry(Number(btn.getAttribute("data-del")));
      });
    });
  }

  function deleteBoardEntry(id) {
    if (!window.confirm("确定删除这条排行榜记录？此操作不可撤销。")) return;
    fetch("/api/leaderboard", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id, adminPass: getAdminPass() })
    })
      .then(function (res) {
        return res.json().then(function (j) { return { status: res.status, json: j }; });
      })
      .then(function (r) {
        if (!r.json.ok) {
          if (r.status === 401) {
            alert("管理员验证失败，请重新验证密码");
            try { sessionStorage.removeItem(ADMIN_KEY); } catch (e) { /* ignore */ }
            adminPending = "board";
            openAdminLogin();
            return;
          }
          alert(r.json.error || "删除失败");
          return;
        }
        loadBoardManage();
      })
      .catch(function () { alert("删除失败：网络错误"); });
  }

  /* ---------- login ---------- */

  function openLoginModal() {
    modalMode = "login";
    modalDan = null;
    var content = document.getElementById("modalContent");
    content.innerHTML = "";
    content.appendChild(createLoginCard());
    var backdrop = document.getElementById("danModal");
    var modal = backdrop.querySelector(".modal");
    modal.classList.add("login-mode");
    backdrop.classList.add("open");
    document.body.style.overflow = "hidden";
    var input = content.querySelector("#loginName");
    if (input) input.focus();
  }

  function createLoginCard() {
    var card = document.createElement("div");
    card.className = "login-card";
    card.innerHTML =
      '<div class="login-title">👤 玩家登录</div>' +
      '<p class="login-hint">设置昵称后即可参与排行榜</p>' +
      '<input class="login-input" id="loginName" maxlength="20" placeholder="输入昵称" value="' + esc(playerName) + '">' +
      '<div class="login-actions">' +
        '<button class="btn primary" id="loginSubmit">进入</button>' +
      "</div>" +
      '<div class="login-msg" id="loginMsg"></div>';

    card.querySelector("#loginSubmit").addEventListener("click", function () {
      var name = card.querySelector("#loginName").value.trim();
      if (!name) {
        card.querySelector("#loginMsg").textContent = "昵称不能为空";
        return;
      }
      savePlayer(name);
      candyBurst(0.5);
      closeModal();
    });
    card.querySelector("#loginName").addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") card.querySelector("#loginSubmit").click();
    });
    return card;
  }

  /* ---------- 隐藏段位解锁 ---------- */

  function openUnlockModal(dan, index) {
    modalMode = "unlock";
    modalDan = dan.name;
    var content = document.getElementById("modalContent");
    content.innerHTML = "";
    content.appendChild(createUnlockCard(dan, index));
    var backdrop = document.getElementById("danModal");
    var modal = backdrop.querySelector(".modal");
    modal.classList.add("login-mode");
    backdrop.classList.add("open");
    document.body.style.overflow = "hidden";
    var input = content.querySelector("#unlockCode");
    if (input) input.focus();
  }

  function createUnlockCard(dan, index) {
    var card = document.createElement("div");
    card.className = "login-card";
    card.innerHTML =
      '<div class="login-title">🔒 解锁隐藏段位</div>' +
      '<p class="login-hint">输入解锁码解锁「' + esc(versionLabel(dan)) + '」的全部隐藏段位</p>' +
      '<input class="login-input" id="unlockCode" maxlength="40" placeholder="解锁码" autocomplete="off">' +
      '<div class="login-actions">' +
        '<button class="btn primary" id="unlockSubmit">解锁</button>' +
      "</div>" +
      '<div class="login-msg" id="unlockMsg"></div>';

    card.querySelector("#unlockSubmit").addEventListener("click", function () {
      var input = card.querySelector("#unlockCode");
      var code = input.value.trim();
      var expect = String(dan.unlockCode || "").trim();
      if (!expect || code === expect) {
        if (!state.unlocked) state.unlocked = {};
        state.unlocked[versionLabel(dan)] = true;
        saveState();
        candyBurst(0.5);
        closeModal();
        scheduleRender();
        showNotice("🔓 已解锁「" + versionLabel(dan) + "」全部隐藏段位");
        openModal(dan, index);
      } else {
        card.querySelector("#unlockMsg").textContent = "解锁码不正确";
      }
    });
    card.querySelector("#unlockCode").addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") card.querySelector("#unlockSubmit").click();
    });
    return card;
  }

  /* ---------- 版本大类详情 ---------- */

  function openVersionModal(v) {
    modalMode = "version";
    modalDan = null;
    var content = document.getElementById("modalContent");
    content.innerHTML = "";
    content.appendChild(createVersionCard(v));
    var backdrop = document.getElementById("danModal");
    backdrop.classList.add("open");
    document.body.style.overflow = "hidden";
    document.getElementById("modalClose").focus();
  }

  function createVersionCard(v) {
    var dans = effectiveDans()
      .map(function (dan, index) { return { dan: dan, index: index }; })
      .filter(function (item) { return versionLabel(item.dan) === v; });
    var cleared = dans.filter(function (item) { return danState(item.dan).cleared; }).length;
    var card = document.createElement("div");
    card.className = "version-detail";
    card.innerHTML =
      '<div class="version-detail-head">' +
        versionLogoHtml(v) +
        '<span class="version-detail-meta">' + cleared + "/" + dans.length + " 已通过</span>" +
      "</div>";
    var grid = document.createElement("div");
    grid.className = "folder-grid";
    dans.forEach(function (item) {
      grid.appendChild(createFolderCard(item.dan, item.index));
    });
    card.appendChild(grid);
    return card;
  }

  /* ---------- leaderboard ---------- */

  var boardState = { dan: null, version: "", mode: "NORMAL", criterion: "score" };

  function openLeaderboardModal() {
    var dans = effectiveDans();
    if (!dans.length) return;
    var first = dans[0];
    if (!dans.some(function (d) {
      return d.name === boardState.dan && versionLabel(d) === boardState.version;
    })) {
      boardState.dan = first.name;
      boardState.version = versionLabel(first);
    }
    modalMode = "leaderboard";
    modalDan = null;
    var content = document.getElementById("modalContent");
    content.innerHTML = "";
    content.appendChild(createLeaderboardCard());
    var backdrop = document.getElementById("danModal");
    var modal = backdrop.querySelector(".modal");
    modal.classList.add("board-mode");
    backdrop.classList.add("open");
    document.body.style.overflow = "hidden";
    loadBoard();
  }

  function createLeaderboardCard() {
    var dans = effectiveDans();
    var card = document.createElement("div");
    card.className = "board-card";
    card.innerHTML =
      '<div class="card-head">' +
        '<span class="rank-badge">🏆 排行榜</span>' +
        '<span class="board-player-now" id="boardPlayerNow"></span>' +
      "</div>" +
      '<div class="board-controls">' +
        '<label class="board-field">段位<select id="boardDan">' +
          dans.map(function (d) {
            var v = versionLabel(d);
            return '<option value="' + esc(d.name) + '" data-version="' + esc(v) + '"' +
              ((d.name === boardState.dan && v === boardState.version) ? " selected" : "") +
              ">" + esc(v + " · " + d.name) + "</option>";
          }).join("") +
        "</select></label>" +
        '<label class="board-field">模式<select id="boardMode">' +
          Object.keys(MODES).map(function (m) {
            return '<option value="' + m + '"' + (boardState.mode === m ? " selected" : "") + ">" + MODES[m] + "</option>";
          }).join("") +
        "</select></label>" +
        '<label class="board-field">排名依据<select id="boardCriterion">' +
          '<option value="score"' + (boardState.criterion === "score" ? " selected" : "") + '>总分数</option>' +
          '<option value="avg"' + (boardState.criterion === "avg" ? " selected" : "") + '>平均分</option>' +
          '<option value="rate"' + (boardState.criterion === "rate" ? " selected" : "") + '>music rate</option>' +
        "</select></label>" +
        '<button class="btn primary" id="boardRefresh">刷新</button>' +
      "</div>" +
      '<div class="board-body" id="boardBody"><div class="board-loading">加载中…</div></div>' +
      '<div class="board-note" id="boardNote"></div>';

    card.querySelector("#boardDan").addEventListener("change", function (ev) {
      boardState.dan = ev.target.value;
      boardState.version = (ev.target.selectedOptions && ev.target.selectedOptions[0])
        ? (ev.target.selectedOptions[0].dataset.version || "")
        : "";
      /* 跟随所选段位的过段方式，默认展示对应榜单 */
      var target = dans.find(function (d) {
        return d.name === boardState.dan && versionLabel(d) === boardState.version;
      });
      if (target) {
        boardState.criterion = target.criterion === "rate" ? "rate" : (target.criterion === "avg" ? "avg" : "score");
        var critSel = card.querySelector("#boardCriterion");
        if (critSel) critSel.value = boardState.criterion;
      }
      loadBoard();
    });
    card.querySelector("#boardMode").addEventListener("change", function (ev) {
      boardState.mode = ev.target.value;
      loadBoard();
    });
    card.querySelector("#boardCriterion").addEventListener("change", function (ev) {
      boardState.criterion = ev.target.value;
      loadBoard();
    });
    card.querySelector("#boardRefresh").addEventListener("click", loadBoard);
    card.querySelector("#boardPlayerNow").textContent = playerName ? "当前玩家：" + playerName : "";
    return card;
  }

  function mockBoardEntries() {
    var isRate = boardState.criterion === "rate";
    var values = isRate ? [92.5, 90.1, 88.7] : [2650000, 2512000, 2400000];
    var names = ["演示·小明", "演示·小红", "演示·阿伟"];
    var dates = ["2026-08-01", "2026-07-30", "2026-07-28"];
    return values.map(function (v, i) {
      return { rank: i + 1, player: names[i], value: v, achieved_at: dates[i] };
    });
  }

  function loadBoard() {
    var body = document.getElementById("boardBody");
    var note = document.getElementById("boardNote");
    if (!body) return;
    body.innerHTML = '<div class="board-loading">加载中…</div>';
    note.textContent = "";
    if (location.protocol === "file:") {
      note.textContent = "排行榜服务未连接（需部署 Cloudflare Pages Functions），以下为本地演示数据。";
      renderBoard(mockBoardEntries());
      return;
    }
    var qs = "dan=" + encodeURIComponent(boardState.dan) +
      "&version=" + encodeURIComponent(boardState.version) +
      "&mode=" + encodeURIComponent(boardState.mode) +
      "&criterion=" + encodeURIComponent(boardState.criterion) + "&limit=20";
    fetch("/api/leaderboard?" + qs)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        renderBoard(data.board || []);
      })
      .catch(function () {
        note.textContent = "排行榜服务未连接（需部署 Cloudflare Pages Functions），以下为本地演示数据。";
        renderBoard(mockBoardEntries());
      });
  }

  function renderBoard(entries) {
    var body = document.getElementById("boardBody");
    if (!body) return;
    if (!entries.length) {
      body.innerHTML = '<div class="board-empty">暂无上榜记录，去通过段位并提交成绩吧</div>';
      return;
    }
    var isRate = boardState.criterion === "rate";
    body.innerHTML = entries.map(function (e) {
      var v = isRate ? Number(e.value).toFixed(2) + "%" : Number(e.value).toLocaleString();
      var medal = e.rank === 1 ? "🥇" : e.rank === 2 ? "🥈" : e.rank === 3 ? "🥉" : "";
      return '<div class="board-row' + (e.rank <= 3 ? " top" : "") + '">' +
        '<span class="board-rank">' + medal + " " + e.rank + "</span>" +
        '<span class="board-player">' + esc(e.player) + "</span>" +
        '<span class="board-value">' + esc(v) + "</span>" +
        '<span class="board-date">' + esc(String(e.achieved_at || "").slice(0, 10)) + "</span>" +
      "</div>";
    }).join("");
  }

  function submitScore(dan, st, msgEl, btn) {
    var criterion = dan.criterion === "rate" ? "rate" : (dan.criterion === "avg" ? "avg" : "score");
    var danMode = (dan.mode && MODES[dan.mode])
      ? dan.mode
      : ((dan.songs[0] && MODES[dan.songs[0].mode]) ? dan.songs[0].mode : "normal");
    var payload = {
      player: playerName,
      dan: dan.name,
      version: versionLabel(dan),
      mode: danMode,
      criterion: criterion,
      scores: st.scores.map(function (v) { return v == null ? 0 : v; }),
      rates: st.rates.map(function (v) { return v == null ? 0 : v; }),
      fc: (st.fc || []).map(function (v) { return !!v; }),
      fcCount: (st.fc || []).filter(function (v) { return v; }).length,
      passTotal: passTotalFor(dan),
      passRate: passRateFor(dan),
      passAvg: dan.criterion === "avg" ? passAvgFor(dan) : null,
      songMin: dan.songMin != null ? Number(dan.songMin) : null,
      needFc: dan.needFc != null ? Number(dan.needFc) : null
    };
    if (btn) btn.disabled = true;
    msgEl.textContent = "提交中…";
    msgEl.classList.remove("ok", "err");
    if (location.protocol === "file:") {
      msgEl.textContent = "排行榜服务未部署，提交未生效（部署后即可使用）";
      msgEl.classList.add("err");
      if (btn) btn.disabled = false;
      return;
    }
    fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (r) {
        if (!r.ok) {
          return r.json().then(function (j) {
            throw new Error(j.error || "提交失败");
          });
        }
        return r.json();
      })
      .then(function (j) {
        msgEl.textContent = "已上榜 ✓";
        msgEl.classList.add("ok");
        candyBurst(1);
      })
      .catch(function (e) {
        msgEl.textContent = "排行榜服务未部署，提交未生效（部署后即可使用）";
        msgEl.classList.add("err");
        if (btn) btn.disabled = false;
      });
  }

  /* ---------- custom dan editor ---------- */

  function ensureCustom() {
    if (customDanData === null) {
      customDanData = deepCopy(DAN_DATA);
      saveCustomData();
    }
  }

  function refreshEditorThumb(row, song) {
    var label = row.querySelector(".ed-thumb");
    if (!label) return;
    var fileInput = label.querySelector(".ed-thumb-file");
    var img = label.querySelector("img");
    if (song.image) {
      if (!img) {
        img = document.createElement("img");
        img.alt = "";
        img.decoding = "async";
        label.insertBefore(img, fileInput);
      }
      img.src = song.image;
      label.classList.remove("empty");
    } else if (img) {
      img.remove();
      label.classList.add("empty");
    }
    var wrap = row.querySelector(".ed-thumb-wrap");
    var clearBtn = row.querySelector(".ed-thumb-clear");
    if (song.image && !clearBtn && wrap) {
      clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "ed-thumb-clear";
      clearBtn.title = "移除图片";
      clearBtn.textContent = "×";
      clearBtn.addEventListener("click", function () {
        delete song.image;
        var imgInput = row.querySelector(".ed-image");
        if (imgInput) imgInput.value = "";
        saveCustomData();
        renderEditorModal();
      });
      wrap.appendChild(clearBtn);
    } else if (!song.image && clearBtn) {
      clearBtn.remove();
    }
  }

  function createEditorSongRow(dan, slotIdx, songIdx, slot) {
    var song = slotSongs(slot)[songIdx];
    var row = document.createElement("div");
    row.className = "ed-song" + (songIdx > 0 ? " alt" : "") + (song.hidden ? " hidden" : "");
    var imgValue = (song.image && song.image.indexOf("data:") !== 0) ? song.image : "";
    row.innerHTML =
      '<div class="ed-song-line1">' +
        '<span class="ed-song-idx">' + (songIdx === 0 ? songOrdinal(slotIdx, dan.songs.length) : "备" + (songIdx + 1)) + "</span>" +
        '<span class="ed-thumb-wrap">' +
          '<label class="ed-thumb' + (song.image ? "" : " empty") + '" title="点击上传 / 更换歌曲图片">' +
            (song.image
              ? '<img src="' + esc(song.image) + '" alt="" decoding="async">'
              : '<span class="ed-thumb-ph">♪</span>') +
            '<input type="file" class="ed-thumb-file" accept="image/*" hidden>' +
          "</label>" +
          (song.image ? '<button type="button" class="ed-thumb-clear" title="移除图片">×</button>' : "") +
        "</span>" +
        '<input class="ed-title" placeholder="曲名" value="' + esc(song.title) + '">' +
        (song.hidden ? '<span class="ed-hidden-flag" title="该曲目为隐藏曲，打歌时显示？？？">🔒 ？？？</span>' : "") +
        '<input class="ed-level" type="number" step="0.1" min="1" max="10.9" value="' + esc(song.level) + '">' +
        '<button class="icon-btn danger" data-act="delsong" title="删除该曲目">×</button>' +
      "</div>" +
      '<div class="ed-song-line2">' +
        '<label class="ed-field ed-image-field" title="图片路径或 URL（如 assets/songs/xxx.jpg），或点上方缩略图上传">' +
          '<span class="ed-field-label">图片</span>' +
          '<input class="ed-image" type="text" placeholder="assets/songs/xxx.jpg 或 URL" value="' + esc(imgValue) + '">' +
        "</label>" +
        '<label class="ed-field"><span class="ed-field-label">难度</span>' +
          '<select class="ed-diff">' +
            '<option value="bsc"' + (song.diff === "bsc" ? " selected" : "") + '>BSC（绿）</option>' +
            '<option value="adv"' + (song.diff === "adv" ? " selected" : "") + '>ADV（黄）</option>' +
            '<option value="ext"' + (song.diff === "ext" ? " selected" : "") + '>EXT（红）</option>' +
          "</select>" +
        "</label>" +
        (slotIdx > 0
          ? '<label class="ed-field ed-hidden"><input type="checkbox" class="ed-hidden-check"' + (song.hidden ? " checked" : "") + ">" +
            "<span>隐藏曲（打歌显示？？？）</span></label>"
          : "") +
      "</div>";

    row.querySelector(".ed-title").addEventListener("input", function (ev) {
      song.title = ev.target.value;
      scheduleCustomSave();
    });
    var imageInput = row.querySelector(".ed-image");
    if (imageInput) {
      imageInput.addEventListener("input", function (ev) {
        var val = ev.target.value.trim();
        if (val) {
          song.image = val;
        } else {
          delete song.image;
        }
        scheduleCustomSave();
        refreshEditorThumb(row, song);
      });
    }
    var thumbFile = row.querySelector(".ed-thumb-file");
    if (thumbFile) {
      thumbFile.addEventListener("change", function () {
        var f = thumbFile.files && thumbFile.files[0];
        if (!f) return;
        fileToDataThumb(f, function (dataUrl) {
          song.image = dataUrl;
          saveCustomData();
          renderEditorModal();
        });
      });
    }
    var thumbClear = row.querySelector(".ed-thumb-clear");
    if (thumbClear) {
      thumbClear.addEventListener("click", function () {
        delete song.image;
        saveCustomData();
        renderEditorModal();
      });
    }
    row.querySelector(".ed-level").addEventListener("input", function (ev) {
      var v = parseFloat(ev.target.value);
      song.level = isNaN(v) ? 0 : Math.min(10.9, Math.max(1, v));
      scheduleCustomSave();
    });
    row.querySelector(".ed-diff").addEventListener("change", function (ev) {
      song.diff = ev.target.value;
      scheduleCustomSave();
    });
    var hiddenCheck = row.querySelector(".ed-hidden-check");
    if (hiddenCheck) {
      hiddenCheck.addEventListener("change", function (ev) {
        song.hidden = ev.target.checked;
        row.classList.toggle("hidden", song.hidden);
        var flag = row.querySelector(".ed-hidden-flag");
        if (song.hidden && !flag) {
          var t = row.querySelector(".ed-title");
          var span = document.createElement("span");
          span.className = "ed-hidden-flag";
          span.title = "该曲目为隐藏曲，打歌时显示？？？";
          span.textContent = "🔒 ？？？";
          if (t && t.nextSibling) t.parentNode.insertBefore(span, t.nextSibling);
          else if (t) t.parentNode.appendChild(span);
        } else if (!song.hidden && flag) {
          flag.remove();
        }
        scheduleCustomSave();
      });
    }
    row.querySelector('[data-act="delsong"]').addEventListener("click", function () {
      if (!confirm("确定删除这首曲目吗？")) return;
      if (Array.isArray(slot) && slot.length > 1) {
        slot.splice(songIdx, 1);
        saveCustomData();
        renderEditorModal();
        return;
      }
      if (dan.songs.length <= 1) {
        alert("每个段位至少保留 1 个曲目位。");
        return;
      }
      dan.songs.splice(slotIdx, 1);
      saveCustomData();
      renderEditorModal();
    });
    return row;
  }

  function createEditorDanRow(dan, idx) {
    var row = document.createElement("div");
    row.className = "editor-dan";
    row.style.setProperty("--dan-color", dan.color);

    var head = document.createElement("div");
    head.className = "editor-dan-head";
    var danMode = (dan.mode && MODES[dan.mode])
      ? dan.mode
      : ((dan.songs[0] && MODES[dan.songs[0].mode]) ? dan.songs[0].mode : "normal");
    var isRateCriterion = dan.criterion === "rate";
    var isAvgCriterion = dan.criterion === "avg";
    var medalBasis = dan.medalBasis ||
      (dan.criterion === "rate" ? "rate" : (dan.criterion === "avg" ? "avg" : "total"));
    head.innerHTML =
      '<div class="ed-head-row1">' +
        '<input class="ed-name" value="' + esc(dan.name) + '" aria-label="段位名">' +
        '<input class="ed-version" placeholder="版本（如 festo / jubeat prop）" value="' + esc(dan.version || "") + '" aria-label="jubeat 版本">' +
        '<label class="ed-field ed-mode-dan-wrap" title="挑战模式（用于排行榜分组）">' +
          '<span class="ed-field-label">挑战模式</span>' +
          '<select class="ed-mode-dan">' +
            Object.keys(MODES).map(function (m) {
              return '<option value="' + m + '"' + (danMode === m ? " selected" : "") + ">" + MODES[m] + "</option>";
            }).join("") +
          "</select>" +
        "</label>" +
        '<label class="ed-color-wrap" title="主题色"><input type="color" class="ed-color" value="' + esc(dan.color) + '"></label>' +
        '<button class="icon-btn" data-act="up" title="上移">↑</button>' +
        '<button class="icon-btn" data-act="down" title="下移">↓</button>' +
        '<button class="icon-btn danger" data-act="del" title="删除该段位">×</button>' +
      "</div>" +
      '<div class="ed-head-row2">' +
        '<span class="criterion-label">过段</span>' + criterionToggleHtml(dan.criterion || "score") +
        '<label class="ed-field"' + (isRateCriterion || isAvgCriterion ? ' style="display:none"' : "") +
          ' title="总分达标线（留空按每首 700,000 分自动换算）">' +
          '<span class="ed-field-label">总分线</span>' +
          '<input class="ed-pass-total" type="number" min="0" step="10000" placeholder="留空=自动" value="' + (dan.passTotal != null ? dan.passTotal : "") + '">' +
        "</label>" +
        '<label class="ed-field"' + (!isAvgCriterion ? ' style="display:none"' : "") +
          ' title="平均分达标线（留空按每首 700,000 分自动换算）">' +
          '<span class="ed-field-label">平均分线</span>' +
          '<input class="ed-pass-avg" type="number" min="0" max="1000000" step="1000" placeholder="留空=自动" value="' + (dan.passAvg != null ? dan.passAvg : "") + '">' +
        "</label>" +
        '<label class="ed-field"' + (!isRateCriterion ? ' style="display:none"' : "") +
          ' title="Rate 达标线（留空用默认 85%）">' +
          '<span class="ed-field-label">Rate线</span>' +
          '<input class="ed-pass-rate" type="number" min="0" max="100" step="0.1" placeholder="留空=默认" value="' + (dan.passRate != null ? dan.passRate : "") + '">' +
        "</label>" +
      "</div>" +
      '<div class="ed-head-row3">' +
        '<span class="criterion-label">奖牌</span>' +
        '<label class="ed-field" title="奖牌线按哪种数值判定">' +
          '<span class="ed-field-label">按</span>' +
          '<select class="ed-medal-basis">' +
            '<option value="total"' + (medalBasis === "total" ? " selected" : "") + '>总分数</option>' +
            '<option value="avg"' + (medalBasis === "avg" ? " selected" : "") + '>平均分</option>' +
            '<option value="rate"' + (medalBasis === "rate" ? " selected" : "") + '>music rate</option>' +
          "</select>" +
        "</label>" +
        '<label class="ed-field" title="金奖牌线（按所选依据的数值，留空不设）">' +
          '<span class="ed-field-label">金线</span>' +
          '<input class="ed-medal" data-medal="gold" type="number" min="0" step="any" placeholder="不设" value="' + esc(dan.medals && dan.medals.gold != null ? dan.medals.gold : "") + '">' +
        "</label>" +
        '<label class="ed-field" title="银奖牌线（按所选依据的数值，留空不设）">' +
          '<span class="ed-field-label">银线</span>' +
          '<input class="ed-medal" data-medal="silver" type="number" min="0" step="any" placeholder="不设" value="' + esc(dan.medals && dan.medals.silver != null ? dan.medals.silver : "") + '">' +
        "</label>" +
        '<label class="ed-field" title="铜奖牌线（按所选依据的数值，留空不设）">' +
          '<span class="ed-field-label">铜线</span>' +
          '<input class="ed-medal" data-medal="bronze" type="number" min="0" step="any" placeholder="不设" value="' + esc(dan.medals && dan.medals.bronze != null ? dan.medals.bronze : "") + '">' +
        "</label>" +
      "</div>" +
      '<div class="ed-head-row4">' +
        '<label class="ed-field ed-hidden-dan" title="勾选后该段位在主页显示为锁定状态，需输入解锁码才能进入">' +
          '<input type="checkbox" class="ed-hidden-dan-check"' + (dan.hidden ? " checked" : "") + ">" +
          "<span>隐藏段位（需解锁码解锁）</span>" +
        "</label>" +
        '<label class="ed-field ed-unlock-code-wrap"' + (dan.hidden ? "" : ' style="display:none"') + ">" +
          '<span class="ed-field-label">解锁码</span>' +
          '<input class="ed-unlock-code" type="text" maxlength="40" placeholder="解锁码" value="' + esc(dan.unlockCode || "") + '">' +
        "</label>" +
      "</div>";

    var songs = document.createElement("div");
    songs.className = "editor-songs";
    dan.songs.forEach(function (slot, si) {
      var opts = slotSongs(slot);
      opts.forEach(function (song, sj) {
        songs.appendChild(createEditorSongRow(dan, si, sj, slot));
      });
      if (opts.length < 4) {
        var addChoice = document.createElement("button");
        addChoice.type = "button";
        addChoice.className = "btn ed-add-choice";
        addChoice.textContent = "+ 该位置添加可选曲";
        addChoice.addEventListener("click", function () {
          var cur = dan.songs[si];
          var nopts = slotSongs(cur);
          if (nopts.length >= 4) {
            alert("每个曲目位最多 4 首可选曲。");
            return;
          }
          if (Array.isArray(cur)) {
            cur.push({ title: "", diff: "adv", hidden: false, level: 8 });
          } else {
            dan.songs[si] = [cur, { title: "", diff: "adv", hidden: false, level: 8 }];
          }
          saveCustomData();
          renderEditorModal();
        });
        songs.appendChild(addChoice);
      }
    });

    var addSong = document.createElement("button");
    addSong.type = "button";
    addSong.className = "btn ed-add-song";
    addSong.textContent = "+ 添加曲目";
    addSong.addEventListener("click", function () {
      dan.songs.push({ title: "", diff: "adv", hidden: false, level: 8 });
      saveCustomData();
      renderEditorModal();
    });

    row.appendChild(head);
    row.appendChild(songs);
    row.appendChild(addSong);

    head.querySelector(".ed-name").addEventListener("input", function (ev) {
      dan.name = ev.target.value;
      scheduleCustomSave();
      scheduleRender();
      var activeTabName = document.querySelector(".editor-tab.active .editor-tab-name");
      if (activeTabName) activeTabName.textContent = dan.name;
    });
    head.querySelector(".ed-version").addEventListener("input", function (ev) {
      dan.version = ev.target.value;
      scheduleCustomSave();
      scheduleRender();
    });
    head.querySelector(".ed-mode-dan").addEventListener("change", function (ev) {
      dan.mode = ev.target.value;
      scheduleCustomSave();
    });
    var hiddenDanCheck = head.querySelector(".ed-hidden-dan-check");
    if (hiddenDanCheck) {
      hiddenDanCheck.addEventListener("change", function (ev) {
        dan.hidden = ev.target.checked;
        if (!dan.hidden) delete dan.unlockCode;
        var codeWrap = head.querySelector(".ed-unlock-code-wrap");
        if (codeWrap) codeWrap.style.display = dan.hidden ? "" : "none";
        scheduleCustomSave();
        scheduleRender();
      });
    }
    var unlockCodeInput = head.querySelector(".ed-unlock-code");
    if (unlockCodeInput) {
      unlockCodeInput.addEventListener("input", function (ev) {
        dan.unlockCode = ev.target.value.trim();
        scheduleCustomSave();
      });
    }
    head.querySelector(".ed-medal-basis").addEventListener("change", function (ev) {
      dan.medalBasis = ev.target.value;
      scheduleCustomSave();
    });
    head.querySelector(".ed-color").addEventListener("input", function (ev) {
      dan.color = ev.target.value;
      row.style.setProperty("--dan-color", dan.color);
      scheduleCustomSave();
      scheduleRender();
      var activeTabDot = document.querySelector(".editor-tab.active .editor-tab-dot");
      if (activeTabDot) activeTabDot.style.background = dan.color;
    });
    head.querySelector(".ed-pass-total").addEventListener("input", function (ev) {
      if (ev.target.value === "") {
        delete dan.passTotal;
      } else {
        dan.passTotal = Math.max(0, Number(ev.target.value));
      }
      scheduleCustomSave();
    });
    head.querySelector(".ed-pass-avg").addEventListener("input", function (ev) {
      if (ev.target.value === "") {
        delete dan.passAvg;
      } else {
        dan.passAvg = Math.min(1000000, Math.max(0, Number(ev.target.value)));
      }
      scheduleCustomSave();
    });
    head.querySelector(".ed-pass-rate").addEventListener("input", function (ev) {
      if (ev.target.value === "") {
        delete dan.passRate;
      } else {
        dan.passRate = Math.min(100, Math.max(0, Number(ev.target.value)));
      }
      scheduleCustomSave();
    });
    head.querySelectorAll(".ed-medal").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var v = parseFloat(inp.value);
        if (isNaN(v)) {
          if (dan.medals) delete dan.medals[inp.dataset.medal];
          if (dan.medals && !Object.keys(dan.medals).length) delete dan.medals;
        } else {
          if (!dan.medals) dan.medals = {};
          dan.medals[inp.dataset.medal] = v;
        }
        scheduleCustomSave();
      });
    });
    head.querySelectorAll(".criterion-toggle .cchip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        dan.criterion = chip.dataset.criterion;
        saveCustomData();
        renderEditorModal();
      });
    });
    head.querySelectorAll("[data-act]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var act = btn.dataset.act;
        if (act === "up" && idx > 0) {
          var t = customDanData[idx - 1];
          customDanData[idx - 1] = customDanData[idx];
          customDanData[idx] = t;
          if (editorSelected === idx) editorSelected = idx - 1;
          else if (editorSelected === idx - 1) editorSelected = idx;
        } else if (act === "down" && idx < customDanData.length - 1) {
          var t2 = customDanData[idx + 1];
          customDanData[idx + 1] = customDanData[idx];
          customDanData[idx] = t2;
          if (editorSelected === idx) editorSelected = idx + 1;
          else if (editorSelected === idx + 1) editorSelected = idx;
        } else if (act === "del") {
          if (!confirm("删除段位「" + dan.name + "」？")) return;
          customDanData.splice(idx, 1);
          if (idx < editorSelected) editorSelected--;
          else if (editorSelected >= customDanData.length) {
            editorSelected = Math.max(0, customDanData.length - 1);
          }
        }
        saveCustomData();
        renderEditorModal();
        render();
      });
    });

    return row;
  }

  function createEditorCard() {
    ensureCustom();
    if (editorSelected >= customDanData.length) {
      editorSelected = Math.max(0, customDanData.length - 1);
    }

    var editor = document.createElement("div");
    editor.className = "editor";

    var head = document.createElement("div");
    head.className = "editor-head";
    head.innerHTML =
      '<span class="rank-badge">自定义段位管理</span>' +
      '<span class="editor-hint">修改实时保存到本机；「导出存档」可带走自定义段位数据</span>';

    var body = document.createElement("div");
    body.className = "editor-body";

    var sidebar = document.createElement("div");
    sidebar.className = "editor-sidebar";
    var groups = [];
    var byVersion = {};
    customDanData.forEach(function (dan, idx) {
      var v = versionLabel(dan);
      if (!byVersion[v]) {
        byVersion[v] = [];
        groups.push(v);
      }
      byVersion[v].push({ dan: dan, idx: idx });
    });
    groups.forEach(function (v) {
      var sec = document.createElement("div");
      sec.className = "editor-group" + (versionOpen[v] ? " open" : "");
      var secHead = document.createElement("button");
      secHead.type = "button";
      secHead.className = "editor-group-head";
      secHead.setAttribute("aria-expanded", versionOpen[v] ? "true" : "false");
      secHead.innerHTML =
        '<span class="editor-group-name">' + esc(v) + "</span>" +
        '<span class="editor-group-meta">' + byVersion[v].length + " 个</span>" +
        '<span class="version-chevron" aria-hidden="true">▾</span>';
      secHead.addEventListener("click", function () {
        versionOpen[v] = !versionOpen[v];
        renderEditorModal();
      });
      var secBody = document.createElement("div");
      secBody.className = "editor-group-body";
      byVersion[v].forEach(function (item) {
        secBody.appendChild(createEditorTab(item.dan, item.idx));
      });
      sec.appendChild(secHead);
      sec.appendChild(secBody);
      sidebar.appendChild(sec);
    });

    var addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn ed-add-dan";
    addBtn.textContent = "+ 添加段位";
    addBtn.addEventListener("click", function () {
      customDanData.push({
        id: "custom-" + Date.now(),
        name: "新段位" + (customDanData.length + 1),
        version: customDanData[editorSelected] ? (customDanData[editorSelected].version || "") : "",
        color: paletteColor(customDanData.length),
        criterion: "score",
        songs: [
          { title: "", diff: "adv", hidden: false, level: 8 },
          { title: "", diff: "adv", hidden: false, level: 8 },
          { title: "", diff: "adv", hidden: false, level: 8 }
        ]
      });
      editorSelected = customDanData.length - 1;
      saveCustomData();
      renderEditorModal();
      render();
    });
    sidebar.appendChild(addBtn);

    var resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "btn danger ed-reset-dan";
    resetBtn.textContent = "恢复默认数据";
    resetBtn.addEventListener("click", function () {
      if (!confirm("恢复为 data.json 的默认段位数据？当前自定义修改和挑战进度将被清除。")) return;
      customDanData = null;
      editorSelected = 0;
      state = defaultState();
      saveState();
      saveCustomData();
      render();
      closeModal();
    });
    sidebar.appendChild(resetBtn);

    var panel = document.createElement("div");
    panel.className = "editor-panel";
    if (customDanData.length) {
      panel.appendChild(createEditorDanRow(customDanData[editorSelected], editorSelected));
    } else {
      panel.innerHTML = '<div class="editor-empty">暂无段位，点击左侧「+ 添加段位」</div>';
    }

    body.appendChild(sidebar);
    body.appendChild(panel);
    editor.appendChild(head);
    editor.appendChild(body);

    return editor;
  }

  function createEditorTab(dan, idx) {
    var tab = document.createElement("button");
    tab.type = "button";
    tab.className = "editor-tab" + (idx === editorSelected ? " active" : "");
    tab.style.setProperty("--dan-color", dan.color);
    tab.innerHTML =
      '<span class="editor-tab-dot"></span>' +
      '<span class="editor-tab-name">' + (dan.hidden ? "🔒 " : "") + esc(dan.name) + "</span>";
    tab.addEventListener("click", function () {
      editorSelected = idx;
      renderEditorModal();
    });
    return tab;
  }

  function renderEditorModal() {
    var content = document.getElementById("modalContent");
    content.innerHTML = "";
    content.appendChild(createEditorCard());
  }

  function openEditorModal() {
    ensureCustom();
    if (customDanData.length) {
      var selIdx = Math.min(editorSelected, customDanData.length - 1);
      versionOpen[versionLabel(customDanData[selIdx])] = true;
    }
    modalMode = "editor";
    modalDan = null;
    var content = document.getElementById("modalContent");
    content.innerHTML = "";
    content.appendChild(createEditorCard());
    var backdrop = document.getElementById("danModal");
    var modal = backdrop.querySelector(".modal");
    modal.classList.add("editor-mode");
    backdrop.classList.add("editor-full");
    backdrop.classList.add("open");
    document.body.style.overflow = "hidden";
    document.getElementById("modalClose").focus();
  }

  /* 删除/改名段位后，清理 state 中已不存在的进度 key（保留旧版按段位名存的 key） */
  function pruneStateKeys() {
    if (!state) return;
    var keep = {};
    effectiveDans().forEach(function (d) {
      keep[danKey(d)] = 1;
      if (d.name) keep[d.name] = 1;
    });
    var changed = false;
    Object.keys(state.d).forEach(function (k) {
      if (!keep[k]) {
        delete state.d[k];
        changed = true;
      }
    });
    if (changed) saveState();
  }

  function render() {
    pruneStateKeys();
    effectiveDans().forEach(function (d) {
      var st = danState(d);
      var passed = computePassed(d, st);
      if (passed !== st.cleared) {
        st.cleared = passed;
        st.clearedCriterion = passed ? d.criterion : null;
      }
    });
    var list = document.getElementById("danFolders");
    list.innerHTML = "";
    /* 本地自定义数据会整体覆盖 data.json，更新内置数据后容易被误认为“没生效”，给个提示 */
    var notice = document.getElementById("customDataNotice");
    if (customDanData !== null) {
      if (!notice) {
        notice = document.createElement("div");
        notice.id = "customDataNotice";
        notice.className = "custom-data-notice";
        list.parentNode.insertBefore(notice, list);
      }
      notice.innerHTML =
        '<span class="custom-data-notice-text">当前显示的是本地自定义段位数据，data.json 的更新不会自动生效。</span>' +
        '<button type="button" class="btn custom-data-notice-btn" id="useDefaultDataBtn">恢复默认数据</button>';
      var useBtn = notice.querySelector("#useDefaultDataBtn");
      useBtn.addEventListener("click", function () {
        if (!window.confirm("将清除本地自定义段位数据并恢复 data.json 的默认数据，确定？")) return;
        customDanData = null;
        saveCustomData();
        render();
      });
    } else if (notice) {
      notice.remove();
    }
    list.appendChild(createRandomFolderCard());
    var vgrid = document.createElement("div");
    vgrid.className = "version-grid";
    var dans = effectiveDans();
    var groups = [];
    var byVersion = {};
    dans.forEach(function (dan, index) {
      var v = versionLabel(dan);
      if (!byVersion[v]) {
        byVersion[v] = [];
        groups.push(v);
      }
      byVersion[v].push({ dan: dan, index: index });
    });
    groups.forEach(function (v) {
      var items = byVersion[v];
      var visible = items.filter(function (item) {
        var st = danState(item.dan);
        return activeFilter === "all" ||
          (activeFilter === "cleared" && st.cleared) ||
          (activeFilter === "pending" && !st.cleared);
      });
      if (!visible.length) return;
      var cleared = items.filter(function (item) {
        return danState(item.dan).cleared;
      }).length;
      vgrid.appendChild(createVersionFolderCard(v, cleared, items.length));
    });
    if (vgrid.children.length) list.appendChild(vgrid);
    updateSummary();
  }

  /* ---------- actions ---------- */

  function exportData() {
    var payload = {
      app: "jubeat-dan-challenge",
      exportedAt: new Date().toISOString(),
      state: state,
      random: randomState,
      custom: customDanData
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

  function importData(file) {
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
        modalMode = "import";
        modalDan = null;
        var content = document.getElementById("modalContent");
        content.innerHTML = "";
        content.appendChild(createImportConfirmCard(parsed));
        var backdrop = document.getElementById("danModal");
        backdrop.classList.add("open");
        document.body.style.overflow = "hidden";
        document.getElementById("modalClose").focus();
      } catch (e) {
        alert("导入失败：" + e.message);
      }
    };
    reader.readAsText(file);
  }

  function createImportConfirmCard(parsed) {
    var customDesc = Array.isArray(parsed.custom)
      ? parsed.custom.length + " 个段位"
      : (parsed.custom === null ? "已恢复默认" : "—");
    var parts = [
      Object.keys(parsed.state.d || {}).length + " 个段位进度",
      parsed.random ? "随机挑战记录" : null,
      parsed.custom !== undefined ? "自定义段位（" + customDesc + "）" : null
    ].filter(Boolean);
    var card = document.createElement("div");
    card.className = "import-card";
    card.innerHTML =
      '<div class="login-title">📥 导入存档</div>' +
      '<p class="login-hint">存档包含：' + esc(parts.join("、")) + "</p>" +
      '<p class="login-hint">「进度 + 自定义」会用存档的段位数据覆盖本机设置，请选择：</p>' +
      '<div class="import-options">' +
        '<button class="btn" id="importStateOnly">只导入进度</button>' +
        '<button class="btn primary" id="importAll">进度 + 自定义</button>' +
      "</div>" +
      '<div class="login-msg" id="importMsg"></div>';
    card.querySelector("#importStateOnly").addEventListener("click", function () {
      applyImport(parsed, false);
    });
    card.querySelector("#importAll").addEventListener("click", function () {
      applyImport(parsed, true);
    });
    return card;
  }

  function applyImport(parsed, withCustom) {
    /* 先应用自定义数据，再按当前有效段位构建进度，保证存档的段位与进度能对上 */
    if (withCustom === true) {
      customDanData = parsed.custom === null
        ? null
        : (Array.isArray(parsed.custom) ? parsed.custom : customDanData);
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
      t.chosen.forEach(function (_, i) {
        t.chosen[i] = Number((src.chosen || [])[i]) || 0;
      });
    });
    if (parsed.state.unlocked && typeof parsed.state.unlocked === "object") {
      Object.keys(parsed.state.unlocked).forEach(function (k) {
        if (parsed.state.unlocked[k]) base.unlocked[k] = true;
      });
    }
    state = base;
    saveState();
    randomState = parseRandom(parsed.random);
    saveRandomState();
    editorSelected = 0;
    closeModal();
    render();
    alert("导入成功！");
  }

  function resetAll() {
    if (!confirm("确定清空全部段位进度和分数吗？此操作不可撤销（可先导出存档备份）。")) return;
    state = defaultState();
    saveState();
    render();
  }

  /* ---------- boot ---------- */

  function wireModalCommon() {
    document.getElementById("modalClose").addEventListener("click", closeModal);
    var backdrop = document.getElementById("danModal");
    backdrop.addEventListener("click", function (ev) {
      if (ev.target === backdrop) closeModal();
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") {
        closeModal();
        var dd = document.getElementById("settingsDropdown");
        if (dd) dd.classList.remove("open");
        var sbtn = document.getElementById("settingsBtn");
        if (sbtn) sbtn.setAttribute("aria-expanded", "false");
      }
      if (ev.key === "Tab") {
        var backdrop = document.getElementById("danModal");
        if (!backdrop.classList.contains("open")) return;
        var focusables = backdrop.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        var active = document.activeElement;
        if (ev.shiftKey && (active === first || !backdrop.contains(active))) {
          ev.preventDefault();
          last.focus();
        } else if (!ev.shiftKey && (active === last || !backdrop.contains(active))) {
          ev.preventDefault();
          first.focus();
        }
      }
    });
  }

  function initAdminPage() {
    var gridBg = document.getElementById("gridBg");
    if (gridBg) gridBg.innerHTML = Array.from({ length: 16 }, function () { return "<i></i>"; }).join("");
    initDecorations();
    wireModalCommon();

    var manageBtn = document.getElementById("adminManageBtn");
    if (manageBtn) {
      manageBtn.addEventListener("click", function () {
        if (!adminLocked() || isAdminAuthed()) {
          openEditorModal();
        } else {
          adminPending = "editor";
          openAdminLogin();
        }
      });
    }
    var boardBtn = document.getElementById("adminBoardBtn");
    if (boardBtn) {
      boardBtn.addEventListener("click", function () {
        if (!adminLocked() || isAdminAuthed()) {
          openBoardManage();
        } else {
          adminPending = "board";
          openAdminLogin();
        }
      });
    }
    var refreshBtn = document.getElementById("boardManageRefresh");
    if (refreshBtn) refreshBtn.addEventListener("click", loadBoardManage);
  }

  function init() {
    if (PAGE_ADMIN) {
      initAdminPage();
      return;
    }

    var gridBg = document.getElementById("gridBg");
    gridBg.innerHTML = Array.from({ length: 16 }, function () { return "<i></i>"; }).join("");
    initDecorations();

    document.querySelectorAll(".filters .chip").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeFilter = btn.dataset.filter;
        document.querySelectorAll(".filters .chip").forEach(function (b) {
          b.classList.toggle("active", b === btn);
        });
        render();
      });
    });

    document.getElementById("exportBtn").addEventListener("click", exportData);
    document.getElementById("importFile").addEventListener("change", function (ev) {
      if (ev.target.files && ev.target.files[0]) importData(ev.target.files[0]);
      ev.target.value = "";
    });
    document.getElementById("resetBtn").addEventListener("click", resetAll);
    document.getElementById("boardBtn").addEventListener("click", openLeaderboardModal);
    document.getElementById("loginBtn").addEventListener("click", openLoginModal);
    updatePlayerButton();

    var settingsBtn = document.getElementById("settingsBtn");
    var settingsDropdown = document.getElementById("settingsDropdown");
    if (settingsBtn && settingsDropdown) {
      settingsBtn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        var open = settingsDropdown.classList.toggle("open");
        settingsBtn.setAttribute("aria-expanded", open ? "true" : "false");
      });
      settingsDropdown.addEventListener("click", function (ev) {
        if (ev.target.closest && ev.target.closest(".dropdown-item")) {
          settingsDropdown.classList.remove("open");
          settingsBtn.setAttribute("aria-expanded", "false");
        }
      });
      document.addEventListener("click", function (ev) {
        if (!settingsDropdown.contains(ev.target)) {
          settingsDropdown.classList.remove("open");
          settingsBtn.setAttribute("aria-expanded", "false");
        }
      });
    }

    wireModalCommon();

    render();
  }

  function applyData(site, config, dans) {
    SITE_INFO = site;
    APP_CONFIG = config;
    DAN_DATA = dans;
    CONFIG = APP_CONFIG;
    scoreMax = CONFIG.scoreMax;
    customDanData = loadCustomData();
    state = loadState();
    init();
  }

  function useFallbackData() {
    /* 本地双击打开（file://）时浏览器禁止 fetch 本地文件，改用兜底数据 */
    if (window.SITE_INFO && window.APP_CONFIG && window.DAN_DATA) {
      applyData(window.SITE_INFO, window.APP_CONFIG, window.DAN_DATA);
    } else {
      var foldersEl = document.getElementById("danFolders");
      if (foldersEl) {
        foldersEl.innerHTML =
          '<div class="notice">数据加载失败：找不到 data.json，也没有可用的兜底数据。</div>';
      } else if (PAGE_ADMIN) {
        var bodyEl = document.getElementById("boardManageBody");
        if (bodyEl) {
          bodyEl.innerHTML = '<div class="board-empty">数据加载失败：找不到 data.json。</div>';
        }
      }
    }
  }

  function loadData() {
    if (location.protocol === "file:") {
      useFallbackData();
      return;
    }
    fetch("data.json")
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (json) {
        applyData(json.site, json.config, json.dans);
      })
      .catch(useFallbackData);
  }

  window.addEventListener("beforeunload", flushCustomSave);
  window.addEventListener("pagehide", flushCustomSave);

  document.addEventListener("DOMContentLoaded", loadData);
})();
