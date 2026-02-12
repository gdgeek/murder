# 服务间通信协议

## 同步 REST 调用（查询 + 即时命令）

```
creation-service     ──► knowledge-service      (RAG检索)
creation-service     ──► auth-service            (验证用户)
creation-service     ──► progression-service     (查询设计师等级、扣费)
creation-service     ──► ai-toolchain-service    (获取提示词模板、少样本示例、推理链、A/B测试分配、记录Token)
gameplay-service     ──► creation-service        (获取剧本内容)
gameplay-service     ──► auth-service            (验证用户)
gameplay-service     ──► ai-toolchain-service    (AI DM的提示词模板、Token追踪、TTS/多媒体资源)
gameplay-service     ──► knowledge-service       (AI DM回答时检索知识)
progression-service  ──► creation-service        (排行榜需要剧本评分数据)
ai-toolchain-service ──► auth-service            (A/B测试关联反馈时查询玩家信息)
feedback-service     ──► auth-service            (获取评价者游玩次数，用于权重计算)
```

## 异步事件（状态变更通知）

```
feedback-service     ~~► knowledge-service       (评价提交 → 权重更新)
feedback-service     ~~► progression-service     (评价提交 → 设计师XP)
feedback-service     ~~► creation-service        (低分阈值 → 自动优化)
knowledge-service    ~~► creation-service        (权重更新 → 缓存失效)
gameplay-service     ~~► progression-service     (游戏完成 → 奖励发放)
gameplay-service     ~~► feedback-service        (游戏完成 → 准备评价)
creation-service     ~~► progression-service     (剧本生成 → 设计师XP)
progression-service  ~~► creation-service        (设计师升级 → 解锁新牌)
```

## 认证传递

所有服务间内部调用通过 `X-Internal-Service-Key` header 认证，值为共享密钥（环境变量配置）。

前端请求携带 JWT token，各服务共享 JWT_SECRET 自行验证 token，减少服务间调用。

## 数据一致性

- 各服务拥有独立数据库，不直接访问其他服务的数据库
- 跨服务查询通过 REST API 调用
- 跨服务状态变更通过事件总线异步传播
- 关键操作（如扣费+生成）使用补偿事务模式（先扣费，失败则退费）
- 事件投递使用 Outbox Pattern 保证至少一次投递
- 事件消费使用去重表保证幂等处理

## 错误响应格式（统一）

```json
{
  "error": "错误描述",
  "code": "ERROR_CODE",
  "retryable": false,
  "details": {}
}
```

## 内部 API 错误码体系

所有 `/api/internal/*` 端点使用标准化错误码，调用方根据 `retryable` 字段决定是否重试：

| HTTP 状态码 | 错误码 | 含义 | 可重试 |
|------------|--------|------|--------|
| 400 | `INVALID_PARAMS` | 请求参数校验失败 | 否 |
| 401 | `INVALID_SERVICE_KEY` | 内部服务密钥无效 | 否 |
| 404 | `RESOURCE_NOT_FOUND` | 请求的资源不存在 | 否 |
| 409 | `INSUFFICIENT_BALANCE` | 余额不足（扣费场景） | 否 |
| 409 | `DUPLICATE_OPERATION` | 重复操作（幂等检查） | 否 |
| 422 | `BUSINESS_RULE_VIOLATION` | 业务规则冲突 | 否 |
| 500 | `INTERNAL_ERROR` | 服务内部错误 | 是 |
| 502 | `UPSTREAM_UNAVAILABLE` | 上游依赖不可用 | 是 |
| 503 | `SERVICE_OVERLOADED` | 服务过载 | 是（退避重试） |
| 504 | `UPSTREAM_TIMEOUT` | 上游依赖超时 | 是 |

调用方重试策略：
- 可重试错误：最多 3 次，指数退避（1s → 2s → 4s）
- 不可重试错误：立即失败，触发补偿逻辑（如退费）

## 补偿事务（Saga 模式）

跨服务的关键操作使用 Saga 模式保证最终一致性。每个步骤定义正向操作和补偿操作：

### 剧本生成 Saga

```
步骤1: progression-service 扣费
  正向: POST /api/internal/economy/consume { userId, amount, scriptConfigId }
  补偿: POST /api/internal/economy/refund  { transactionId, reason: "generation_failed" }

步骤2: ai-toolchain-service 分配 A/B 测试变体
  正向: POST /api/internal/ab-tests/assign { category, userId }
  补偿: 无需补偿（分配记录保留用于统计）

步骤3: knowledge-service RAG 检索
  正向: POST /api/internal/rag/retrieve-batch { queries, gameType }
  补偿: 无需补偿（只读操作）

步骤4: LLM 生成剧本
  正向: 调用 LLM API
  补偿: 无需补偿（幂等操作）

步骤5: creation-service 存储剧本
  正向: 写入 scripts 表
  补偿: 删除已写入的剧本记录
```

Saga 状态追踪：

```typescript
interface SagaRecord {
  sagaId: string;
  type: 'script_generation';
  status: 'started' | 'completed' | 'compensating' | 'compensated' | 'failed';
  steps: SagaStep[];
  createdAt: Date;
  updatedAt: Date;
}

interface SagaStep {
  name: string;
  status: 'pending' | 'completed' | 'compensated' | 'compensation_failed';
  forwardResult?: unknown;
  compensationResult?: unknown;
}
```

补偿失败处理：
- 补偿操作本身失败时，Saga 状态标记为 `failed`
- 定时任务扫描 `failed` 状态的 Saga，重试补偿
- 连续 3 次补偿失败后，写入 `dead_letter_sagas` 表，等待人工介入
- 管理员可通过内部 API 查看和手动处理失败的 Saga

## 降级策略

降级行为通过 `policy.json` 中的 `degradation` 配置节定义，不硬编码在代码中：

| 服务不可用 | 影响范围 | 降级行为（由 policy.json 配置） |
|-----------|---------|-------------------------------|
| auth-service | 全部 | 各服务本地 JWT 验证仍可工作（共享 JWT_SECRET），仅注册/登录不可用 |
| knowledge-service | 剧本生成 | `degradation.knowledgeService.fallbackMode` → 使用本地 Skill 模板兜底，标记 `ragFallback: true` |
| ai-toolchain-service | 剧本生成、AI DM | `degradation.aiToolchainService.promptFallbackMode` → 使用默认提示词模板；`ttsFallbackMode` → 回退到文字模式 |
| progression-service | 奖励发放 | `degradation.progressionService.fallbackMode` → 事件存入 outbox，服务恢复后重放 |
| feedback-service | 评价提交 | `degradation.feedbackService.fallbackMode` → 前端缓存评价数据，服务恢复后重新提交 |

## RAG 检索延迟控制策略

creation-service 与 knowledge-service 之间的 RAG 检索是剧本生成的关键路径（同步阻塞），需要专门的延迟控制策略：

### 1. Redis 缓存热点知识

creation-service 侧用 Redis 缓存 RAG 查询结果：
- 缓存 key：`rag:{gameType}:{sha256(query_text)}`
- TTL：由 policy.json 中 `rag.cacheTimeoutSeconds` 配置（默认600秒）
- knowledge-service 在知识条目权重更新后，发布 `events:knowledge:weights-updated` 事件
- creation-service 订阅该事件后失效相关缓存

### 2. 配置阶段预取

用户在填写配置参数和进行访谈时，creation-service 提前发起 RAG 预检索：
- 用户提交 Config 后立即异步预取（不阻塞响应）
- 用户完成访谈确认摘要后，用更精确的上下文再次预取
- 预取结果存入 Redis，生成时直接命中缓存

```
时间线：
  用户填写配置 ──► 异步预取 RAG（粗粒度）
  用户进行访谈 ──► ...
  用户确认摘要 ──► 异步预取 RAG（精确）
  用户点击生成 ──► 命中缓存，直接组装提示词 ──► 调用 LLM
```

### 3. 超时降级

creation-service 调用 knowledge-service 设置硬超时和降级策略：
- 超时阈值：由 policy.json 中 `rag.retrieveTimeoutMs` 配置（默认3000ms）
- 降级方案：使用本地 Skill 模板兜底
- 降级时在 script_generation_records 中标记 `ragFallback: true`

```typescript
async function getRAGContext(config: ScriptConfig): Promise<KnowledgeEntry[]> {
  try {
    const cached = await redis.get(`rag:${config.gameType}:${hash(config)}`);
    if (cached) return JSON.parse(cached);

    const result = await axios.post(
      `${KNOWLEDGE_SERVICE_URL}/api/internal/rag/retrieve`,
      { query, gameType, topK: policy.rag.defaultTopK },
      { timeout: policy.rag.retrieveTimeoutMs }
    );
    await redis.setex(
      `rag:${config.gameType}:${hash(config)}`,
      policy.rag.cacheTimeoutSeconds,
      JSON.stringify(result.data.entries)
    );
    return result.data.entries;
  } catch (err) {
    logger.warn('RAG retrieval failed, falling back to local skills', err);
    return [];  // 空列表触发 SkillService 兜底
  }
}
```

### 4. 批量检索接口

knowledge-service 支持一次请求检索多个维度，减少网络往返：

```
POST /api/internal/rag/retrieve-batch
  Body: {
    queries: [
      { query: "角色设计 民国 本格", category: "character_design", topK: 5 },
      { query: "线索设计 密室 本格", category: "clue_design", topK: 5 },
      { query: "诡计设计 不在场证明", category: "trick", topK: 5 },
      { query: "时间线构建 多角色", category: "timeline", topK: 5 }
    ],
    gameType: "honkaku",
    totalContextTokens: 4000
  }
```

单次请求替代 4 次往返，延迟从 `4 × RTT` 降到 `1 × RTT`。
