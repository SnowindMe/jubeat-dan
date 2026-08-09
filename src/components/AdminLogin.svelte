<script>
  import { ADMIN_KEY, ADMIN_PASS_KEY } from "../lib/constants.js";
  import { APP_CONFIG } from "../lib/data.svelte.js";
  import { closeModal } from "../lib/stores.svelte.js";
  import { sha256Hex } from "../lib/utils.js";

  let { onSuccess } = $props();
  let pass = $state("");
  let msg = $state("");

  async function submit() {
    if (!pass) {
      msg = "请输入密码";
      return;
    }
    var hash = await sha256Hex(pass);
    var a = APP_CONFIG.admin;
    if (!hash || !a || hash.toLowerCase() !== String(a.passHash).toLowerCase()) {
      msg = "密码错误";
      return;
    }
    try {
      sessionStorage.setItem(ADMIN_KEY, "1");
      sessionStorage.setItem(ADMIN_PASS_KEY, pass);
    } catch (e) {
      /* ignore */
    }
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
