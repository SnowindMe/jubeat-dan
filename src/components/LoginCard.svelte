<script>
  import { AVATARS, FRAMES } from "../lib/constants.js";
  import { app, closeModal, saveProfile } from "../lib/stores.svelte.js";
  import { candyBurst } from "../lib/utils.js";

  let name = $state(app.playerName);
  let avatar = $state(app.playerAvatar);
  let frame = $state(app.playerFrame);
  let msg = $state("");

  function submit() {
    var n = name.trim();
    if (!n) {
      msg = "昵称不能为空";
      return;
    }
    saveProfile(n, avatar, frame);
    candyBurst(0.5);
    closeModal();
  }
</script>

<div class="login-card">
  <div class="login-title">👤 玩家登录</div>
  <p class="login-hint">设置昵称、头像与姓名框后即可参与排行榜</p>
  <!-- svelte-ignore a11y_autofocus -->
  <input
    class="login-input"
    type="text"
    maxlength="20"
    placeholder="输入昵称（提交后可随时修改）"
    autofocus
    bind:value={name}
    onkeydown={(e) => { if (e.key === "Enter") submit(); }}
  >
  <div class="profile-preview" style="--frame-color: {(FRAMES.find(function (f) { return f.id === frame; }) || FRAMES[0]).color}">
    <span class="profile-avatar">{avatar}</span>
    <span class="profile-name">{name || "预览"}</span>
  </div>
  <div class="pick-label">头像</div>
  <div class="avatar-grid">
    {#each AVATARS as a (a)}
      <button
        type="button"
        class="avatar-option"
        class:selected={avatar === a}
        aria-label={"头像 " + a}
        onclick={() => { avatar = a; }}
      >{a}</button>
    {/each}
  </div>
  <div class="pick-label">姓名框</div>
  <div class="frame-row">
    {#each FRAMES as f (f.id)}
      <button
        type="button"
        class="frame-option"
        class:selected={frame === f.id}
        style="--frame-color: {f.color}"
        onclick={() => { frame = f.id; }}
      >{f.label}</button>
    {/each}
  </div>
  <div class="login-actions">
    <button class="btn primary" onclick={submit}>保存并进入</button>
  </div>
  <div class="login-msg">{msg}</div>
</div>

<style>
  .profile-preview {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 10px 0 14px;
    padding: 6px 14px 6px 6px;
    border: 2px solid var(--frame-color, transparent);
    border-radius: 999px;
    background: rgba(56, 182, 242, 0.08);
  }

  .profile-avatar {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: linear-gradient(135deg, #E1F4FF, #C5E9FB);
    font-size: 20px;
  }

  .profile-name {
    font-size: 14px;
    font-weight: 700;
    color: var(--text, #1B3A55);
  }

  .pick-label {
    margin: 12px 0 6px;
    font-size: 12px;
    font-weight: 700;
    color: #6AA9D8;
  }

  .avatar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
  }

  .avatar-option {
    display: grid;
    place-items: center;
    height: 38px;
    border: 1px solid #D7EBFA;
    border-radius: 10px;
    background: #FFFFFF;
    font-size: 20px;
    cursor: pointer;
    transition: transform 0.12s ease, border-color 0.15s ease, background 0.15s ease;
  }

  .avatar-option:hover {
    transform: scale(1.08);
    border-color: #8FD0F7;
  }

  .avatar-option.selected {
    border-color: #38B6F2;
    background: #E1F4FF;
    box-shadow: 0 0 0 2px rgba(56, 182, 242, 0.25);
  }

  .frame-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .frame-option {
    padding: 6px 12px;
    border: 2px solid var(--frame-color, #D7EBFA);
    border-radius: 999px;
    background: #FFFFFF;
    font-size: 13px;
    font-weight: 600;
    color: #1B3A55;
    cursor: pointer;
    transition: transform 0.12s ease, box-shadow 0.15s ease;
  }

  .frame-option:hover {
    transform: translateY(-1px);
  }

  .frame-option.selected {
    box-shadow: 0 0 0 2px var(--frame-color, #38B6F2);
    background: #F2FAFF;
  }

  @media (max-width: 420px) {
    .avatar-grid { grid-template-columns: repeat(6, 1fr); }
  }
</style>
