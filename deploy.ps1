# ============================================================
# JUBEAT 段位挑战 · 一键部署脚本（GitHub + Cloudflare Pages）
# ------------------------------------------------------------
# 用法（在 PowerShell 中先设置环境变量，再运行本脚本）：
#   $env:GITHUB_TOKEN = "ghp_你的token"          # 可选
#   $env:CLOUDFLARE_API_TOKEN = "你的token"      # 可选
#   $env:CLOUDFLARE_ACCOUNT_ID = "你的账户ID"    # 可选
#   ./deploy.ps1
#
# 只想上传 GitHub：只设置 GITHUB_TOKEN 即可。
# 只想部署 Cloudflare：只设置两个 CLOUDFLARE_* 变量即可。
# 先试运行：./deploy.ps1 -DryRun
# 脚本会自动先构建前端（需要 Node.js 环境），再上传/部署。
# ============================================================
[CmdletBinding()]
param(
  [string]$GitHubUser = "SnowindME",
  [string]$RepoName = "jubeat-dan",
  [string]$ProjectName = "jubeat-dan",
  [string]$D1Name = "jubeat-dan",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

function Step([string]$msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Skip([string]$msg) { Write-Host "    (跳过) $msg" -ForegroundColor Yellow }

if ($DryRun) {
  Step "干跑模式：检查环境并列出将要执行的步骤"
  Write-Host "GITHUB_TOKEN          : $(if ($env:GITHUB_TOKEN) { '已设置' } else { '未设置' })"
  Write-Host "CLOUDFLARE_API_TOKEN  : $(if ($env:CLOUDFLARE_API_TOKEN) { '已设置' } else { '未设置' })"
  Write-Host "CLOUDFLARE_ACCOUNT_ID : $(if ($env:CLOUDFLARE_ACCOUNT_ID) { '已设置' } else { '未设置' })"
  Step "将执行："
  if ($env:GITHUB_TOKEN) {
    Write-Host "1. 构建前端（npm install + npm run build）"
    Write-Host "2. GitHub：创建公开仓库 $GitHubUser/$RepoName，推送 main，启用 GitHub Pages（Actions 工作流构建）"
  }
  if ($env:CLOUDFLARE_API_TOKEN -and $env:CLOUDFLARE_ACCOUNT_ID) {
    Write-Host "3. Cloudflare：创建 D1 数据库、执行 schema.sql、创建 Pages 项目并部署 dist"
  }
  if (-not $env:GITHUB_TOKEN -and -not ($env:CLOUDFLARE_API_TOKEN -and $env:CLOUDFLARE_ACCOUNT_ID)) {
    Write-Host "（未设置任何令牌，请先按脚本头部说明设置环境变量）" -ForegroundColor Yellow
  }
  exit 0
}

# ---------------- 0. 构建前端 ----------------
if ($env:GITHUB_TOKEN -or ($env:CLOUDFLARE_API_TOKEN -and $env:CLOUDFLARE_ACCOUNT_ID)) {
  Step "构建前端（Svelte 5 + Vite）"
  Push-Location $root
  try {
    if (-not (Test-Path "node_modules")) {
      npm install 2>&1 | Out-Null
    }
    npm run build 2>&1 | Out-Null
    Write-Host "    构建完成：dist/"
  } finally {
    Pop-Location
  }
}

# ---------------- 1. GitHub ----------------
if ($env:GITHUB_TOKEN) {
  Step "GitHub：创建仓库 $GitHubUser/$RepoName（公开）"
  $ghHeaders = @{
    Authorization = "token $env:GITHUB_TOKEN"
    Accept        = "application/vnd.github+json"
  }
  try {
    Invoke-RestMethod -Method Post -Uri "https://api.github.com/user/repos" -Headers $ghHeaders `
      -ContentType "application/json" `
      -Body (@{ name = $RepoName; description = "JUBEAT 段位挑战（音乐魔方）"; private = $false; has_issues = $true } | ConvertTo-Json) | Out-Null
    Write-Host "    仓库创建成功"
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 422) {
      Write-Host "    仓库已存在，继续推送"
    } else {
      throw
    }
  }

  Step "GitHub：推送代码到 main 分支"
  Push-Location $root
  try {
    if (-not (Test-Path ".git")) { git init | Out-Null }
    git add -A | Out-Null
    git commit -m "JUBEAT 段位挑战：站点、排行榜 API 与部署脚本" 2>$null | Out-Null
    if (-not (git remote | Select-String -Quiet "origin")) {
      git remote add origin "https://github.com/$GitHubUser/$RepoName.git"
    } else {
      git remote set-url origin "https://github.com/$GitHubUser/$RepoName.git"
    }
    $authHeader = "basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${GitHubUser}:$env:GITHUB_TOKEN"))
    git -c http.extraheader="AUTHORIZATION: $authHeader" push -u origin "HEAD:main" 2>&1 | Out-Null
    Write-Host "    已推送到 https://github.com/$GitHubUser/$RepoName"
  } finally {
    Pop-Location
  }

  Step "GitHub：启用 GitHub Pages（使用 .github/workflows/gh-pages.yml 构建）"
  try {
    Invoke-RestMethod -Method Post -Uri "https://api.github.com/repos/$GitHubUser/$RepoName/pages" -Headers $ghHeaders `
      -ContentType "application/json" `
      -Body (@{ build_type = "workflow" } | ConvertTo-Json) | Out-Null
    Write-Host "    已启用 Pages：https://$GitHubUser.github.io/$RepoName/"
  } catch {
    Write-Host "    Pages 启用请求未成功（可能已启用）：$($_.Exception.Message)" -ForegroundColor Yellow
  }
} else {
  Skip "未设置 GITHUB_TOKEN，跳过 GitHub 上传"
}

# ---------------- 2. Cloudflare ----------------
if ($env:CLOUDFLARE_API_TOKEN -and $env:CLOUDFLARE_ACCOUNT_ID) {
  Step "Cloudflare：创建 D1 数据库 $D1Name"
  $d1Out = npx --yes wrangler d1 create $D1Name 2>&1
  $d1Match = $d1Out | Select-String -Pattern "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}" | Select-Object -First 1
  if (-not $d1Match) { throw "无法从 wrangler 输出解析 D1 database_id" }
  $d1Id = $d1Match.Matches[0].Value
  Write-Host "    D1 database_id: $d1Id"

  Step "Cloudflare：写入 wrangler.toml 的 D1 绑定"
  $tomlPath = Join-Path $root "wrangler.toml"
  $toml = (Get-Content -Raw $tomlPath) -replace "REPLACE_WITH_D1_DATABASE_ID", $d1Id
  Set-Content -Path $tomlPath -Value $toml -Encoding UTF8

  Step "Cloudflare：执行 schema.sql 建表"
  Push-Location $root
  try {
    npx --yes wrangler d1 execute $D1Name --remote --file=./schema.sql 2>&1 | Out-Null
    Write-Host "    表已创建"
  } finally {
    Pop-Location
  }

  Step "Cloudflare：创建 Pages 项目并部署"
  Push-Location $root
  try {
    npx --yes wrangler pages project create $ProjectName --production-branch main 2>&1 | Out-Null
    npx --yes wrangler pages deploy dist --project-name $ProjectName --branch main 2>&1 | Out-Null
    Write-Host "    部署完成：https://$ProjectName.pages.dev/"
  } finally {
    Pop-Location
  }
} else {
  Skip "未设置 CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID，跳过 Cloudflare 部署"
}

Step "全部完成！"
