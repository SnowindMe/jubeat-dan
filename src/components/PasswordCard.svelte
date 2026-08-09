<script>
  import { ADMIN_PASS_KEY } from "../lib/constants.js";
  import { closeModal, showNotice } from "../lib/stores.svelte.js";

  let oldPass = $state("");
  let newPass = $state("");
  let confirmPass = $state("");
  let msg = $state("");
  let sending = $state(false);

  async function submit() {
    if (!oldPass) {
      msg = "请输入当前密码";
      return;
    }
    if (newPass.length < 4 || newPass.length > 64) {
      msg = "新密码需为 4-64 个字符";
      return;
    }
    if (newPass !== confirmPass) {
      msg = "两次输入的新密码不一致";
      return;
    }
    sending = true;
    msg = "";
    try {
      var r = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "password", oldPass: oldPass, newPass: newPass })
      });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(j.error || "修改失败");
      try {
        sessionStorage.setItem(ADMIN_PASS_KEY, newPass);
      } catch (e) {
        /* ignore */
      }
      closeModal();
      showNotice("🔑 管理员密码已修改");
    } catch (e) {
      msg = e.message || "修改失败";
    } finally {
      sending = false;
    }
  }
</script>

<div class="login-card">
  <div class="login-title">🔑 修改管理员密码</div>
  <p class="login-hint">修改后请牢记新密码，用于排行榜管理等管理操作</p>
  <!-- svelte-ignore a11y_autofocus -->
  <input
    class="login-input"
    type="password"
    placeholder="当前密码"
    autocomplete="current-password"
    autofocus
    bind:value={oldPass}
    onkeydown={(e) => { if (e.key === "Enter") submit(); }}
  >
  <input
    class="login-input"
    type="password"
    placeholder="新密码（4-64 个字符）"
    autocomplete="new-password"
    bind:value={newPass}
    onkeydown={(e) => { if (e.key === "Enter") submit(); }}
  >
  <input
    class="login-input"
    type="password"
    placeholder="再次输入新密码"
    autocomplete="new-password"
    bind:value={confirmPass}
    onkeydown={(e) => { if (e.key === "Enter") submit(); }}
  >
  <div class="login-actions">
    <button class="btn primary" disabled={sending} onclick={submit}>{sending ? "提交中…" : "确认修改"}</button>
  </div>
  <div class="login-msg">{msg}</div>
</div>
