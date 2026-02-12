# 剧本杀系统 — 设计知识库

本工程是剧本杀AI生成系统的统一设计知识库，不包含任何实现代码。8个独立子系统（7个后端微服务 + 1个前端）+ 2个共享 NPM 包通过引用本知识库进行协同设计与开发。服务间通过 REST API + Redis Pub/Sub 事件总线通信。

## 子系统

| 服务 | 端口 | 职责 |
|------|------|------|
| auth-service | 3001 | 账户注册登录、JWT认证、个人资料 |
| creation-service | 3002 | 剧本生成引擎、配置校验、技能牌、标签、访谈 |
| gameplay-service | 3003 | 游戏会话、WebSocket实时通信、AI DM、投票、聊天 |
| knowledge-service | 3004 | 知识条目、向量存储、RAG检索、Embedding、学习管道 |
| ai-toolchain-service | 3005 | 提示词模板、少样本示例、推理链、A/B测试、Token追踪、插件/多媒体 |
| progression-service | 3006 | 双身份等级、成就、收藏、排行榜、经济系统 |
| feedback-service | 3007 | 评价收集、建议收集、评价权重计算、反馈汇总 |
| web-client | 5173 | Vue 3 + Element Plus 单页应用 |

## 快速启动

```bash
cp .env.example .env
# 编辑 .env 填入 API 密钥
docker compose up
```

## 知识库结构

```
.kiro/
├── skills/
│   └── murder-mystery-writing.md          # 剧本杀创作领域知识
├── specs/
│   ├── microservice-architecture/
│   │   └── architecture.md                # 微服务架构、API定义、事件总线、部署方案
│   └── murder-mystery-ai-generator/
│       ├── requirements.md                # 核心需求文档（41项需求）
│       └── design.md                      # 系统设计文档
docker-compose.yml                         # 统一部署编排（7后端 + 1前端 + MySQL + Redis）
init-db/                                   # 数据库初始化脚本（7个独立数据库）
.env.example                               # 环境变量模板
services/                                  # 各子项目目录
```

## 协同开发

各子项目严格按照 `architecture.md` 中定义的 REST API 和事件总线 Schema 实现。同步 REST 仅用于查询，状态变更通过 Redis Pub/Sub 事件总线异步传播。业务策略（公式、阈值、权重）统一外置于 `policy.json`。共享包 `@murder-mystery/shared`（契约类型）和 `@murder-mystery/event-bus`（事件基础设施）提供跨服务复用。通过 `docker compose up` 统一验证联调。详见架构文档中的"子项目开发指南"章节。
