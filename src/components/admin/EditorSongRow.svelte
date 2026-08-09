<script>
  import { untrack } from "svelte";
  import { songOrdinal } from "../../lib/pass.js";
  import { saveCustomData, scheduleCustomSave, slotSongs } from "../../lib/stores.svelte.js";
  import { fileToDataThumb } from "../../lib/utils.js";

  let { dan, slotIndex, songIndex, slot } = $props();

  const song = $derived(slotSongs(slot)[songIndex]);
  const initSong = untrack(() => slotSongs(slot)[songIndex]);
  let levelRaw = $state(initSong.level != null ? String(initSong.level) : "");
  let imageRaw = $state(initSong.image && initSong.image.indexOf("data:") !== 0 ? initSong.image : "");

  function onLevelInput(ev) {
    levelRaw = ev.currentTarget.value;
    var v = parseFloat(levelRaw);
    song.level = isNaN(v) ? 0 : Math.min(10.9, Math.max(1, v));
    scheduleCustomSave();
  }

  function onLevelBlur() {
    levelRaw = song.level != null ? String(song.level) : "";
  }

  function onImageInput(ev) {
    imageRaw = ev.currentTarget.value;
    var val = imageRaw.trim();
    if (val) {
      song.image = val;
    } else {
      delete song.image;
    }
    scheduleCustomSave();
  }

  function onImageBlur() {
    imageRaw = song.image && song.image.indexOf("data:") !== 0 ? song.image : "";
  }

  function onThumbFile(ev) {
    var f = ev.currentTarget.files && ev.currentTarget.files[0];
    if (!f) return;
    fileToDataThumb(f, function (dataUrl) {
      song.image = dataUrl;
      saveCustomData();
    });
  }

  function clearImage() {
    delete song.image;
    saveCustomData();
  }

  function delSong() {
    if (!confirm("确定删除这首曲目吗？")) return;
    if (Array.isArray(slot) && slot.length > 1) {
      slot.splice(songIndex, 1);
      saveCustomData();
      return;
    }
    if (dan.songs.length <= 1) {
      alert("每个段位至少保留 1 个曲目位。");
      return;
    }
    dan.songs.splice(slotIndex, 1);
    saveCustomData();
  }
</script>

<div class="ed-song" class:alt={songIndex > 0} class:hidden={song.hidden}>
  <div class="ed-song-line1">
    <span class="ed-song-idx">{songIndex === 0 ? songOrdinal(slotIndex, dan.songs.length) : "备" + (songIndex + 1)}</span>
    <span class="ed-thumb-wrap">
      <label class="ed-thumb" class:empty={!song.image} title="点击上传 / 更换歌曲图片">
        {#if song.image}
          <img src={song.image} alt="" decoding="async">
        {:else}
          <span class="ed-thumb-ph">♪</span>
        {/if}
        <input type="file" class="ed-thumb-file" accept="image/*" hidden onchange={onThumbFile}>
      </label>
      {#if song.image}
        <button type="button" class="ed-thumb-clear" title="移除图片" onclick={clearImage}>×</button>
      {/if}
    </span>
    <input class="ed-title" placeholder="曲名" bind:value={song.title} oninput={scheduleCustomSave}>
    {#if song.hidden}
      <span class="ed-hidden-flag" title="该曲目为隐藏曲，打歌时显示？？？">🔒 ？？？</span>
    {/if}
    <input
      class="ed-level"
      type="number"
      step="0.1"
      min="1"
      max="10.9"
      value={levelRaw}
      oninput={onLevelInput}
      onblur={onLevelBlur}
    >
    <button class="icon-btn danger" title="删除该曲目" onclick={delSong}>×</button>
  </div>

  <div class="ed-song-line2">
    <label class="ed-field ed-image-field" title="图片路径或 URL（如 assets/songs/xxx.jpg），或点上方缩略图上传">
      <span class="ed-field-label">图片</span>
      <input
        class="ed-image"
        type="text"
        placeholder="assets/songs/xxx.jpg 或 URL"
        value={imageRaw}
        oninput={onImageInput}
        onblur={onImageBlur}
      >
    </label>
    <label class="ed-field">
      <span class="ed-field-label">难度</span>
      <select class="ed-diff" value={song.diff || "bsc"} onchange={(e) => { song.diff = e.currentTarget.value; scheduleCustomSave(); }}>
        <option value="bsc">BSC（绿）</option>
        <option value="adv">ADV（黄）</option>
        <option value="ext">EXT（红）</option>
      </select>
    </label>
    {#if slotIndex > 0}
      <label class="ed-field ed-hidden">
        <input
          type="checkbox"
          class="ed-hidden-check"
          checked={song.hidden}
          onchange={(e) => { song.hidden = e.currentTarget.checked; scheduleCustomSave(); }}
        >
        <span>隐藏曲（打歌显示？？？）</span>
      </label>
    {/if}
  </div>
</div>

<style>
  .ed-song {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid #E3F0FA;
    border-radius: 10px;
  }

  .ed-song-line1 {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .ed-song-line2 {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding-left: 26px;
  }

  .ed-song-idx {
    min-width: 26px;
    flex: none;
    text-align: center;
    color: var(--muted);
    font-size: 11px;
    font-weight: 700;
  }

  .ed-song.alt {
    background: rgba(255, 243, 213, 0.45);
  }

  .ed-song.hidden {
    background: #FFF8FB;
    border-color: #F0C9D8;
  }

  .ed-hidden {
    cursor: pointer;
    user-select: none;
  }

  .ed-hidden input {
    accent-color: var(--cyan);
  }

  .ed-hidden-flag {
    flex: none;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    color: #A34E7E;
    background: #FBEDF5;
    border: 1px solid #F0CFE1;
    border-radius: 999px;
    padding: 2px 8px;
    white-space: nowrap;
  }

  .ed-thumb-wrap {
    position: relative;
    flex: none;
    width: 40px;
    height: 40px;
  }

  .ed-thumb {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    border: 1px dashed #A9D4F2;
    background: #EAF5FE;
    color: #8BBDE3;
    font-size: 15px;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .ed-thumb:hover {
    border-color: var(--cyan);
    box-shadow: 0 0 0 3px rgba(47, 168, 240, 0.12);
  }

  .ed-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .ed-thumb-clear {
    position: absolute;
    top: -7px;
    right: -7px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1px solid #F1B7C3;
    background: #FFFFFF;
    color: #D64B6B;
    font-size: 12px;
    line-height: 1;
    cursor: pointer;
    padding: 0;
  }

  .ed-title { flex: 1; }
  .ed-level { width: 76px; flex: none; }

  .ed-title, .ed-level {
    min-width: 0;
    background: #FFFFFF;
    border: 1px solid #C9E4F7;
    border-radius: 8px;
    padding: 6px 8px;
    font-size: 13px;
    color: var(--text);
    font-family: inherit;
  }

  .ed-title:focus, .ed-level:focus {
    outline: none;
    border-color: var(--cyan);
    box-shadow: 0 0 0 3px rgba(47, 168, 240, 0.15);
  }

  .ed-image {
    width: 220px;
    min-width: 0;
    background: #FFFFFF;
    border: 1px solid #C9E4F7;
    border-radius: 8px;
    padding: 5px 8px;
    font-size: 12px;
    color: var(--text);
    font-family: inherit;
  }

  .ed-image:focus {
    outline: none;
    border-color: var(--cyan);
    box-shadow: 0 0 0 3px rgba(47, 168, 240, 0.15);
  }

  .ed-image::placeholder {
    color: #A5B8CE;
  }
</style>
