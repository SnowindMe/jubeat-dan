<script>
  import {
    changePassword,
    checkSession,
    cloud,
    fetchSave,
    login,
    logout,
    register,
    uploadSave
  } from "../lib/cloudsave.svelte.js";
  import { openModal } from "../lib/stores.svelte.js";

  let mode = $state("login");
  let username = $state("");
  let password = $state("");
  let confirmPass = $state("");
  let msg = $state("");
  let busy = $state(false);
  let showPass = $state(false);
  let oldPass = $state("");
  let newPass = $state("");
  let confirmNew = $state("");
  let passMsg = $state("");
  let passBusy = $state(false);

  checkSession();

  function switchMode(next) {
    mode = next;
    msg = "";
  }

  async function submit() {
    var name = username.trim();
    if (!name || !password) {
      msg = "请输入用户名和密码";
      return;
    }
    if (mode === "register") {
      if (password.length < 6) {
        msg = "密码至少 6 位";
        return;
      }
      if (password !== confirmPass) {
        msg = "两次输入的密码不一致";
        return;
      }
    }
    busy = true;
    msg = "";
    try {
      if (mode === "register") {
        await register(name, password);
      } else {
        await login(name, password);
      }
      password = "";
      confirmPass = "";
    } catch (e) {
      msg = e.message || "操作失败";
    } finally {
      busy = false;
    }
  }

  async function doUpload() {
    busy = true;
    msg = "";
    try {
      await uploadSave();
      msg = "☁️ 已上传到云端";
    } catch (e) {
      msg = e.message || "上传失败";
    } finally {
      busy = false;
    }
  }

  async function doDownload() {
    busy = true;
    msg = "";
    try {
      var data = await fetchSave();
      openModal("import", { payload: data });
    } catch (e) {
      msg = e.message || "下载失败";
    } finally {
      busy = false;
    }
  }

  async function doLogout() {
    busy = true;
    msg = "";
    try {
      await logout();
    } catch (e) {
      msg = e.message || "退出失败";
    } finally {
      busy = false;
    }
  }

  function openPassForm() {
    showPass = true;
    msg = "";
    passMsg = "";
  }

  function closePassForm() {
    showPass = false;
    passMsg = "";
    oldPass = "";
    newPass = "";
    confirmNew = "";
  }

  async function doChangePass() {
    if (!oldPass) {
      passMsg = "请输入当前密码";
      return;
    }
    if (newPass.length < 6) {
      passMsg = "新密码至少 6 位";
      return;
    }
    if (newPass !== confirmNew) {
      passMsg = "两次输入的新密码不一致";
      return;
    }
    passBusy = true;
    passMsg = "";
    try {
      await changePassword(oldPass, newPass);
      closePassForm();
      msg = "✅ 密码已修改";
    } catch (e) {
      passMsg = e.message || "修改失败";
    } finally {
      passBusy = false;
    }
  }
</script>

{#if cloud.checking}
  <div class="cloud-loading">正在检查登录状态…</div>
{:else if !cloud.authed}
  <div class="login-card">
    <div class="login-title">☁️ 云存档</div>
    <p class="login-hint">
      {#if mode === "login"}
        登录后可在不同设备间同步段位进度；没有账号请先注册
      {:else}
        注册一个账号，存档将保存到云端（仅本机进度与自定义段位）
      {/if}
    </p>
    <input
      class="login-input"
      type="text"
      placeholder="用户名（1-16 位）"
      maxlength="16"
      autocomplete="username"
      bind:value={username}
      onkeydown={(e) => { if (e.key === "Enter") submit(); }}
    >
    <input
      class="login-input"
      type="password"
      placeholder={mode === "register" ? "密码（至少 6 位）" : "密码"}
      autocomplete={mode === "register" ? "new-password" : "current-password"}
      bind:value={password}
      onkeydown={(e) => { if (e.key === "Enter") submit(); }}
    >
    {#if mode === "register"}
      <input
        class="login-input"
        type="password"
        placeholder="再次输入密码"
        autocomplete="new-password"
        bind:value={confirmPass}
        onkeydown={(e) => { if (e.key === "Enter") submit(); }}
      >
    {/if}
    <div class="login-actions">
      <button class="btn primary" disabled={busy} onclick={submit}>
        {busy ? "处理中…" : (mode === "register" ? "注册并登录" : "登录")}
      </button>
    </div>
    <button type="button" class="cloud-switch" onclick={() => switchMode(mode === "login" ? "register" : "login")}>
      {mode === "login" ? "没有账号？去注册" : "已有账号？去登录"}
    </button>
    {#if mode === "login"}
      <p class="cloud-forgot">忘记密码？联系管理员在后台「用户管理」重置</p>
    {/if}
    <div class="login-msg">{msg}</div>
  </div>
{:else}
  <div class="login-card">
    <div class="login-title">☁️ 云存档</div>
    <p class="login-hint">已登录：{cloud.name}</p>
    {#if showPass}
      <div class="login-title pass-title">🔑 修改密码</div>
      <input
        class="login-input"
        type="password"
        placeholder="当前密码"
        autocomplete="current-password"
        bind:value={oldPass}
        onkeydown={(e) => { if (e.key === "Enter") doChangePass(); }}
      >
      <input
        class="login-input"
        type="password"
        placeholder="新密码（至少 6 位）"
        autocomplete="new-password"
        bind:value={newPass}
        onkeydown={(e) => { if (e.key === "Enter") doChangePass(); }}
      >
      <input
        class="login-input"
        type="password"
        placeholder="再次输入新密码"
        autocomplete="new-password"
        bind:value={confirmNew}
        onkeydown={(e) => { if (e.key === "Enter") doChangePass(); }}
      >
      <div class="cloud-actions">
        <button class="btn primary" disabled={passBusy} onclick={doChangePass}>
          {passBusy ? "提交中…" : "确认修改"}
        </button>
        <button class="btn" disabled={passBusy} onclick={closePassForm}>返回</button>
      </div>
      <div class="login-msg">{passMsg}</div>
    {:else}
      <div class="cloud-actions">
        <button class="btn primary" disabled={busy} onclick={doUpload}>📤 上传当前存档</button>
        <button class="btn" disabled={busy || !cloud.saved} onclick={doDownload}>📥 下载到本机</button>
        <button class="btn" disabled={busy} onclick={openPassForm}>🔑 修改密码</button>
        <button class="btn" disabled={busy} onclick={doLogout}>🚪 退出登录</button>
      </div>
      <p class="cloud-note">
        {#if cloud.saved}
          云端存档更新时间：{cloud.updatedAt || "未知"}（上传会覆盖云端旧档）
        {:else}
          云端还没有存档，上传一次即可备份
        {/if}
      </p>
    {/if}
    <div class="login-msg">{msg}</div>
  </div>
{/if}

<style>
  .cloud-loading {
    padding: 28px 10px;
    text-align: center;
    color: var(--muted);
  }

  .cloud-switch {
    appearance: none;
    border: none;
    background: transparent;
    color: #1B7FCF;
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    align-self: center;
    padding: 2px 6px;
  }

  .cloud-switch:hover { text-decoration: underline; }

  .cloud-forgot {
    margin: 0;
    text-align: center;
    font-size: 12px;
    color: var(--muted);
  }

  .pass-title {
    font-size: 16px;
    margin-top: 4px;
  }

  .cloud-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .cloud-actions .btn { flex: 1; min-width: 130px; }

  .cloud-note {
    margin: 0;
    font-size: 12px;
    color: var(--muted);
  }
</style>
