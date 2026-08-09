<script>
  import { untrack } from "svelte";
  import { VERSION_LOGOS } from "../lib/constants.js";
  import { versionLabel } from "../lib/pass.js";
  import { effectiveDans, readDanState } from "../lib/stores.svelte.js";
  import FolderCard from "./FolderCard.svelte";

  let { version } = $props();

  const items = $derived(
    effectiveDans()
      .map(function (dan, index) { return { dan: dan, index: index }; })
      .filter(function (it) { return versionLabel(it.dan) === version; })
  );
  const cleared = $derived(items.filter(function (it) { return readDanState(it.dan).cleared; }).length);
  const logo = untrack(() => VERSION_LOGOS[version]);
</script>

<div class="version-detail">
  <div class="version-detail-head">
    {#if logo}
      <img class={"version-logo-img logo-" + version.replace(/\s+/g, "-")} src={logo} alt={version} decoding="async">
    {:else}
      <span class="version-name">{version}</span>
    {/if}
    <span class="version-detail-meta">{cleared}/{items.length} 已通过</span>
  </div>
  <div class="folder-grid">
    {#each items as it (it.dan.id || it.index)}
      <FolderCard dan={it.dan} index={it.index} />
    {/each}
  </div>
</div>

<style>
  .folder-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
    gap: 12px;
  }

  .version-detail-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .version-detail-head .version-logo-img {
    flex: none;
    width: 150px;
    height: auto;
  }

  .version-detail-head .logo-festo { width: 128px; }
  .version-detail-head .logo-clan { width: 154px; }
  .version-detail-head .logo-jubeat-prop { width: 164px; }

  .version-detail-meta {
    flex: none;
    font-size: 13px;
    font-weight: 700;
    color: #5B7CA0;
    background: #E9F2FA;
    border-radius: 999px;
    padding: 4px 12px;
    white-space: nowrap;
  }

  /* 版本详情页内的段位卡片：压缩间距，让多张卡在弹窗内完整可见 */
  .version-detail .folder-grid {
    gap: 10px;
  }

  .version-detail .folder-card {
    padding: 12px 8px 10px;
    gap: 4px;
  }

  .version-detail .folder-icon {
    width: 44px;
    height: 44px;
  }

  @media (max-width: 900px) {
    .folder-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 600px) {
    .version-detail-head { flex-direction: column; align-items: flex-start; }
  }
</style>
