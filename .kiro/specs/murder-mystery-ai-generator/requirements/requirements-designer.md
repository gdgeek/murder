# 设计师与经济系统需求（需求 33-41）

## 需求 33：设计师身份与双身份系统

**用户故事：** 作为用户，我希望拥有独立的设计师身份和玩家身份，以便分别追踪我的创作成就和游玩成就，两个身份独立升级。

#### 验收标准

1. THE Player_Account SHALL 同时包含玩家身份（Player_Level）和设计师身份（Designer_Identity），两者拥有独立的等级和经验值
2. WHEN 用户首次创建剧本时，THE System SHALL 自动初始化该用户的Designer_Identity，设计师等级为1，经验值为0
3. WHEN 用户完成一局Game_Session后，THE System SHALL 为该用户的玩家身份增加游玩经验值（基础10XP + 评价加成）
4. WHEN 用户的玩家经验值达到升级阈值时，THE System SHALL 自动提升玩家等级（等级N升级所需XP = N × 100）
5. WHEN 用户的设计师经验值达到升级阈值时，THE System SHALL 自动提升设计师等级（等级N升级所需XP = N × 150）
6. THE Player_Account SHALL 在个人主页分别展示玩家等级信息（等级、经验值、游玩次数）和设计师等级信息（等级、经验值、创建剧本数、剧本被游玩总次数）

## 需求 34：技能牌系统

**用户故事：** 作为设计师，我希望Skill以可选牌的形式呈现，以便我在创建剧本时通过选牌来定制生成效果，让剧本更具个性。

#### 验收标准

1. THE Skill_Card SHALL 包含以下属性：唯一标识符、名称、描述、类别（SkillCategory）、适用游戏类型列表、牌等级（Card_Tier：basic/advanced/expert/legendary）、点数消耗（Card_Point_Cost）、效果内容（Prompt片段）、解锁所需设计师等级
2. WHEN 系统初始化时，THE System SHALL 将所有现有Skill模板转换为Skill_Card，基础类别的牌设为basic等级，高级类别的牌设为对应更高等级
3. WHEN 设计师查看可用技能牌时，THE System SHALL 仅展示该设计师当前等级已解锁的牌，未解锁的牌以灰色展示并标注解锁所需等级
4. THE Skill_Card SHALL 按牌等级分配点数消耗：basic牌消耗1-2点，advanced牌消耗3-4点，expert牌消耗5-7点，legendary牌消耗8-10点
5. WHEN 序列化Skill_Card为JSON格式后再反序列化时，THE System SHALL 产生与原始对象等价的结果（往返一致性）
6. THE Skill_Card SHALL 包含以下特色牌示例：打破第四堵墙（expert）、神话设定背景（advanced）、多杀手设定（expert）、时间循环（legendary）、不可靠叙述者（advanced）、密室逃脱机制（basic）

## 需求 35：设计点数预算系统

**用户故事：** 作为设计师，我希望每次设计剧本时有点数预算限制，以便通过等级提升获得更多点数来选择更强力的牌组合。

#### 验收标准

1. WHEN 设计师开始创建剧本时，THE System SHALL 根据设计师等级计算Design_Point_Budget：等级1=10点，等级2=13点，等级3=16点，等级4=20点，等级5=25点，之后每级+3点
2. WHEN 设计师选择技能牌时，THE System SHALL 实时显示已消耗点数和剩余点数
3. WHEN 设计师选择的技能牌总点数超过Design_Point_Budget时，THE System SHALL 阻止添加该牌并提示点数不足
4. WHEN 设计师确认选牌完成后，THE System SHALL 将选中的Skill_Card列表传递给Generator，作为生成上下文的一部分
5. WHEN Generator接收到Skill_Card列表时，THE Generator SHALL 将每张牌的效果内容嵌入LLM提示词中，替代原有的按游戏类型自动选择Skill模板的逻辑
6. IF 设计师未选择任何技能牌，THEN THE Generator SHALL 回退到按游戏类型自动选择基础Skill模板的默认行为


## 需求 36：设计师牌库与自定义牌组

**用户故事：** 作为设计师，我希望能管理自己的牌库并组合自定义牌组，以便快速复用常用的牌组合来设计不同风格的剧本。

#### 验收标准

1. THE Designer_Deck SHALL 包含该设计师当前等级已解锁的所有Skill_Card
2. WHEN 设计师等级提升时，THE System SHALL 自动将新解锁等级对应的Skill_Card添加到Designer_Deck中，并通知设计师
3. WHEN 设计师创建Custom_Deck时，THE System SHALL 允许设计师从Designer_Deck中选择牌组成自定义牌组，并为牌组命名
4. THE Custom_Deck SHALL 不限制牌的总点数（点数限制仅在实际创建剧本时生效）
5. WHEN 设计师查看Custom_Deck列表时，THE System SHALL 展示每个牌组的名称、包含的牌数量和总点数消耗
6. THE System SHALL 允许设计师创建、编辑和删除Custom_Deck，每个设计师最多拥有10个自定义牌组
7. WHEN 设计师在创建剧本时选择使用某个Custom_Deck时，THE System SHALL 自动加载该牌组中的所有牌，设计师可在此基础上增减牌

## 需求 37：设计师奖励与经验值系统

**用户故事：** 作为设计师，我希望当我创建的剧本被其他玩家游玩时能获得奖励，以便激励我持续创作高质量的剧本。

#### 验收标准

1. WHEN 设计师创建的剧本被其他玩家完成一局Game_Session后，THE System SHALL 为该设计师增加设计师经验值（基础5XP）
2. WHEN 设计师创建的剧本收到玩家评价且整体满意度≥8分时，THE System SHALL 为该设计师额外增加经验值加成（额外10XP）
3. WHEN 设计师创建的剧本累计被游玩次数达到里程碑（10次、25次、50次、100次）时，THE System SHALL 为该设计师解锁对应的设计师成就徽章
4. WHEN 设计师等级提升时，THE System SHALL 通知设计师新解锁的牌和新增的点数预算
5. THE System SHALL 在设计师个人页面展示设计师统计数据：创建剧本数、剧本被游玩总次数、平均评分、设计师等级和经验值进度
6. WHEN 计算设计师经验值加成时，THE System SHALL 根据评价的加权平均分（使用Player_Rating_Weight）计算，而非简单平均分

## 需求 38：双币经济系统

**用户故事：** 作为用户，我希望系统有清晰的双币经济体系（游戏币和真实货币），以便我能通过游玩赚取游戏币获得奖励，同时通过充值真实货币来支付剧本生成的LLM费用。

#### 验收标准

1. THE System SHALL 为每个Player_Account维护两个独立的货币余额：Game_Coin_Balance（游戏币余额）和Real_Currency_Balance（充值余额），两种货币不可互相兑换
2. WHEN 玩家完成一局Game_Session后，THE System SHALL 为该玩家增加游戏币奖励（基础50游戏币 + 评价加成：整体满意度≥8时额外30游戏币）
3. WHEN 用户发起充值操作时，THE System SHALL 通过支付渠道接口完成Real_Currency_Recharge，充值金额计入Real_Currency_Balance
4. WHEN 设计师发起剧本生成时，THE System SHALL 根据选用的技能牌复杂度和预估LLM Token用量计算Generation_Cost，从设计师的Real_Currency_Balance中扣除
5. WHEN 设计师的Real_Currency_Balance不足以支付Generation_Cost时，THE System SHALL 阻止生成操作并提示余额不足，引导充值
6. WHEN 任何货币变动发生时，THE System SHALL 创建一条Currency_Transaction记录，包含货币类型、变动类型、金额、变动前余额、变动后余额和关联的剧本或游戏会话ID
7. THE System SHALL 确保所有LLM调用成本由真实货币覆盖，游戏币不可用于支付剧本生成费用
8. WHEN 用户查看个人钱包时，THE System SHALL 分别展示Game_Coin_Balance和Real_Currency_Balance，以及最近的交易记录
9. WHEN 剧本生成因LLM调用失败而未完成时，THE System SHALL 将已扣除的真实货币退还到设计师的Real_Currency_Balance，并创建退还类型的Currency_Transaction记录

## 需求 39：设计师荣誉与排行榜系统

**用户故事：** 作为设计师，我希望有专属的荣誉称号和排行榜系统，以便展示我的创作成就并激励持续创作。

#### 验收标准

1. THE Designer_Honor SHALL 定义以下荣誉称号等级：新手设计师（等级1-2）、进阶设计师（等级3-4）、人气设计师（等级5-7）、大师设计师（等级8-10）、传奇设计师（等级11+）
2. WHEN 设计师等级提升且达到新的荣誉称号等级时，THE System SHALL 自动授予对应的Honor_Title并通知设计师
3. THE Designer_Leaderboard SHALL 根据设计师创建剧本的综合表现进行排名，排名分数 = 剧本被游玩总次数 × 0.4 + 剧本平均评分 × 30 × 0.4 + 创建剧本数 × 10 × 0.2
4. WHEN 查看设计师排行榜时，THE Designer_Leaderboard SHALL 展示设计师昵称、荣誉称号、设计师等级、创建剧本数、剧本被游玩总次数和平均评分
5. WHEN 新的评价数据提交后，THE Designer_Leaderboard SHALL 重新计算对应设计师的排名分数
6. THE System SHALL 在设计师个人页面突出展示当前荣誉称号、设计师等级徽章和排行榜排名
7. WHEN 设计师创建的剧本累计被游玩次数达到特殊里程碑（100次、500次、1000次）时，THE System SHALL 授予特殊荣誉徽章（如"百人剧作家"、"千人剧作家"）

## 需求 40：玩家到设计师过渡引导

**用户故事：** 作为系统运营者，我希望系统能引导活跃玩家自然过渡为设计师，以便扩大设计师群体并丰富剧本内容。

#### 验收标准

1. WHEN 玩家的游玩次数达到10次时，THE System SHALL 在个人主页展示"成为设计师"引导入口，介绍设计师身份的权益和玩法
2. WHEN 玩家首次点击"成为设计师"入口时，THE System SHALL 展示新手设计师教程，介绍技能牌系统、点数预算和剧本生成流程
3. WHEN 玩家完成首次剧本设计时，THE System SHALL 赠送首次设计奖励（额外设计师经验值50XP + 游戏币200）
4. THE System SHALL 在游戏结束页面（当玩家游玩次数≥5次时）展示"想创作自己的剧本？"引导提示
5. WHEN 玩家的玩家等级达到5级时，THE System SHALL 发送系统通知，邀请玩家体验设计师功能

## 需求 41：电子物料确认

**用户故事：** 作为系统设计者，我希望明确所有游戏物料均为电子版，以便统一物料管理方式。

#### 验收标准

1. THE Material SHALL 以电子形式存储和展示，包括线索卡、道具卡、投票卡和场景描述卡
2. THE Game_Platform SHALL 在游戏过程中通过Web界面向玩家展示所有电子物料，支持手机、iPad和电脑三种屏幕尺寸
3. THE System SHALL 不提供任何实体物料打印或邮寄功能
