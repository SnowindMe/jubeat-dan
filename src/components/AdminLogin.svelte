<script>
  import { ADMIN_KEY, ADMIN_PASS_KEY } from "../lib/constants.js";
  import { closeModal } from "../lib/stores.svelte.js";

  let { onSuccess } = $props();
  let pass = $state("");
  let msg = $state("");
  let sending = $state(false);

  async function submit() {
    if (!pass) {
      msg = "请输入密码";
      return;
    }
    sending = true;
    msg = "";
    var ok = false;
    try {
      var r = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", pass: pass })
      });
      var j = await r.json().catch(function () { return {}; });
      ok = r.ok && !!j.ok;
    } catch (e) {
      ok = false;
    }
    if (!ok) {
      msg = "密码错误";
      sending = false;
      return;
    }
    try {
      sessionStorage.setItem(ADMIN_KEY, "1");
      sessionStorage.setItem(ADMIN_PASS_KEY, pass);
    } catch (e) {
      /* ignore */
    }
    sending = false;
    closeModal();
    onSuccess?.();
  }
</script>

<div class="login-card">
  <div class="login-title">🔑 管理员验证</div>
  <p class="login-hint">段位管理仅对管理员开放，请输入管理员密码</p>
  <!-- svelte-ignore a11y_autofocus -->
  <input
    class="login-input"
    type="password"
    placeholder="管理员密码"
    autocomplete="current-password"
    autofocus
    bind:value={pass}
    onkeydown={(e) => { if (e.key === "Enter") submit(); }}
  >
  <div class="login-actions">
    <button class="btn primary" onclick={submit}>验证</button>
  </div>
  <div class="login-msg">{msg}</div>
</div>
