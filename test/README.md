# 单元测试

运行：

```bash
npm test -w test
```

---

## 测试文件

### `result_panel.test.ts`

测试对象：`app/src/utils/result_panel.ts`

| 函数 | 用例 | 覆盖路径 |
|------|------|----------|
| `getResultStatement` | `'yes'` → 积极指示文案 | 积极分支 |
| `getResultStatement` | `'no'` → 消极指示文案 | 消极分支 |
| `getSummaryText` | 3 张牌含义 → 取前 2 句拼接、第 3 句截断 | 2 片段主流程；含标点的首句提取 |
| `getSummaryText` | 1 张牌含义 → 单片段无分隔符 | 1 片段（`join('、')` 单元素路径） |
| `getSummaryText` | 0 张牌 → 只返回引导语 | 空 `cardDetails` fallback |

---

### `tarotReading.test.ts`

测试对象：`app/src/utils/tarotReading.ts`

| 函数 | 用例 | 覆盖路径 |
|------|------|----------|
| `drawThreeCards` | 精确抽出 3 张 | slice(0, 3) 主流程 |
| `drawThreeCards` | 每张牌 position 为合法值 | `'upright' \| 'reversed'` 随机分支 |
| `drawThreeCards` | 抽到的牌均来自原始牌组 | 牌数据引用完整性 |
| `drawThreeCards` | 无重复牌（id 唯一） | Fisher-Yates shuffle 无碰撞 |

---

## 未覆盖的边界

以下场景在当前业务逻辑中**不可能发生**，暂不测试：

- `drawThreeCards` 传入不足 3 张的牌组（实际牌组固定 78 张）
- `getSummaryText` 传入全为标点的 meaning（数据来自后端受控 JSON）
