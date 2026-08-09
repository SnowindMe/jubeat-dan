<script>
  import { isDanUnlocked, openModal, readDanState } from "../lib/stores.svelte.js";

  let { dan, index } = $props();

  const st = $derived(readDanState(dan));
  const locked = $derived(dan.hidden && !isDanUnlocked(dan));

  function click() {
    if (dan.hidden && !isDanUnlocked(dan)) {
      openModal("unlock", { dan: dan, index: index });
    } else {
      openModal("dan", { dan: dan, index: index });
    }
  }
</script>

<button type="button" class="folder-card" class:locked class:cleared={st.cleared} style="--dan-color: {dan.color}" onclick={click}>
  {#if locked}
    <span class="folder-icon lock" aria-hidden="true">🔒</span>
  {:else}
    <svg class="folder-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="currentColor" opacity=".28"/>
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7H9l2 2h8.5A1.5 1.5 0 0 1 21 10.5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="currentColor"/>
    </svg>
  {/if}
  <span class="folder-name">{locked ? "？？？" : dan.name}</span>
  <span class="folder-num">{locked ? "隐藏段位" : (dan.lv != null ? "Lv." + dan.lv : "第 " + (index + 1) + " 段")}</span>
  <span class="folder-status">{locked ? "🔒 未解锁" : (st.cleared ? "已通过 ✓" : "未通过")}</span>
</button>
