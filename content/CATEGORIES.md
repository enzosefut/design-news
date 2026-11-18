# 条目分类（`category`）

首页筛选与各处的系列标签都读 `items.json` 与条目 Markdown front matter 里的 **`category`**，请两边保持一致。

| 键值 `category` | 界面名称     | 适用内容 |
|-----------------|--------------|----------|
| `x`             | X 设计动态   | 品牌在 X 上的识别、UI、工艺、物件设计等（默认栏目） |
| `game`          | 娱乐设计动态 | 电子游戏相关：角色/美术设定、游戏 UI、游戏内视觉与预告等 |
| `ai`            | AI 辅助设计日报 | 工具、agent、MCP、生成式产品与工作流 |

## 何时用 `game`

- Creative Uncut 等发布的 **角色设定、职业图、主视觉**（FF、Persona、DMC 等）
- **可玩产品的界面**（独立游戏 HUD、调酒/模拟类 UI 等）
- 以 **游戏作品** 为主体的预告或美术成片

不属于 `game` 的示例：体育联赛品牌（如 MLB）、电影海报、纯品牌识别、通用工具帖。

## 写入方式

**`content/YYYY-MM-DD-items.json`** 中每条：

```json
{ "id": "…", "category": "game", "title": "…", … }
```

**`content/items/YYYY-MM-DD-{slug}.md`** front matter：

```yaml
category: game
```

构建后会生成当日索引 `/design-news/YYYY-MM-DD/game/`（仅当该日有条目时）。permalink 仍为 `/design-news/YYYY-MM-DD/{slug}/`。