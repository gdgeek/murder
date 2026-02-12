# 剧本杀系统微服务拆分架构

## 概述

系统拆分为 9 个独立工程（7 个后端微服务 + 1 个前端 + 1 个共享策略配置），各服务独立开发、独立部署、通过 REST API + Redis Pub/Sub 事件总线通信，通过一个 docker-compose.yml 统一编排部署。

另有 2 个共享 NPM 包：`@murder-mystery/shared`（跨服务契约类型 + 策略配置）和 `@murder-mystery/event-bus`（事件发布/订阅基础设施）。

### 设计原则

本架构遵循 Unix 程序设计艺术（Eric Raymond）和敏捷软件开发原则（Robert C. Martin）：

**Unix 哲学**：
- **模块性**：每个服务只做一件事，做好它。服务边界按"关注点"而非"数据表"划分
- **组合性**：服务间通过事件总线松耦合组合，同步 REST 仅用于查询，状态变更通过事件传播
- **分离性**：业务策略（公式、阈值、权重）与机制（HTTP处理、DB查询）分离，策略通过配置文件外置
- **简洁性**：每个服务有唯一的 API 路由前缀，Nginx 配置为简单的一对一映射
- **透明性**：所有服务间依赖关系通过事件 schema 显式定义，降级行为明确

**SOLID 原则**：
- **SRP（单一职责）**：服务内部按模块隔离（config/generation/skill-cards/tags/interview），模块间通过接口通信
- **OCP（开闭原则）**：事件订阅通过配置文件注册，新增消费者无需改代码；降级策略通过 policy.json 配置
- **LSP（里氏替换）**：内部 API 使用标准化错误码体系，调用方可统一处理任何服务的错误响应
- **ISP（接口隔离）**：每个服务一个 Nginx 路由前缀，客户端不需要知道服务内部的子路由结构
- **DIP（依赖倒置）**：策略加载通过 `IPolicyProvider` 接口；服务发现通过 `ServiceRegistry` 抽象

**包设计原则**：
- **CCP（共同封闭）**：`@murder-mystery/shared` 只包含跨服务契约类型，各服务 Entity/DTO 留在内部
- **CRP（共同复用）**：`@murder-mystery/event-bus` 提供 Outbox Pattern 和幂等处理的统一实现

## 服务划分

| 服务名 | 代号 | 职责 | 端口 | 详细文档 |
|--------|------|------|------|----------|
| 认证与账户 | `auth-service` | 账户注册登录、JWT认证、个人资料 | 3001 | [auth-service.md](services/auth-service.md) |
| 剧本杀制作 | `creation-service` | 剧本生成引擎、配置校验、技能牌/Skill库、标签、访谈、设计师牌库 | 3002 | [creation-service.md](services/creation-service.md) |
| 剧本杀游玩 | `gameplay-service` | 游戏会话、WebSocket实时通信、AI DM、投票、聊天、TTS、视频播放 | 3003 | [gameplay-service.md](services/gameplay-service.md) |
| 知识库 | `knowledge-service` | 知识条目CRUD、向量存储、RAG检索、Embedding、学习管道、快照、导入导出 | 3004 | [knowledge-service.md](services/knowledge-service.md) |
| AI工具链 | `ai-toolchain-service` | 提示词模板、少样本示例、推理链、A/B测试、Token追踪、插件系统、多媒体生成 | 3005 | [ai-toolchain-service.md](services/ai-toolchain-service.md) |
| 用户成长 | `progression-service` | 双身份等级、成就、收藏、排行榜、设计师荣誉、经济系统 | 3006 | [progression-service.md](services/progression-service.md) |
| 反馈 | `feedback-service` | 评价收集、建议收集、评价权重计算、反馈汇总 | 3007 | [feedback-service.md](services/feedback-service.md) |
| 前端 | `web-client` | Vue 3 + Element Plus SPA，整合所有后端服务 | 5173 | [web-client.md](web-client.md) |

### 拆分理由

#### 从原 `user-service` 拆分为 `auth-service` + `progression-service` + `feedback-service`

原 `user-service` 承担了 9 个不同关注点（认证、成就、收藏、排行榜、反馈、设计师身份、经济、国际化、荣誉），违反模块性原则。拆分后：

- **auth-service**：认证是所有服务的基础依赖，应尽可能轻量稳定。只负责注册、登录、JWT验证和个人资料
- **progression-service**：聚焦"用户成长"这一个关注点——等级、经验值、成就、收藏、排行榜、经济、荣誉称号
- **feedback-service**：反馈数据的生产者是 gameplay-service（游戏结束后），消费者是 knowledge-service（权重更新）和 creation-service（剧本优化）。独立出来后通过事件总线广播，消除跨服务链式调用

#### `ai-toolchain-service` 从原 `creation-service` 独立

- **职责边界清晰**：提示词模板、少样本示例、推理链、A/B测试、Token追踪属于"LLM工程基础设施"，与"剧本生成业务逻辑"是不同关注点
- **独立演化**：AI工具链的迭代频率高（频繁调整提示词、跑A/B测试），不应影响生成引擎的稳定性
- **复用性**：AI工具链可被 creation-service 和 gameplay-service 共同使用
- **插件系统归属**：存储插件、多媒体生成插件作为可扩展基础设施，归入工具链服务统一管理

## 架构图

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           web-client (Vue 3)                              │
│                    Element Plus + Vue Router + Pinia                      │
└──┬────────┬──────────┬──────────┬──────────┬──────────┬──────────┬───────┘
   │        │          │          │          │          │          │
   ▼        ▼          ▼          ▼          ▼          ▼          ▼
┌──────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐
│ auth │ │creation│ │gameplay│ │knowledge│ │ai-tool-  │ │progress- │ │feedback│
│:3001 │ │ :3002  │ │ :3003  │ │ :3004  │ │chain:3005│ │ion :3006 │ │ :3007  │
└──┬───┘ └───┬────┘ └───┬────┘ └───┬────┘ └────┬─────┘ └────┬─────┘ └───┬───┘
   │         │          │          │            │            │           │
   ▼         ▼          ▼          ▼            ▼            ▼           ▼
 MySQL     MySQL      MySQL     MySQL        MySQL        MySQL       MySQL
(auth_db)(creation_db)(gameplay_db)(knowledge_db)(toolchain_db)(progression_db)(feedback_db)
   │         │          │          │            │            │           │
   └─────────┴──────────┴──────────┴────────────┴────────────┴───────────┘
                                    │
                              ┌─────▼─────┐
                              │   Redis    │
                              │ (共享实例)  │
                              │ 缓存+事件  │
                              └───────────┘
```

## 详细文档索引

| 文档 | 内容 |
|------|------|
| [事件总线设计](event-bus.md) | Redis Pub/Sub 事件 Schema、事件目录、Payload 定义、处理流程、可靠性保障（Outbox Pattern + 幂等） |
| [策略配置外置](policy.md) | policy.json 完整定义、策略加载方式（IPolicyProvider 接口） |
| [服务间通信协议](communication.md) | 同步/异步调用关系、认证传递、错误码体系、Saga 补偿事务、降级策略、RAG 延迟控制 |
| [Docker Compose 部署](deployment.md) | docker-compose.yml、数据库初始化、环境变量、需求-服务映射表 |
| [前端与网关](web-client.md) | Vue 3 技术栈、页面结构、Nginx 路由配置 |
| [子项目开发指南](dev-guide.md) | 目录结构、共享包定义、模块边界、标准项目结构、新建子项目步骤、AI开发者交接说明 |

## 各服务详细文档

| 服务 | 文档 |
|------|------|
| auth-service | [services/auth-service.md](services/auth-service.md) |
| creation-service | [services/creation-service.md](services/creation-service.md) |
| gameplay-service | [services/gameplay-service.md](services/gameplay-service.md) |
| knowledge-service | [services/knowledge-service.md](services/knowledge-service.md) |
| ai-toolchain-service | [services/ai-toolchain-service.md](services/ai-toolchain-service.md) |
| progression-service | [services/progression-service.md](services/progression-service.md) |
| feedback-service | [services/feedback-service.md](services/feedback-service.md) |
