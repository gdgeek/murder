---
inclusion: manual
---

# 独立生成器工程 — 新项目启动指引

本工程（murder-mystery-design-kb）是纯设计知识库，不包含实现代码。
AI 剧本杀生成器在另一个独立项目中开发。通过 git submodule 保持设计同步。

## 一、同步方案：git submodule

### 1.1 新项目引入知识库

```bash
cd murder-mystery-generator
git submodule add git@github.com:gdgeek/murder.git design-kb
git commit -m "add design-kb submodule"
```

### 1.2 目录结构

```
murder-mystery-generator/
├── design-kb/                          # submodule → 本知识库（只读引用）
│   ├── .kiro/
│   │   ├── specs/                      # 需求 + 设计 + 架构文档
│   │   │   ├── murder-mystery-ai-generator/
│   │   │   │   ├── design/
│   │   │   │   │   ├── components-core.md       ← 类型契约权威来源
│   │   │   │   │   ├── token-optimization.md    ← Token 策略
│   │   │   │   │   └── ...
│   │   │   │   ├── standalone-generator-plan.md ← 开发计划
│   │   │   │   └── requirements/
│   │   │   └── microservice-architecture/
│   │   │       ├── services/
│   │   │       │   └── creation-service.md      ← API 契约
│   │   │       ├── event-bus.md                 ← 事件格式
│   │   │       └── communication.md             ← 错误码 + 降级
│   │   └── skills/
│   │       └── murder-mystery-writing.md
│   └── docker-compose.yml
├── .kiro/
│   └── steering/
│       └── dev-conventions.md          # 引用 design-kb 中的文档
├── src/
│   └── ...                             # 实现代码
├── package.json
└── tsconfig.json
```

### 1.3 同步设计变更

```bash
# 在新项目中拉取知识库最新设计
cd design-kb
git pull origin main
cd ..
git add design-kb
git commit -m "sync design-kb to latest"
```

或者一行：
```bash
git submodule update --remote design-kb
```

### 1.4 日常工作流

1. 在本知识库修改设计文档 → commit + push
2. 在新项目中 `git submodule update --remote design-kb` 拉取最新
3. 检查设计变更是否影响已有代码 → 按需修改
4. 如果开发中发现设计需要调整 → 回到本知识库修改 → 再同步

## 二、新项目的 .kiro/steering/dev-conventions.md

在新项目中创建此 steering 文件，用 `#[[file:]]` 引用 submodule 中的设计文档。
这样 AI 助手在新项目中工作时，能直接读到完整的设计契约。

```markdown
---
inclusion: auto
---

# 开发约定

## 项目定位

AI 剧本杀生成器，支持双模式运行（standalone / microservice）。
设计文档通过 git submodule 引入，位于 design-kb/ 目录。

## 权威设计文档（通过 submodule 同步）

以下文档是类型定义和 API 契约的权威来源，代码必须与之一致：

- 核心类型定义：#[[file:design-kb/.kiro/specs/murder-mystery-ai-generator/design/components-core.md]]
- Token 节省策略：#[[file:design-kb/.kiro/specs/murder-mystery-ai-generator/design/token-optimization.md]]
- 开发计划：#[[file:design-kb/.kiro/specs/murder-mystery-ai-generator/standalone-generator-plan.md]]
- 微服务 API 契约：#[[file:design-kb/.kiro/specs/microservice-architecture/services/creation-service.md]]
- 事件总线格式：#[[file:design-kb/.kiro/specs/microservice-architecture/event-bus.md]]
- 通信协议与错误码：#[[file:design-kb/.kiro/specs/microservice-architecture/communication.md]]

## 关键约束

1. 类型命名必须与 components-core.md 完全一致（ScriptConfig, Script, DMHandbook 等）
2. 枚举值必须一致（GameType, AgeGroup, SkillCategory, TokenOptimizationMode）
3. 微服务模式路由必须与 creation-service.md 完全对齐
4. 事件 payload 必须与 event-bus.md 一致
5. 所有服务通过构造函数注入依赖，不直接 import 具体实现
6. Token 节省是核心约束，禁止一次性传入所有上下文到 LLM
7. generate() 必须支持 tokenMode 参数
```

注意：`inclusion: auto` 表示每次对话都会自动加载此文件，AI 助手始终能看到设计引用。
但 `#[[file:]]` 引用的文件只在需要时按需加载，不会一次性消耗大量 token。

## 三、新项目初始化完整步骤

```bash
# 1. 创建项目
mkdir murder-mystery-generator && cd murder-mystery-generator
git init

# 2. 引入设计知识库
git submodule add git@github.com:gdgeek/murder.git design-kb

# 3. 初始化 Node 项目
pnpm init

# 4. 安装依赖
pnpm add typescript express openai commander dotenv uuid
pnpm add -D vitest @types/node @types/express @types/uuid tsx

# 5. 创建 steering
mkdir -p .kiro/steering
# 把上面第二节的内容写入 .kiro/steering/dev-conventions.md

# 6. 创建 tsconfig.json, .env.example, src/ 目录结构
# （参照 design-kb 中的 standalone-generator-plan.md）

# 7. 开始开发
```

## 四、开发阶段

| 阶段 | 目标 | 预估 |
|------|------|------|
| 1 | MVP：CLI 输入 Config → 输出完整剧本 JSON | 3-5 天 |
| 2 | 独立 API + 知识库 + 访谈 | 3-4 天 |
| 3 | 微服务模式（creation-service:3002） | 3-4 天 |
| 4 | npm 包发布 + Docker + 联调 | 2-3 天 |

## 五、回归主工程

阶段 4 完成后，在本知识库的 docker-compose.yml 中添加 creation-service 构建配置，
指向新项目目录（或通过 git submodule 反向引入）。
