---
date: "2026-11-17"
slug: marcel-underlay
category: ai
title: Underlay · 490 屏 Figma 工作流
author: Marcel
deck: Claude Code 经 Figma API 直接改文件，244 桌面 + 246 移动，决策仍在人。
tweet: https://x.com/marcelkargul/status/2122430710053019994
official: https://kargul.studio/insights/how-we-use-ai-agents-for-product-design-in-2026
tweetId: "2122430710053019994"
facts:
  - label: 产品
    value: Underlay（机构一体化工作台）
  - label: 画面数量
    value: 490 屏（244 桌面 + 246 移动）
  - label: Brief
    value: 产品负责人 24 页
  - label: 工具
    value: Claude Code + Figma 插件 API
sources:
  - label: Kargul Studio 长文
    url: https://kargul.studio/insights/how-we-use-ai-agents-for-product-design-in-2026
quote:
  text: "we designed 490 screens with Claude Code working directly inside our Figma file."
  url: https://x.com/marcelkargul/status/2122430710053019994
---

**Marcel**（Kargul Studio）为机构工作台 **Underlay** 做产品设计的做法，在 X 上被概括为一句：**490 个画面，Claude Code 直接在 Figma 文件里工作**。其中 **244 个桌面 frame、246 个移动 frame**；**设计师对每个画面负责**，**产品负责人写了 24 页 brief**。Claude Code 通过 **Figma 插件 API** 改的是真文件——不是渲染效果图，也不是「建议布局」截图。帖内 X Article 链已 404，**正文应以官网长文** *how we use AI agents for product design in 2026* **为准**；本条无推文配图，不做假截图。

长文给出五条可复用纪律：

**1. 颜色全部走 Figma 变量，禁止手写 hex。** 基础色板 **244 个变量**，其上主题一层，再按用途绑定 token。坑：绑定变量时 Figma 会存 **fallback**，Claude 写成黑色，截图看起来正常，打开文件才暴露。

**2. `design-system.md` 跨会话记忆。** 每条规则一句话，附原因与日期；文中举例 44px 按钮、sheet 顶边 54 或 102、对比度等，需对照原文引用。

**3. 不预先堆组件库。** 先画真实屏幕，再把重复结构收成 **6 个块**：list card、sheet、form sheet、dock、bottom bar、empty state。

**4. 每批跑审计。** 查 fallback、裸 hex、文字样式、图标描边、clip——一次 **112 个图标描边错误**，另一次 **858 个框被错误 clip**。

**5. 纠正写回规则。** 能自动化的进审计；全局修正回灌旧稿（例如间距收至 8px 后 **59 个按钮** 一起改）。

结论写得直白：**体量 Claude 扛住了，设计决策没有外包**——品味与判断仍在团队。Underlay 覆盖项目、任务、聊天、发票、合同、会议等模块，是把代理当「批量执行层」而非创意总监。

若你要在团队复制，先准备变量宪法与 `design-system.md`，再谈提示词。没有文件化约束，490 屏只会放大 fallback 黑洞。