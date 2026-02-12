# feedback-service（反馈）

## 职责

评价数据的收集、存储、汇总和阈值检测。是事件总线的核心发布者之一。

## 数据库表

- `feedbacks` — 评价记录
- `live_suggestions` — 实时建议
- `feedback_aggregates` — 剧本评价汇总缓存

## REST API

### 评价
```
POST   /api/feedback               — 提交评价
GET    /api/feedback/script/:id    — 获取某剧本的汇总评价
GET    /api/feedback/script/:id/detail — 获取某剧本的详细评价列表
```

### 建议
```
POST   /api/feedback/suggestions   — 提交实时建议
GET    /api/feedback/suggestions/script/:id — 获取某剧本的建议列表
```

### 内部API
```
GET    /api/internal/feedback/script/:id/aggregated — 获取汇总评价（creation调用）
GET    /api/internal/feedback/script/:id/texts      — 获取文字评价和建议（knowledge调用）
```

## 事件订阅
- `events:game:completed` → 准备评价表单（标记会话可评价）

## 事件发布
- `events:feedback:submitted` — 新评价提交
- `events:feedback:threshold-reached` — 低分维度达到自动优化阈值
- `events:feedback:extraction-ready` — 反馈数量达到知识提炼阈值
