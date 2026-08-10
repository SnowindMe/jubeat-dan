<script>
  import AdminLogin from "./components/AdminLogin.svelte";
  import BoardManage from "./components/admin/BoardManage.svelte";
  import FeedbackManage from "./components/admin/FeedbackManage.svelte";
  import EditorCard from "./components/admin/EditorCard.svelte";
  import UserManage from "./components/admin/UserManage.svelte";
  import PasswordCard from "./components/PasswordCard.svelte";
  import Decorations from "./components/Decorations.svelte";
  import { adminLocked, clearAdminSession, isAdminAuthed } from "./lib/stores.svelte.js";

  const VIEWS = [
    { id: "editor", label: "✏️ 段位管理" },
    { id: "board", label: "🏆 排行榜管理" },
    { id: "feedback", label: "📮 反馈管理" },
    { id: "users", label: "👥 用户管理" },
    { id: "passwd", label: "🔑 修改密码" }
  ];

  /* 侧边栏 + 右内容：未验证管理员身份时右区先显示登录卡片，验证后进入对应功能 */
  let view = $state(adminLocked() && !isAdminAuthed() ? "login" : "editor");
  let pending = $state("editor");
  let boardKey = $state(0);
  let feedbackKey = $state(0);
  let usersKey = $state(0);

  function selectView(id) {
    pending = id;
    if (adminLocked() && !isAdminAuthed()) {
      view = "login";
    } else {
      view = id;
    }
  }

  function runPending() {
    view = pending;
  }

  function onBoardAuthFail() {
    clearAdminSession();
    pending = "board";
    view = "login";
  }

  function onFeedbackAuthFail() {
    clearAdminSession();
    pending = "feedback";
    view = "login";
  }

  function onUsersAuthFail() {
    clearAdminSession();
    pending = "users";
    view = "login";
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

<main class="container admin-layout">
  <aside class="admin-sidebar">
    <nav class="admin-nav" aria-label="管理后台导航">
      {#each VIEWS as v (v.id)}
        <button
          type="button"
          class="admin-nav-item"
          class:active={view === v.id}
          onclick={() => selectView(v.id)}
        >{v.label}</button>
      {/each}
    </nav>
    <a class="admin-nav-item admin-nav-back" href="./">← 返回主页</a>
  </aside>

  <section class="admin-content">
    {#if view === "login"}
      <div class="admin-login-wrap">
        <AdminLogin onSuccess={runPending} />
      </div>
    {:else if view === "editor"}
      <EditorCard />
    {:else if view === "board"}
      <div class="admin-page-head">
        <h2 class="admin-page-title">🏆 排行榜管理</h2>
        <button class="btn primary" onclick={() => { boardKey++; }}>刷新</button>
      </div>
      {#key boardKey}
        <BoardManage onAuthFail={onBoardAuthFail} />
      {/key}
    {:else if view === "feedback"}
      <div class="admin-page-head">
        <h2 class="admin-page-title">📮 反馈管理</h2>
        <button class="btn primary" onclick={() => { feedbackKey++; }}>刷新</button>
      </div>
      {#key feedbackKey}
        <FeedbackManage onAuthFail={onFeedbackAuthFail} />
      {/key}
    {:else if view === "users"}
      <div class="admin-page-head">
        <h2 class="admin-page-title">👥 用户管理</h2>
        <button class="btn primary" onclick={() => { usersKey++; }}>刷新</button>
      </div>
      {#key usersKey}
        <UserManage onAuthFail={onUsersAuthFail} />
      {/key}
    {:else if view === "passwd"}
      <div class="admin-login-wrap">
        <PasswordCard />
      </div>
    {/if}
  </section>
</main>

<footer class="site-footer">
  <p class="dim">非官方站点，与 KONAMI 无关 · 曲目信息请以机台实际为准</p>
</footer>

<style>
  .admin-layout {
    max-width: 1040px;
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 16px;
    align-items: start;
  }

  .admin-sidebar {
    position: sticky;
    top: 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid #C7E4F7;
    border-radius: 14px;
    backdrop-filter: blur(4px);
  }

  .admin-nav {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .admin-nav-item {
    appearance: none;
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    text-align: left;
    padding: 10px 12px;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: var(--text);
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .admin-nav-item:hover {
    background: #EFF7FE;
    color: #1B7FCF;
  }

  .admin-nav-item.active {
    background: linear-gradient(180deg, #2FA8F0, #3B82F6);
    color: #FFFFFF;
    box-shadow: 0 6px 14px rgba(47, 168, 240, 0.30);
  }

  .admin-nav-back {
    border-top: 1px dashed #CBE7F5;
    border-radius: 0;
    text-decoration: none;
  }

  .admin-nav-back:hover { border-radius: 10px; }

  .admin-content {
    min-width: 0;
    padding: 18px 20px 22px;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid #C7E4F7;
    border-radius: 14px;
    backdrop-filter: blur(4px);
  }

  .admin-page-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 12px;
  }

  .admin-page-title {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: 1px;
    color: #1B7FCF;
  }

  .admin-login-wrap {
    max-width: 380px;
    margin: 32px auto;
  }

  @media (max-width: 640px) {
    .admin-layout { grid-template-columns: 1fr; }
    .admin-sidebar { position: static; }
    .admin-nav {
      flex-direction: row;
      overflow-x: auto;
      padding-bottom: 4px;
    }
    .admin-nav-item { flex: none; white-space: nowrap; }
    .admin-nav-back {
      border-top: none;
      border-left: 1px dashed #CBE7F5;
      border-radius: 10px;
      padding-top: 10px;
    }
  }
</style>
