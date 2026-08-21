<script>
  import { untrack } from "svelte";
  import SongRow from "./SongRow.svelte";
  import { MODES } from "../lib/constants.js";
  import { getPlayerId, postBoard } from "../lib/leaderboard.svelte.js";
  import {
    clampRate,
    clampScore,
    computePassed,
    danFailed,
    danFailMessage,
    passAvgFor,
    passRateFor,
    passTotalFor,
    versionLabel
  } from "../lib/pass.js";
  import { medalRowHtml, passSummaryHtml } from "../lib/render.js";
  import {
    app,
    danState,
    effectiveDans,
    openModal,
    saveState,
    scheduleSaveState
  } from "../lib/stores.svelte.js";
  import { candyBurst } from "../lib/utils.js";

  let { dan, index } = $props();

  const st = untrack(() => danState(dan));
  const isRate = $derived(dan.criterion === "rate");
  let editingIndex = $state(null);
  const exclude = $derived(editingIndex != null ? editingIndex : undefined);
  const failed = $derived(danFailed(st, dan, exclude));
  const passLabel = $derived(
    dan.criterionLabel || (isRate ? "music rate" : dan.criterion === "avg" ? "平均分" : "总分数")
  );
  const danMode = $derived(
    (dan.mode && MODES[dan.mode])
      ? dan.mode
      : ((dan.songs[0] && MODES[dan.songs[0].mode]) ? dan.songs[0].mode : "normal")
  );

  let submitMsg = $state("");
  let submitClass = $state("");
  let submitting = $state(false);

  function allCleared() {
    return effectiveDans().every(function (d) { return danState(d).cleared; });
  }

  function afterClearedChange(wasCleared) {
    if (!wasCleared && st.cleared) {
      candyBurst(1);
      if (allCleared()) {
        setTimeout(function () { candyBurst(1.6); }, 500);
      }
    }
  }

  function onScoreInput(i, value) {
    if (isRate) st.rates[i] = value === "" ? null : clampRate(value);
    else st.scores[i] = value === "" ? null : clampScore(value);
    var wasCleared = st.cleared;
    st.cleared = computePassed(dan, st);
    st.clearedCriterion = st.cleared ? dan.criterion : null;
    scheduleSaveState();
    afterClearedChange(wasCleared);
  }

  function toggleFc(i) {
    st.fc[i] = !st.fc[i];
    var wasCleared = st.cleared;
    st.cleared = computePassed(dan, st);
    st.clearedCriterion = st.cleared ? dan.criterion : null;
    scheduleSaveState();
    afterClearedChange(wasCleared);
  }

  function chooseSong(i, choice) {
    if ((st.chosen[i] || 0) === choice) return;
    st.chosen[i] = choice;
    st.scores[i] = null;
    st.rates[i] = null;
    st.cleared = computePassed(dan, st);
    st.clearedCriterion = st.cleared ? dan.criterion : null;
    scheduleSaveState();
  }

  function retry() {
    for (var k = 0; k < dan.songs.length; k++) {
      st.scores[k] = null;
      st.rates[k] = null;
      st.fc[k] = false;
    }
    st.cleared = false;
    st.clearedCriterion = null;
    scheduleSaveState();
  }

  async function submit() {
    if (!st.cleared || submitting) return;
    if (!app.playerName) {
      openModal("login");
      return;
    }
    submitting = true;
    submitMsg = "提交中…";
    submitClass = "";
    var payload = {
      player: app.playerName,
      playerId: getPlayerId(),
      dan: dan.name,
      version: versionLabel(dan),
      mode: danMode,
      criterion: isRate ? "rate" : (dan.criterion === "avg" ? "avg" : "score"),
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
    try {
      await postBoard(payload);
      submitMsg = "已上榜 ✓";
      submitClass = "ok";
      candyBurst(1);
    } catch (e) {
      submitMsg = "排行榜服务未部署，提交未生效（部署后即可使用）";
      submitClass = "err";
    } finally {
      submitting = false;
    }
  }
</script>

<article class="dan-card" class:cleared={st.cleared} class:failed style="--dan-color: {dan.color}">
  <div class="card-head">
    <span class="rank-badge">{dan.lv != null ? "Lv." + dan.lv + " · " + dan.name : dan.name}</span>
    <span class="card-status">{st.cleared ? "已通过 ✓" : (failed ? "挑战失败" : "未通过")}</span>
  </div>

  <div class="criterion-row">
    <span class="criterion-label">过段方式</span>
    <span class="criterion-value">{passLabel}</span>
    <span class="mode-badge" data-mode={danMode}>{MODES[danMode]}</span>
  </div>

  {#if failed}
    <div class="fail-banner">
      ⚠️ {danFailMessage(dan, isRate)}
      <button type="button" class="btn btn-small" onclick={retry}>↻ 重开挑战</button>
    </div>
  {/if}

  <ul class="song-list">
    {#each dan.songs as slot, i (i)}
      <SongRow
        {dan}
        index={i}
        {st}
        editingIndex={editingIndex}
        oninput={onScoreInput}
        onfc={toggleFc}
        onchoose={chooseSong}
        onedit={(i2, on) => { editingIndex = on ? i2 : null; }}
      />
    {/each}
  </ul>

  <div class="pass-summary-wrap">{@html passSummaryHtml(dan, st)}</div>
  {@html medalRowHtml(dan, st)}

  {#if dan.note}
    <div class="dan-note">ℹ️ {dan.note}</div>
  {/if}

  <div class="submit-row">
    <button class="btn" disabled={!st.cleared || submitting} onclick={submit}>🏆 提交到排行榜</button>
    <span class="submit-msg {submitClass}">{submitMsg}</span>
  </div>
</article>

<style>
  .dan-card {
    position: relative;
    background: #FFFFFF;
    border: 1px solid #D9ECF9;
    border-left: 5px solid var(--dan-color);
    border-radius: var(--radius);
    padding: 16px 18px 14px;
    transition: box-shadow 0.25s ease, border-color 0.25s ease;
  }

  .dan-card.cleared {
    box-shadow: 0 0 26px color-mix(in srgb, var(--dan-color) 30%, transparent);
    border-color: color-mix(in srgb, var(--dan-color) 55%, transparent);
  }

  .card-status {
    font-size: 13px;
    padding: 3px 10px;
    border-radius: 999px;
    background: #E9F2FA;
    color: #5B7CA0;
  }

  .dan-card.cleared .card-status {
    background: color-mix(in srgb, var(--dan-color) 16%, #FFFFFF);
    color: var(--dan-color);
  }

  .song-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .criterion-value {
    font-size: 13px;
    font-weight: 600;
    color: #1B7FCF;
  }

  .mode-badge {
    flex: none;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid;
  }

  .mode-badge[data-mode="easy"]   { color: #1FA97E; border-color: #B9E8D6; background: #F0FBF6; }
  .mode-badge[data-mode="normal"] { color: #1B7FCF; border-color: #BBDCF5; background: #F1F8FE; }
  .mode-badge[data-mode="hard"]   { color: #E87F1E; border-color: #F4D3B0; background: #FEF7F0; }

  .dan-card.failed .card-head {
    border-color: #E56A7E;
  }

  .fail-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin: 10px 0 2px;
    padding: 10px 14px;
    border-radius: 10px;
    background: #FFF0F2;
    border: 1px solid #F2B8C2;
    color: #C0394F;
    font-size: 13px;
    font-weight: 600;
  }

  .btn-small {
    padding: 5px 12px;
    font-size: 12px;
    border-radius: 8px;
    flex: none;
  }

  .submit-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
    flex-wrap: wrap;
  }

  .submit-row .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .submit-msg {
    font-size: 12px;
    color: var(--muted);
  }

  .submit-msg.ok {
    color: #1FA97E;
    font-weight: 600;
  }

  .submit-msg.err {
    color: #D64B6B;
  }

  .dan-note {
    margin-top: 10px;
    padding: 8px 10px;
    background: #FFF8EC;
    border: 1px solid #F3DFB8;
    border-radius: 10px;
    font-size: 12px;
    line-height: 1.5;
    color: #8A6D2F;
  }
</style>
