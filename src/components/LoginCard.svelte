<script>
  import { app, closeModal, savePlayer } from "../lib/stores.svelte.js";
  import { candyBurst } from "../lib/utils.js";

  let name = $state(app.playerName);
  let msg = $state("");

  function submit() {
    var n = name.trim();
    if (!n) {
      msg = "昵称不能为空";
      return;
    }
    savePlayer(n);
    candyBurst(0.5);
    closeModal();
  }
</script>

<div class="login-card">
  <div class="login-title">👤 玩家登录</div>
  <p class="login-hint">设置昵称后即可参与排行榜</p>
  <!-- svelte-ignore a11y_autofocus -->
  <input
    class="login-input"
    type="text"
    maxlength="20"
    placeholder="输入昵称"
    autofocus
    bind:value={name}
    onkeydown={(e) => { if (e.key === "Enter") submit(); }}
  >
  <div class="login-actions">
    <button class="btn primary" onclick={submit}>进入</button>
  </div>
  <div class="login-msg">{msg}</div>
</div>
