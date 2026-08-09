<script>
  import { untrack } from "svelte";
  import EditorSongRow from "./EditorSongRow.svelte";
  import { MODES } from "../../lib/constants.js";
  import {
    app,
    saveCustomData,
    scheduleCustomSave,
    slotSongs
  } from "../../lib/stores.svelte.js";

  let { dan, idx } = $props();

  const danMode = $derived(
    (dan.mode && MODES[dan.mode])
      ? dan.mode
      : ((dan.songs[0] && MODES[dan.songs[0].mode]) ? dan.songs[0].mode : "normal")
  );
  const isRateCriterion = $derived(dan.criterion === "rate");
  const isAvgCriterion = $derived(dan.criterion === "avg");
  const medalBasis = $derived(
    dan.medalBasis || (dan.criterion === "rate" ? "rate" : dan.criterion === "avg" ? "avg" : "total")
  );

  /* 数字/路径类输入保留原始文本，避免输入过程中被钳制回写 */
  const initDan = untrack(() => dan);
  let passTotalRaw = $state(initDan.passTotal != null ? String(initDan.passTotal) : "");
  let passAvgRaw = $state(initDan.passAvg != null ? String(initDan.passAvg) : "");
  let passRateRaw = $state(initDan.passRate != null ? String(initDan.passRate) : "");
  let medalGoldRaw = $state(initDan.medals && initDan.medals.gold != null ? String(initDan.medals.gold) : "");
  let medalSilverRaw = $state(initDan.medals && initDan.medals.silver != null ? String(initDan.medals.silver) : "");
  let medalBronzeRaw = $state(initDan.medals && initDan.medals.bronze != null ? String(initDan.medals.bronze) : "");
  let unlockRaw = $state(initDan.unlockCode || "");

  function onPassTotalInput(ev) {
    passTotalRaw = ev.currentTarget.value;
    if (passTotalRaw === "") {
      delete dan.passTotal;
    } else {
      dan.passTotal = Math.max(0, Number(passTotalRaw));
    }
    scheduleCustomSave();
  }
  function onPassTotalBlur() {
    passTotalRaw = dan.passTotal != null ? String(dan.passTotal) : "";
  }

  function onPassAvgInput(ev) {
    passAvgRaw = ev.currentTarget.value;
    if (passAvgRaw === "") {
      delete dan.passAvg;
    } else {
      dan.passAvg = Math.min(1000000, Math.max(0, Number(passAvgRaw)));
    }
    scheduleCustomSave();
  }
  function onPassAvgBlur() {
    passAvgRaw = dan.passAvg != null ? String(dan.passAvg) : "";
  }

  function onPassRateInput(ev) {
    passRateRaw = ev.currentTarget.value;
    if (passRateRaw === "") {
      delete dan.passRate;
    } else {
      dan.passRate = Math.min(100, Math.max(0, Number(passRateRaw)));
    }
    scheduleCustomSave();
  }
  function onPassRateBlur() {
    passRateRaw = dan.passRate != null ? String(dan.passRate) : "";
  }

  function onMedalInput(key, rawSetter, ev) {
    rawSetter(ev.currentTarget.value);
    var v = parseFloat(ev.currentTarget.value);
    if (isNaN(v)) {
      if (dan.medals) delete dan.medals[key];
      if (dan.medals && !Object.keys(dan.medals).length) delete dan.medals;
    } else {
      if (!dan.medals) dan.medals = {};
      dan.medals[key] = v;
    }
    scheduleCustomSave();
  }
  function medalRawFor(key) {
    return dan.medals && dan.medals[key] != null ? String(dan.medals[key]) : "";
  }

  function onUnlockInput(ev) {
    unlockRaw = ev.currentTarget.value;
    dan.unlockCode = ev.currentTarget.value.trim();
    scheduleCustomSave();
  }
  function onUnlockBlur() {
    unlockRaw = dan.unlockCode || "";
  }

  function setCriterion(cr) {
    dan.criterion = cr;
    saveCustomData();
  }

  function move(act) {
    var t;
    if (act === "up" && idx > 0) {
      t = app.customDans[idx - 1];
      app.customDans[idx - 1] = app.customDans[idx];
      app.customDans[idx] = t;
      if (app.editorSelected === idx) app.editorSelected = idx - 1;
      else if (app.editorSelected === idx - 1) app.editorSelected = idx;
    } else if (act === "down" && idx < app.customDans.length - 1) {
      t = app.customDans[idx + 1];
      app.customDans[idx + 1] = app.customDans[idx];
      app.customDans[idx] = t;
      if (app.editorSelected === idx) app.editorSelected = idx + 1;
      else if (app.editorSelected === idx + 1) app.editorSelected = idx;
    } else if (act === "del") {
      if (!confirm("删除段位「" + dan.name + "」？")) return;
      app.customDans.splice(idx, 1);
      if (idx < app.editorSelected) app.editorSelected--;
      else if (app.editorSelected >= app.customDans.length) app.editorSelected = Math.max(0, app.customDans.length - 1);
    }
    saveCustomData();
  }

  function addChoice(si) {
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
  }

  function addSong() {
    dan.songs.push({ title: "", diff: "adv", hidden: false, level: 8 });
    saveCustomData();
  }
</script>

<div class="editor-dan" style="--dan-color: {dan.color}">
  <div class="editor-dan-head">
    <div class="ed-head-row1">
      <input class="ed-name" aria-label="段位名" bind:value={dan.name} oninput={scheduleCustomSave}>
      <input
        class="ed-version"
        placeholder="版本（如 festo / jubeat prop）"
        aria-label="jubeat 版本"
        bind:value={dan.version}
        oninput={scheduleCustomSave}
      >
      <label class="ed-field ed-mode-dan-wrap" title="挑战模式（用于排行榜分组）">
        <span class="ed-field-label">挑战模式</span>
        <select class="ed-mode-dan" value={danMode} onchange={(e) => { dan.mode = e.currentTarget.value; scheduleCustomSave(); }}>
          {#each Object.keys(MODES) as m (m)}
            <option value={m}>{MODES[m]}</option>
          {/each}
        </select>
      </label>
      <label class="ed-color-wrap" title="主题色">
        <input type="color" class="ed-color" bind:value={dan.color} oninput={scheduleCustomSave}>
      </label>
      <button class="icon-btn" title="上移" onclick={() => move("up")}>↑</button>
      <button class="icon-btn" title="下移" onclick={() => move("down")}>↓</button>
      <button class="icon-btn danger" title="删除该段位" onclick={() => move("del")}>×</button>
    </div>

    <div class="ed-head-row2">
      <span class="criterion-label">过段</span>
      <div class="criterion-toggle">
        <button type="button" class="cchip" class:active={dan.criterion === "score"} onclick={() => setCriterion("score")}>总分数</button>
        <button type="button" class="cchip" class:active={dan.criterion === "avg"} onclick={() => setCriterion("avg")}>平均分</button>
        <button type="button" class="cchip" class:active={dan.criterion === "rate"} onclick={() => setCriterion("rate")}>music rate</button>
      </div>
      {#if !isRateCriterion && !isAvgCriterion}
        <label class="ed-field" title="总分达标线（留空按每首 700,000 分自动换算）">
          <span class="ed-field-label">总分线</span>
          <input
            class="ed-pass-total"
            type="number"
            min="0"
            step="10000"
            placeholder="留空=自动"
            value={passTotalRaw}
            oninput={onPassTotalInput}
            onblur={onPassTotalBlur}
          >
        </label>
      {/if}
      {#if isAvgCriterion}
        <label class="ed-field" title="平均分达标线（留空按每首 700,000 分自动换算）">
          <span class="ed-field-label">平均分线</span>
          <input
            class="ed-pass-avg"
            type="number"
            min="0"
            max="1000000"
            step="1000"
            placeholder="留空=自动"
            value={passAvgRaw}
            oninput={onPassAvgInput}
            onblur={onPassAvgBlur}
          >
        </label>
      {/if}
      {#if isRateCriterion}
        <label class="ed-field" title="Rate 达标线（留空用默认 85%）">
          <span class="ed-field-label">Rate线</span>
          <input
            class="ed-pass-rate"
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="留空=默认"
            value={passRateRaw}
            oninput={onPassRateInput}
            onblur={onPassRateBlur}
          >
        </label>
      {/if}
    </div>

    <div class="ed-head-row3">
      <span class="criterion-label">奖牌</span>
      <label class="ed-field" title="奖牌线按哪种数值判定">
        <span class="ed-field-label">按</span>
        <select class="ed-medal-basis" value={medalBasis} onchange={(e) => { dan.medalBasis = e.currentTarget.value; scheduleCustomSave(); }}>
          <option value="total">总分数</option>
          <option value="avg">平均分</option>
          <option value="rate">music rate</option>
        </select>
      </label>
      <label class="ed-field" title="金奖牌线（按所选依据的数值，留空不设）">
        <span class="ed-field-label">金线</span>
        <input
          class="ed-medal"
          data-medal="gold"
          type="number"
          min="0"
          step="any"
          placeholder="不设"
          value={medalGoldRaw}
          oninput={(e) => onMedalInput("gold", (v) => { medalGoldRaw = v; }, e)}
          onblur={() => { medalGoldRaw = medalRawFor("gold"); }}
        >
      </label>
      <label class="ed-field" title="银奖牌线（按所选依据的数值，留空不设）">
        <span class="ed-field-label">银线</span>
        <input
          class="ed-medal"
          data-medal="silver"
          type="number"
          min="0"
          step="any"
          placeholder="不设"
          value={medalSilverRaw}
          oninput={(e) => onMedalInput("silver", (v) => { medalSilverRaw = v; }, e)}
          onblur={() => { medalSilverRaw = medalRawFor("silver"); }}
        >
      </label>
      <label class="ed-field" title="铜奖牌线（按所选依据的数值，留空不设）">
        <span class="ed-field-label">铜线</span>
        <input
          class="ed-medal"
          data-medal="bronze"
          type="number"
          min="0"
          step="any"
          placeholder="不设"
          value={medalBronzeRaw}
          oninput={(e) => onMedalInput("bronze", (v) => { medalBronzeRaw = v; }, e)}
          onblur={() => { medalBronzeRaw = medalRawFor("bronze"); }}
        >
      </label>
    </div>

    <div class="ed-head-row4">
      <label class="ed-field ed-hidden-dan" title="勾选后该段位在主页显示为锁定状态，需输入解锁码才能进入">
        <input
          type="checkbox"
          class="ed-hidden-dan-check"
          checked={dan.hidden}
          onchange={(e) => {
            dan.hidden = e.currentTarget.checked;
            if (!dan.hidden) delete dan.unlockCode;
            scheduleCustomSave();
          }}
        >
        <span>隐藏段位（需解锁码解锁）</span>
      </label>
      {#if dan.hidden}
        <label class="ed-field ed-unlock-code-wrap">
          <span class="ed-field-label">解锁码</span>
          <input
            class="ed-unlock-code"
            type="text"
            maxlength="40"
            placeholder="解锁码"
            value={unlockRaw}
            oninput={onUnlockInput}
            onblur={onUnlockBlur}
          >
        </label>
      {/if}
    </div>
  </div>

  <div class="editor-songs">
    {#each dan.songs as slot, si (si)}
      {#each slotSongs(slot) as _, sj (sj)}
        <EditorSongRow {dan} slotIndex={si} songIndex={sj} {slot} />
      {/each}
      {#if slotSongs(slot).length < 4}
        <button type="button" class="btn ed-add-choice" onclick={() => addChoice(si)}>+ 该位置添加可选曲</button>
      {/if}
    {/each}
  </div>

  <button type="button" class="btn ed-add-song" onclick={addSong}>+ 添加曲目</button>
</div>

<style>
  .editor-dan {
    background: #F5FBFF;
    border: 1px solid #DCEFFB;
    border-left: 4px solid var(--dan-color);
    border-radius: 12px;
    padding: 10px 12px;
  }

  .editor-dan-head {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 6px;
    margin: -10px -12px 8px;
    padding: 10px 12px 8px;
    background: linear-gradient(180deg, #F5FBFF 0%, #F5FBFF 85%, rgba(245, 251, 255, 0.9));
    border-bottom: 1px solid rgba(220, 239, 251, 0.85);
  }

  .editor-songs {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .ed-head-row1, .ed-head-row2, .ed-head-row3, .ed-head-row4 {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    width: 100%;
  }

  .ed-head-row2, .ed-head-row3, .ed-head-row4 {
    align-items: flex-end;
    gap: 8px 14px;
  }

  .ed-head-row2 .ed-field, .ed-head-row3 .ed-field, .ed-head-row4 .ed-field {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .ed-mode-dan-wrap select {
    min-width: 92px;
  }

  .ed-medal-basis {
    min-width: 96px;
  }

  .ed-name {
    flex: 1;
    min-width: 0;
    background: #FFFFFF;
    border: 1px solid #C9E4F7;
    border-radius: 8px;
    padding: 6px 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    font-family: inherit;
  }

  .ed-name:focus {
    outline: none;
    border-color: var(--cyan);
    box-shadow: 0 0 0 3px rgba(47, 168, 240, 0.15);
  }

  .ed-version {
    flex: none;
    width: 200px;
    min-width: 0;
    background: #FFFFFF;
    border: 1px solid #C9E4F7;
    border-radius: 8px;
    padding: 6px 8px;
    font-size: 13px;
    color: var(--text);
    font-family: inherit;
  }

  .ed-version:focus {
    outline: none;
    border-color: var(--cyan);
    box-shadow: 0 0 0 3px rgba(47, 168, 240, 0.15);
  }

  .ed-color-wrap {
    flex: none;
    display: grid;
    place-items: center;
  }

  .ed-color {
    width: 34px;
    height: 28px;
    border: 1px solid #C9E4F7;
    border-radius: 7px;
    background: #FFFFFF;
    padding: 2px;
    cursor: pointer;
  }

  .ed-pass-total, .ed-pass-rate, .ed-medal {
    width: 82px;
    border: 1px solid #C9E4F7;
    border-radius: 8px;
    background: #FFFFFF;
    padding: 5px 6px;
    font-size: 12px;
    color: var(--text);
    font-family: inherit;
  }

  .ed-pass-total:focus, .ed-pass-rate:focus, .ed-medal:focus {
    outline: none;
    border-color: var(--cyan);
    box-shadow: 0 0 0 3px rgba(47, 168, 240, 0.15);
  }

  .ed-hidden-dan {
    cursor: pointer;
    user-select: none;
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }

  .ed-hidden-dan input {
    accent-color: var(--cyan);
    width: 16px;
    height: 16px;
  }

  .ed-unlock-code-wrap input {
    border: 1px solid #C9E4F7;
    border-radius: 8px;
    padding: 5px 8px;
    font: inherit;
    color: var(--text);
    min-width: 120px;
    background: #FFFFFF;
  }

  .ed-unlock-code-wrap input:focus {
    outline: none;
    border-color: var(--cyan);
    box-shadow: 0 0 0 3px rgba(47, 168, 240, 0.18);
  }

  .ed-add-song {
    margin-top: 8px;
    padding: 5px 10px;
    font-size: 12px;
  }

  .ed-add-choice {
    align-self: flex-start;
    margin: 0 0 2px 30px;
    padding: 4px 10px;
    font-size: 12px;
    border-style: dashed;
    color: #8A6A00;
    border-color: #E8D9A8;
    background: #FFFDF5;
  }

  .ed-add-choice:hover {
    border-color: #D9B84D;
    color: #7A5C00;
  }
</style>
