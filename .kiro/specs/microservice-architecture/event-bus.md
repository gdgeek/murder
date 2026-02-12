# 事件总线设计（Redis Pub/Sub）

## 设计原则

- 同步 REST 仅用于**查询**（GET 类操作）和**需要即时响应的命令**（如扣费）
- 状态变更的**下游通知**通过事件总线异步传播
- 每个事件有唯一的 channel 和标准化的 message schema

## 事件 Schema

```typescript
// 统一事件信封
interface DomainEvent<T = unknown> {
  eventId: string;          // UUID
  timestamp: string;        // ISO 8601
  source: string;           // 发布服务名
  type: string;             // 事件类型（与 channel 一致）
  payload: T;
}
```

## 事件目录

| Channel | 发布者 | 订阅者 | 说明 |
|---------|--------|--------|------|
| `events:feedback:submitted` | feedback-service | knowledge-service, progression-service, creation-service | 新评价提交 |
| `events:feedback:threshold-reached` | feedback-service | creation-service | 某剧本低分维度达到自动优化阈值 |
| `events:feedback:extraction-ready` | feedback-service | knowledge-service | 某剧本反馈数量达到知识提炼阈值 |
| `events:knowledge:weights-updated` | knowledge-service | creation-service | 知识权重批量更新完成 |
| `events:knowledge:entry-deprecated` | knowledge-service | creation-service | 知识条目被自动弃用 |
| `events:game:completed` | gameplay-service | progression-service, feedback-service | 游戏会话结束 |
| `events:game:evaluation-ready` | gameplay-service | progression-service | AI DM 评价生成完成 |
| `events:script:generated` | creation-service | progression-service | 新剧本生成完成 |
| `events:script:played` | gameplay-service | progression-service | 剧本被游玩一次 |
| `events:designer:level-up` | progression-service | creation-service | 设计师等级提升（解锁新牌） |
| `events:player:level-up` | progression-service | auth-service | 玩家等级提升 |

## 事件 Payload 定义

```typescript
// events:feedback:submitted
interface FeedbackSubmittedPayload {
  feedbackId: string;
  scriptId: string;
  sessionId: string;
  userId: string;
  plotScore: number;
  difficultyScore: number;
  characterScore: number;
  overallScore: number;
  comment: string;
  playerGamesPlayed: number;
}

// events:feedback:threshold-reached
interface FeedbackThresholdPayload {
  scriptId: string;
  dimension: string;
  avgScore: number;
  totalFeedbacks: number;
}

// events:feedback:extraction-ready
interface FeedbackExtractionReadyPayload {
  scriptId: string;
  totalTextFeedbacks: number;
  totalSuggestions: number;
}

// events:knowledge:weights-updated
interface KnowledgeWeightsUpdatedPayload {
  updatedEntryIds: string[];
  trigger: 'feedback' | 'manual';
  affectedGameTypes: string[];
}

// events:game:completed
interface GameCompletedPayload {
  sessionId: string;
  scriptId: string;
  scriptDesignerId: string;
  playerIds: string[];
  endingId: string;
  duration: number;
}

// events:script:generated
interface ScriptGeneratedPayload {
  scriptId: string;
  designerId: string;
  version: string;
  gameType: string;
  skillCardIds: string[];
  generationCost: number;
}

// events:script:played
interface ScriptPlayedPayload {
  scriptId: string;
  designerId: string;
  sessionId: string;
}

// events:designer:level-up
interface DesignerLevelUpPayload {
  designerId: string;
  newLevel: number;
  previousLevel: number;
  newPointBudget: number;
  newlyUnlockedCardIds: string[];
}
```

## 事件处理流程

```
玩家提交评价:
  feedback-service 存储评价
    → 响应用户"提交成功"
    → 发布 events:feedback:submitted
        → knowledge-service: 更新知识条目有效性分数
            → 发布 events:knowledge:weights-updated
                → creation-service: 失效 RAG 缓存
        → progression-service: 更新设计师 XP、检查成就
        → creation-service: 检查是否需要自动优化
    → 检查阈值
        → 发布 events:feedback:threshold-reached（如果触发）
        → 发布 events:feedback:extraction-ready（如果触发）

游戏结束:
  gameplay-service 更新会话状态
    → 发布 events:game:completed
        → progression-service: 发放游戏币奖励、更新玩家 XP、检查成就、解锁收藏
        → feedback-service: 准备评价表单
    → 发布 events:script:played
        → progression-service: 更新设计师 XP
```

## 事件可靠性保障

```typescript
// 发布端：至少一次投递
async function publishEvent<T>(channel: string, payload: T): Promise<void> {
  const event: DomainEvent<T> = {
    eventId: uuid(),
    timestamp: new Date().toISOString(),
    source: SERVICE_NAME,
    type: channel,
    payload
  };
  // 1. 先写入 MySQL 事件表（outbox pattern）
  await db.insert('outbox_events', event);
  // 2. 再发布到 Redis
  try {
    await redis.publish(channel, JSON.stringify(event));
    await db.update('outbox_events', event.eventId, { published: true });
  } catch (err) {
    // Redis 不可用时，由定时任务重试未发布的事件
    logger.warn('Event publish failed, will retry', { channel, eventId: event.eventId });
  }
}

// 订阅端：幂等处理
async function handleEvent<T>(event: DomainEvent<T>): Promise<void> {
  const processed = await db.exists('processed_events', event.eventId);
  if (processed) return;
  await processEventPayload(event);
  await db.insert('processed_events', { eventId: event.eventId, processedAt: new Date() });
}
```

每个服务维护两张辅助表（由 `@murder-mystery/event-bus` 包的迁移脚本自动创建）：
- `outbox_events`：发布端 outbox，定时任务扫描未发布的事件重试
- `processed_events`：订阅端去重表，确保幂等
