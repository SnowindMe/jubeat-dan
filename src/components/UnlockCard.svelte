<script>
  import { versionLabel } from "../lib/pass.js";
  import {
    app,
    closeModal,
    openModal,
    saveState,
    showNotice
  } from "../lib/stores.svelte.js";
  import { candyBurst } from "../lib/utils.js";

  let { dan, index } = $props();
  let code = $state("");
  let msg = $state("");

  function submit() {
    var expect = String(dan.unlockCode || "").trim();
    if (!expect || code.trim() === expect) {
      var label = versionLabel(dan);
      if (!app.progress.unlocked) app.progress.unlocked = {};
      app.progress.unlocked[label] = true;
      saveState();
      candyBurst(0.5);
      closeModal();
      showNotice("🔓 已解锁「" + label + "」全部隐藏段位");
      openModal("dan", { dan: dan, index: index });
    } else {
      msg = "解锁码不正确";
    }
  }
</script>

<div class="login-card">
  <div class="login-title">🔒 解锁隐藏段位</div>
  <p class="login-hint">输入解锁码解锁「{versionLabel(dan)}」的全部隐藏段位</p>
  <!-- svelte-ignore a11y_autofocus -->
  <input
    class="login-input"
    type="text"
    maxlength="40"
    placeholder="解锁码"
    autocomplete="off"
    autofocus
    bind:value={code}
    onkeydown={(e) => { if (e.key === "Enter") submit(); }}
  >
  <div class="login-actions">
    <button class="btn primary" onclick={submit}>解锁</button>
  </div>
  <div class="login-msg">{msg}</div>
</div>
