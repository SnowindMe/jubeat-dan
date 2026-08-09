<script>
  import { onMount } from "svelte";
  import { MODES } from "../lib/constants.js";
  import { boardState, fetchBoard } from "../lib/leaderboard.svelte.js";
  import { versionLabel } from "../lib/pass.js";
  import { app, effectiveDans } from "../lib/stores.svelte.js";

  const dans = effectiveDans();

  if (!dans.some(function (d) {
    return d.name === boardState.dan && versionLabel(d) === boardState.version;
  })) {
    var first = dans[0];
    boardState.dan = first.name;
    boardState.version = versionLabel(first);
  }

  const selIndex = $derived(dans.findIndex(function (d) {
    return d.name === boardState.dan && versionLabel(d) === boardState.version;
  }));
  const isRate = $derived(boardState.criterion === "rate");

  let entries = $state([]);
  let loading = $state(true);
  let note = $state("");

  function mockBoardEntries() {
    var values = isRate ? [92.5, 90.1, 88.7] : [2650000, 2512000, 2400000];
    var names = ["演示·小明", "演示·小红", "演示·阿伟"];
    var dates = ["2026-08-01", "2026-07-30", "2026-07-28"];
    return values.map(function (v, i) {
      return { rank: i + 1, player: names[i], value: v, achieved_at: dates[i] };
    });
  }

  async function load() {
    loading = true;
    note = "";
    try {
      var data = await fetchBoard();
      entries = data.board || [];
    } catch (e) {
      note = "排行榜服务未连接（需部署 Cloudflare Pages Functions），以下为本地演示数据。";
      entries = mockBoardEntries();
    } finally {
      loading = false;
    }
  }

  onMount(load);

  function onDanChange(ev) {
    var idx = Number(ev.currentTarget.value);
    var target = dans[idx];
    if (!target) return;
    boardState.dan = target.name;
    boardState.version = versionLabel(target);
    /* 跟随所选段位的过段方式，默认展示对应榜单 */
    boardState.criterion = target.criterion === "rate" ? "rate" : (target.criterion === "avg" ? "avg" : "score");
    load();
  }
</script>

<div class="board-card">
  <div class="card-head">
    <span class="rank-badge">🏆 排行榜</span>
    <span class="board-player-now">{app.playerName ? "当前玩家：" + app.playerName : ""}</span>
  </div>

  <div class="board-controls">
    <label class="board-field">段位
      <select value={selIndex} onchange={onDanChange}>
        {#each dans as d, i (i)}
          <option value={i}>{versionLabel(d) + " · " + d.name}</option>
        {/each}
      </select>
    </label>
    <label class="board-field">模式
      <select value={boardState.mode} onchange={(e) => { boardState.mode = e.currentTarget.value; load(); }}>
        {#each Object.keys(MODES) as m (m)}
          <option value={m}>{MODES[m]}</option>
        {/each}
      </select>
    </label>
    <label class="board-field">排名依据
      <select value={boardState.criterion} onchange={(e) => { boardState.criterion = e.currentTarget.value; load(); }}>
        <option value="score">总分数</option>
        <option value="avg">平均分</option>
        <option value="rate">music rate</option>
      </select>
    </label>
    <button class="btn primary" onclick={load}>刷新</button>
  </div>

  <div class="board-body">
    {#if loading}
      <div class="board-loading">加载中…</div>
    {:else if !entries.length}
      <div class="board-empty">暂无上榜记录，去通过段位并提交成绩吧</div>
    {:else}
      {#each entries as e (e.rank)}
        <div class="board-row" class:top={e.rank <= 3}>
          <span class="board-rank">
            {#if e.rank === 1}🥇 {:else if e.rank === 2}🥈 {:else if e.rank === 3}🥉 {/if}{e.rank}
          </span>
          <span class="board-player">{e.player}</span>
          <span class="board-value">{isRate ? Number(e.value).toFixed(2) + "%" : Number(e.value).toLocaleString()}</span>
          <span class="board-date">{String(e.achieved_at || "").slice(0, 10)}</span>
        </div>
      {/each}
    {/if}
  </div>

  <div class="board-note">{note}</div>
</div>
