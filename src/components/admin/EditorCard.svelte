<script>
  import EditorDan from "./EditorDan.svelte";
  import { paletteColor, versionLabel } from "../../lib/pass.js";
  import {
    app,
    closeModal,
    defaultState,
    ensureCustom,
    saveCustomData,
    saveState,
    seedProgress
  } from "../../lib/stores.svelte.js";

  ensureCustom();

  if (app.editorSelected >= app.customDans.length) {
    app.editorSelected = Math.max(0, app.customDans.length - 1);
  }
  if (app.customDans.length) {
    app.versionOpen[versionLabel(app.customDans[app.editorSelected])] = true;
  }

  const groups = $derived.by(function () {
    var map = new Map();
    app.customDans.forEach(function (dan, idx) {
      var v = versionLabel(dan);
      if (!map.has(v)) map.set(v, []);
      map.get(v).push({ dan: dan, idx: idx });
    });
    return [...map.entries()].map(function (entry) {
      return { version: entry[0], items: entry[1] };
    });
  });

  function addDan() {
    app.customDans.push({
      id: "custom-" + Date.now(),
      name: "新段位" + (app.customDans.length + 1),
      version: app.customDans[app.editorSelected] ? (app.customDans[app.editorSelected].version || "") : "",
      color: paletteColor(app.customDans.length),
      criterion: "score",
      songs: [
        { title: "", diff: "adv", hidden: false, level: 8 },
        { title: "", diff: "adv", hidden: false, level: 8 },
        { title: "", diff: "adv", hidden: false, level: 8 }
      ]
    });
    app.editorSelected = app.customDans.length - 1;
    saveCustomData();
  }

  function resetData() {
    if (!confirm("恢复为 data.json 的默认段位数据？当前自定义修改和挑战进度将被清除。")) return;
    app.customDans = null;
    app.editorSelected = 0;
    app.progress = defaultState();
    saveState();
    saveCustomData();
    seedProgress();
    closeModal();
  }
</script>

<div class="editor">
  <div class="editor-head">
    <span class="rank-badge">自定义段位管理</span>
    <span class="editor-hint">修改实时保存到本机；「导出存档」可带走自定义段位数据</span>
  </div>

  <div class="editor-body">
    <div class="editor-sidebar">
      {#each groups as g (g.version)}
        <div class="editor-group" class:open={!!app.versionOpen[g.version]}>
          <button
            type="button"
            class="editor-group-head"
            aria-expanded={!!app.versionOpen[g.version]}
            onclick={() => { app.versionOpen[g.version] = !app.versionOpen[g.version]; }}
          >
            <span class="editor-group-name">{g.version}</span>
            <span class="editor-group-meta">{g.items.length} 个</span>
            <span class="version-chevron" aria-hidden="true">▾</span>
          </button>
          <div class="editor-group-body">
            {#each g.items as it (it.dan.id || it.idx)}
              <button
                type="button"
                class="editor-tab"
                class:active={app.editorSelected === it.idx}
                style="--dan-color: {it.dan.color}"
                onclick={() => { app.editorSelected = it.idx; }}
              >
                <span class="editor-tab-dot"></span>
                <span class="editor-tab-name">{it.dan.hidden ? "🔒 " : ""}{it.dan.name}</span>
              </button>
            {/each}
          </div>
        </div>
      {/each}

      <button type="button" class="btn ed-add-dan" onclick={addDan}>+ 添加段位</button>
      <button type="button" class="btn danger ed-reset-dan" onclick={resetData}>恢复默认数据</button>
    </div>

    <div class="editor-panel">
      {#if app.customDans.length}
        {#key app.editorSelected}
          <EditorDan dan={app.customDans[app.editorSelected]} idx={app.editorSelected} />
        {/key}
      {:else}
        <div class="editor-empty">暂无段位，点击左侧「+ 添加段位」</div>
      {/if}
    </div>
  </div>
</div>

<style>
  .editor-head {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 12px;
  }

  .editor-head .rank-badge { color: #1E9BE0; }

  .editor-hint {
    font-size: 12px;
    color: var(--muted);
  }

  .editor-body {
    display: grid;
    grid-template-columns: 176px 1fr;
    gap: 12px;
  }

  .editor-sidebar {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 56vh;
    overflow-y: auto;
    padding-right: 2px;
  }

  .editor-tab {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    text-align: left;
    padding: 9px 10px;
    border-radius: 10px;
    border: 1px solid #D7EBFA;
    background: #FFFFFF;
    color: var(--text);
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.15s ease;
  }

  .editor-tab:hover {
    border-color: var(--cyan);
    color: #1B7FCF;
  }

  .editor-tab.active {
    background: linear-gradient(180deg, #2FA8F0, #3B82F6);
    color: #FFFFFF;
    border-color: transparent;
    box-shadow: 0 6px 14px rgba(47, 168, 240, 0.30);
  }

  .editor-tab-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--dan-color);
    flex: none;
  }

  .editor-tab.active .editor-tab-dot {
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.35);
  }

  .editor-tab-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .editor-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .editor-group-head {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #CBE7F5;
    border-radius: 10px;
    background: #F2FAFF;
    color: #5B7CA0;
    font-family: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: border-color 0.15s ease;
  }

  .editor-group-head:hover {
    border-color: #8FD0F7;
  }

  .editor-group-name {
    flex: 1;
    min-width: 0;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .editor-group-meta {
    font-weight: 600;
    color: var(--muted);
  }

  .version-chevron {
    margin-left: auto;
    font-size: 13px;
    color: var(--muted);
    transition: transform 0.2s ease;
  }

  .editor-group.open .editor-group-head .version-chevron {
    transform: rotate(180deg);
  }

  .editor-group-body {
    display: none;
    flex-direction: column;
    gap: 6px;
  }

  .editor-group.open .editor-group-body {
    display: flex;
  }

  .ed-add-dan, .ed-reset-dan {
    margin-top: 4px;
    font-size: 12px;
    padding: 8px 10px;
  }

  .editor-panel {
    min-width: 0;
    min-height: 220px;
  }

  .editor-empty {
    padding: 34px 16px;
    text-align: center;
    color: var(--muted);
    border: 1px dashed #C9E4F7;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.5);
  }

  @media (max-width: 640px) {
    .editor-body { grid-template-columns: 1fr; }
    .editor-sidebar {
      flex-direction: row;
      overflow-x: auto;
      max-height: none;
      padding-bottom: 4px;
    }
    .editor-group { flex: none; }
    .editor-tab { flex: none; width: auto; }
    .ed-add-dan, .ed-reset-dan { margin-top: 0; }
  }
</style>
