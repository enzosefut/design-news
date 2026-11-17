# 设计动态

**公开地址：** https://enzosefut.github.io/design-news/

面向设计团队的工作日笔记：「X 设计动态」与「AI 辅助设计日报」。静态站点，无需登录。

## 新增一天的稿件

1. 在 `content/` 下添加两个 Markdown 文件（文件名固定格式）：
   - `content/YYYY-MM-DD-x.md` — X 设计动态
   - `content/YYYY-MM-DD-ai.md` — AI 辅助设计日报

2. 每个文件顶部使用 YAML front matter：

```yaml
---
date: 2026-11-17
category: x
title: X 设计动态
---
```

`category` 只能是 `x` 或 `ai`；`date` 为 `YYYY-MM-DD`（Asia/Shanghai 语境下的刊发日）；`title` 为栏目标题。

3. front matter 下方写正文（标准 Markdown，链接会原样保留）。

4. （有图片时）新增同日配套文件：
   - `content/YYYY-MM-DD-items.json` — 每条作品的卡片元数据（`id`、`title`、`author`、`tweetId`、`category`、`cardAspect` 等；无图条目设 `typographic: true`）
   - `content/media-manifest-YYYY-MM-DD.json` — 原帖媒体 URL 清单（供下载脚本使用）
   - 运行 `npm run media`（或维护好 `media/YYYY-MM-DD/` 与 `media-meta.json`）

5. 推送到 `main` 分支。GitHub Actions 会构建站点，并将静态文件推送到 `gh-pages` 分支。

## GitHub Pages 首次启用

在仓库 [Settings → Pages](https://github.com/enzosefut/design-news/settings/pages) 任选其一（推荐方案 A）：

- **A. GitHub Actions**：Build and deployment → Source 选 **GitHub Actions**（与 `.github/workflows/pages.yml` 中的 `deploy-pages` 步骤配合）。
- **B. 分支发布**：Source 选分支 **`gh-pages`**、目录 **`/`**（每次 push 到 `main` 后工作流会更新该分支）。

启用后约 1 分钟可访问：**https://enzosefut.github.io/design-news/**

## 本地预览

```bash
npm install
npm run build
npx serve dist
```

站点使用项目路径前缀 `/design-news/`（与 GitHub Pages 项目站一致）。本地用 `serve` 时需在能处理该 base 的方式下访问，或直接用构建产物中的路径结构打开 `dist/index.html` 做粗略检查。

## permalink

- 首页：`/design-news/`
- 某日 X 栏：`/design-news/YYYY-MM-DD/x/`
- 某日 AI 栏：`/design-news/YYYY-MM-DD/ai/`