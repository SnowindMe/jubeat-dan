<script>
  import { onMount } from "svelte";
  import { clearAdminSession, getAdminPass } from "../../lib/stores.svelte.js";

  let { onAuthFail } = $props();

  let users = $state([]);
  let loading = $state(true);
  let error = $state("");
  let note = $state("");
  let username = $state("");
  let newPass = $state("");
  let confirmPass = $state("");
  let msg = $state("");
  let busy = $state(false);

  async function load() {
    loading = true;
    error = "";
    note = "";
    try {
      var r = await fetch("/api/admin", {
        headers: { "X-Admin-Pass": getAdminPass() }
      });
      var j = await r.json().catch(function () { return {}; });
      if (r.status === 401) {
        clearAdminSession();
        onAuthFail?.();
        return;
      }
      if (!r.ok) throw new Error((j && j.error) || ("HTTP " + r.status));
      users = j.users || [];
    } catch (e) {
      error = "加载失败：" + e.message;
      note = "用户服务未连接（需部署 Cloudflare Pages Functions）。";
      users = [];
    } finally {
      loading = false;
    }
  }

  onMount(load);

  function pickUser(name) {
    username = name;
    msg = "";
  }

  async function resetPass() {
    var name = username.trim();
    if (!name) {
      msg = "请输入用户名";
      return;
    }
    if (newPass.length < 6 || newPass.length > 64) {
      msg = "新密码需为 6-64 个字符";
      return;
    }
    if (newPass !== confirmPass) {
      msg = "两次输入的新密码不一致";
      return;
    }
    if (!window.confirm("确定将用户「" + name + "」的密码重置为临时密码？该用户所有设备将退出登录。")) return;
    busy = true;
    msg = "";
    try {
      var r = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Pass": getAdminPass() },
        body: JSON.stringify({ action: "resetpass", username: name, newPass: newPass })
      });
      var j = await r.json().catch(function () { return {}; });
      if (r.status === 401) {
        clearAdminSession();
        onAuthFail?.();
        return;
      }
      if (!r.ok) throw new Error((j && j.error) || "重置失败");
      msg = "✅ 已重置，请把新密码告知用户";
      newPass = "";
      confirmPass = "";
      load();
    } catch (e) {
      msg = e.message || "重置失败";
    } finally {
      busy = false;
    }
  }
</script>

<div class="user-reset">
  <div class="user-reset-row">
    <input
      class="login-input"
      type="text"
      placeholder="用户名"
      maxlength="16"
      bind:value={username}
    >
    <input
      class="login-input"
      type="password"
      placeholder="临时新密码（6-64 位）"
      autocomplete="new-password"
      bind:value={newPass}
    >
    <input
      class="login-input"
      type="password"
      placeholder="再次输入"
      autocomplete="new-password"
      bind:value={confirmPass}
      onkeydown={(e) => { if (e.key === "Enter") resetPass(); }}
    >
    <button class="btn primary" disabled={busy} onclick={resetPass}>
      {busy ? "处理中…" : "重置密码"}
    </button>
  </div>
  <p class="user-reset-note">重置后该用户所有设备将退出登录，需用新密码重新登录</p>
  <div class="login-msg">{msg}</div>
</div>

<div class="board-body">
  {#if loading}
    <div class="board-loading">加载中…</div>
  {:else if error}
    <div class="board-empty">{error}</div>
  {:else if !users.length}
    <div class="board-empty">还没有注册用户。</div>
  {:else}
    <div class="board-scroll">
      <table class="user-table">
        <thead>
          <tr><th>ID</th><th>用户名</th><th>注册时间</th><th>云端存档</th><th></th></tr>
        </thead>
        <tbody>
          {#each users as u (u.id)}
            <tr>
              <td>{u.id}</td>
              <td>{u.name}</td>
              <td>{String(u.created_at || "").replace("T", " ").slice(0, 19)}</td>
              <td>{u.has_save ? "☁️ 有" : "—"}</td>
              <td><button type="button" class="btn" onclick={() => pickUser(u.name)}>重置此用户</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
<div class="board-note">{note}</div>

<style>
  .user-reset {
    margin-bottom: 12px;
    padding: 12px 14px;
    border: 1px solid #DCEFFB;
    border-radius: 12px;
    background: #F5FBFF;
  }

  .user-reset-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr auto;
    gap: 8px;
    align-items: center;
  }

  .user-reset-row .login-input {
    font-size: 13px;
    padding: 8px 10px;
  }

  .user-reset-note {
    margin: 8px 0 0;
    font-size: 12px;
    color: var(--muted);
  }

  .user-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    white-space: nowrap;
  }

  .user-table th,
  .user-table td {
    padding: 8px 10px;
    border-bottom: 1px solid #DCEFFB;
    text-align: left;
    vertical-align: middle;
  }

  .user-table th {
    color: #6AA9D8;
    font-weight: 700;
    font-size: 12px;
  }

  .user-table tr:last-child td { border-bottom: none; }
  .user-table .btn { padding: 4px 10px; font-size: 12px; }

  @media (max-width: 640px) {
    .user-reset-row { grid-template-columns: 1fr; }
  }
</style>
