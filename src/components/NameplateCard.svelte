<script>
  import { MODES, NAME_PLATES } from "../lib/constants.js";
  import { app, effectiveDans, openModal, readDanState } from "../lib/stores.svelte.js";
  import { emojiToDataUrl } from "../lib/utils.js";

  const svgCache = new Map();
  let svgRoot = $state(null);
  let renderToken = 0;

  const plate = $derived(NAME_PLATES.find(function (p) { return p.id === app.playerPlate; }) || NAME_PLATES[0]);

  /* 最高已过段位：只取 2 字短名阶梯（初段～指神），姓名框段位字槽放不下长课程名 */
  const highest = $derived.by(function () {
    var out = null;
    effectiveDans().forEach(function (dan) {
      if (dan.name && dan.name.length <= 4 && readDanState(dan).cleared) out = dan;
    });
    return out;
  });

  const danText = $derived(highest ? highest.name : "未定");
  const modeText = $derived(highest ? (MODES[highest.mode] || "NORMAL") : "");
  const avatarSrc = $derived(
    String(app.playerAvatar || "").startsWith("data:image")
      ? app.playerAvatar
      : emojiToDataUrl(app.playerAvatar || "🐱")
  );

  async function loadSvg(src) {
    if (svgCache.has(src)) return svgCache.get(src);
    try {
      var r = await fetch(src);
      var text = await r.text();
      svgCache.set(src, text);
      return text;
    } catch (e) {
      return "";
    }
  }

  function apply() {
    var root = svgRoot.querySelector("svg");
    if (!root) return;

    root.setAttribute("width", "100%");
    root.setAttribute("height", "100%");

    root.querySelectorAll("image").forEach(function (img) {
      if (img.getAttribute("width") === "60" && img.getAttribute("height") === "60") {
        img.setAttribute("href", avatarSrc);
        img.setAttribute("xlink:href", avatarSrc);
      }
    });

    root.querySelectorAll("text").forEach(function (t) {
      var x = t.getAttribute("x");
      var y = t.getAttribute("y");
      if (y === "166" && x === "98") {
        /* 玩家名 */
        t.textContent = app.playerName || "玩家";
      } else if (y === "186" && x === "98") {
        /* 本地不记录过关日期，隐藏日期行 */
        t.style.display = "none";
      } else if (y === "156" && x === "690") {
        /* 段位字（描边层 + 填充层各一处） */
        t.textContent = danText;
      } else if (y === "120" && x === "430") {
        /* PASS：未过任何段位时隐藏，避免「PASS + 未定」矛盾 */
        t.style.display = highest ? "" : "none";
      } else if (y === "4" && x === "0") {
        /* 挑战模式小标（连胶囊一起显隐） */
        var capsule = t.parentElement;
        if (capsule && capsule.tagName === "g") capsule.style.display = "";
        if (highest) {
          t.textContent = modeText;
          t.style.display = "";
        } else {
          t.style.display = "none";
          if (capsule && capsule.tagName === "g") capsule.style.display = "none";
        }
      }
    });
  }

  async function render() {
    var token = ++renderToken;
    var text = await loadSvg(plate.src);
    if (!text || !svgRoot || token !== renderToken) return;
    svgRoot.innerHTML = text;
    apply();
  }

  $effect(function () {
    var src = plate.src;
    var name = app.playerName;
    var av = avatarSrc;
    var dan = danText;
    var mode = modeText;
    if (src) render();
  });
</script>

{#if plate.id === "none"}
  <button type="button" class="me-empty" onclick={() => openModal("login")}>
    <span class="me-empty-title">✦ 我的段位姓名框 ✦</span>
    <span class="me-empty-hint">点击设置昵称、头像与姓名框，生成你的段位名片</span>
  </button>
{:else}
  <button type="button" class="me-nameplate" title="点击编辑个人资料" onclick={() => openModal("login")}>
    <div class="me-nameplate-svg" bind:this={svgRoot}></div>
  </button>
{/if}

<style>
  .me-nameplate {
    display: block;
    width: 100%;
    max-width: 100%;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    overflow: hidden;
  }

  .me-nameplate-svg {
    width: 100%;
    max-width: 100%;
    aspect-ratio: 860 / 220;
    overflow: hidden;
  }

  .me-nameplate-svg :global(svg) {
    width: 100%;
    max-width: 100%;
    height: 100%;
    display: block;
  }

  .me-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    aspect-ratio: 860 / 220;
    background: rgba(255, 255, 255, 0.55);
    border: 2px dashed #8FD0F7;
    border-radius: 18px;
    cursor: pointer;
    color: #1B7FCF;
    font-family: inherit;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .me-empty:hover {
    border-color: #38B6F2;
    background: rgba(255, 255, 255, 0.75);
  }

  .me-empty-title {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: 3px;
  }

  .me-empty-hint {
    font-size: 13px;
    color: var(--muted);
  }

  @media (max-width: 620px) {
    .me-empty-title { font-size: 16px; letter-spacing: 1px; }
    .me-empty-hint { font-size: 11px; }
  }
</style>
