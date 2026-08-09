<script>
  import { app, closeModal, showNotice } from "../lib/stores.svelte.js";
  import { candyBurst } from "../lib/utils.js";

  let content = $state("");
  let contact = $state(app.playerName);
  let msg = $state("");
  let sending = $state(false);

  async function submit() {
    var text = content.trim();
    if (!text) {
      msg = "请填写反馈内容";
      return;
    }
    if (text.length > 1000) {
      msg = "反馈内容最多 1000 字";
      return;
    }
    sending = true;
    msg = "";
    try {
      var r = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          player: (contact || "").trim().slice(0, 20)
        })
      });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(j.error || "提交失败");
      candyBurst(0.6);
      closeModal();
      showNotice("📮 反馈已收到，感谢！");
    } catch (e) {
      msg = "提交失败，请稍后再试";
    } finally {
      sending = false;
    }
  }
</script>

<div class="login-card">
  <div class="login-title">📮 意见反馈</div>
  <p class="login-hint">遇到问题或有建议？欢迎告诉我们</p>
  <!-- svelte-ignore a11y_autofocus -->
  <textarea
    class="feedback-input"
    maxlength="1000"
    placeholder="想说的话…（最多 1000 字）"
    autofocus
    bind:value={content}
  ></textarea>
  <input
    class="login-input"
    type="text"
    maxlength="20"
    placeholder="昵称/联系方式（可选）"
    bind:value={contact}
  >
  <div class="login-actions">
    <button class="btn primary" disabled={sending} onclick={submit}>{sending ? "提交中…" : "提交反馈"}</button>
  </div>
  <div class="login-msg">{msg}</div>
</div>

<style>
  .feedback-input {
    width: 100%;
    min-height: 120px;
    resize: vertical;
    margin-bottom: 10px;
    padding: 10px 12px;
    border: 1px solid #CBE7F5;
    border-radius: 12px;
    background: #FFFFFF;
    font: inherit;
    font-size: 14px;
    line-height: 1.6;
    color: #1B3A55;
    box-sizing: border-box;
  }

  .feedback-input:focus {
    outline: none;
    border-color: #38B6F2;
    box-shadow: 0 0 0 3px rgba(56, 182, 242, 0.18);
  }
</style>
