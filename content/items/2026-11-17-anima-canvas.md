---
date: "2026-11-17"
slug: anima-canvas
category: ai
title: Agentic Canvas
author: Anima
deck: 免费免登录浏览器画布，人与 MCP 代理共编同一份 HTML/CSS。
tweet: null
official: https://animaapp.com/blog/agentic/canvas/
facts:
  - label: 产品
    value: Agentic Canvas（AgentGrid.io）
  - label: 核心
    value: 真实 HTML/CSS，MCP 代理协同编辑
  - label: 布局映射
    value: Frame=页面，Auto layout=flexbox，Grid=CSS Grid
  - label: 导出
    value: HTML、PNG、SVG、PDF
  - label: Product Hunt
    value: 2025-11-15 日榜第 6
sources:
  - label: 在线画布
    url: https://agentgrid.io/canvas
  - label: Anima 博客
    url: https://animaapp.com/blog/agentic/canvas/
quote:
  text: "Free browser canvas where people and MCP agents edit the same real HTML/CSS."
  url: https://animaapp.com/blog/agentic/canvas/
---

Anima 联合创始人兼 CEO **Avishay Cohen** 推出 **Agentic Canvas**（挂在 **AgentGrid.io** 品牌下）：**免费、免登录** 的浏览器设计画布。人与 **MCP 代理** 编辑的是 **同一份真实 HTML/CSS**——不是截图上的建议框，也不是不可导出的专有对象树。

布局语义与前端对齐：**Frame 就是页面**；Figma 式 **Auto layout 映射 flexbox**；**网格即 CSS Grid**。可接入 **Claude、ChatGPT、Claude Code、Codex、Cursor** 等代理；代理运行时需 **保持画布标签页打开**，否则会话无法继续改同一份 DOM。

工作流支持从 **HTML、Figma 选区、图片** 导入，或让代理生成初稿后再手动拖拽、改色、调间距，然后把修改交回代理迭代。导出 **HTML、PNG、SVG、PDF**。**文件默认只存在当前浏览器本地**，不会自动云同步；只有发布公开链接时才需要账号。官方介绍强调「画布 = 真实代码」，避免设计 / 开发双轨 drift。

Product Hunt 于 **2025 年 11 月 15 日** 日榜排名第 **6**（与当期 AI 日报一致）。对团队而言，Canvas 把「设计工具」与「交付物」压成一层：代理改 class、人改 class，版本可在浏览器 devtools 与代理日志之间对照。

与纯 AI 出图工具不同，此案的关键约束是 **MCP + 实 HTML**：适合想保留 Tailwind / token 体系、又怕 Figma handoff 失真的产品组。若你试用，应先验证代理对你家组件命名与 CSS 变量的服从度，再决定是否替代静态原型。

隐私侧：默认本地存储意味着会话结束即自担备份；若要协作，需走官方公开链接与账号流程。报道链 Anima 博客与 agentgrid.io/canvas，不把 PH 排名写成产品成熟度证明。