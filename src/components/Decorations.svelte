<script>
  import { onMount } from "svelte";
  import { DECOR_COLORS } from "../lib/constants.js";
  import { candySvg, decorRand } from "../lib/utils.js";

  let candies = $state([]);
  let heroes = $state([]);

  onMount(function () {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /* 全屏背景：2 个棒棒糖 + 3 个蝴蝶糖果，位置/角度/速度随机（减量降耗） */
    candies = Array.from({ length: 5 }, function (_, i) {
      var candy = i >= 2;
      var color = DECOR_COLORS[Math.floor(Math.random() * DECOR_COLORS.length)];
      return {
        candy: candy,
        inner: candy ? candySvg(color) : '<i class="lp-body"></i>',
        style: [
          "--c:" + color,
          "--size:" + Math.round(decorRand(36, 58)) + "px",
          "--rot:" + Math.round(decorRand(-55, 55)) + "deg",
          "--dur:" + decorRand(18, 30).toFixed(1) + "s",
          "--spin-dur:" + decorRand(8, 16).toFixed(1) + "s",
          "--delay:-" + decorRand(0, 26).toFixed(1) + "s",
          "--op:" + decorRand(0.18, 0.34).toFixed(2),
          "left:" + decorRand(2, 86).toFixed(1) + "%;top:" + decorRand(8, 86).toFixed(1) + "%"
        ].join(";")
      };
    });

    /* 顶部 Hero：3 个棒棒糖 + 1 个蝴蝶糖果，位置固定、参数随机 */
    var spots = [
      { left: "3%", top: "14px", size: 46 },
      { right: "6%", top: "28px", size: 52 },
      { left: "11%", bottom: "10px", size: 34 }
    ];
    heroes = spots.map(function (s, i) {
      return {
        cls: "lollipop",
        inner: '<i class="lp-body"></i>',
        style: [
          "--c:" + DECOR_COLORS[(i * 2 + 1) % DECOR_COLORS.length],
          "--size:" + s.size + "px",
          "--rot:" + Math.round(decorRand(-40, 40)) + "deg",
          "--dur:" + decorRand(14, 22).toFixed(1) + "s",
          "--spin-dur:" + decorRand(9, 15).toFixed(1) + "s",
          "--delay:-" + decorRand(0, 16).toFixed(1) + "s",
          "--op:0.95",
          (s.left ? "left:" + s.left : ""),
          (s.right ? "right:" + s.right : ""),
          "top:" + (s.top || "auto"),
          "bottom:" + (s.bottom || "auto")
        ].filter(Boolean).join(";")
      };
    });
    heroes.push({
      cls: "candy-wrapped",
      inner: candySvg("#A46BFF"),
      style: "--c:#A46BFF;--size:54px;--rot:-24deg;--dur:17s;--spin-dur:9s;--delay:-6s;--op:0.95;right:16%;bottom:12%"
    });
  });
</script>

<div class="candy-field" aria-hidden="true">
  {#each candies as c, i (i)}
    <span class={c.candy ? "candy-wrapped" : "lollipop"} style={c.style}>{@html c.inner}</span>
  {/each}
</div>

{#each heroes as h, i (i)}
  <span class={h.cls} style={h.style}>{@html h.inner}</span>
{/each}

<style>
  .lollipop {
    position: absolute;
    width: var(--size, 44px);
    height: calc(var(--size, 44px) + 32px);
    display: block;
    pointer-events: none;
    opacity: var(--op, 0.3);
    animation: lp-float var(--dur, 16s) ease-in-out infinite;
    animation-delay: var(--delay, 0s);
    will-change: transform;
  }

  /* 整个棒棒糖旋转：糖头 + 棍子一起转，飘动由外层负责 */
  .lp-body {
    position: absolute;
    inset: 0;
    display: block;
    transform-origin: 50% 50%;
    animation: lp-spin var(--spin-dur, 12s) linear infinite;
    animation-delay: var(--delay, 0s);
    will-change: transform;
  }

  .lp-body::before {
    content: "";
    display: block;
    width: var(--size, 44px);
    height: var(--size, 44px);
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      #FFFFFF 0deg 32deg, var(--c) 32deg 64deg,
      #FFFFFF 64deg 96deg, var(--c) 96deg 128deg,
      #FFFFFF 128deg 160deg, var(--c) 160deg 192deg,
      #FFFFFF 192deg 224deg, var(--c) 224deg 256deg,
      #FFFFFF 256deg 288deg, var(--c) 288deg 320deg,
      #FFFFFF 320deg 352deg, var(--c) 352deg 360deg
    );
    box-shadow: inset -4px -6px 10px rgba(30, 70, 120, 0.12), 0 8px 16px rgba(70, 130, 190, 0.18);
  }

  .lp-body::after {
    content: "";
    display: block;
    width: 7px;
    height: 34px;
    margin: -3px auto 0;
    background: linear-gradient(90deg, #F3E9D8, #FFFFFF 50%, #E8DCC6);
    border-radius: 4px;
  }

  @keyframes lp-float {
    0%   { transform: translate(0, 0) rotate(var(--rot, -6deg)); }
    20%  { transform: translate(18px, -16px) rotate(calc(var(--rot, -6deg) + 13deg)); }
    40%  { transform: translate(-14px, -30px) rotate(calc(var(--rot, -6deg) - 11deg)); }
    60%  { transform: translate(12px, -20px) rotate(calc(var(--rot, -6deg) + 9deg)); }
    80%  { transform: translate(-20px, -10px) rotate(calc(var(--rot, -6deg) - 7deg)); }
    100% { transform: translate(0, 0) rotate(var(--rot, -6deg)); }
  }

  @keyframes lp-spin {
    to { transform: rotate(360deg); }
  }

  /* 蝴蝶状糖果：两头扭结包装纸的糖果（参考图样式） */
  .candy-wrapped {
    position: absolute;
    width: var(--size, 64px);
    height: calc(var(--size, 64px) * 0.6);
    display: block;
    pointer-events: none;
    opacity: var(--op, 0.3);
    animation: candy-float var(--dur, 20s) ease-in-out infinite;
    animation-delay: var(--delay, 0s);
    will-change: transform;
  }

  /* svg 由 {@html} 注入，不受作用域保护，需 :global */
  :global(.candy-wrapped svg) {
    display: block;
    width: 100%;
    height: 100%;
    transform-origin: 50% 50%;
    filter: drop-shadow(0 5px 10px rgba(70, 130, 190, 0.22));
    animation: candy-spin var(--spin-dur, 9s) linear infinite;
    animation-delay: var(--delay, 0s);
    will-change: transform;
  }

  @keyframes candy-float {
    0%   { transform: translate(0, 0) rotate(var(--rot, 0deg)); }
    25%  { transform: translate(20px, -16px) rotate(calc(var(--rot, 0deg) + 12deg)); }
    50%  { transform: translate(-16px, -28px) rotate(calc(var(--rot, 0deg) - 10deg)); }
    75%  { transform: translate(12px, -14px) rotate(calc(var(--rot, 0deg) + 7deg)); }
    100% { transform: translate(0, 0) rotate(var(--rot, 0deg)); }
  }

  @keyframes candy-spin {
    to { transform: rotate(360deg); }
  }

  .candy-field {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
  }

  @media (max-width: 620px) {
    :global(.hero .lollipop), :global(.hero .candy-wrapped) { display: none; }
    .candy-field .lollipop, .candy-field .candy-wrapped { opacity: 0.20; }
  }

  @media (prefers-reduced-motion: reduce) {
    .lollipop, .lp-body,
    .candy-wrapped, .candy-wrapped svg { animation: none; transition: none; }
  }
</style>
