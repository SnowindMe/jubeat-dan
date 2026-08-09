<script>
  import { modal, closeModal } from "../lib/stores.svelte.js";

  let { children } = $props();

  let open = $state(false);
  let closing = $state(false);
  let closeTimer;
  let backdropEl = $state(null);
  let closeBtn = $state(null);

  const FOCUS_SELF = ["login", "admin", "unlock", "import"];

  const modeClass = $derived(
    modal.mode === "editor" ? "editor-mode" :
    modal.mode === "login" || modal.mode === "unlock" || modal.mode === "admin" ? "login-mode" :
    modal.mode === "leaderboard" ? "board-mode" : ""
  );

  function requestClose() {
    if (closing) return;
    closing = true;
    open = false;
    clearTimeout(closeTimer);
    closeTimer = setTimeout(function () {
      closing = false;
      closeModal();
    }, 220);
  }

  $effect(function () {
    if (!modal.mode) {
      /* 应用逻辑直接调用 closeModal()（如段位失败自动关闭）时同步收起遮罩 */
      open = false;
      return;
    }
    open = true;
    closing = false;
    clearTimeout(closeTimer);
    document.body.style.overflow = "hidden";
    if (!FOCUS_SELF.includes(modal.mode) && closeBtn) closeBtn.focus();

    function onKey(ev) {
      if (ev.key === "Escape") {
        requestClose();
        return;
      }
      if (ev.key === "Tab" && backdropEl) {
        var focusables = backdropEl.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        var active = document.activeElement;
        if (ev.shiftKey && (active === first || !backdropEl.contains(active))) {
          ev.preventDefault();
          last.focus();
        } else if (!ev.shiftKey && (active === last || !backdropEl.contains(active))) {
          ev.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return function () {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="modal-backdrop"
  class:open={open}
  class:editor-full={modal.mode === "editor"}
  bind:this={backdropEl}
  onclick={(ev) => { if (ev.target === backdropEl) requestClose(); }}
>
  {#if modal.mode}
    <div class="modal {modeClass}" role="dialog" aria-modal="true" aria-label="弹窗">
      <button class="modal-close" aria-label="关闭" type="button" bind:this={closeBtn} onclick={requestClose}>×</button>
      <div class="modal-content">
        {@render children?.()}
      </div>
    </div>
  {/if}
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 48px 16px calc(48px + env(safe-area-inset-bottom, 0px));
    background: rgba(36, 110, 170, 0.42);
    backdrop-filter: blur(5px);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.22s ease, visibility 0.22s ease;
    overflow-y: auto;
  }

  .modal-backdrop.open {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  .modal {
    position: relative;
    width: min(580px, 100%);
    max-height: calc(100vh - 96px);
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, #FFFFFF 0%, #F4FBFF 100%);
    border: 1px solid #D7EBFA;
    border-radius: 20px;
    padding: 20px 18px 16px;
    margin: auto 0;
    box-shadow: 0 24px 60px rgba(25, 110, 180, 0.30);
    transform: translateY(14px) scale(0.98);
    transition: transform 0.22s ease;
  }

  .modal-backdrop.open .modal { transform: none; }

  .modal-close {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 1px solid #CBE7F5;
    background: rgba(31, 110, 176, 0.08);
    color: #5B7CA0;
    font-size: 19px;
    line-height: 1;
    cursor: pointer;
    z-index: 2;
    transition: all 0.15s ease;
  }

  .modal-close:hover {
    color: #1B7FCF;
    border-color: var(--cyan);
  }

  :global(.modal-content .dan-card) { margin: 0; }

  .modal-content {
    min-height: 0;
    overflow-y: auto;
  }

  .modal-backdrop.editor-full {
    padding: 0;
    align-items: stretch;
    overflow: hidden;
  }

  .modal.editor-mode {
    width: 100%;
    max-width: none;
    height: 100%;
    border-radius: 0;
    margin: 0;
    padding: 26px 28px 18px;
    display: flex;
    flex-direction: column;
  }

  .modal.editor-mode .modal-content {
    flex: 1;
    min-height: 0;
    display: flex;
    overflow: visible;
  }

  /* 编辑器布局规则下沉到 EditorCard 内部元素，这里用 :global 透传 */
  :global(.modal.editor-mode .editor) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  :global(.modal.editor-mode .editor-body) {
    flex: 1;
    min-height: 0;
    grid-template-columns: 240px 1fr;
  }

  :global(.modal.editor-mode .editor-sidebar) { max-height: none; }

  :global(.modal.editor-mode .editor-panel) {
    overflow-y: auto;
    padding-right: 4px;
  }

  :global(.modal.editor-mode .editor-head) {
    flex-direction: row;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 12px;
    padding-right: 44px;
  }

  .modal.login-mode { max-width: 380px; }
  .modal.board-mode { max-width: 560px; }

  @media (max-width: 640px) {
    .modal-backdrop { backdrop-filter: none; }
    :global(.modal.editor-mode .editor-body) { overflow-y: auto; }
    :global(.modal.editor-mode .editor-panel) { overflow: visible; padding-right: 0; }
    :global(.modal.editor-mode .editor-sidebar) { max-height: 30vh; }
  }
</style>
