<script>
  import { onMount } from "svelte";
  import { deleteEntry, fetchManageEntries } from "../../lib/leaderboard.svelte.js";
  import { clearAdminSession, getAdminPass } from "../../lib/stores.svelte.js";

  let { onAuthFail } = $props();

  let entries = $state([]);
  let loading = $state(true);
  let error = $state("");
  let note = $state("");

  const criterionLabel = { score: "总分数", avg: "平均分", rate: "music rate" };

  async function load() {
    loading = true;
    error = "";
    note = "";
    try {
      entries = await fetchManageEntries(100);
    } catch (e) {
      error = "加载失败：" + e.message;
      note = "排行榜服务未连接（需部署 Cloudflare Pages Functions）。";
      entries = [];
    } finally {
      loading = false;
    }
  }

  onMount(load);

  async function del(id) {
    if (!confirm("确定删除这条排行榜记录？此操作不可撤销。")) return;
    try {
      var r = await deleteEntry(id, getAdminPass());
      if (!r.json.ok) {
        if (r.status === 401) {
          alert("管理员验证失败，请重新验证密码");
          clearAdminSession();
          onAuthFail?.();
          return;
        }
        alert(r.json.error || "删除失败");
        return;
      }
      load();
    } catch (e) {
      alert("删除失败：网络错误");
    }
  }
</script>

<div class="board-body">
  {#if loading}
    <div class="board-loading">加载中…</div>
  {:else if error}
    <div class="board-empty">{error}</div>
  {:else if !entries.length}
    <div class="board-empty">暂无排行榜记录。</div>
  {:else}
    <div class="board-scroll">
      <table class="board-manage-table">
        <thead>
          <tr><th>玩家</th><th>段位</th><th>模式</th><th>依据</th><th>成绩</th><th>时间</th><th></th></tr>
        </thead>
        <tbody>
          {#each entries as e (e.id)}
            <tr>
              <td>{e.player}</td>
              <td>{e.version || ""} · {e.dan}</td>
              <td>{e.mode}</td>
              <td>{criterionLabel[e.criterion] || e.criterion}</td>
              <td>{e.criterion === "rate" ? Number(e.value).toFixed(1) + "%" : Math.round(Number(e.value)).toLocaleString("zh-CN")}</td>
              <td>{String(e.created_at || "").replace("T", " ").slice(0, 19)}</td>
              <td><button type="button" class="btn danger" onclick={() => del(Number(e.id))}>删除</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
<div class="board-note">{note}</div>

<style>
  .board-scroll { overflow-x: auto; }

  .board-manage-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    white-space: nowrap;
  }

  .board-manage-table th,
  .board-manage-table td {
    padding: 8px 10px;
    border-bottom: 1px solid #DCEFFB;
    text-align: left;
    vertical-align: middle;
  }

  .board-manage-table th {
    color: #6AA9D8;
    font-weight: 700;
    font-size: 12px;
  }

  .board-manage-table tr:last-child td { border-bottom: none; }
  .board-manage-table .btn { padding: 4px 10px; font-size: 12px; }

  .board-manage-table .btn.danger {
    background: #FDECEC;
    color: #D64545;
    border-color: #F3C2C2;
  }

  /* 管理后台的空态样式（覆盖全局 .board-empty 的间距） */
  .board-empty {
    padding: 22px 14px;
    text-align: center;
    color: #8FB8DC;
  }
</style>
