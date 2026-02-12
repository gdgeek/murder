# knowledge-service（知识库）

## 数据库表

- `knowledge_entries` — 知识条目
- `knowledge_weight_updates` — 权重更新记录
- `knowledge_snapshots` — 快照
- `feedback_knowledge_links` — 反馈知识关联

## 向量存储

- hnswlib 进程内向量索引

## REST API

### 知识条目
```
GET    /api/knowledge              — 知识条目列表（分页、筛选、排序）
POST   /api/knowledge              — 创建知识条目
GET    /api/knowledge/:id          — 知识条目详情
PUT    /api/knowledge/:id          — 更新知识条目
DELETE /api/knowledge/:id          — 弃用知识条目（设为deprecated）
```

### 语义搜索
```
POST   /api/knowledge/search       — 语义搜索（输入文本，返回相似条目）
```

### RAG检索（内部调用）
```
POST   /api/internal/rag/retrieve  — 单维度RAG检索
  Body: { query: string, gameType: string, topK: number, contextWindowTokens: number }
  Response: { entries: KnowledgeEntry[], totalTokens: number }

POST   /api/internal/rag/retrieve-batch  — 多维度批量RAG检索（减少网络往返）
  Body: {
    queries: [{ query: string, category: string, topK: number }],
    gameType: string,
    totalContextTokens: number
  }
  Response: {
    results: [{ category: string, entries: KnowledgeEntry[] }],
    totalTokens: number
  }
```

### 知识导入
```
POST   /api/knowledge/import/article   — 从文章提取知识
POST   /api/knowledge/import/script    — 从剧本分析提取知识
POST   /api/knowledge/import/seed      — 导入种子数据（Skill模板）
POST   /api/knowledge/import/json      — 从JSON文件导入
```

### 快照管理
```
GET    /api/knowledge/snapshots        — 快照列表
POST   /api/knowledge/snapshots        — 创建快照
POST   /api/knowledge/snapshots/:id/rollback — 回滚到快照
```

### 导出
```
GET    /api/knowledge/export           — 导出知识库JSON
```

### 统计
```
GET    /api/knowledge/stats            — 知识库统计数据
GET    /api/knowledge/:id/history      — 条目权重变化历史
GET    /api/knowledge/report           — 演化报告
```

### 反馈关联（内部调用）
```
POST   /api/internal/knowledge/link-feedback — 记录生成使用的知识条目
```

## 事件订阅
- `events:feedback:submitted` → 更新知识条目有效性分数
- `events:feedback:extraction-ready` → 触发知识提炼流程

## 事件发布
- `events:knowledge:weights-updated` — 权重批量更新完成
- `events:knowledge:entry-deprecated` — 知识条目被自动弃用
