<script>
  import { versionLabel } from "../lib/pass.js";
  import {
    app,
    closeModal,
    effectiveDans,
    openModal,
    saveState,
    showNotice
  } from "../lib/stores.svelte.js";
  import { candyBurst } from "../lib/utils.js";

  let code = $state("");
  let msg = $state("");

  function submit() {
    var input = code.trim();
    if (!input) {
      msg = "请输入隐藏码";
      return;
    }
    var matched = null;
    effectiveDans().forEach(function (dan) {
      var expect = String(dan.unlockCode || "").trim();
      if (!matched && expect && expect === input) matched = dan;
    });
    if (!matched) {
      msg = "解锁码不正确";
      return;
    }
    var label = versionLabel(matched);
    if (!app.progress.unlocked) app.progress.unlocked = {};
    app.progress.unlocked[label] = true;
    saveState();
    candyBurst(0.5);
    closeModal();
    showNotice("🔓 已解锁「" + label + "」全部隐藏段位");
    openModal("version", { payload: { version: label } });
  }
</script>

<div class="login-card">
  <div class="login-title">🔑 输入隐藏码</div>
  <p class="login-hint">输入正确的隐藏码，解锁对应版本的隐藏段位</p>
  <!-- svelte-ignore a11y_autofocus -->
  <input
    class="login-input"
    type="text"
    maxlength="40"
    placeholder="隐藏码"
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
