# 正确性属性

本文档包含系统的45个Property-Based Testing正确性属性定义。

---

### Property 1: 配置参数校验完整性
对于任意配置输入，如果所有必填字段在合法范围内（playerCount 1-6, durationHours 2-6, restorationRatio + deductionRatio = 100），则校验通过；否则返回的错误列表精确指出每个不合法字段。

**验证需求**: 1.1, 1.2, 1.4

### Property 2: Skill模板JSON往返一致性
对于任意SkillTemplate对象，serialize(deserialize(serialize(template))) === serialize(template)。

**验证需求**: 2.7

### Property 3: 剧本生成玩家手册数量一致性
对于任意有效Config（playerCount = N），Generator生成的Script中playerHandbooks.length === N。

**验证需求**: 3.2

### Property 4: 线索分发完整性
对于Generator生成的任意Script，DM_Handbook中clueDistribution引用的每个clueId在Material的线索卡中都存在对应条目，反之亦然。

**验证需求**: 3.4, 6.3

### Property 5: 分支结构可达性
对于Generator生成的任意BranchStructure，从起始节点出发，通过任意投票选择组合，都能到达至少一个Ending。不存在死路节点。

**验证需求**: 3.7, 3.8

### Property 6: 玩家手册信息隔离
对于同一Script中的任意两个PlayerHandbook A和B，A.secrets与B的所有可见内容（backgroundStory, knownClues, roundActions）无交集。

**验证需求**: 5.2

### Property 7: 评分范围有效性
对于任意提交的Feedback，所有评分字段（plotScore, difficultyScore, characterScore, overallScore）均在[1, 10]范围内。

**验证需求**: 8.2

### Property 8: 版本递增不可变性
对于任意Script的版本历史序列，版本号严格递增，且旧版本内容不被修改。

**验证需求**: 3.10 (原8), 8.8

### Property 9: 轮次结构时长约束
对于任意durationHours D，calculateRoundStructure(D)生成的轮次结构中，所有轮次时间 + 总结时间 ≤ D * 60分钟。

**验证需求**: 1.6, 1.7

### Property 10: Script JSON往返一致性
对于任意Script对象，deserializeScript(serializeScript(script))在语义上等价于原始script。

**验证需求**: 3.9

### Property 11: KnowledgeEntry JSON往返一致性
*对于任意*有效的KnowledgeEntry对象，序列化为JSON后再反序列化，产生的对象与原始对象等价。同样，存储到数据库后再读取，产生的数据与原始数据等价。

**验证需求**: 19.2, 19.5

### Property 12: 知识条目查询过滤正确性
*对于任意*知识条目集合和任意过滤条件组合（分类、游戏类型、状态、有效性分数范围），查询返回的每个条目都满足所有指定的过滤条件，且不遗漏任何满足条件的条目。

**验证需求**: 19.4

### Property 13: 向量搜索相似度排序
*对于任意*查询向量和向量存储中的条目集合，搜索返回的结果按余弦相似度降序排列，且结果数量不超过请求的topK值。

**验证需求**: 19.7

### Property 14: 弃用条目RAG排除
*对于任意*RAG检索查询，返回的知识条目中不包含任何状态为"deprecated"的条目。

**验证需求**: 20.3

### Property 15: 综合反馈分数计算
*对于任意*评价数据（剧情评分p、推理难度评分d、角色体验评分c、整体满意度评分o），综合反馈分数等于 p×0.3 + d×0.2 + c×0.3 + o×0.2。

**验证需求**: 22.2

### Property 16: 有效性分数调整公式
*对于任意*综合反馈分数score和关联的知识条目：当score > 7时，有效性分数增加 0.02 × (score - 7) / 3，上限1.0；当score < 5时，有效性分数减少 0.02 × (5 - score) / 5，下限0.0；当5 ≤ score ≤ 7时，有效性分数不变。

**验证需求**: 22.3, 22.4, 22.5

### Property 17: 连续负向反馈自动弃用
*对于任意*知识条目，当有效性分数降至0.1以下且连续5次反馈均为负向调整时，该条目状态自动变为"deprecated"。

**验证需求**: 22.7

### Property 18: RAG检索排序与知识关联记录
*对于任意*剧本生成请求，RAG检索返回的知识条目按有效性分数降序排列，且生成完成后创建的Feedback_Knowledge_Link记录包含所有使用的知识条目ID。

**验证需求**: 21.3, 21.4, 21.6

### Property 19: 快照回滚状态恢复
*对于任意*知识库状态，创建快照后修改知识库内容，再回滚到该快照，知识库状态与快照创建时等价。

**验证需求**: 24.3, 24.6

### Property 20: 知识库导入去重
*对于任意*知识库导出JSON和目标知识库，导入时语义相似度>0.95的条目被跳过，新条目被添加，导入后知识库中不存在语义重复的条目。

**验证需求**: 24.5

### Property 21: 访谈摘要提示词优先级
*对于任意*访谈摘要和知识条目集合，Generator组装的LLM提示词中，访谈摘要内容出现在通用知识条目之前，且摘要内容完整包含在提示词中。

**验证需求**: 27.6, 27.7

### Property 22: 访谈会话持久化往返一致性
*对于任意*完整的InterviewSession（包含问答对和摘要），存储到数据库后再读取，产生的数据与原始数据等价。

**验证需求**: 27.9

### Property 23: 访谈模板格式校验
*对于任意*InterviewTemplate输入，如果包含所有必要字段（初始问题、核心维度覆盖、最大问题数、摘要生成提示词），则校验通过；缺少任一必要字段则返回具体的校验错误信息。

**验证需求**: 28.5

### Property 24: AI工具链数据JSON往返一致性
*对于任意*有效的InterviewTemplate、PromptTemplate（含版本历史）、FewShotExample或ReasoningChain对象，序列化为JSON后再反序列化，产生的对象与原始对象等价。

**验证需求**: 28.6, 29.7, 30.6, 30.7

### Property 25: 提示词模板版本管理
*对于任意*PromptTemplate，创建时版本号为1；每次更新后版本号严格递增且所有历史版本保留；回滚到任意历史版本后，该版本成为当前活跃版本且不删除任何版本记录。

**验证需求**: 29.2, 29.3, 29.5

### Property 26: 提示词模板变量渲染
*对于任意*PromptTemplate和任意变量参数集合，渲染后的内容中所有已提供变量的占位符被替换为实际值，未提供的可选变量使用默认值，缺少必填变量时返回错误且不产生部分渲染结果。

**验证需求**: 29.6

### Property 27: AI资源按相关性和评分选取
*对于任意*生成任务（指定类别和游戏类型），从FewShotExample中选取的示例全部匹配任务类别和游戏类型、按质量评分降序排列、数量不超过K；从ReasoningChain中检索的推理链全部匹配适用场景和游戏类型。

**验证需求**: 30.2, 30.5

### Property 28: Token用量记录完整性
*对于任意*LLM_Adapter API调用，调用完成后创建的TokenUsageRecord包含所有必填字段（调用类型、模型名称、token数量、响应时间），且promptTokens + completionTokens = totalTokens。

**验证需求**: 31.1

### Property 29: 提示词Token预算合规
*对于任意*知识条目集合、少样本示例集合和LLM上下文窗口大小，Generator组装的提示词总token数不超过上下文窗口大小的80%。

**验证需求**: 31.4

### Property 30: 玩家评价权重计算
*对于任意*玩家游玩次数N，calculateWeight(N)返回的权重值符合分级规则：N≥25返回1.5，10≤N<25返回1.2，5≤N<10返回1.0，N<5返回0.7。*对于任意*反馈集合和对应的玩家游玩次数，加权平均评分等于 Σ(score_i × weight_i) / Σ(weight_i)。

**验证需求**: 8.10, 9.6, 22.8

### Property 31: A/B测试流量分配与反馈关联
*对于任意*运行中的ABTest（流量比例a:b），大量请求的分配结果近似于指定比例；且每个使用ABTest变体生成的剧本收到的反馈被正确关联到对应变体。

**验证需求**: 32.2, 32.3

### Property 32: A/B测试创建校验
*对于任意*ABTest创建输入，两个变体配置有效且流量分配比例之和等于100%时创建成功；否则返回校验错误。

**验证需求**: 32.1

### Property 33: 技能牌JSON往返一致性
*对于任意*有效的SkillCard对象，序列化为JSON后再反序列化，产生的对象与原始对象等价。

**验证需求**: 34.5

### Property 34: 技能牌等级点数约束
*对于任意*SkillCard，其pointCost必须在对应CardTier的合法范围内：basic 1-2点，advanced 3-4点，expert 5-7点，legendary 8-10点。

**验证需求**: 34.4

### Property 35: 技能牌解锁等级过滤
*对于任意*设计师等级L和技能牌集合，getUnlockedCards(L)返回的每张牌的requiredDesignerLevel ≤ L，且不遗漏任何满足条件的牌。

**验证需求**: 34.3, 36.1

### Property 36: 设计点数预算计算与选牌校验
*对于任意*设计师等级L，getDesignPointBudget(L)返回的点数预算符合公式：等级1=10, 2=13, 3=16, 4=20, 5=25, 之后每级+3。*对于任意*牌选择组合，如果选中牌的总点数超过预算，则校验失败并阻止添加。

**验证需求**: 35.1, 35.3

### Property 37: 等级升级阈值计算
*对于任意*玩家等级N，升级所需XP = N × 100；*对于任意*设计师等级N，升级所需XP = N × 150。当累计XP达到阈值时，等级自动提升。

**验证需求**: 33.4, 33.5

### Property 38: 荣誉称号等级映射
*对于任意*设计师等级L，calculateHonorTitle(L)返回的荣誉称号符合映射规则：等级1-2→新手设计师，3-4→进阶设计师，5-7→人气设计师，8-10→大师设计师，11+→传奇设计师。

**验证需求**: 39.1, 39.2

### Property 39: 设计师排行榜分数计算
*对于任意*设计师统计数据（剧本被游玩总次数P、平均评分R、创建剧本数C），排名分数 = P × 0.4 + R × 30 × 0.4 + C × 10 × 0.2，且排行榜按分数降序排列。

**验证需求**: 39.3

### Property 40: 双币分离不变量
*对于任意*剧本生成操作，消耗的货币类型必须为real_currency，不可使用game_coin支付。*对于任意*游玩奖励操作，奖励的货币类型必须为game_coin。两种货币的交易记录互不影响对方余额。

**验证需求**: 38.1, 38.7

### Property 41: 货币交易记录完整性
*对于任意*货币变动操作（充值、消费、奖励、退还），操作完成后创建的CurrencyTransaction记录中balanceAfter = balanceBefore + amount，且实际余额与balanceAfter一致。

**验证需求**: 38.6

### Property 42: 生成费用余额校验
*对于任意*设计师和生成费用估算，如果Real_Currency_Balance < Generation_Cost，则生成操作被阻止；如果余额充足，则扣除后余额 = 原余额 - Generation_Cost。

**验证需求**: 38.4, 38.5

### Property 43: 生成失败退还
*对于任意*因LLM调用失败而未完成的剧本生成，已扣除的真实货币被完整退还，退还后余额等于扣除前余额。

**验证需求**: 38.9

### Property 44: 自定义牌组牌来源校验
*对于任意*自定义牌组中的每张牌，该牌必须存在于设计师的已解锁牌库中。每个设计师最多拥有10个自定义牌组。

**验证需求**: 36.3, 36.6

### Property 45: 设计师经验值奖励
*对于任意*设计师创建的剧本被完成一局游戏，设计师获得基础5XP；如果该局评价的整体满意度加权平均≥8分，额外获得10XP。

**验证需求**: 37.1, 37.2
