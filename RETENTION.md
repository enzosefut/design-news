# 媒体保留策略

本站线上媒体**只保留最近 60 天**（按 **Asia/Shanghai** 日历日计算）。首页与当日浏览目录仅展示这 60 天内的刊期。

## 过期后网站上会怎样

- **单条 permalink**（`content/items/` 与 `*-items.json`）**保留**，`/YYYY-MM-DD/{slug}/` 不会 404。
- 对应日期的 `media/YYYY-MM-DD/` 会从仓库移除；详情页不再渲染图片/视频，并显示说明「本期图片已归档」，短导语与主按钮仍可用。
- 数据里会标记 `mediaArchived: true`（日级或条目级），构建脚本据此切换版式。

## 归档命令

在仓库根目录：

```bash
# 仅打包已过期日期（输出 archive/design-news-YYYY-MM-DD.zip，不提交）
npm run archive

# 先打包，再删除过期媒体并写入 mediaArchived
npm run archive -- --prune
```

- 默认保留 **60** 天，可用环境变量 `RETENTION_DAYS` 覆盖（本地测试或特殊恢复场景）。
- 若当前没有过期日期，脚本以 0 退出并提示无操作。
- `archive/` 已在 `.gitignore` 中；zip 仅供离线备份，过期内容亦会在站外单独归档。

## 本地校验

```bash
npm run test:archive   # 临时目录内验证打包+修剪，不修改真实稿件
npm run build
```