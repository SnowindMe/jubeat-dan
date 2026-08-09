<script>
  import { untrack } from "svelte";
  import { VERSION_LOGOS } from "../lib/constants.js";
  import { openModal } from "../lib/stores.svelte.js";

  let { version, cleared, total } = $props();

  const logo = untrack(() => VERSION_LOGOS[version]);
</script>

<button
  type="button"
  class="version-card"
  title={"查看「" + version + "」大类详情"}
  onclick={() => openModal("version", { payload: { version: version } })}
>
  <span class="version-card-logo">
    {#if logo}
      <img class={"version-logo-img logo-" + version.replace(/\s+/g, "-")} src={logo} alt={version} decoding="async">
    {:else}
      <span class="version-name">{version}</span>
    {/if}
  </span>
  <span class="version-card-meta">{cleared}/{total} 已通过</span>
  <span class="version-card-cta">查看详情 ▸</span>
</button>

<style>
  .version-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 18px 14px 14px;
    background: linear-gradient(180deg, #FFFFFF 0%, #F2FAFF 100%);
    border: 1px solid #D7EBFA;
    border-radius: 16px;
    cursor: pointer;
    font-family: inherit;
    color: var(--text);
    box-shadow: 0 4px 12px rgba(45, 140, 210, 0.10);
    transition: transform 0.16s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .version-card:hover {
    transform: translateY(-2px);
    border-color: #8FD0F7;
    box-shadow: 0 8px 18px rgba(45, 140, 210, 0.18);
  }

  .version-card-logo {
    display: grid;
    place-items: center;
    width: 100%;
    height: 92px;
  }

  .version-logo-img {
    display: block;
    width: 130px;
    height: auto;
    filter: drop-shadow(0 2px 5px rgba(45, 140, 210, 0.18));
  }

  /* 各版本 Logo 原始构图宽高比差异较大，按内容面积相当来定显示宽度，观感一致 */
  .version-card-logo .logo-festo { width: 110px; }
  .version-card-logo .logo-clan { width: 132px; }
  .version-card-logo .logo-jubeat-prop { width: 140px; }

  .version-card-meta {
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
  }

  .version-card-cta {
    font-size: 12px;
    font-weight: 700;
    color: var(--cyan);
  }

  @media (max-width: 600px) {
    .version-logo-img { width: 110px; height: auto; }
    .version-card-logo { height: 74px; }
  }
</style>
