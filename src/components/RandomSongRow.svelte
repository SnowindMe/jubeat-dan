<script>
  import { untrack } from "svelte";
  import { DIFF_LABEL, MODES } from "../lib/constants.js";
  import { fmtLevel, scoreMax, songOrdinal } from "../lib/pass.js";

  let { index, c, oninput, onmode } = $props();

  const isRate = $derived(c.criterion === "rate");
  const song = $derived(c.songs[index]);
  const mode = $derived(c.modes[index] || "normal");
  let editing = $state(false);
  let rawVal = $state(untrack(() => isRate ? (c.rates[index] ?? "") : (c.scores[index] ?? "")));

  function onScoreInput(ev) {
    rawVal = ev.currentTarget.value;
    oninput(index, rawVal);
  }
</script>

<li class="song-row">
  {#if song.image}
    <span class="song-thumb"><img src={song.image} alt="" decoding="async" loading="lazy"></span>
  {:else}
    <span class="song-thumb empty">♪</span>
  {/if}

  <div class="song-info">
    <span class="song-title-line">
      <span class="song-ordinal">{songOrdinal(index, c.songs.length)}</span>
      <span class="song-title">{song.title}</span>
    </span>
    <span class="song-badges">
      <span class="diff-badge" data-diff={DIFF_LABEL[song.diff] ? song.diff : "bsc"}>{DIFF_LABEL[song.diff] || DIFF_LABEL.bsc}</span>
      <span class="song-level">Lv.{fmtLevel(song.level)}</span>
      <select
        class="song-mode"
        aria-label="歌曲模式"
        value={mode}
        onchange={(e) => onmode(index, e.currentTarget.value)}
      >
        {#each Object.keys(MODES) as m (m)}
          <option value={m}>{MODES[m]}</option>
        {/each}
      </select>
    </span>
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
        placeholder="Rate %"
        value={editing ? rawVal : (c.rates[index] ?? "")}
        onfocus={() => { editing = true; }}
        oninput={onScoreInput}
        onblur={() => { editing = false; }}
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
        value={editing ? rawVal : (c.scores[index] ?? "")}
        onfocus={() => { editing = true; }}
        oninput={onScoreInput}
        onblur={() => { editing = false; }}
      >
    {/if}
    <span class="score-unit">{isRate ? "%" : "分"}</span>
  </label>
</li>

<style>
  .song-mode {
    flex: none;
    width: 88px;
    border: 1px solid #C9E4F7;
    border-radius: 8px;
    background: #FFFFFF;
    color: #1B7FCF;
    font-size: 12px;
    font-weight: 700;
    padding: 6px 4px;
    cursor: pointer;
    font-family: inherit;
    transition: border-color 0.15s ease;
  }

  .song-mode:focus {
    outline: none;
    border-color: var(--cyan);
    box-shadow: 0 0 0 3px rgba(47, 168, 240, 0.15);
  }
</style>
