<script>
  import { untrack } from "svelte";
  import { DIFF_LABEL } from "../lib/constants.js";
  import {
    danFailed,
    danFailMessage,
    fmtLevel,
    scoreMax,
    songGate,
    songLocked,
    songOrdinal,
    songValue
  } from "../lib/pass.js";
  import { closeModal, showNotice, slotSongs } from "../lib/stores.svelte.js";

  let { dan, index, st, editingIndex, oninput, onfc, onchoose, onedit } = $props();

  const opts = $derived(slotSongs(dan.songs[index]));
  const chosenIdx = $derived(Math.min(st.chosen[index] || 0, opts.length - 1));
  const song = $derived(opts[chosenIdx]);
  const isRate = $derived(dan.criterion === "rate");
  const editing = $derived(editingIndex === index);
  const exclude = $derived(editingIndex != null ? editingIndex : undefined);
  let rawVal = $state(untrack(() => isRate ? (st.rates[index] ?? "") : (st.scores[index] ?? "")));

  const locked = $derived(songLocked(st, dan, index, exclude));
  const revealed = $derived(!song.hidden || songValue(st, dan, index) != null || !locked);
  const below = $derived(
    songValue(st, dan, index) != null &&
    songGate(dan) != null &&
    songValue(st, dan, index) < songGate(dan)
  );
  const showFc = $derived(
    dan.needFc || dan.songMin != null || (dan.note && dan.note.indexOf("FC") >= 0)
  );

  function onScoreInput(ev) {
    rawVal = ev.currentTarget.value;
    oninput(index, rawVal);
  }

  function onBlur() {
    onedit(index, false);
    if (danFailed(st, dan)) {
      /* 先取文案再关闭：closeModal 会把 modal.dan 置空，活绑定 prop 随后会变 null */
      var msg = danFailMessage(dan, isRate);
      closeModal();
      showNotice("⚠️ " + msg);
    }
  }
</script>

<li class="song-row" class:locked class:below>
  {#if song.image && (!song.hidden || revealed)}
    <span class="song-thumb"><img src={song.image} alt="" decoding="async"></span>
  {:else}
    <span class="song-thumb empty">♪</span>
  {/if}

  <div class="song-info">
    <span class="song-title-line">
      <span class="song-ordinal">{songOrdinal(index, dan.songs.length)}</span>
      <span class="song-title">{song.hidden && !revealed ? "？？？" : song.title}</span>
    </span>
    <span class="song-badges">
      <span class="diff-badge" data-diff={DIFF_LABEL[song.diff] ? song.diff : "bsc"}>{DIFF_LABEL[song.diff] || DIFF_LABEL.bsc}</span>
      <span class="song-level">Lv.{fmtLevel(song.level)}</span>
    </span>
    {#if opts.length > 1}
      <span class="choice-chips" role="group" aria-label="该位置选曲">
        {#each opts as _, j (j)}
          <button
            type="button"
            class="choice-chip"
            class:active={j === chosenIdx}
            disabled={locked}
            title={"选择第 " + (j + 1) + " 首"}
            onclick={() => onchoose(index, j)}
          >{j + 1}</button>
        {/each}
      </span>
    {/if}
    {#if song.hidden && !revealed}
      <span class="hidden-mask" aria-hidden="true">
        <span class="hidden-icon">🔒</span><span class="hidden-text">？？？</span>
      </span>
    {/if}
  </div>

  <label class="score-field">
    {#if isRate}
      <input
        class="score-input"
        type="number"
        min="0"
        max="100"
        step="0.01"
        inputmode="decimal"
        placeholder={dan.criterionLabel ? "Perfect %" : "Rate %"}
        disabled={locked}
        value={editing ? rawVal : (st.rates[index] ?? "")}
        onfocus={() => onedit(index, true)}
        oninput={onScoreInput}
        onblur={onBlur}
      >
    {:else}
      <input
        class="score-input"
        type="number"
        min="0"
        max={scoreMax()}
        step="1"
        inputmode="numeric"
        placeholder="分数"
        disabled={locked}
        value={editing ? rawVal : (st.scores[index] ?? "")}
        onfocus={() => onedit(index, true)}
        oninput={onScoreInput}
        onblur={onBlur}
      >
    {/if}
    <span class="score-unit">{isRate ? "%" : "分"}</span>
  </label>

  {#if showFc}
    <button
      type="button"
      class="fc-toggle"
      class:on={st.fc[index]}
      disabled={locked}
      title="本曲 FULL COMBO"
      aria-pressed={st.fc[index] ? "true" : "false"}
      onclick={() => onfc(index)}
    >FC</button>
  {/if}
</li>

<style>
  .choice-chips {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: 6px;
  }

  .choice-chip {
    min-width: 24px;
    height: 22px;
    padding: 0 7px;
    border-radius: 999px;
    border: 1px solid #C9E4F7;
    background: #FFFFFF;
    color: #5B7CA0;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s ease;
  }

  .choice-chip:hover {
    border-color: var(--cyan);
    color: #1B7FCF;
  }

  .choice-chip.active {
    background: linear-gradient(180deg, #2FA8F0, #3B82F6);
    color: #FFFFFF;
    border-color: transparent;
  }

  .hidden-mask {
    position: absolute;
    inset: -9px -12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: rgba(246, 250, 255, 0.55);
    -webkit-backdrop-filter: blur(7px);
    backdrop-filter: blur(7px);
    border-radius: 10px;
    z-index: 2;
    pointer-events: none;
    user-select: none;
  }

  .hidden-icon {
    font-size: 16px;
    filter: blur(0.4px);
  }

  .hidden-text {
    font-size: 13px;
    font-weight: 700;
    color: #7C93AB;
    letter-spacing: 2px;
  }

  .song-row.locked {
    opacity: 0.62;
    border-style: dashed;
    border-color: #C9D9E6;
  }

  .song-row.locked .score-input {
    cursor: not-allowed;
  }

  .song-row.below {
    border-color: #F0A0B0;
    background: #FFF4F6;
  }

  .fc-toggle {
    flex: none;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 9px;
    border-radius: 999px;
    border: 1px solid #B9CDE0;
    background: #F2F7FB;
    color: #7C93AB;
    cursor: pointer;
    transition: background .15s, color .15s, border-color .15s;
  }

  .fc-toggle:hover { border-color: #7FB5D8; }

  .fc-toggle.on {
    background: #E3F6EC;
    border-color: #4FBE8A;
    color: #148F5C;
  }
</style>
