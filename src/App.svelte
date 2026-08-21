<script>
  import { onMount } from "svelte";
  import { checkSession } from "./lib/cloudsave.svelte.js";
  import CloudSaveCard from "./components/CloudSaveCard.svelte";
  import DanCard from "./components/DanCard.svelte";
  import Decorations from "./components/Decorations.svelte";
  import CodeCard from "./components/CodeCard.svelte";
  import FeedbackCard from "./components/FeedbackCard.svelte";
  import ImportConfirm from "./components/ImportConfirm.svelte";
  import LeaderboardCard from "./components/LeaderboardCard.svelte";
  import LoginCard from "./components/LoginCard.svelte";
  import Modal from "./components/Modal.svelte";
  import NameplateCard from "./components/NameplateCard.svelte";
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
  let visitCount = $state(null);

  onMount(function () {
    checkSession();
    fetch("/api/visit").then(function (r) { return r.json(); }).then(function (j) {
      if (j && typeof j.total === "number") visitCount = j.total;
    }).catch(function () { /* 计数服务不可用时静默隐藏 */ });
  });

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

  /* 全局通过进度：所有段位（含隐藏）中已通过的数量，用于 hero 进度条 */
  const overallProgress = $derived.by(function () {
    var dans = effectiveDans();
    var total = dans.length;
    var cleared = dans.filter(function (d) { return readDanState(d).cleared; }).length;
    return { total: total, cleared: cleared, pct: total ? Math.round((cleared / total) * 100) : 0 };
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
    <div class="hero-progress" title="全部版本已通过段位">
      <div class="hero-progress-top">
        <span class="hero-progress-label">总进度</span>
        <span class="hero-progress-num">{overallProgress.cleared}/{overallProgress.total} 已通过</span>
      </div>
      <div class="hero-progress-track" role="progressbar" aria-valuenow={overallProgress.cleared} aria-valuemin="0" aria-valuemax={overallProgress.total}>
        <div class="hero-progress-fill" style="width: {overallProgress.pct}%"></div>
      </div>
    </div>
  </div>
</header>

<main class="container">
  <section class="me-row" aria-label="我的段位姓名框">
    <NameplateCard />
  </section>

  <div class="toolbar">
    <div class="filters" role="tablist" aria-label="筛选">
      <button class="chip" class:active={app.filter === "all"} onclick={() => { app.filter = "all"; }}>全部</button>
      <button class="chip" class:active={app.filter === "cleared"} onclick={() => { app.filter = "cleared"; }}>已通过</button>
      <button class="chip" class:active={app.filter === "pending"} onclick={() => { app.filter = "pending"; }}>未通过</button>
    </div>
    <div class="actions">
      <button class="btn" id="boardBtn" title="查看排行榜" onclick={() => openModal("leaderboard")}>🏆 排行榜</button>
      <button class="btn" id="cloudSaveBtn" title="云存档：登录后跨设备同步进度" onclick={() => openModal("cloudsave")}>☁️ 云存档</button>
      <button class="btn" id="codeBtn" title="输入隐藏码解锁隐藏段位" onclick={() => openModal("code")}>🔑 隐藏码</button>
      <button class="btn" id="feedbackBtn" title="意见反馈" onclick={() => openModal("feedback")}>📮 反馈</button>
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
  {#if visitCount != null}
    <p class="visit-count">本网站已有 {visitCount.toLocaleString("zh-CN")} 人查看，谢谢你们对 jubeat 的热爱与支持</p>
  {/if}
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
  {:else if modal.mode === "cloudsave"}
    <CloudSaveCard />
  {:else if modal.mode === "unlock" && modal.dan}
    <UnlockCard dan={modal.dan} index={modal.index} />
  {:else if modal.mode === "version"}
    <VersionDetail version={modal.payload?.version} />
  {:else if modal.mode === "import"}
    <ImportConfirm payload={modal.payload} />
  {:else if modal.mode === "code"}
    <CodeCard />
  {:else if modal.mode === "feedback"}
    <FeedbackCard />
  {/if}
</Modal>

<Notice />

<style>
  .visit-count {
    margin-top: 6px;
    font-size: 12px;
    color: var(--muted, #7CA2C3);
  }

  .hero-progress {
    flex: none;
    min-width: 220px;
    max-width: 280px;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.82);
    border: 1px solid rgba(199, 228, 247, 0.9);
    border-radius: 16px;
    box-shadow: 0 8px 22px rgba(36, 110, 170, 0.14);
  }

  .hero-progress-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }

  .hero-progress-label {
    font-size: 12px;
    font-weight: 700;
    color: #5B7CA0;
    letter-spacing: 2px;
  }

  .hero-progress-num {
    font-size: 15px;
    font-weight: 800;
    color: #1B7FCF;
  }

  .hero-progress-track {
    height: 8px;
    border-radius: 999px;
    background: #E3F0FA;
    overflow: hidden;
  }

  .hero-progress-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #2FA8F0, #6C5CE7);
    transition: width 0.35s ease;
  }

  .dan-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .me-row {
    margin-bottom: 16px;
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
