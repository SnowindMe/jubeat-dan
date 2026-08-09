<script>
  import { notice } from "../lib/stores.svelte.js";

  let show = $state(false);
  let gone = $state(true);
  let timer;

  $effect(function () {
    if (!notice.id) return;
    gone = false;
    show = false;
    var id = notice.id;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (id === notice.id) show = true;
      });
    });
    clearTimeout(timer);
    timer = setTimeout(dismiss, 4000);
  });

  function dismiss() {
    if (!show) return;
    show = false;
    clearTimeout(timer);
    timer = setTimeout(function () { gone = true; }, 450);
  }
</script>

{#if !gone}
  <div class="app-notice" role="alert" class:show class:hide={!show}>
    <div class="app-notice-card">
      <span class="app-notice-msg">{notice.msg}</span>
      <button type="button" class="app-notice-close" aria-label="关闭提示" onclick={dismiss}>×</button>
    </div>
  </div>
{/if}

<style>
  .app-notice {
    position: fixed;
    top: calc(14px + env(safe-area-inset-top, 0px));
    left: 50%;
    z-index: 60;
    width: max-content;
    max-width: min(560px, calc(100vw - 32px));
    transform: translateX(-50%);
    pointer-events: none;
  }

  .app-notice-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 12px 12px 18px;
    border-radius: 14px;
    background: #FFFFFF;
    border: 1px solid #F2B8C2;
    box-shadow: 0 14px 36px rgba(192, 57, 79, 0.16);
    color: #C0394F;
    font-size: 14px;
    font-weight: 600;
    pointer-events: auto;
    opacity: 0;
    transform: translateY(-12px);
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  .app-notice.show .app-notice-card {
    opacity: 1;
    transform: translateY(0);
  }

  .app-notice.hide .app-notice-card {
    opacity: 0;
    transform: translateY(-12px);
  }

  .app-notice-msg {
    flex: 1;
    min-width: 0;
  }

  .app-notice-close {
    flex: none;
    width: 26px;
    height: 26px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 1px solid #F2B8C2;
    background: #FFF5F6;
    color: #C0394F;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .app-notice-close:hover {
    background: #FFE4E8;
  }

  @media (prefers-reduced-motion: reduce) {
    .app-notice-card { animation: none; transition: none; }
  }
</style>
