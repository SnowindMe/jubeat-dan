# JUBEAT 段位挑战（音乐魔方）

一个纯静态的段位认定进度追踪站，数据全部保存在浏览器本地（localStorage），可选接入 Cloudflare D1 排行榜。

段位按 **jubeat 机台版本分组**展示（如 festo / clan / jubeat prop）：主页先显示「随机挑战」入口和版本列表，点开某个版本展开该版本下的段位文件夹网格，再点击文件夹弹出曲目卡片，可记录每首分数，达标自动判定通过。

主页列表第一项是「🎲 随机挑战」：从曲目池随机抽取 3 首生成挑战，分「全曲池 / 入門（Lv≤7）/ 上級（Lv8-9）/ 超上級（Lv10）」四档难度，支持换一组、记分数，达标自动判定通过；随机挑战结果独立保存在浏览器本地，并随导出存档一起备份。

管理后台页 `/admin`（部署后访问，需管理员密码验证）支持自定义段位：改名、填版本、设挑战模式、填金/银/铜奖牌线、改主题色、增删段位、排序、增删曲目、上传歌曲图片，修改实时保存到本机；「恢复默认数据」可回到 `data.json` 的版本。

## 技术栈（v2，Svelte 5 重构版）

- **Svelte 5**（runes）+ **Vite 8**：无虚拟 DOM，编译产物小，无运行时框架开销
- 双页面：`index.html`（主页）+ `admin.html`（管理后台），共享组件与响应式 store
- **样式按组件拆分**：组件独有样式写在各自 `.svelte` 的 `<style>` 里（自动作用域隔离）；设计令牌、重置与跨组件共享的类（按钮/曲目行/登录卡等）保留在 `src/app.css` 全局基座
- **Cloudflare Pages Functions + D1**：排行榜 API（`functions/api/leaderboard.js`）
- 零运行时依赖（canvas-confetti 为本地单文件，无 npm 依赖）

## 目录结构

```
├── index.html / admin.html   Vite 多页入口
├── src/
│   ├── main.js / admin-main.js   页面挂载入口
│   ├── App.svelte / AdminApp.svelte
│   ├── components/               UI 组件（主页 + 管理后台）
│   └── lib/
│       ├── data.svelte.js        构建时打包 data.json
│       ├── stores.svelte.js      集中式响应状态（进度/自定义数据/随机挑战/弹窗）
│       ├── pass.js               通过判定与数值逻辑（纯函数）
│       ├── leaderboard.svelte.js 排行榜 API 客户端
│       └── importexport.js       导出 / 导入存档
├── public/                       静态资源（图标、版本 Logo、canvas-confetti）
├── functions/api/leaderboard.js  排行榜 API（Cloudflare Pages Functions + D1）
├── data.json                     唯一数据源（构建时打包进 JS）
├── wrangler.toml                 Pages 构建输出目录 = dist
└── deploy.ps1                    一键部署脚本
```

## 本地开发

需要 Node.js 18+（推荐 20/22+）：

```powershell
npm install
npm run dev        # 开发服务器，默认 http://localhost:5173
npm run build      # 构建到 dist/
npm run preview    # 本地预览构建产物
```

开发时直接改 `data.json` 即可，保存后页面热更新（数据在构建时打包，开发模式同样生效）。

## 修改段位 / 曲目数据

**所有数据都在根目录的 `data.json` 里维护**，结构说明：

- `dans` 数组是段位列表，每个段位含 `id`（进度唯一标识）、`name`、`version`（所属版本）、`color`、`mode`、`criterion`（过段方式：`score` / `avg` / `rate`）、`passTotal` / `passAvg` / `passRate`（达标线，留空自动按每首 700,000 分换算）、`medals`（金/银/铜线）、`songMin`（单曲分数线）、`needFc`（FC 曲数要求）、`hidden` / `unlockCode`（隐藏段位）、`songs`（曲目位，可多选写成数组）
- 每首曲子可填 `title`、`level`、`diff`（bsc/adv/ext）、`mode`、`hidden`、`image`（推荐 `assets/songs/` 相对路径或 URL）
- 改完保存后重新构建部署：`npm run build`（本地开发时刷新即可）

> 旧版的 `js/data.js` 兜底文件与 `tools/sync-data.js` 已废弃删除：现在 Vite 在构建时直接打包 `data.json`，不需要任何同步步骤。

## 管理员密码

- 线上管理员密码由服务端校验，只认 D1 `admin_config` 表的 `pass_hash`（不再回退到代码里的默认值）
- 首次部署后请在 D1 Console 执行以下语句设置密码（`<新密码>` 替换为实际密码的 SHA-256）：
  ```sql
  INSERT INTO admin_config (key, value) VALUES ('pass_hash', '<SHA256哈希>')
  ON CONFLICT (key) DO UPDATE SET value = excluded.value;
  ```
- 日常改密：登录 `/admin` 后使用「🔑 修改密码」，自动写入 D1，无需重新部署
- `data.json` 中残留的 `config.admin.passHash` 仅作为前端是否启用密码验证的信号，不参与服务端校验
- 管理接口（反馈查看、排行榜管理）密码通过 `X-Admin-Pass` 请求头传递，不经过 URL

## 排行榜与登录（可选，Cloudflare Pages + D1）

工具栏的「🏆 排行榜」查看榜单，「👤 登录」设置昵称（昵称保存在本机，无密码，适合小圈子）。

- 通过段位后，段位卡片会出现「🏆 提交到排行榜」，达标即可提交
- 按（版本 × 段位 × 挑战模式 × 过段方式）分榜，每个设备只保留最好成绩（同榜重复提交自动覆盖）
- 身份以浏览器匿名设备 ID 为准（localStorage 自动生成），改名只会原地更新榜名，不会新增榜位
- 「👤 登录」可同时设置头像与姓名框（保存在本机）
- 「🔑 隐藏码」输入隐藏码可解锁对应版本的隐藏段位（段位数据中配置 `unlockCode`）
- 「📮 反馈」提交的意见会存入 D1 `feedback` 表，管理员在 `/admin` 的「反馈管理」中查看/删除
- 管理员可在 `/admin` 的「修改密码」中改密码（存于 D1 `admin_config` 表，无需重新部署）
- 页脚显示独立访客数（D1 `visitors` 表，按匿名哈希去重）
- 曲目图片已迁移到 Cloudflare R2（`SONG_IMAGES` 绑定），由 Pages Function 代理 `/assets/songs/*` 并做边缘缓存，不再依赖 remywiki 外链
- 排行榜结果使用 Workers KV（`LEADERBOARD_CACHE` 绑定）缓存 5 分钟，提交后自动失效；反馈/管理员/上榜接口按 IP 限流（D1 `rate_limits` 表）
- 未部署后端时，前端自动显示本地演示数据，其余功能不受影响
- 管理后台 `/admin` 的「🏆 排行榜管理」可查看全部记录并删除不当记录（删除操作在服务端验证管理员密码）

## 部署（免费）

仓库里备好一键部署脚本 [deploy.ps1](deploy.ps1)：设置好 GitHub / Cloudflare 的令牌环境变量后运行 `./deploy.ps1`，脚本会先构建 `dist/`，再完成 GitHub 上传 + GitHub Pages 启用 + Cloudflare D1 建库 + Pages 部署（先用 `-DryRun` 预览）。

手动部署：

1. `npm install && npm run build`
2. Cloudflare：`npx wrangler pages deploy dist --project-name jubeat-dan --branch main`（或用 [deploy.ps1](deploy.ps1)）
3. D1 绑定：在 Cloudflare 控制台创建 D1 数据库，执行根目录 `schema.sql`，并在 Pages 项目绑定变量名 `DB`
4. GitHub Pages：推送 main 分支后由 `.github/workflows/gh-pages.yml` 自动构建并发布（需在仓库 Settings → Pages 选择 GitHub Actions 作为来源）

本地调试排行榜：

```powershell
npx wrangler pages dev dist --d1 DB=<database-id>
```

## HTTPS

Cloudflare Pages 的 `*.pages.dev` 与 GitHub Pages 的 `*.github.io` 均自动提供免费 HTTPS，无需任何配置；绑定自定义域名时 Cloudflare 会自动签发免费证书（SSL/TLS 加密模式建议 Full (strict)）。

## 其他说明

- 进度保存在浏览器 localStorage，不同设备不互通，可用「⚙️ 设置」里的导出存档 / 导入存档迁移（导入带自定义段位的存档时可选择"只导入进度"或"进度 + 自定义"）
- 非官方站点，与 KONAMI 无关，曲目信息请以机台实际为准
