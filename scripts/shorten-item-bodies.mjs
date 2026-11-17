import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ITEMS_DIR = path.join(process.cwd(), "content", "items");
const SHORT = {
  allo: "joshpuckett 发布免费开源字体 **Allo**：从 Inter 4.1 重绘，可变字重与 roundness 轴、自动光学尺寸、真斜体与风格替换。官网 logo 是会互动的角色。",
  "die-grotesk":
    "Klim 首款零售可变字体 **Die Grotesk**，Kris Sowersby 回应 Helvetica 光学尺度：opsz 6–42、wght 100–900，静态切分 A/B/C/D 光学子家族。",
  mlb: "Mother Design 为 MLB 推进「Modernize Nostalgia」：1968 击球员标保留，五套定制字体（Franklin、Clarendon、Script、Block、Flare）重绘字标与球场图形系统。",
  kuda: "Barkas 为尼日利亚数字银行 Kuda 围绕「More Life」建识别：定制字体 Kuda Modena（Erkin Karamemet）与单独绘制的奈拉符号。",
  olearius:
    "vrai studio 为 Olearius 橄榄油做深色瓶身：无纸标、金色字标，瓶脊竖排印庄园 GPS 坐标（Provence / Sardinia 庄园）。",
  likeweiss:
    "OlssønBarbieri 为 Pfalz 3L bag-in-box 霞多丽做识别：戏仿名 Likeweiß、手写大字标与酒标线描，概念「Wine from a changing world」。",
  cannes:
    "TAVERN 把 Kir Royale 装进 222 mL 罐：Cannes 谐音 cans，在戛纳首发；法国原料与 Riviera 条纹、十字纹样包装。",
  vsgoods:
    "VS/Goods 把 Jitter mockup 模板做成可逛的店铺：页面从亮白翻到暗色货架，页脚带旋转表盘，售卖 plug-and-play 动效模板。",
  "miggi-iphone":
    "miggi 用 Figma 3D Transforms 与 Motion 做 Apple iPhone 对开开合动画，工具链和方法本身即是作品。",
  "ramin-tickets":
    "Ramin Nasibov 展示足球票务 App 原型：下单前可先预览座位视角，交互以视频呈现。",
  "ramin-sweater":
    "Ramin 毛衣系列里的草皮款：下摆斜纹「刚割过的草坪」，绣着骑割草机的小人——细节以帖中配图为准。",
  "marvel-app":
    "Mondra 发布新版 Marvel Comics App 界面截图：暗色底、封面主视觉与 Read Now / Save，底栏 Home / Explore / Library / Account。",
  "ahmed-metal": "Ahmed 进行中的金属条形标志探索（Logo mark in progress），以帖中单图为准。",
  "ahmed-nectai":
    "未采用的 **NectAi** 识别探索：绿色字标与半调海报，文案「Every answer has a source」。",
  "ahmed-spectr":
    "Ahmed 为 spectr 做粉橙几何珐琅徽章与户外广告，主张标志应自己成立、故事留给追问的人。",
  "sheared-type":
    "rettuce 的 Sheared Type：六块齐边面板里塞进对比极大的字，周期性重新拉斜并带硬边投影（作者日文说明的意译）。",
  "object-01":
    "Nako Baev 的 THE OBJECT 01：回收 PETG 模块 3D 打印躺椅，视似混凝土、约 20kg、Kyoto Fog 灰（尺寸以来源页为准）。",
  "fate-samurai":
    "Creative Uncut 发布《Fate/Samurai Remnant》Rogue Saber 角色设定原画，本条仅收录该角色相关图。",
  pokemon:
    "Creative Uncut 的《宝可梦 太阳／月亮》概念图：Lillie、Kiawe、Mallow、Guzma，取自同页角色原画。",
  "anima-canvas":
    "Anima 的 Agentic Canvas（AgentGrid.io）：免费浏览器画布，人与 MCP 代理编辑同一份 HTML/CSS；可导出或分享，文件默认仅存本机。Product Hunt 日榜第 6（2026-11-15）。",
  "marcel-underlay":
    "Marcel 撰文介绍 Underlay 用 Claude Code 经 Figma 插件 API 直接改 490 屏（244 桌面 + 246 移动），五条约束文件撑起体量，设计决策仍在团队。",
  code2video:
    "Kaggle × HeyGen × HyperFrames 上线 Code2Video Arena：168 条 brief 盲投比较模型生成动态设计；截至公告时领先 Gemini 4 Carbon (High)。",
};

for (const file of fs.readdirSync(ITEMS_DIR)) {
  if (!file.endsWith(".md")) continue;
  const slug = file.replace(/^2026-11-17-/, "").replace(/\.md$/, "");
  const text = SHORT[slug];
  if (!text) {
    console.warn("skip", slug);
    continue;
  }
  const raw = fs.readFileSync(path.join(ITEMS_DIR, file), "utf8");
  const { data } = matter(raw);
  delete data.facts;
  delete data.sources;
  delete data.quote;
  if (!data.tag && data.deck) data.tag = String(data.deck).slice(0, 56);
  if (data.official === null) delete data.official;
  const out = matter.stringify(`\n${text}\n`, data);
  fs.writeFileSync(path.join(ITEMS_DIR, file), out);
  console.log("shortened", slug);
}