# ai-toolchain-service（AI工具链）

## 数据库表

- `prompt_templates` / `prompt_versions` — 提示词模板与版本
- `few_shot_examples` — 少样本示例
- `reasoning_chains` — 推理链模式
- `token_usage_records` — Token用量记录
- `ab_tests` / `ab_test_feedbacks` — A/B测试
- `plugin_configs` — 插件配置

## REST API

所有公开 API 统一使用 `/api/toolchain/` 前缀，保持"一服务一前缀"的简洁性原则。

### 提示词模板
```
GET    /api/toolchain/prompt-templates       — 模板列表
POST   /api/toolchain/prompt-templates       — 创建模板
GET    /api/toolchain/prompt-templates/:id   — 模板详情
PUT    /api/toolchain/prompt-templates/:id   — 更新模板
GET    /api/toolchain/prompt-templates/:id/versions  — 版本历史
POST   /api/toolchain/prompt-templates/:id/rollback  — 回滚版本
POST   /api/toolchain/prompt-templates/:id/render    — 渲染预览
```

### 少样本示例
```
GET    /api/toolchain/few-shot-examples      — 示例列表
POST   /api/toolchain/few-shot-examples      — 创建示例
GET    /api/toolchain/few-shot-examples/:id  — 示例详情
PUT    /api/toolchain/few-shot-examples/:id  — 更新示例
DELETE /api/toolchain/few-shot-examples/:id  — 弃用示例
```

### 推理链
```
GET    /api/toolchain/reasoning-chains       — 推理链列表
POST   /api/toolchain/reasoning-chains       — 创建推理链
GET    /api/toolchain/reasoning-chains/:id   — 推理链详情
PUT    /api/toolchain/reasoning-chains/:id   — 更新推理链
```

### Token用量
```
GET    /api/toolchain/token-usage/stats      — 用量统计
GET    /api/toolchain/token-usage/daily      — 每日用量
PUT    /api/toolchain/token-usage/threshold  — 设置预警阈值
```

### A/B测试
```
POST   /api/toolchain/ab-tests               — 创建测试
GET    /api/toolchain/ab-tests               — 测试列表
GET    /api/toolchain/ab-tests/:id           — 测试详情
GET    /api/toolchain/ab-tests/:id/result    — 测试结果
POST   /api/toolchain/ab-tests/:id/complete  — 结束测试
POST   /api/toolchain/ab-tests/:id/cancel    — 取消测试
```

### 多媒体资源（插件驱动）
```
POST   /api/toolchain/media/tts              — TTS语音合成
POST   /api/toolchain/media/tts/pre-generate — 批量预生成语音
POST   /api/toolchain/media/image            — AI图片生成
POST   /api/toolchain/media/music            — AI音乐生成
POST   /api/toolchain/media/video            — AI视频生成
GET    /api/toolchain/media/assets/:id       — 获取已生成的资源
```

### 内部API（供其他服务调用）
```
GET    /api/internal/prompt-templates/active/:category — 获取某类别的活跃模板
POST   /api/internal/prompt-templates/:id/render       — 渲染模板
GET    /api/internal/few-shot-examples/select           — 按类别和游戏类型选取示例
  Query: { category: string, gameType: string, topK: number }
GET    /api/internal/reasoning-chains/match              — 按场景匹配推理链
  Query: { scenario: string, gameType: string }
POST   /api/internal/ab-tests/assign                     — 分配A/B测试变体
POST   /api/internal/ab-tests/:id/link-feedback          — 关联反馈到变体
POST   /api/internal/token-usage/record                  — 记录Token用量
GET    /api/internal/token-usage/check-threshold          — 检查是否超过预警阈值
POST   /api/internal/media/tts/speak                     — 实时TTS
GET    /api/internal/media/assets/:id/url                 — 获取资源URL
```
