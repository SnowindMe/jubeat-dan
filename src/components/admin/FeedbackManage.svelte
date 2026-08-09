<script>
  import { onMount } from "svelte";
  import { clearAdminSession, getAdminPass } from "../../lib/stores.svelte.js";

  let { onAuthFail } = $props();

  let entries = $state([]);
  let loading = $state(true);
  let error = $state("");
  let note = $state("");

  async function load() {
    loading = true;
    error = "";
    note = "";
    try {
      var qs = "?pass=" + encodeURIComponent(getAdminPass());
      var r = await fetch("/api/feedback" + qs);
      var j = await r.json().catch(function () { return {}; });
      if (r.status === 401) {
        clearAdminSession();
        onAuthFail?.();
        return;
      }
      if (!r.ok) throw new Error((j && j.error) || ("HTTP " + r.status));
      entries = j.entries || [];
    } catch (e) {
      error = "加载失败：" + e.message;
      note = "反馈服务未连接（需部署 Cloudflare Pages Functions）。";
      entries = [];
    } finally {
      loading = false;
    }
  }

  onMount(load);

  async function del(id) {
    if (!confirm("确定删除这条反馈？此操作不可撤销。")) return;
    try {
      var r = await fetch("/api/feedback", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id, adminPass: getAdminPass() })
      });
      var j = await r.json().catch(function () { return {}; });
      if (r.status === 401) {
        alert("管理员验证失败，请重新验证密码");
        clearAdminSession();
        onAuthFail?.();
        return;
      }
      if (!r.ok) {
        alert((j && j.error) || "删除失败");
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
    <div class="board-empty">暂无反馈。</div>
  {:else}
    <div class="fb-list">
      {#each entries as e (e.id)}
        <div class="fb-item">
          <div class="fb-head">
            <span class="fb-player">{e.player || "匿名"}</span>
            <span class="fb-time">{String(e.created_at || "").replace("T", " ").slice(0, 19)}</span>
          </div>
          <div class="fb-content">{e.content}</div>
          <div class="fb-actions">
            <button type="button" class="btn danger" onclick={() => del(Number(e.id))}>删除</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
<div class="board-note">{note}</div>

<style>
  .fb-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 60vh;
    overflow-y: auto;
    padding-right: 4px;
  }

  .fb-item {
    padding: 12px 14px;
    border: 1px solid #DCEFFB;
    border-radius: 12px;
    background: #FFFFFF;
  }

  .fb-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 6px;
  }

  .fb-player {
    font-size: 13px;
    font-weight: 700;
    color: #1B3A55;
  }

  .fb-time {
    font-size: 12px;
    color: #8FB8DC;
  }

  .fb-content {
    font-size: 13px;
    line-height: 1.6;
    color: #40576E;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .fb-actions {
    margin-top: 8px;
    text-align: right;
  }

  .fb-actions .btn {
    padding: 4px 10px;
    font-size: 12px;
  }

  .fb-actions .btn.danger {
    background: #FDECEC;
    color: #D64545;
    border-color: #F3C2C2;
  }

  .board-empty {
    padding: 22px 14px;
    text-align: center;
    color: #8FB8DC;
  }
</style>
