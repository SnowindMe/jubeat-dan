<script>
  import { untrack } from "svelte";
  import RandomSongRow from "./RandomSongRow.svelte";
  import { MODES, POOLS } from "../lib/constants.js";
  import { clampRate, clampScore, computePassed } from "../lib/pass.js";
  import { passSummaryHtml } from "../lib/render.js";
  import {
    app,
    generateChallenge,
    saveRandomState,
    songPoolFor
  } from "../lib/stores.svelte.js";
  import { candyBurst } from "../lib/utils.js";

  const c = $derived(app.random.challenge);
  const isRate = $derived(c.criterion === "rate");

  // 打开时先按当前输入重算一次通过状态（与原版 createRandomCard 一致）
  untrack(function () {
    c.cleared = computePassed({ criterion: c.criterion }, c);
    c.clearedCriterion = c.cleared ? c.criterion : null;
  });

  function recountCleared() {
    var wasCleared = c.cleared;
    c.cleared = computePassed({ criterion: c.criterion }, c);
    c.clearedCriterion = c.cleared ? c.criterion : null;
    if (!wasCleared && c.cleared) {
      if (!c.counted) {
        c.counted = true;
        app.random.passedCount++;
      }
      candyBurst(1);
    } else if (!c.cleared) {
      c.counted = false;
    }
    saveRandomState();
  }

  function onScoreInput(i, value) {
    if (isRate) c.rates[i] = value === "" ? null : clampRate(value);
    else c.scores[i] = value === "" ? null : clampScore(value);
    recountCleared();
  }

  function onModeChange(i, value) {
    c.modes[i] = value;
    c.scores[i] = null;
    c.rates[i] = null;
    c.cleared = computePassed({ criterion: c.criterion }, c);
    c.clearedCriterion = c.cleared ? c.criterion : null;
    saveRandomState();
  }

  function setCriterion(cr) {
    c.criterion = cr;
    c.cleared = computePassed({ criterion: c.criterion }, c);
    c.clearedCriterion = c.cleared ? c.criterion : null;
    saveRandomState();
  }
</script>

<article class="dan-card random-card" class:cleared={c.cleared} style="--dan-color: #2FA8F0">
  <div class="card-head">
    <span class="rank-badge">随机挑战</span>
    <span class="card-status">{c.cleared ? "已通过 ✓" : "未通过"}</span>
  </div>

  <div class="criterion-row">
    <span class="criterion-label">过段</span>
    <div class="criterion-toggle">
      <button type="button" class="cchip" class:active={c.criterion === "score"} onclick={() => setCriterion("score")}>总分数</button>
      <button type="button" class="cchip" class:active={c.criterion === "avg"} onclick={() => setCriterion("avg")}>平均分</button>
      <button type="button" class="cchip" class:active={c.criterion === "rate"} onclick={() => setCriterion("rate")}>music rate</button>
    </div>
  </div>

  <div class="random-meta">
    难度：{POOLS[app.random.pool].label}
    {#if songPoolFor(app.random.pool).length < 3}（曲池不足，已从全曲池抽取）{/if}
    · 已通过 {app.random.passedCount} 组
  </div>

  <div class="pool-chips">
    {#each Object.keys(POOLS) as k (k)}
      <button
        type="button"
        class="chip pool-chip"
        class:active={app.random.pool === k}
        onclick={() => generateChallenge(k)}
      >{POOLS[k].label}</button>
    {/each}
  </div>

  <ul class="song-list">
    {#each c.songs as _, i (i)}
      <RandomSongRow index={i} {c} oninput={onScoreInput} onmode={onModeChange} />
    {/each}
  </ul>

  <div class="pass-summary-wrap">{@html passSummaryHtml({ criterion: c.criterion }, c)}</div>

  <div class="random-actions">
    <button class="btn" onclick={() => generateChallenge(app.random.pool)}>🎲 换一组</button>
  </div>
</article>

<style>
  .random-meta {
    font-size: 13px;
    color: var(--muted);
    margin: -2px 0 10px;
  }

  .pool-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
  }

  .pool-chips .chip { padding: 5px 10px; font-size: 12px; }

  .random-actions { margin-top: 14px; text-align: center; }
</style>
