# 知识库系统需求（需求 19-26）

## 需求 19：知识条目数据模型与向量存储

**用户故事：** 作为系统管理员，我希望知识条目以结构化方式存储并支持语义搜索，以便系统能通过RAG技术高效检索相关知识来指导剧本生成。

#### 验收标准

1. THE Knowledge_Base SHALL 为每个Knowledge_Entry存储以下字段：唯一标识符、内容描述、知识分类（Knowledge_Category）、适用游戏类型列表（Game_Type_Tag）、有效性分数（Effectiveness_Score，0.0-1.0，默认0.5）、来源类型（Knowledge_Source）、来源引用、向量嵌入（Embedding）、使用次数、创建时间、更新时间、状态（active/deprecated）
2. WHEN 存储Knowledge_Entry到数据库后再读取时，THE Knowledge_Base SHALL 产生与原始数据等价的结果（往返一致性）
3. WHEN Knowledge_Entry的有效性分数不在0.0到1.0范围内时，THE Knowledge_Base SHALL 拒绝该操作并返回具体的校验错误信息
4. THE Knowledge_Base SHALL 支持按知识分类、游戏类型标签、状态和有效性分数范围组合查询知识条目
5. WHEN 序列化Knowledge_Entry为JSON格式后再反序列化时，THE Knowledge_Base SHALL 产生与原始对象等价的结果
6. WHEN 创建或更新Knowledge_Entry时，THE Knowledge_Base SHALL 调用Embedding_Provider为内容描述生成向量嵌入，并存储到Vector_Store中
7. THE Vector_Store SHALL 支持基于余弦相似度的近似最近邻搜索，返回与查询向量最相似的前K个知识条目

## 需求 20：知识管理与导入

**用户故事：** 作为管理员，我希望能手动管理知识条目并从外部来源批量导入，以便快速丰富知识库内容。

#### 验收标准

1. WHEN 管理员提交包含内容描述和知识分类的新知识条目时，THE Knowledge_Base SHALL 创建该条目并分配默认有效性分数0.5、来源类型"manual"，同时生成向量嵌入
2. WHEN 管理员编辑已有知识条目的内容时，THE Knowledge_Base SHALL 更新对应字段、更新时间，并重新生成向量嵌入
3. WHEN 管理员将知识条目状态设置为"deprecated"时，THE Knowledge_Base SHALL 将该条目标记为弃用，Generator在后续RAG检索中排除该条目
4. WHEN 管理员提交一篇文章文本进行知识提取时，THE Knowledge_Base SHALL 调用LLM_Adapter分析文本，提取结构化知识条目列表供管理员审核后导入
5. WHEN 管理员提交一个已有剧本进行分析时，THE Knowledge_Base SHALL 调用LLM_Adapter分析剧本结构，提取设计技巧作为知识条目供审核后导入
6. WHEN 管理员手动调整知识条目有效性分数时，THE Knowledge_Base SHALL 记录一条权重更新记录，包含调整原因"manual"、调整前后分数值和操作时间
7. IF LLM_Adapter在知识提取过程中调用失败，THEN THE Knowledge_Base SHALL 返回包含错误类型和建议操作的错误信息

## 需求 21：RAG检索增强生成

**用户故事：** 作为剧本创作者，我希望系统在生成剧本时通过语义搜索从知识库中检索最相关的知识，以便生成更高质量、更符合需求的剧本。

#### 验收标准

1. WHEN Generator生成新剧本时，THE Generator SHALL 将当前Config的游戏类型、主题风格、时代背景等参数组合为查询文本，调用Embedding_Provider生成查询向量
2. WHEN Generator获取查询向量后，THE Generator SHALL 在Vector_Store中执行语义搜索，检索与查询最相关的active状态知识条目
3. WHEN Generator检索到知识条目后，THE Generator SHALL 按有效性分数降序排列，选取前N个条目（N由配置参数决定，默认20），并根据LLM上下文窗口大小动态调整N值
4. WHEN Generator组装LLM提示词时，THE Generator SHALL 将选取的知识条目内容作为生成指导嵌入提示词中，有效性分数越高的条目在提示词中的位置越靠前
5. WHILE Knowledge_Base中没有任何active状态的知识条目时，THE Generator SHALL 使用原有的Skill模板作为回退方案正常生成剧本
6. WHEN Generator完成剧本生成后，THE Generator SHALL 创建Feedback_Knowledge_Link记录，关联本次生成使用的所有知识条目ID到生成的Script


## 需求 22：反馈驱动的有效性分数更新

**用户故事：** 作为系统管理员，我希望系统能根据玩家反馈自动调整知识条目的有效性分数，以便知识库持续优化、越用越聪明。

#### 验收标准

1. WHEN Feedback_System收集到某Script的新评价后，THE Knowledge_Base SHALL 通过Feedback_Knowledge_Link查询该Script生成时使用的知识条目列表
2. WHEN Knowledge_Base获取到关联知识条目后，THE Knowledge_Base SHALL 根据评价的各维度评分计算综合反馈分数（加权平均：剧情30%、推理难度20%、角色体验30%、整体满意度20%）
3. WHEN 综合反馈分数高于7分时，THE Knowledge_Base SHALL 对关联的每个知识条目有效性分数增加正向调整量（delta = 0.02 × (score - 7) / 3），有效性分数上限为1.0
4. WHEN 综合反馈分数低于5分时，THE Knowledge_Base SHALL 对关联的每个知识条目有效性分数减少负向调整量（delta = 0.02 × (5 - score) / 5），有效性分数下限为0.0
5. WHEN 综合反馈分数在5分到7分之间时，THE Knowledge_Base SHALL 保持关联知识条目的有效性分数不变
6. WHEN 知识条目有效性分数发生调整时，THE Knowledge_Base SHALL 为每个调整创建一条权重更新记录，记录调整原因"feedback"、关联的Feedback ID、调整前后分数值
7. WHEN 某知识条目的有效性分数降至0.1以下且连续5次反馈均为负向调整时，THE Knowledge_Base SHALL 将该条目状态自动设置为"deprecated"并通知管理员
8. WHEN Knowledge_Base计算综合反馈分数时，THE Knowledge_Base SHALL 根据评价者的Player_Account游戏记录计算评价权重：游玩次数≥25次的玩家权重为1.5，游玩次数≥10次的玩家权重为1.2，游玩次数≥5次的玩家权重为1.0，游玩次数<5次的玩家权重为0.7。加权后的综合分数用于知识条目有效性分数调整

## 需求 23：反馈知识提炼与高评分剧本学习

**用户故事：** 作为系统管理员，我希望系统能从玩家反馈和高评分剧本中自动提炼新知识，以便知识库持续扩充和进化。

#### 验收标准

1. WHEN 某Script累计收到的文字评价和Live_Suggestion数量达到阈值（默认10条）时，THE Knowledge_Base SHALL 自动触发知识提炼流程
2. WHEN 知识提炼流程触发后，THE Knowledge_Base SHALL 调用LLM_Adapter分析所有文字评价和建议，提取可操作的设计改进建议作为候选知识条目
3. WHEN Knowledge_Base提取出候选知识条目后，THE Knowledge_Base SHALL 将候选列表提交给管理员审核，管理员可确认、修改或拒绝
4. WHEN 管理员确认候选知识条目后，THE Knowledge_Base SHALL 创建新知识条目，来源类型设置为"feedback_extraction"，初始有效性分数设置为0.5
5. WHEN 某Script的整体满意度平均分达到8分以上且游玩次数达到5次以上时，THE Knowledge_Base SHALL 自动触发高评分剧本学习流程，调用LLM_Adapter分析该剧本的设计特点，提取成功经验作为候选知识条目
6. WHEN 高评分剧本学习提取出候选知识条目后，THE Knowledge_Base SHALL 将候选列表提交给管理员审核，来源类型标记为"high_rated_script"
7. IF LLM_Adapter在知识提炼过程中调用失败，THEN THE Knowledge_Base SHALL 记录错误日志并在下次达到阈值时重试

## 需求 24：知识库快照、导出与部署差异化

**用户故事：** 作为系统管理员，我希望能管理知识库版本并支持导出导入，以便在不同部署实例间共享知识，同时保持各实例的独立演化。

#### 验收标准

1. WHEN 管理员手动触发快照创建时，THE Knowledge_Base SHALL 创建一个Knowledge_Snapshot，包含当前所有知识条目的完整状态（内容、分类、有效性分数、状态、向量嵌入）
2. WHEN 系统执行批量有效性分数更新（处理反馈后）前，THE Knowledge_Base SHALL 自动创建一个Knowledge_Snapshot
3. WHEN 管理员选择回滚到某个快照时，THE Knowledge_Base SHALL 将所有知识条目恢复到该快照记录的状态，并创建一条新的快照记录标记为"rollback"
4. WHEN 管理员选择导出知识库时，THE Knowledge_Base SHALL 将所有active状态的知识条目序列化为JSON文件，包含内容、分类、有效性分数和来源信息
5. WHEN 管理员导入外部知识库JSON文件时，THE Knowledge_Base SHALL 将导入的知识条目合并到当前知识库，重复内容（基于语义相似度>0.95判定）自动跳过，新条目重新生成向量嵌入
6. WHEN 序列化Knowledge_Snapshot为JSON格式后再反序列化时，THE Knowledge_Base SHALL 产生与原始快照等价的结果

## 需求 25：知识库统计与Embedding提供商适配

**用户故事：** 作为系统管理员，我希望能查看知识库健康状况并灵活配置向量嵌入服务，以便监控知识库演化并适配不同的AI服务提供商。

#### 验收标准

1. WHEN 管理员访问知识库仪表盘时，THE Knowledge_Base SHALL 展示以下统计数据：知识条目总数、各分类条目数量、各状态条目数量、平均有效性分数、有效性分数分布直方图
2. WHEN 管理员查看知识条目有效性分数变化趋势时，THE Knowledge_Base SHALL 展示指定条目在过去N次更新中的分数变化折线图
3. WHEN 管理员查看知识库演化报告时，THE Knowledge_Base SHALL 展示最近一段时间内新增条目数量、弃用条目数量、分数上升最多和下降最多的条目列表
4. THE Embedding_Provider SHALL 提供统一的接口用于生成向量嵌入，支持通过环境变量配置API密钥和端点地址
5. WHEN 配置Embedding提供商时，THE Embedding_Provider SHALL 支持通过配置切换不同的嵌入模型（如OpenAI text-embedding-3-small、本地模型等）
6. IF Embedding_Provider调用失败，THEN THE Knowledge_Base SHALL 记录错误日志，对于新建知识条目标记为"embedding_pending"状态，待服务恢复后重新生成嵌入

## 需求 26：知识库REST API

**用户故事：** 作为前端开发者，我希望通过REST API访问知识库功能，以便在前端界面中集成知识库管理和可视化功能。

#### 验收标准

1. THE Knowledge_Base SHALL 提供以下REST API端点：知识条目CRUD（创建、读取、更新、弃用）、知识条目列表查询（支持分页、筛选、排序）、知识导入触发（文章提取、剧本分析）、快照管理（创建、列表、回滚）、导出导入、统计数据查询、权重更新历史查询、语义搜索（输入文本返回相似知识条目）
2. WHEN API接收到无效请求参数时，THE Knowledge_Base SHALL 返回包含具体错误字段和错误描述的结构化错误响应
3. WHEN API请求需要管理员权限时，THE Knowledge_Base SHALL 验证请求者的认证token和管理员角色，未授权请求返回403错误
