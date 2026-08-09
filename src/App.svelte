<script>
  import DanCard from "./components/DanCard.svelte";
  import Decorations from "./components/Decorations.svelte";
  import ImportConfirm from "./components/ImportConfirm.svelte";
  import LeaderboardCard from "./components/LeaderboardCard.svelte";
  import LoginCard from "./components/LoginCard.svelte";
  import Modal from "./components/Modal.svelte";
  import Notice from "./components/Notice.svelte";
  import RandomCard from "./components/RandomCard.svelte";
  import RandomFolderCard from "./components/RandomFolderCard.svelte";
  import UnlockCard from "./components/UnlockCard.svelte";
  import VersionCard from "./components/VersionCard.svelte";
  import VersionDetail from "./components/VersionDetail.svelte";
  import { exportData, importData, resetAll } from "./lib/importexport.js";
  import { versionLabel } from "./lib/pass.js";
  import {
    app,
    danState,
    effectiveDans,
    modal,
    openModal,
    pruneStateKeys,
    readDanState,
    saveCustomData,
    seedProgress
  } from "./lib/stores.svelte.js";

  let settingsOpen = $state(false);

  $effect(function () {
    effectiveDans();
    effectiveDans().forEach(function (d) { danState(d); });
    pruneStateKeys();
  });

  $effect(function () {
    if (!settingsOpen) return;
    function onDoc() { settingsOpen = false; }
    function onKey(ev) {
      if (ev.key === "Escape" && !modal.mode) settingsOpen = false;
    }
    window.addEventListener("click", onDoc);
    window.addEventListener("keydown", onKey);
    return function () {
      window.removeEventListener("click", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  });

  const groups = $derived.by(function () {
    var map = new Map();
    effectiveDans().forEach(function (dan, index) {
      var v = versionLabel(dan);
      if (!map.has(v)) map.set(v, { version: v, dans: [] });
      map.get(v).dans.push({ dan: dan, index: index });
    });
    var out = [];
    for (var g of map.values()) {
      var visible = g.dans.filter(function (it) {
        var st = readDanState(it.dan);
        return app.filter === "all" ||
          (app.filter === "cleared" && st.cleared) ||
          (app.filter === "pending" && !st.cleared);
      });
      if (!visible.length) continue;
      var cleared = g.dans.filter(function (it) { return readDanState(it.dan).cleared; }).length;
      out.push({ version: g.version, dans: g.dans, cleared: cleared });
    }
    return out;
  });

  function onImportChange(ev) {
    if (ev.currentTarget.files && ev.currentTarget.files[0]) {
      importData(ev.currentTarget.files[0]);
    }
    ev.currentTarget.value = "";
  }

  function useDefaultData() {
    if (!window.confirm("将清除本地自定义段位数据并恢复 data.json 的默认数据，确定？")) return;
    app.customDans = null;
    saveCustomData();
    seedProgress();
  }
</script>

<Decorations />

<header class="hero">
  <div class="grid-bg" aria-hidden="true">
    {#each Array(16) as _, i (i)}<i></i>{/each}
  </div>
  <div class="hero-inner">
    <div class="logo">
      <img class="logo-img" src="assets/jubeat-icon.png" alt="jubeat">
      <div class="logo-text">
        <h1>段位挑战</h1>
        <p class="subtitle">jubeat 音乐魔方 · 段位认定进度追踪</p>
      </div>
    </div>
  </div>
</header>

<main class="container">
  <div class="toolbar">
    <div class="filters" role="tablist" aria-label="筛选">
      <button class="chip" class:active={app.filter === "all"} onclick={() => { app.filter = "all"; }}>全部</button>
      <button class="chip" class:active={app.filter === "cleared"} onclick={() => { app.filter = "cleared"; }}>已通过</button>
      <button class="chip" class:active={app.filter === "pending"} onclick={() => { app.filter = "pending"; }}>未通过</button>
    </div>
    <div class="actions">
      <button class="btn" id="boardBtn" title="查看排行榜" onclick={() => openModal("leaderboard")}>🏆 排行榜</button>
      <button class="btn" id="loginBtn" title="设置玩家昵称" onclick={() => openModal("login")}>{app.playerName ? "👤 " + app.playerName : "👤 登录"}</button>
      <div class="dropdown" class:open={settingsOpen}>
        <button
          class="btn"
          id="settingsBtn"
          type="button"
          aria-haspopup="true"
          aria-expanded={settingsOpen}
          onclick={(ev) => { ev.stopPropagation(); settingsOpen = !settingsOpen; }}
        >⚙️ 设置</button>
        {#if settingsOpen}
          <!-- svelte-ignore a11y_interactive_supports_focus -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <div class="dropdown-menu" role="menu" onclick={(ev) => { if (ev.target.closest && ev.target.closest(".dropdown-item")) settingsOpen = false; }}>
            <button type="button" class="dropdown-item" role="menuitem" onclick={exportData}>📤 导出存档</button>
            <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
            <label class="dropdown-item" for="importFile" role="menuitem">
              📥 导入存档
              <input type="file" id="importFile" accept=".json,application/json" hidden onchange={onImportChange}>
            </label>
            <button type="button" class="dropdown-item danger" role="menuitem" onclick={resetAll}>🗑 清空进度</button>
          </div>
        {/if}
      </div>
    </div>
  </div>

  {#if import.meta.env.DEV && app.customDans !== null}
    <div class="custom-data-notice">
      <span class="custom-data-notice-text">当前显示的是本地自定义段位数据，data.json 的更新不会自动生效。</span>
      <button type="button" class="btn custom-data-notice-btn" onclick={useDefaultData}>恢复默认数据</button>
    </div>
  {/if}

  <section class="dan-list" id="danFolders">
    <RandomFolderCard />
    <div class="version-grid">
      {#each groups as g (g.version)}
        <VersionCard version={g.version} cleared={g.cleared} total={g.dans.length} />
      {/each}
    </div>
  </section>
</main>

<footer class="site-footer">
  <p class="dim">非官方站点，与 KONAMI 无关 · 曲目信息请以机台实际为准</p>
</footer>

<Modal>
  {#if modal.mode === "dan" && modal.dan}
    <DanCard dan={modal.dan} index={modal.index} />
  {:else if modal.mode === "random"}
    <RandomCard />
  {:else if modal.mode === "leaderboard"}
    <LeaderboardCard />
  {:else if modal.mode === "login"}
    <LoginCard />
  {:else if modal.mode === "unlock" && modal.dan}
    <UnlockCard dan={modal.dan} index={modal.index} />
  {:else if modal.mode === "version"}
    <VersionDetail version={modal.payload?.version} />
  {:else if modal.mode === "import"}
    <ImportConfirm payload={modal.payload} />
  {/if}
</Modal>

<Notice />

<style>
  .dan-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .version-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 12px;
  }

  .custom-data-notice {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
    padding: 10px 14px;
    background: #FFF8EC;
    border: 1px solid #F3DFB8;
    border-radius: 12px;
    font-size: 13px;
    color: #8A6D2F;
  }

  .custom-data-notice-text {
    flex: 1;
    min-width: 0;
  }

  .custom-data-notice-btn {
    flex: none;
    padding: 5px 12px;
    font-size: 12px;
  }
</style>
