# creation-service（剧本杀制作）

> **实现工程**：本服务由独立工程 `murder-mystery-generator` 以微服务模式（`RUN_MODE=microservice`）运行实现。该工程同时支持独立模式（CLI + 独立 API），详见 [独立生成器开发计划](../../murder-mystery-ai-generator/standalone-generator-plan.md)。

## 数据库表

- `script_configs` — 剧本配置
- `scripts` — 剧本内容
- `tags` / `script_tags` — 标签
- `skill_cards` / `designer_decks` / `custom_decks` — 技能牌
- `interview_sessions` — 访谈会话
- `script_generation_records` — 生成记录（关联使用的模板版本、A/B测试变体等）

## REST API

### 配置
```
POST   /api/creation/configs                — 创建配置
GET    /api/creation/configs/:id            — 获取配置
```

### 剧本
```
POST   /api/creation/scripts/generate       — 生成剧本
GET    /api/creation/scripts                — 剧本列表
GET    /api/creation/scripts/:id            — 剧本详情
GET    /api/creation/scripts/:id/versions   — 版本历史
POST   /api/creation/scripts/:id/optimize   — 反馈优化
GET    /api/creation/scripts/search         — 标签搜索
```

### 标签
```
GET    /api/creation/tags                   — 标签列表
POST   /api/creation/tags                   — 创建标签
POST   /api/creation/tags/script/:id        — 为剧本添加标签
DELETE /api/creation/tags/script/:id/:tagId — 移除标签
```

### 技能牌
```
GET    /api/creation/skill-cards            — 所有技能牌
GET    /api/creation/skill-cards/:id        — 技能牌详情
GET    /api/creation/skill-cards/unlocked   — 已解锁技能牌（需设计师等级）
POST   /api/creation/skill-cards/validate   — 校验选牌（点数预算）
```

### 设计师牌库
```
GET    /api/creation/deck                   — 设计师牌库
GET    /api/creation/custom-decks           — 自定义牌组列表
POST   /api/creation/custom-decks           — 创建牌组
PUT    /api/creation/custom-decks/:id       — 更新牌组
DELETE /api/creation/custom-decks/:id       — 删除牌组
```

### 访谈
```
POST   /api/creation/interviews             — 开始访谈
POST   /api/creation/interviews/:id/answer  — 提交回答
POST   /api/creation/interviews/:id/summary — 生成摘要
PUT    /api/creation/interviews/:id/confirm — 确认摘要
DELETE /api/creation/interviews/:id         — 取消访谈
GET    /api/creation/interviews/:id         — 获取访谈详情
```

### 内部API（供其他服务调用）
```
GET    /api/internal/scripts/:id            — 获取剧本完整内容（gameplay调用）
GET    /api/internal/scripts/:id/dm-handbook — 获取DM手册（gameplay调用）
GET    /api/internal/scripts/:id/player-handbooks — 获取玩家手册列表
GET    /api/internal/scripts/:id/materials  — 获取物料
GET    /api/internal/scripts/:id/branch-structure — 获取分支结构
GET    /api/internal/scripts/:id/config     — 获取剧本配置（含玩家人数等）
GET    /api/internal/scripts/:id/designer   — 获取剧本创建者ID
POST   /api/internal/cache/invalidate       — 缓存失效通知（knowledge-service调用）
```

## 事件订阅
- `events:feedback:threshold-reached` → 触发自动优化
- `events:knowledge:weights-updated` → 失效 RAG 缓存
- `events:designer:level-up` → 更新技能牌解锁状态
