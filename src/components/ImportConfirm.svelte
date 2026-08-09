<script>
  import { untrack } from "svelte";
  import { applyImport } from "../lib/importexport.js";

  let { payload } = $props();

  const initPayload = untrack(() => payload);
  const customDesc = Array.isArray(initPayload.custom)
    ? initPayload.custom.length + " 个段位"
    : (initPayload.custom === null ? "已恢复默认" : "—");
  const parts = [
    Object.keys(initPayload.state.d || {}).length + " 个段位进度",
    initPayload.random ? "随机挑战记录" : null,
    initPayload.custom !== undefined ? "自定义段位（" + customDesc + "）" : null
  ].filter(Boolean);
</script>

<div class="import-card">
  <div class="login-title">📥 导入存档</div>
  <p class="login-hint">存档包含：{parts.join("、")}</p>
  <p class="login-hint">「进度 + 自定义」会用存档的段位数据覆盖本机设置，请选择：</p>
  <div class="import-options">
    <button class="btn" onclick={() => applyImport(payload, false)}>只导入进度</button>
    <button class="btn primary" onclick={() => applyImport(payload, true)}>进度 + 自定义</button>
  </div>
  <div class="login-msg"></div>
</div>

<style>
  .import-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .import-card .login-hint {
    margin: 0;
  }

  .import-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .import-options .btn {
    padding: 10px 8px;
    font-size: 13px;
    text-align: center;
  }

  @media (max-width: 620px) {
    .import-options { grid-template-columns: 1fr; }
  }
</style>
