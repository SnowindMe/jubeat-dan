<script>
  import { tick } from "svelte";
  import AdminLogin from "./components/AdminLogin.svelte";
  import BoardManage from "./components/admin/BoardManage.svelte";
  import FeedbackManage from "./components/admin/FeedbackManage.svelte";
  import EditorCard from "./components/admin/EditorCard.svelte";
  import PasswordCard from "./components/PasswordCard.svelte";
  import Decorations from "./components/Decorations.svelte";
  import Modal from "./components/Modal.svelte";
  import { versionLabel } from "./lib/pass.js";
  import {
    adminLocked,
    app,
    clearAdminSession,
    ensureCustom,
    isAdminAuthed,
    modal,
    openModal
  } from "./lib/stores.svelte.js";

  let boardVisible = $state(false);
  let boardKey = $state(0);
  let feedbackVisible = $state(false);
  let feedbackKey = $state(0);
  let pending = $state("editor");

  function run(action) {
    if (action === "board") {
      openBoardManage();
    } else if (action === "feedback") {
      openFeedbackManage();
    } else if (action === "passwd") {
      openModal("passwd");
    } else {
      openEditorModal();
    }
  }

  function requireAuth(action) {
    pending = action;
    if (!adminLocked() || isAdminAuthed()) {
      run(action);
    } else {
      openModal("admin", { payload: { pending: action } });
    }
  }

  function runPending() {
    run(pending);
  }

  function openEditorModal() {
    ensureCustom();
    if (app.customDans.length) {
      var selIdx = Math.min(app.editorSelected, app.customDans.length - 1);
      app.versionOpen[versionLabel(app.customDans[selIdx])] = true;
    }
    openModal("editor");
  }

  async function openBoardManage() {
    boardVisible = true;
    boardKey++;
    await tick();
    var panel = document.querySelector(".board-manage-panel");
    if (panel && panel.scrollIntoView) panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function openFeedbackManage() {
    feedbackVisible = true;
    feedbackKey++;
    await tick();
    var panel = document.querySelector(".feedback-manage-panel");
    if (panel && panel.scrollIntoView) panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function onBoardAuthFail() {
    clearAdminSession();
    requireAuth("board");
  }

  function onFeedbackAuthFail() {
    clearAdminSession();
    requireAuth("feedback");
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
        <h1>管理后台</h1>
        <p class="subtitle">段位管理 · 排行榜管理</p>
      </div>
    </div>
  </div>
</header>

<main class="container">
  <div class="toolbar">
    <div class="actions">
      <button class="btn" id="adminManageBtn" title="管理员：增删段位、编辑曲目" onclick={() => requireAuth("editor")}>✏️ 段位管理</button>
      <button class="btn" id="adminBoardBtn" title="管理员：查看并管理排行榜记录" onclick={() => requireAuth("board")}>🏆 排行榜管理</button>
      <button class="btn" id="adminFeedbackBtn" title="管理员：查看并管理用户反馈" onclick={() => requireAuth("feedback")}>📮 反馈管理</button>
      <button class="btn" id="adminPasswdBtn" title="管理员：修改管理员密码" onclick={() => requireAuth("passwd")}>🔑 修改密码</button>
      <a class="btn" href="./">← 返回主页</a>
    </div>
  </div>

  {#if boardVisible}
    <section class="board-manage-panel">
      <div class="board-card">
        <div class="card-head">
          <span class="rank-badge">🏆 排行榜管理</span>
        </div>
        <div class="board-controls">
          <button class="btn primary" onclick={() => { boardKey++; }}>刷新</button>
        </div>
        {#key boardKey}
          <BoardManage onAuthFail={onBoardAuthFail} />
        {/key}
      </div>
    </section>
  {/if}

  {#if feedbackVisible}
    <section class="feedback-manage-panel">
      <div class="board-card">
        <div class="card-head">
          <span class="rank-badge">📮 反馈管理</span>
        </div>
        <div class="board-controls">
          <button class="btn primary" onclick={() => { feedbackKey++; }}>刷新</button>
        </div>
        {#key feedbackKey}
          <FeedbackManage onAuthFail={onFeedbackAuthFail} />
        {/key}
      </div>
    </section>
  {/if}
</main>

<footer class="site-footer">
  <p class="dim">非官方站点，与 KONAMI 无关 · 曲目信息请以机台实际为准</p>
</footer>

<Modal>
  {#if modal.mode === "editor"}
    <EditorCard />
  {:else if modal.mode === "admin"}
    <AdminLogin onSuccess={runPending} />
  {:else if modal.mode === "passwd"}
    <PasswordCard />
  {/if}
</Modal>

<style>
  .board-manage-panel { margin-top: 18px; }
  .feedback-manage-panel { margin-top: 18px; }
  .board-manage-panel .board-card { max-width: 900px; margin: 0 auto; }
  .feedback-manage-panel .board-card { max-width: 900px; margin: 0 auto; }
</style>
