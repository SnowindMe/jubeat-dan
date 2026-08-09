/* ============================================================
 * 把 data.json 同步生成 js/data.js（本地双击打开时的兜底数据）
 * 用法：node tools/sync-data.js
 * 数据请只编辑 data.json，本文件内容由脚本覆盖生成。
 * ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const raw = fs.readFileSync(path.join(root, "data.json"), "utf8");
const json = JSON.parse(raw);

const js =
  "/* ============================================================\n" +
  " * 此文件由 tools/sync-data.js 从 data.json 自动生成，请勿手改。\n" +
  " * 修改数据请编辑 data.json，然后运行：node tools/sync-data.js\n" +
  " * 作用：作为本地双击打开（file://）时的数据兜底。\n" +
  " * ============================================================ */\n\n" +
  "var SITE_INFO = " + JSON.stringify(json.site, null, 2) + ";\n\n" +
  "var APP_CONFIG = " + JSON.stringify(json.config, null, 2) + ";\n\n" +
  "var DAN_DATA = " + JSON.stringify(json.dans, null, 2) + ";\n";

fs.writeFileSync(path.join(root, "js", "data.js"), js, "utf8");
console.log("已生成 js/data.js（段位数：" + json.dans.length + "）");
