---
date: "2026-11-17"
slug: miggi-iphone
category: x
title: iPhone 对开动画
author: miggi
deck: Figma 3D Transforms 与 Motion 复刻 Apple iPhone 双机开合。
tweet: https://x.com/miggi/status/2122474018557350106
official: null
tweetId: "2122474018557350106"
facts:
  - label: 工具
    value: Figma 3D Transforms、Figma Motion
  - label: 主题
    value: Apple iPhone duo 开合动画
  - label: 性质
    value: 工具实验，无独立官网项目
sources:
  - label: miggi 原帖
    url: https://x.com/miggi/status/2122474018557350106
quote:
  text: "Playing around with 3D Transforms and @figma Motion and making Apple iPhone duo open animations."
  url: https://x.com/miggi/status/2122474018557350106
---

**miggi**（figgi 社区）这条视频帖是一次纯粹的 **Figma 动效实验**：用 **3D Transforms** 搭出两部 iPhone 的立体关系，再用 **Figma Motion** 做「对开 / 开合」过渡，视觉参考 Apple 产品页常见的双机构图。推文没有附带独立案例站或客户背景，应把内容理解为工具能力展示，而不是落地产品动画 spec。

3D Transforms 解决的是层级空间与透视；Motion 负责时间轴与缓动。没有后期合成软件，意味着贴图、阴影与机模边角都要在 Figma 内可维护——适合需要把交互原型直接交给开发对照的团队，但要接受渲染精度上限。

对 UI 动效设计师，此案的价值在流程：先在 Figma 里验证「双机拆开」的节奏与景深，再决定是否值得导出到 After Effects 或代码。若项目 deadline 紧，留在 Figma 可减少 handoff 成本；若需要实机光影，仍要外接 3D 工具。

学习路径很直接：跟做帖中结构，分别测试 hinge 轴心落在铰链边还是机身中心，观察 Motion 曲线对「苹果式」轻重的影响。不必虚构品牌 brief——原帖本身就是 playground 记录。