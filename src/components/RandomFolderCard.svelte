<script>
  import { POOLS } from "../lib/constants.js";
  import { app, openRandomModal } from "../lib/stores.svelte.js";
</script>

<button type="button" class="folder-card random-folder" style="--dan-color: #E056D4" onclick={openRandomModal}>
  <span class="folder-icon">🎲</span>
  <span class="folder-name">随机挑战</span>
  <span class="folder-num">{POOLS[app.random.pool].label} · 已通过 {app.random.passedCount} 组</span>
  <span class="folder-status">随时可玩</span>
</button>
