# Docker Compose 统一部署

## docker-compose.yml

```yaml
version: "3.8"

services:
  # ========== 基础设施 ==========
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-root}
    ports: ["3306:3306"]
    volumes:
      - mysql_data:/var/lib/mysql
      - ./init-db:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      retries: 5

  # ========== 后端微服务 ==========
  auth-service:
    build: ./services/auth-service
    ports: ["3001:3001"]
    environment:
      DB_HOST: mysql
      DB_NAME: auth_db
      REDIS_HOST: redis
      JWT_SECRET: ${JWT_SECRET}
      INTERNAL_SERVICE_KEY: ${INTERNAL_SERVICE_KEY}
    depends_on:
      mysql: { condition: service_healthy }
      redis: { condition: service_healthy }

  creation-service:
    build: ./services/creation-service
    ports: ["3002:3002"]
    environment:
      DB_HOST: mysql
      DB_NAME: creation_db
      REDIS_HOST: redis
      JWT_SECRET: ${JWT_SECRET}
      INTERNAL_SERVICE_KEY: ${INTERNAL_SERVICE_KEY}
      AUTH_SERVICE_URL: http://auth-service:3001
      KNOWLEDGE_SERVICE_URL: http://knowledge-service:3004
      AI_TOOLCHAIN_SERVICE_URL: http://ai-toolchain-service:3005
      PROGRESSION_SERVICE_URL: http://progression-service:3006
      FEEDBACK_SERVICE_URL: http://feedback-service:3007
      LLM_API_KEY: ${LLM_API_KEY}
      LLM_ENDPOINT: ${LLM_ENDPOINT}
    depends_on:
      mysql: { condition: service_healthy }
      redis: { condition: service_healthy }

  gameplay-service:
    build: ./services/gameplay-service
    ports: ["3003:3003"]
    environment:
      DB_HOST: mysql
      DB_NAME: gameplay_db
      REDIS_HOST: redis
      JWT_SECRET: ${JWT_SECRET}
      INTERNAL_SERVICE_KEY: ${INTERNAL_SERVICE_KEY}
      AUTH_SERVICE_URL: http://auth-service:3001
      CREATION_SERVICE_URL: http://creation-service:3002
      KNOWLEDGE_SERVICE_URL: http://knowledge-service:3004
      AI_TOOLCHAIN_SERVICE_URL: http://ai-toolchain-service:3005
      LLM_API_KEY: ${LLM_API_KEY}
      LLM_ENDPOINT: ${LLM_ENDPOINT}
    depends_on:
      mysql: { condition: service_healthy }
      redis: { condition: service_healthy }

  knowledge-service:
    build: ./services/knowledge-service
    ports: ["3004:3004"]
    environment:
      DB_HOST: mysql
      DB_NAME: knowledge_db
      REDIS_HOST: redis
      JWT_SECRET: ${JWT_SECRET}
      INTERNAL_SERVICE_KEY: ${INTERNAL_SERVICE_KEY}
      EMBEDDING_API_KEY: ${EMBEDDING_API_KEY}
      EMBEDDING_ENDPOINT: ${EMBEDDING_ENDPOINT}
      EMBEDDING_MODEL: ${EMBEDDING_MODEL:-text-embedding-3-small}
      LLM_API_KEY: ${LLM_API_KEY}
      LLM_ENDPOINT: ${LLM_ENDPOINT}
    depends_on:
      mysql: { condition: service_healthy }
      redis: { condition: service_healthy }
    volumes:
      - vector_data:/app/data/vectors

  ai-toolchain-service:
    build: ./services/ai-toolchain-service
    ports: ["3005:3005"]
    environment:
      DB_HOST: mysql
      DB_NAME: toolchain_db
      REDIS_HOST: redis
      JWT_SECRET: ${JWT_SECRET}
      INTERNAL_SERVICE_KEY: ${INTERNAL_SERVICE_KEY}
      AUTH_SERVICE_URL: http://auth-service:3001
      TTS_API_KEY: ${TTS_API_KEY:-}
      TTS_ENDPOINT: ${TTS_ENDPOINT:-}
      IMAGE_GEN_API_KEY: ${IMAGE_GEN_API_KEY:-}
      MUSIC_GEN_API_KEY: ${MUSIC_GEN_API_KEY:-}
      VIDEO_GEN_API_KEY: ${VIDEO_GEN_API_KEY:-}
    depends_on:
      mysql: { condition: service_healthy }
      redis: { condition: service_healthy }
    volumes:
      - media_assets:/app/data/assets

  progression-service:
    build: ./services/progression-service
    ports: ["3006:3006"]
    environment:
      DB_HOST: mysql
      DB_NAME: progression_db
      REDIS_HOST: redis
      JWT_SECRET: ${JWT_SECRET}
      INTERNAL_SERVICE_KEY: ${INTERNAL_SERVICE_KEY}
      AUTH_SERVICE_URL: http://auth-service:3001
      CREATION_SERVICE_URL: http://creation-service:3002
    depends_on:
      mysql: { condition: service_healthy }
      redis: { condition: service_healthy }

  feedback-service:
    build: ./services/feedback-service
    ports: ["3007:3007"]
    environment:
      DB_HOST: mysql
      DB_NAME: feedback_db
      REDIS_HOST: redis
      JWT_SECRET: ${JWT_SECRET}
      INTERNAL_SERVICE_KEY: ${INTERNAL_SERVICE_KEY}
      AUTH_SERVICE_URL: http://auth-service:3001
    depends_on:
      mysql: { condition: service_healthy }
      redis: { condition: service_healthy }

  # ========== 前端 + Nginx 网关 ==========
  web-client:
    build: ./services/web-client
    ports: ["80:80"]
    depends_on:
      - auth-service
      - creation-service
      - gameplay-service
      - knowledge-service
      - ai-toolchain-service
      - progression-service
      - feedback-service

volumes:
  mysql_data:
  redis_data:
  vector_data:
  media_assets:
```

## 数据库初始化

```sql
-- init-db/00-create-databases.sql
CREATE DATABASE IF NOT EXISTS auth_db;
CREATE DATABASE IF NOT EXISTS creation_db;
CREATE DATABASE IF NOT EXISTS gameplay_db;
CREATE DATABASE IF NOT EXISTS knowledge_db;
CREATE DATABASE IF NOT EXISTS toolchain_db;
CREATE DATABASE IF NOT EXISTS progression_db;
CREATE DATABASE IF NOT EXISTS feedback_db;
```

## 环境变量

根目录 `.env` 文件：

```env
# 共享密钥
JWT_SECRET=your-jwt-secret-here
INTERNAL_SERVICE_KEY=your-internal-key-here
MYSQL_ROOT_PASSWORD=root

# LLM
LLM_API_KEY=your-llm-api-key
LLM_ENDPOINT=https://api.openai.com/v1/chat/completions

# Embedding
EMBEDDING_API_KEY=your-embedding-api-key
EMBEDDING_ENDPOINT=https://api.openai.com/v1/embeddings
EMBEDDING_MODEL=text-embedding-3-small

# 可选：多媒体生成
TTS_API_KEY=
TTS_ENDPOINT=
IMAGE_GEN_API_KEY=
MUSIC_GEN_API_KEY=
VIDEO_GEN_API_KEY=
```

## 各服务需求映射

| 需求 | 服务 |
|------|------|
| 需求1 配置参数 | creation-service |
| 需求2 Skill库 | creation-service |
| 需求3 AI生成引擎 | creation-service + knowledge-service + ai-toolchain-service |
| 需求4 DM手册生成 | creation-service |
| 需求5 玩家手册生成 | creation-service |
| 需求6 物料生成 | creation-service |
| 需求7 线上游戏平台 | gameplay-service + web-client |
| 需求8 评价反馈 | feedback-service |
| 需求9 排行榜 | progression-service |
| 需求10 AI DM | gameplay-service + ai-toolchain-service（TTS） |
| 需求11 LLM适配层 | creation-service + gameplay-service（各自内置LLM客户端，Token记录到ai-toolchain-service） |
| 需求12 玩家账户 | auth-service |
| 需求13 收藏与成就 | progression-service |
| 需求14 视频生成 | ai-toolchain-service（生成）+ gameplay-service（播放） |
| 需求15 插件系统 | ai-toolchain-service |
| 需求16 多媒体生成 | ai-toolchain-service |
| 需求17 容器化部署 | 全部（本知识库提供统一 docker-compose） |
| 需求18 国际化 | web-client（Vue I18n 静态语言包） |
| 需求19-26 知识库 | knowledge-service |
| 需求27-28 访谈 | creation-service |
| 需求29 提示词模板 | ai-toolchain-service |
| 需求30 少样本/推理链 | ai-toolchain-service |
| 需求31 Token追踪 | ai-toolchain-service |
| 需求32 A/B测试 | ai-toolchain-service |
| 需求33 双身份 | progression-service |
| 需求34-36 技能牌 | creation-service |
| 需求37 设计师奖励 | progression-service（事件驱动） |
| 需求38 双币经济 | progression-service |
| 需求39 设计师荣誉 | progression-service |
| 需求40 过渡引导 | progression-service + web-client |
| 需求41 电子物料 | gameplay-service + web-client |
