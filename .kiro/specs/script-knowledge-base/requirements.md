# 需求文档：剧本知识库系统（Script Knowledge Base）

## 简介

剧本知识库系统是线上剧本杀AI生成工具的核心扩展模块，实现"学习→实践→反馈→精进"的持续学习闭环。系统从在线资源、已有剧本和专家经验中提取剧本杀设计知识点，将知识点组织为带权重的结构化知识库。在生成新剧本时，系统根据知识点权重动态调整LLM提示词和生成策略；游戏结束后，通过玩家反馈分析更新知识点权重，持续提升生成质量。

代码开源，但每个部署实例的知识库独立演化，适应各自的玩家群体偏好。

## 术语表

- **Knowledge_Base（知识库）**：存储所有知识点及其元数据的结构化数据集合，每个部署实例拥有独立的知识库
- **Knowledge_Point（知识点）**：一条具体的剧本杀设计知识，包含内容描述、分类标签、权重值和来源信息
- **Weight（权重）**：知识点的重要性数值（0.0-1.0），反映该知识点在生成剧本时的影响力，由反馈驱动动态调整
- **Knowledge_Category（知识分类）**：知识点的分类维度，包括角色设计、线索设计、时间线构建、诡计设计、叙事结构、节奏控制、还原逻辑、推理链条等
- **Game_Type_Tag（游戏类型标签）**：知识点适用的游戏类型标记（本格、新本格、变格），一个知识点可适用于多种类型
- **Knowledge_Source（知识来源）**：知识点的来源类型，包括手动录入、文章导入、剧本分析、反馈提炼
- **Weight_Update_Record（权重更新记录）**：记录每次权重调整的历史，包含调整原因、调整前后值和关联的反馈数据
- **Knowledge_Snapshot（知识快照）**：某一时刻知识库的完整状态快照，用于版本追溯和回滚
- **Feedback_Analysis（反馈分析）**：对玩家反馈数据的结构化分析结果，识别哪些知识点对生成质量有正面或负面影响
- **Knowledge_Import（知识导入）**：从外部来源（文章、已有剧本、专家输入）批量提取和导入知识点的过程
- **Admin（管理员）**：拥有知识库管理权限的用户，可手动添加、编辑、审核知识点

## 需求

### 需求 1：知识点数据模型与存储

**用户故事：** 作为系统管理员，我希望知识点以结构化方式存储，以便系统能高效检索和使用知识点来指导剧本生成。

#### 验收标准

1. THE Knowledge_Base SHALL 为每个知识点存储以下字段：唯一标识符、内容描述、知识分类（Knowledge_Category）、适用游戏类型列表（Game_Type_Tag）、权重值（0.0-1.0，默认0.5）、来源类型（Knowledge_Source）、来源引用、创建时间、更新时间、状态（active/deprecated）
2. WHEN 存储知识点到数据库后再读取时，THE Knowledge_Base SHALL 产生与原始知识点数据等价的结果（往返一致性）
3. WHEN 知识点的权重值不在0.0到1.0范围内时，THE Knowledge_Base SHALL 拒绝该操作并返回具体的校验错误信息
4. THE Knowledge_Base SHALL 支持按知识分类、游戏类型标签、状态和权重范围组合查询知识点
5. WHEN 序列化知识点为JSON格式后再反序列化时，THE Knowledge_Base SHALL 产生与原始对象等价的结果

### 需求 2：知识点手动管理

**用户故事：** 作为管理员，我希望能手动添加、编辑和管理知识点，以便将专家经验和个人见解纳入知识库。

#### 验收标准

1. WHEN 管理员提交包含内容描述和知识分类的新知识点时，THE Knowledge_Base SHALL 创建该知识点并分配默认权重0.5和来源类型"manual"
2. WHEN 管理员编辑已有知识点的内容或分类时，THE Knowledge_Base SHALL 更新对应字段并记录更新时间
3. WHEN 管理员将知识点状态设置为"deprecated"时，THE Knowledge_Base SHALL 将该知识点标记为弃用，Generator在后续生成中排除该知识点
4. WHEN 管理员查看知识点列表时，THE Knowledge_Base SHALL 展示知识点内容、分类、权重、来源、状态，并支持分页和筛选
5. WHEN 管理员手动调整知识点权重时，THE Knowledge_Base SHALL 记录一条Weight_Update_Record，包含调整原因"manual"、调整前后权重值和操作时间

### 需求 3：知识导入

**用户故事：** 作为管理员，我希望能从外部来源导入知识点，以便快速丰富知识库内容。

#### 验收标准

1. WHEN 管理员提交一篇文章文本进行知识提取时，THE Knowledge_Import SHALL 调用LLM_Adapter分析文本，提取结构化知识点列表，每个知识点包含内容描述和建议分类
2. WHEN 管理员提交一个已有剧本进行分析时，THE Knowledge_Import SHALL 调用LLM_Adapter分析剧本结构，提取该剧本中使用的设计技巧作为知识点
3. WHEN Knowledge_Import提取出知识点列表后，THE Knowledge_Import SHALL 将提取结果展示给管理员进行审核，管理员可逐条确认、修改或删除后再导入
4. WHEN 管理员确认导入知识点时，THE Knowledge_Base SHALL 为每个导入的知识点设置来源类型为对应的导入类型（article/script_analysis）并记录来源引用
5. IF LLM_Adapter在知识提取过程中调用失败，THEN THE Knowledge_Import SHALL 返回包含错误类型和建议操作的错误信息

### 需求 4：知识驱动的剧本生成

**用户故事：** 作为剧本创作者，我希望系统在生成剧本时利用知识库中的知识点，以便生成更高质量的剧本。

#### 验收标准

1. WHEN Generator生成新剧本时，THE Generator SHALL 从Knowledge_Base中查询与当前Config匹配的active状态知识点（按游戏类型和相关分类筛选）
2. WHEN Generator查询到匹配的知识点后，THE Generator SHALL 按权重值降序排列知识点，选取权重最高的前N个知识点（N由配置参数决定，默认20）
3. WHEN Generator组装LLM提示词时，THE Generator SHALL 将选取的知识点内容作为生成指导嵌入提示词中，权重越高的知识点在提示词中的位置越靠前
4. WHEN Generator完成剧本生成后，THE Generator SHALL 记录本次生成使用了哪些知识点（知识点ID列表），关联到生成的Script记录中
5. WHILE Knowledge_Base中没有任何active状态的知识点时，THE Generator SHALL 使用原有的Skill模板作为回退方案正常生成剧本

### 需求 5：反馈驱动的权重更新

**用户故事：** 作为系统管理员，我希望系统能根据玩家反馈自动调整知识点权重，以便知识库持续优化。

#### 验收标准

1. WHEN Feedback_System收集到某Script的新评价后，THE Feedback_Analysis SHALL 查询该Script生成时使用的知识点列表
2. WHEN Feedback_Analysis获取到关联知识点后，THE Feedback_Analysis SHALL 根据评价的各维度评分计算综合反馈分数（加权平均：剧情30%、推理难度20%、角色体验30%、整体满意度20%）
3. WHEN 综合反馈分数高于7分时，THE Feedback_Analysis SHALL 对关联的每个知识点权重增加一个正向调整量（delta = 0.02 × (score - 7) / 3），权重上限为1.0
4. WHEN 综合反馈分数低于5分时，THE Feedback_Analysis SHALL 对关联的每个知识点权重减少一个负向调整量（delta = 0.02 × (5 - score) / 5），权重下限为0.0
5. WHEN 综合反馈分数在5分到7分之间时，THE Feedback_Analysis SHALL 保持关联知识点的权重不变
6. WHEN 知识点权重发生调整时，THE Knowledge_Base SHALL 为每个调整创建一条Weight_Update_Record，记录调整原因"feedback"、关联的Feedback ID、调整前后权重值
7. WHEN 某知识点的权重降至0.1以下且连续5次反馈均为负向调整时，THE Feedback_Analysis SHALL 将该知识点状态自动设置为"deprecated"并通知管理员

### 需求 6：反馈知识提炼

**用户故事：** 作为系统管理员，我希望系统能从玩家的文字评价和建议中提炼新的知识点，以便持续扩充知识库。

#### 验收标准

1. WHEN 某Script累计收到的文字评价和Live_Suggestion数量达到阈值（默认10条）时，THE Feedback_Analysis SHALL 自动触发知识提炼流程
2. WHEN 知识提炼流程触发后，THE Feedback_Analysis SHALL 调用LLM_Adapter分析所有文字评价和建议，提取可操作的设计改进建议作为候选知识点
3. WHEN Feedback_Analysis提取出候选知识点后，THE Feedback_Analysis SHALL 将候选知识点列表提交给管理员审核，管理员可确认、修改或拒绝
4. WHEN 管理员确认候选知识点后，THE Knowledge_Base SHALL 创建新知识点，来源类型设置为"feedback_extraction"，初始权重设置为0.5
5. IF LLM_Adapter在知识提炼过程中调用失败，THEN THE Feedback_Analysis SHALL 记录错误日志并在下次达到阈值时重试

### 需求 7：知识库快照与版本管理

**用户故事：** 作为系统管理员，我希望能查看知识库的历史状态并在需要时回滚，以便在知识库质量下降时恢复到之前的良好状态。

#### 验收标准

1. WHEN 管理员手动触发快照创建时，THE Knowledge_Base SHALL 创建一个Knowledge_Snapshot，包含当前所有知识点的完整状态（内容、分类、权重、状态）
2. WHEN 系统执行批量权重更新（处理反馈后）前，THE Knowledge_Base SHALL 自动创建一个Knowledge_Snapshot
3. WHEN 管理员查看快照列表时，THE Knowledge_Base SHALL 展示每个快照的创建时间、知识点总数、平均权重和触发原因
4. WHEN 管理员选择回滚到某个快照时，THE Knowledge_Base SHALL 将所有知识点恢复到该快照记录的状态，并创建一条新的快照记录标记为"rollback"
5. WHEN 序列化Knowledge_Snapshot为JSON格式后再反序列化时，THE Knowledge_Base SHALL 产生与原始快照等价的结果

### 需求 8：知识库统计与可视化

**用户故事：** 作为系统管理员，我希望能查看知识库的统计数据和趋势，以便了解知识库的健康状况和演化方向。

#### 验收标准

1. WHEN 管理员访问知识库仪表盘时，THE Knowledge_Base SHALL 展示以下统计数据：知识点总数、各分类知识点数量、各状态知识点数量、平均权重、权重分布直方图
2. WHEN 管理员查看知识点权重变化趋势时，THE Knowledge_Base SHALL 展示指定知识点在过去N次权重更新中的权重变化折线图
3. WHEN 管理员查看知识库演化报告时，THE Knowledge_Base SHALL 展示最近一段时间内新增知识点数量、弃用知识点数量、权重上升最多和下降最多的知识点列表

### 需求 9：知识库REST API

**用户故事：** 作为前端开发者，我希望通过REST API访问知识库功能，以便在前端界面中集成知识库管理功能。

#### 验收标准

1. THE Knowledge_Base SHALL 提供以下REST API端点：知识点CRUD（创建、读取、更新、删除）、知识点列表查询（支持分页、筛选、排序）、知识导入触发、快照管理（创建、列表、回滚）、统计数据查询、权重更新历史查询
2. WHEN API接收到无效请求参数时，THE Knowledge_Base SHALL 返回包含具体错误字段和错误描述的结构化错误响应
3. WHEN API请求需要管理员权限时，THE Knowledge_Base SHALL 验证请求者的认证token和管理员角色，未授权请求返回403错误

</content>
</invoke>