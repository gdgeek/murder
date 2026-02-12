# 子项目开发指南

## 目录结构

```
murder-mystery-design-kb/          ← 本知识库（设计文档仓库）
├── .kiro/specs/                   ← 需求、设计、架构文档
├── .kiro/skills/                  ← 领域知识
├── docker-compose.yml             ← 统一部署编排
├── init-db/                       ← 数据库初始化脚本
├── .env.example                   ← 环境变量模板
├── policy.json                    ← 共享策略配置
└── services/                      ← 各子项目（Git submodule 或独立目录）
    ├── auth-service/
    ├── creation-service/
    ├── gameplay-service/
    ├── knowledge-service/
    ├── ai-toolchain-service/
    ├── progression-service/
    ├── feedback-service/
    └── web-client/
```

## 共享包定义

### `@murder-mystery/shared`（CCP：共同封闭原则）

只包含跨服务契约类型，各服务自己的 DTO/Entity 不放入：

```
packages/shared/
├── types/
│   ├── enums.ts              ← 通用枚举（GameType, AgeGroup, SkillCategory 等）
│   ├── events.ts             ← 事件 Payload 类型（DomainEvent, 所有 *Payload 接口）
│   ├── policy.ts             ← policy.json 的 TypeScript 类型定义
│   ├── errors.ts             ← 统一错误码枚举和错误响应类型
│   └── internal-api.ts       ← 内部 API 请求/响应类型（跨服务调用契约）
├── policy.json               ← 策略配置文件
└── package.json
```

各服务自己的类型（如 creation-service 的 `Script` Entity、`ScriptConfig` DTO）留在各服务内部，不放入共享包。变更共享包需要通知所有服务同步更新。

### `@murder-mystery/event-bus`（CRP：共同复用原则）

将 Outbox Pattern 和幂等处理抽取为共享基础设施包，避免 7 个服务重复实现：

```
packages/event-bus/
├── src/
│   ├── publisher.ts          ← EventPublisher 类（含 Outbox Pattern）
│   ├── subscriber.ts         ← EventSubscriber 类（含幂等处理 + 去重表）
│   ├── outbox-poller.ts      ← 定时任务：扫描未发布事件重试
│   ├── migrations/
│   │   └── create-event-tables.ts  ← 自动创建 outbox_events + processed_events 表
│   └── types.ts              ← 事件基础类型（复用 @murder-mystery/shared 的定义）
└── package.json
```

使用方式：

```typescript
import { EventPublisher, EventSubscriber } from '@murder-mystery/event-bus';

// 发布
const publisher = new EventPublisher(db, redis, 'feedback-service');
await publisher.publish('events:feedback:submitted', payload);

// 订阅（通过配置文件声明，而非硬编码）
const subscriber = new EventSubscriber(db, redis, 'knowledge-service');
subscriber.registerFromConfig('./event-subscriptions.json');
subscriber.start();
```

## 事件订阅注册表模式（OCP：开闭原则）

每个服务通过配置文件声明订阅的事件，而非在代码中硬编码。新增消费者只需修改配置文件：

```json
// services/knowledge-service/event-subscriptions.json
{
  "subscriptions": [
    {
      "channel": "events:feedback:submitted",
      "handler": "handlers/feedback-submitted.ts",
      "description": "更新知识条目有效性分数"
    },
    {
      "channel": "events:feedback:extraction-ready",
      "handler": "handlers/feedback-extraction.ts",
      "description": "触发知识提炼流程"
    }
  ]
}
```

## 服务发现约定（DIP：依赖倒置原则）

所有内部服务 URL 遵循统一约定 `http://{service-name}:{port}`，由共享的 `ServiceRegistry` 工具类自动构造：

```typescript
const SERVICE_PORTS: Record<string, number> = {
  'auth-service': 3001,
  'creation-service': 3002,
  'gameplay-service': 3003,
  'knowledge-service': 3004,
  'ai-toolchain-service': 3005,
  'progression-service': 3006,
  'feedback-service': 3007,
};

class ServiceRegistry {
  getUrl(serviceName: string): string {
    const envKey = serviceName.toUpperCase().replace(/-/g, '_') + '_URL';
    const envUrl = process.env[envKey];
    if (envUrl) return envUrl;
    
    const port = SERVICE_PORTS[serviceName];
    if (!port) throw new Error(`Unknown service: ${serviceName}`);
    return `http://${serviceName}:${port}`;
  }
}

export const registry = new ServiceRegistry();
```

Docker Compose 中不再需要为每个服务配置所有依赖服务的 URL 环境变量，只需在本地开发时按需覆盖。

## 服务内部模块边界（SRP：单一职责原则）

### creation-service 内部模块

```
services/creation-service/src/
├── modules/
│   ├── config/              ← 剧本配置校验（稳定，变更少）
│   │   ├── routes.ts
│   │   ├── service.ts
│   │   └── types.ts
│   ├── generation/          ← 剧本生成引擎（AI密集，迭代快）
│   │   ├── routes.ts
│   │   ├── service.ts
│   │   ├── saga.ts          ← 生成 Saga 编排
│   │   └── types.ts
│   ├── skill-cards/         ← 技能牌/牌库管理（稳定 CRUD）
│   │   ├── routes.ts
│   │   ├── service.ts
│   │   └── types.ts
│   ├── tags/                ← 标签系统（稳定 CRUD）
│   │   ├── routes.ts
│   │   ├── service.ts
│   │   └── types.ts
│   └── interview/           ← 访谈系统（AI密集，迭代快）
│       ├── routes.ts
│       ├── service.ts
│       └── types.ts
├── clients/                 ← 调用其他微服务的 HTTP 客户端
├── events/                  ← 事件发布/订阅
└── app.ts                   ← Express 入口，组装各模块路由
```

### progression-service 内部模块

```
services/progression-service/src/
├── modules/
│   ├── economy/             ← 双币经济（关键路径，需事务保证）
│   │   ├── routes.ts
│   │   ├── service.ts       ← 扣费/退费/充值，独立事务
│   │   └── types.ts
│   ├── leveling/            ← 等级与经验值
│   │   ├── routes.ts
│   │   ├── service.ts
│   │   └── types.ts
│   ├── achievements/        ← 成就与收藏（异步，事件驱动）
│   │   ├── routes.ts
│   │   ├── service.ts
│   │   └── types.ts
│   ├── leaderboard/         ← 排行榜
│   │   ├── routes.ts
│   │   ├── service.ts
│   │   └── types.ts
│   └── honors/              ← 设计师荣誉
│       ├── routes.ts
│       ├── service.ts
│       └── types.ts
├── clients/
├── events/
└── app.ts
```

## 每个子项目的标准结构

```
services/{service-name}/
├── package.json
├── tsconfig.json
├── Dockerfile
├── .env.example
├── event-subscriptions.json       ← 事件订阅注册表（OCP）
├── src/
│   ├── app.ts                     ← Express 应用入口
│   ├── config/index.ts            ← 环境变量读取
│   ├── db/
│   │   ├── mysql.ts               ← 数据库连接
│   │   ├── redis.ts               ← Redis 连接
│   │   └── migrations/            ← 数据库迁移脚本
│   ├── events/
│   │   ├── setup.ts               ← 从 event-subscriptions.json 注册订阅
│   │   └── handlers/              ← 各事件处理器
│   ├── middleware/
│   │   ├── auth.ts                ← JWT 认证
│   │   └── internal-auth.ts       ← 内部服务认证
│   ├── modules/                   ← 按模块组织（SRP）
│   ├── clients/                   ← 调用其他微服务的 HTTP 客户端（使用 ServiceRegistry）
│   └── policy.ts                  ← 策略配置加载（通过 IPolicyProvider 接口）
├── vitest.config.ts
└── README.md
```

## 如何新建子项目

1. 在 `services/` 下创建目录（或创建独立 Git 仓库后 submodule 引入）
2. 安装共享包：`@murder-mystery/shared`（类型+策略）和 `@murder-mystery/event-bus`（事件基础设施）
3. 参考本架构文档中对应服务的"数据库表"和"REST API"章节实现
4. 实现所有公开 API（`/api/xxx`）和内部 API（`/api/internal/xxx`）
5. 创建 `event-subscriptions.json` 声明事件订阅，使用 `@murder-mystery/event-bus` 的 `EventSubscriber` 注册
6. 使用 `@murder-mystery/event-bus` 的 `EventPublisher` 发布事件（自动处理 Outbox Pattern）
7. 通过 `IPolicyProvider` 接口加载 `policy.json` 策略配置
8. 使用 `ServiceRegistry` 获取其他服务的 URL，而非硬编码环境变量
9. 编写 Dockerfile，确保能被根目录 docker-compose 构建
10. 编写数据库迁移脚本，事件辅助表由 `@murder-mystery/event-bus` 自动创建

## 子项目与知识库的协同方式

1. **API 契约**：各子项目严格按照本架构文档中定义的 REST API 端点和请求/响应格式实现
2. **事件契约**：各子项目严格按照"事件目录"中定义的 channel 和 payload 格式发布/订阅事件
3. **策略共享**：所有业务策略通过 `policy.json` 统一管理，各服务通过 `@murder-mystery/shared` 包引入
4. **类型共享**：`@murder-mystery/shared` 只包含跨服务契约类型（事件 Payload、枚举、错误码、内部 API 类型），各服务自己的 Entity/DTO 留在服务内部
5. **事件基础设施共享**：`@murder-mystery/event-bus` 提供 Outbox Pattern 和幂等处理的统一实现
6. **统一部署验证**：开发完成后，在本知识库根目录执行 `docker compose up` 验证全部服务联调
7. **设计变更流程**：任何 API 或事件变更必须先更新本知识库的架构文档，再通知相关服务的开发者同步修改

## 给各AI开发者的交接说明

每个服务的开发者需要：

1. 独立的 `package.json`、`tsconfig.json`、`Dockerfile`
2. 依赖 `@murder-mystery/shared`（跨服务契约类型 + 策略配置类型 + 错误码 + ServiceRegistry）
3. 依赖 `@murder-mystery/event-bus`（事件发布/订阅基础设施，含 Outbox Pattern 和幂等处理）
4. 实现本文档中定义的所有 REST API 端点
5. 实现 `/api/internal/*` 端点，遵循统一错误码体系（含 `retryable` 字段）
6. 创建 `event-subscriptions.json` 声明事件订阅（OCP：新增订阅只改配置）
7. 通过 `IPolicyProvider` 接口加载 `policy.json` 策略配置，不硬编码业务公式
8. 使用 `ServiceRegistry` 获取依赖服务 URL，Docker 环境自动解析，本地开发可通过环境变量覆盖
9. 统一的 JWT 认证方案（共享 JWT_SECRET）
10. 内部服务调用使用 `X-Internal-Service-Key` 认证
11. 按模块组织代码（SRP），模块间通过接口通信
12. 关键跨服务操作使用 Saga 模式（参考"补偿事务"章节）
13. 降级行为从 `policy.json` 的 `degradation` 配置节读取，不硬编码
14. 各自的单元测试（Vitest）
15. 明确的降级行为（参考"降级策略"表）
