# AI工具链与访谈需求（需求 27-32）

## 需求 27：AI预生成访谈系统

**用户故事：** 作为剧本创作者，我希望在生成剧本前与AI进行交互式访谈，以便AI更精准地理解我的创作意图，生成更贴合需求的剧本。

#### 验收标准

1. WHEN 用户选择"开始访谈"后，THE Pre_Generation_Interview SHALL 基于当前Config参数初始化一个Interview_Session，并向用户提出第一个访谈问题
2. WHEN 用户回答一个访谈问题后，THE Pre_Generation_Interview SHALL 调用LLM_Adapter分析用户回答，动态生成下一个最相关的追问问题，而非按固定顺序提问
3. WHEN Pre_Generation_Interview生成追问问题时，THE Pre_Generation_Interview SHALL 覆盖以下核心维度：叙事风格偏好、情感基调、推理复杂度期望、角色关系深度、玩家互动模式、特殊机制需求
4. WHEN 访谈进行到用户选择结束或达到最大问题数（默认10个）时，THE Pre_Generation_Interview SHALL 调用LLM_Adapter将所有问答对汇总为结构化的访谈摘要
5. WHEN 访谈摘要生成后，THE Pre_Generation_Interview SHALL 将摘要展示给用户确认，用户可修改后确认
6. WHEN 用户确认访谈摘要后，THE Pre_Generation_Interview SHALL 将摘要作为附加上下文传递给Generator，与Config参数一起用于剧本生成
7. WHEN Generator接收到访谈摘要时，THE Generator SHALL 将访谈摘要嵌入LLM提示词中，优先级高于通用知识条目
8. IF LLM_Adapter在访谈过程中调用失败，THEN THE Pre_Generation_Interview SHALL 提供预设的备选问题列表供用户选择回答，不中断访谈流程
9. WHEN 访谈完成后，THE Pre_Generation_Interview SHALL 将完整的Interview_Session（问答对和摘要）持久化存储，关联到后续生成的Script

## 需求 28：访谈模板知识化管理

**用户故事：** 作为系统管理员，我希望访谈模板本身也是知识库的一部分，能通过反馈持续优化访谈质量。

#### 验收标准

1. THE Interview_Template SHALL 作为Knowledge_Entry存储在Knowledge_Base中，知识分类为"prompt_templates"，包含访谈问题模板、分支逻辑和适用场景描述
2. WHEN 系统初始化时，THE Knowledge_Base SHALL 导入默认的Interview_Template种子数据，覆盖不同游戏类型（本格、新本格、变格）的访谈模板
3. WHEN Pre_Generation_Interview初始化访谈时，THE Pre_Generation_Interview SHALL 通过RAG从Knowledge_Base中检索与当前Config最匹配的Interview_Template
4. WHEN 基于某Interview_Template生成的剧本收到玩家反馈后，THE Knowledge_Base SHALL 通过Feedback_Knowledge_Link将反馈关联到该Interview_Template，更新其有效性分数
5. WHEN 管理员创建或编辑Interview_Template时，THE Knowledge_Base SHALL 校验模板格式包含必要字段：初始问题、核心维度覆盖、最大问题数、摘要生成提示词
6. WHEN 序列化Interview_Template为JSON格式后再反序列化时，THE Knowledge_Base SHALL 产生与原始模板等价的结果

## 需求 29：提示词模板管理与版本化

**用户故事：** 作为系统管理员，我希望能管理和版本化所有LLM提示词模板，以便追踪提示词变更历史并支持A/B测试。

#### 验收标准

1. THE Prompt_Template SHALL 支持以下模板类别：剧本生成主模板、角色生成模板、线索生成模板、分支结构生成模板、访谈问题生成模板、知识提炼模板、反馈分析模板
2. WHEN 创建Prompt_Template时，THE System SHALL 为模板分配唯一标识符和初始版本号（v1），支持变量插值语法（如 {{playerCount}}、{{gameType}}）
3. WHEN 更新Prompt_Template时，THE System SHALL 创建新的Prompt_Version记录，版本号自动递增，保留所有历史版本
4. WHEN Generator使用Prompt_Template生成内容时，THE Generator SHALL 记录使用的模板ID和版本号，关联到生成的Script
5. WHEN 管理员选择回滚Prompt_Template到历史版本时，THE System SHALL 将指定历史版本设为当前活跃版本，不删除任何版本记录
6. WHEN 渲染Prompt_Template时，THE System SHALL 将模板中的变量占位符替换为实际参数值，未提供的可选变量使用默认值，缺少必填变量返回错误
7. WHEN 序列化Prompt_Template及其版本历史为JSON后再反序列化时，THE System SHALL 产生与原始数据等价的结果

## 需求 30：少样本示例与推理链管理

**用户故事：** 作为系统管理员，我希望能管理少样本示例和推理链模式，以便通过高质量示例引导LLM生成更好的剧本内容。

#### 验收标准

1. THE Few_Shot_Example SHALL 包含以下字段：唯一标识符、类别（与Prompt_Template类别对应）、适用游戏类型列表、输入描述、期望输出、质量评分（0.0-1.0）、状态（active/deprecated）
2. WHEN Generator组装LLM提示词时，THE Generator SHALL 从Few_Shot_Example中选取与当前生成任务类别和游戏类型匹配的示例，按质量评分降序选取前K个（K由配置决定，默认3个）
3. WHEN 玩家反馈关联到使用了特定Few_Shot_Example的剧本时，THE Knowledge_Base SHALL 根据反馈更新该示例的质量评分，更新逻辑与知识条目有效性分数一致
4. THE Reasoning_Chain SHALL 包含以下字段：唯一标识符、名称、适用场景描述、推理步骤列表（每步包含步骤描述和期望输出格式）、适用游戏类型列表
5. WHEN Generator生成复杂剧本逻辑（分支结构、多结局触发条件、线索链推理）时，THE Generator SHALL 从Reasoning_Chain中检索匹配的推理链模式，嵌入提示词引导LLM进行链式思维推理
6. WHEN 序列化Few_Shot_Example为JSON后再反序列化时，THE System SHALL 产生与原始对象等价的结果
7. WHEN 序列化Reasoning_Chain为JSON后再反序列化时，THE System SHALL 产生与原始对象等价的结果

## 需求 31：Token用量追踪与成本优化

**用户故事：** 作为系统管理员，我希望能追踪所有LLM调用的token用量和成本，以便监控资源消耗并优化使用效率。

#### 验收标准

1. WHEN LLM_Adapter完成一次API调用后，THE System SHALL 创建一条Token_Usage_Record，记录：调用时间、调用类型（生成/访谈/提炼/分析）、使用的模型名称、提示词token数、完成token数、总token数、响应时间（毫秒）、关联的Script ID或Interview_Session ID
2. WHEN 管理员查看Token用量仪表盘时，THE System SHALL 展示以下统计数据：总token消耗、按调用类型分类的token消耗、按时间段（日/周/月）的消耗趋势、平均每次剧本生成的token消耗
3. WHEN 管理员设置token用量预警阈值后，THE System SHALL 在单日token消耗超过阈值时记录警告日志
4. WHEN Generator组装LLM提示词时，THE Generator SHALL 根据LLM上下文窗口大小动态调整知识条目数量和少样本示例数量，确保总token数不超过模型限制的80%

## 需求 32：模型评估与A/B测试

**用户故事：** 作为系统管理员，我希望能对不同的LLM模型或提示词版本进行A/B测试，以便基于数据选择最优配置。

#### 验收标准

1. WHEN 管理员创建AB_Test时，THE System SHALL 接受两个变体配置（变体A和变体B），每个变体指定模型名称和/或Prompt_Template版本，以及流量分配比例（默认50/50）
2. WHILE AB_Test处于运行状态时，THE Generator SHALL 根据流量分配比例将剧本生成请求随机分配到变体A或变体B
3. WHEN 使用AB_Test变体生成的剧本收到玩家反馈后，THE System SHALL 将反馈数据关联到对应的AB_Test变体
4. WHEN 管理员查看AB_Test结果时，THE System SHALL 展示每个变体的样本数量、各维度平均评分、综合反馈分数和统计显著性指标
5. WHEN 管理员结束AB_Test并选择优胜变体时，THE System SHALL 将优胜变体的配置设为系统默认配置，并记录测试结论
6. WHEN AB_Test运行期间某变体的样本数量不足（少于5个反馈）时，THE System SHALL 在结果页面标注"样本不足，结论待定"
