# 核心生成与游玩需求（需求 1-18）

## 需求 1：剧本生成参数配置

**用户故事：** 作为剧本创作者，我希望通过配置基本参数来定义剧本杀的基础设定，以便系统能根据我的需求生成定制化的剧本。

#### 验收标准

1. WHEN 用户创建新剧本项目时，THE Config SHALL 提供以下必填参数的配置界面：玩家人数（1-6人，DM始终由AI担任）、游戏时长（2-6小时，以小时为单位选择）、游戏类型（本格、新本格、变格中选择一种，均为推理类型；机制类和情感类暂不支持，预留扩展）、目标年龄段（小学生、中学生、大学生、成年人中选择一种）
2. WHEN 用户设置游戏比例参数时，THE Config SHALL 接受还原比例和推理比例的数值输入，两项比例之和等于100%
3. WHEN 用户设置背景参数时，THE Config SHALL 接受时代背景、地点设定、主题风格的文本输入
4. WHEN 用户提交的参数不符合约束条件时，THE Config SHALL 返回具体的参数校验错误信息，指明哪个参数不合法及其合法范围
5. WHEN 用户完成所有必填参数配置后，THE Config SHALL 生成一个完整的配置对象并传递给Generator
6. WHEN 用户选择游戏时长后，THE Config SHALL 根据时长自动适配游戏轮次结构：每轮包含阅读、搜证、推证三个阶段。2小时适配2轮（每轮约50分钟+总结20分钟），3小时适配3轮（每轮约50分钟+总结30分钟），4小时适配3-4轮，5小时适配4轮，6小时适配4-5轮
7. WHEN Config生成轮次结构时，THE Config SHALL 为每轮分配阅读时间（约10-15分钟）、搜证时间（约15-20分钟）、推证/讨论时间（约15-20分钟），并预留最终投票和真相揭示时间
8. WHEN 用户选择目标年龄段后，THE Config SHALL 将年龄段信息传递给Generator，用于调整剧本的内容复杂度、用词难度、主题适宜性和推理难度（小学生：简单词汇、轻松主题、低推理难度；中学生：适中复杂度；大学生：较高复杂度；成年人：不限制）

## 需求 2：Skill库管理（知识库种子数据）

**用户故事：** 作为剧本创作者，我希望系统内置丰富的剧本杀Skill模板库作为知识库的初始种子数据，以便AI生成时能参考专业的剧本杀设计规则和模式。

#### 验收标准

1. THE Skill SHALL 包含以下类别的预定义模板：角色设计、线索设计、时间线构建、动机设计、诡计设计、还原逻辑、推理链条
2. WHEN Generator请求特定类别的Skill时，THE Skill SHALL 返回该类别下所有可用的模板列表
3. WHEN 用户选择游戏类型为"本格"时，THE Skill SHALL 优先提供本格推理类Skill模板（如密室诡计、不在场证明、物证链条、公平线索布局、逻辑推理链）
4. WHEN 用户选择游戏类型为"新本格"时，THE Skill SHALL 优先提供新本格类Skill模板（如叙述性诡计、时间线诡计、身份诡计、多重反转、现代元素融合）
5. WHEN 用户选择游戏类型为"变格"时，THE Skill SHALL 优先提供变格类Skill模板（如心理悬疑、氛围营造、角色内心独白、道德困境、开放式结局）
6. THE Skill SHALL 支持以JSON格式存储和读取Skill模板数据
7. WHEN 读取Skill模板JSON数据后再序列化回JSON时，THE Skill SHALL 产生与原始数据等价的结果（往返一致性）
8. WHEN 系统首次初始化知识库时，THE Skill SHALL 将所有预定义Skill模板作为种子数据批量导入Knowledge_Base，来源类型标记为"seed"


## 需求 3：AI剧本生成引擎

**用户故事：** 作为剧本创作者，我希望系统能调用大语言模型，结合知识库自动生成完整的剧本杀内容，以便我能快速获得高质量的剧本。

#### 验收标准

1. WHEN 用户提交有效的Config后，THE Generator SHALL 调用LLM_Adapter生成完整的Script，包含DM_Handbook、所有Player_Handbook和Material
2. WHEN Generator生成Script时，THE Generator SHALL 确保生成的玩家手册数量与Config中指定的玩家人数一致
3. WHEN Generator生成Script时，THE Generator SHALL 确保每个角色的时间线在逻辑上无矛盾
4. WHEN Generator生成Script时，THE Generator SHALL 确保所有线索在DM_Handbook中有对应的分发规则
5. IF LLM_Adapter调用失败，THEN THE Generator SHALL 返回包含错误类型和建议操作的错误信息
6. WHEN Generator生成Script时，THE Generator SHALL 根据Config中的还原比例和推理比例调整内容侧重
7. WHEN Generator生成Script时，THE Generator SHALL 生成分支叙事结构，包含多个剧情分支点（由玩家投票决定走向）和多个结局（至少3个以上），充分利用AI动态生成的优势
8. WHEN Generator生成分支结构时，THE Generator SHALL 确保每个分支路径的线索链条完整且逻辑自洽，不同分支的真相可以不同
9. WHEN Generator完成生成后，THE Generator SHALL 将Script序列化为JSON格式存储到Script_Repository，反序列化后与原始Script等价
10. WHEN Generator生成Script后，THE Generator SHALL 自动为Script生成标签，包括：游戏类型、年龄段、玩家人数、时代背景、主题风格等，并支持创作者手动添加自定义标签
11. WHEN Generator基于反馈优化已有Script时，THE Generator SHALL 创建新版本而非覆盖原始版本，保留完整的版本历史
12. WHEN Generator生成新剧本时，THE Generator SHALL 通过RAG从Knowledge_Base中检索与当前Config语义最相关的知识条目，嵌入到LLM提示词上下文中
13. WHEN Generator完成剧本生成后，THE Generator SHALL 记录本次生成使用了哪些知识条目（Feedback_Knowledge_Link），用于后续反馈关联

## 需求 4：DM手册生成

**用户故事：** 作为DM（主持人），我希望获得一份完整的DM手册，以便我能顺利组织和主持一场剧本杀游戏。

#### 验收标准

1. WHEN Generator生成DM_Handbook时，THE DM_Handbook SHALL 包含以下章节：游戏概述、角色列表、完整时间线、线索分发表、各轮次流程指引、分支决策点定义、多结局描述、真相还原、结局判定规则
2. WHEN DM_Handbook包含线索分发表时，THE DM_Handbook SHALL 为每条线索指定分发时机、接收角色和分发条件
3. WHEN DM_Handbook包含时间线时，THE DM_Handbook SHALL 确保时间线中的事件按时间顺序排列且无逻辑矛盾
4. WHEN DM_Handbook包含分支决策点时，THE DM_Handbook SHALL 为每个分支点定义投票问题、选项、以及各选项对应的后续剧情走向
5. WHEN DM_Handbook包含多结局时，THE DM_Handbook SHALL 为每个结局定义触发条件（基于投票和玩家行为的累积）、结局叙述和每位玩家的个人结局
6. WHEN DM_Handbook包含结局判定规则时，THE DM_Handbook SHALL 定义明确的胜负条件和评分标准

## 需求 5：玩家手册生成

**用户故事：** 作为玩家，我希望获得一份专属的角色手册，以便我能了解自己的角色并参与游戏。

#### 验收标准

1. WHEN Generator生成Player_Handbook时，THE Player_Handbook SHALL 包含以下内容：角色名称、角色背景故事、角色目标、角色关系描述、已知线索、各轮次行动指引
2. WHEN Generator生成Player_Handbook时，THE Player_Handbook SHALL 确保每个玩家手册只包含该角色应知的信息，不泄露其他角色的秘密
3. WHEN Generator为同一Script生成多份Player_Handbook时，THE Generator SHALL 确保不同角色的背景故事在交叉引用时保持一致
4. WHEN Player_Handbook包含角色目标时，THE Player_Handbook SHALL 为每个角色提供至少一个主要目标和一个次要目标

## 需求 6：游戏物料生成

**用户故事：** 作为DM，我希望系统能生成游戏所需的各种物料，以便线上游戏时能方便地分发和使用。

#### 验收标准

1. WHEN Generator生成Material时，THE Material SHALL 包含以下类型的物料：线索卡、道具卡、投票卡、场景描述卡
2. WHEN Material包含线索卡时，THE Material SHALL 确保每张线索卡有唯一标识符、内容描述和关联角色
3. WHEN Material中的线索卡与DM_Handbook中的线索分发表关联时，THE Material SHALL 确保线索卡标识符与分发表中的引用一致


## 需求 7：线上游戏平台

**用户故事：** 作为玩家，我希望能在Web平台上参与剧本杀游戏，以便我能远程与其他玩家一起游戏。

#### 验收标准

1. WHEN 玩家创建Game_Session时，THE Game_Platform SHALL 从Script_Repository中展示可用剧本列表供选择，并生成包含二维码的房间页面，可在手机、iPad或电脑上展示
2. WHEN 其他玩家通过手机扫描房间二维码时，THE Game_Platform SHALL 在玩家手机浏览器中打开游戏页面并加入该Game_Session
3. WHEN 玩家加入Game_Session后，THE Game_Platform SHALL 显示可选角色列表，已被选择的角色标记为不可选
4. WHEN 所有玩家完成选角并全部点击"开始游戏"后，THE Game_Platform SHALL 通知AI_DM接管游戏，正式开始主持
5. WHILE Game_Session处于进行中状态时，THE Game_Platform SHALL 提供实时文字聊天功能供玩家交流
6. WHILE Game_Session处于进行中状态时，THE Game_Platform SHALL 由AI_DM按流程自动分发线索卡和物料给指定玩家
7. WHEN AI_DM推进游戏轮次时，THE Game_Platform SHALL 更新所有玩家的游戏阶段显示
8. WHEN AI_DM在推理环节提出关键问题时，THE Game_Platform SHALL 向所有玩家展示投票界面，收集玩家的选择
9. WHEN 玩家完成投票后，THE AI_DM SHALL 根据投票结果动态选择剧情分支，推进不同的故事走向
10. WHEN Game_Session进入结局阶段时，THE Game_Platform SHALL 根据游戏过程中所有投票和玩家行为的累积结果，展示对应的多结局之一
11. WHEN Game_Session结束后，THE AI_DM SHALL 为每位玩家生成个人评价，包含推理表现、角色扮演表现、关键决策回顾
12. THE Game_Platform SHALL 支持响应式布局，适配手机、iPad和电脑三种屏幕尺寸
13. WHEN Game_Session结束时，THE Game_Platform SHALL 展示对应结局的真相还原、游戏结果和AI为每位玩家生成的个人评价
14. WHILE Game_Session处于进行中状态时，THE Game_Platform SHALL 提供建议提交入口，允许玩家提交对当前剧本的优化建议（Live_Suggestion）
15. WHEN 玩家提交Live_Suggestion时，THE Game_Platform SHALL 将建议内容与当前Game_Session和Script关联存储
16. THE Game_Platform SHALL 支持同一Script创建多个独立的Game_Session，各会话之间互不影响，不同会话可能因投票不同而走向不同结局

## 需求 8：评价反馈系统

**用户故事：** 作为玩家，我希望在游戏结束后能对剧本进行评价，以便AI能根据反馈持续优化生成质量。

#### 验收标准

1. WHEN Game_Session结束后，THE Feedback_System SHALL 向每位玩家展示评价表单，包含以下维度：剧情评分（1-10）、推理难度评分（1-10）、角色体验评分（1-10）、整体满意度评分（1-10）、文字评价
2. WHEN 玩家提交评价时，THE Feedback_System SHALL 验证所有评分在1-10的有效范围内
3. WHEN Feedback_System收集到评价数据后，THE Feedback_System SHALL 将评价数据与对应的Script和Config关联存储
4. WHEN Generator生成新Script时，THE Generator SHALL 查询历史评价数据，将平均评分低于6分的维度作为优化重点纳入LLM提示词
5. WHEN Generator生成新Script时，THE Generator SHALL 查询关联的Live_Suggestion数据，将高频建议纳入LLM提示词以优化生成内容
6. WHEN 用户选择对已有Script进行优化提炼时，THE Feedback_System SHALL 汇总该Script所有Game_Session的评价和建议，提供给Generator作为优化输入
7. WHEN 某Script累计收到的评价数量达到阈值（默认5次）且任一维度平均评分低于6分时，THE Feedback_System SHALL 自动触发Generator对该Script进行优化，生成新版本并标记版本号
8. WHEN 自动优化触发时，THE Generator SHALL 基于所有评价和建议数据生成优化后的Script新版本，版本号自动递增（如v1.0→v1.1），原版本保留不变
9. WHEN 自动优化完成后，THE Feedback_System SHALL 通知剧本创建者新版本已生成，并展示优化摘要（哪些维度被优化、参考了哪些反馈）
10. WHEN Feedback_System计算Script的各维度平均评分时，THE Feedback_System SHALL 根据评价者的Player_Account游玩次数应用评价权重（游玩≥25次权重1.5，≥10次权重1.2，≥5次权重1.0，<5次权重0.7），使用加权平均而非简单平均

## 需求 9：剧本排行榜

**用户故事：** 作为玩家，我希望能查看剧本排行榜，以便发现高质量的剧本并选择参与。

#### 验收标准

1. THE Leaderboard SHALL 根据玩家评价的整体满意度平均分对Script进行排名
2. WHEN 查看排行榜时，THE Leaderboard SHALL 展示剧本名称、游戏类型、玩家人数、平均评分和游玩次数
3. WHEN 新的评价数据提交后，THE Leaderboard SHALL 重新计算对应Script的排名
4. WHEN 排行榜中的Script游玩次数少于3次时，THE Leaderboard SHALL 将该Script标记为"评分待定"而非显示排名
5. THE Leaderboard SHALL 支持按标签筛选和搜索剧本，玩家可通过游戏类型、年龄段、玩家人数、主题风格等标签组合查询
6. WHEN Leaderboard计算Script排名评分时，THE Leaderboard SHALL 使用与Feedback_System一致的玩家评价权重（基于游玩次数），确保资深玩家的评价对排名影响更大


## 需求 10：AI主持人（AI DM）

**用户故事：** 作为玩家，我希望游戏由AI主持人自动组织和主持，以便随时开局无需等待人类DM。

#### 验收标准

1. WHEN 创建Game_Session时，THE Game_Platform SHALL 自动分配AI_DM作为主持人，无需人类DM
2. WHEN 使用AI_DM主持游戏时，THE AI_DM SHALL 根据DM_Handbook中的流程指引自动推进游戏轮次
3. WHEN AI_DM需要分发线索时，THE AI_DM SHALL 根据DM_Handbook中的线索分发表在正确时机向指定玩家分发线索
4. WHEN AI_DM主持游戏时，THE AI_DM SHALL 通过TTS_Engine将主持文本转换为语音输出，优先使用实时TTS流式生成；若实时生成延迟过高（超过2秒），则回退到使用预生成的语音资源
5. WHEN Generator生成Script时，THE Generator SHALL 为DM_Handbook中的固定叙述文本（开场白、轮次过渡、结局揭示等）预生成TTS语音文件，存储到Asset_Storage
6. WHEN 玩家向AI_DM提问时，THE AI_DM SHALL 根据DM_Handbook中的信息范围回答问题，避免泄露不应公开的信息，回答语音通过实时TTS生成
7. IF TTS_Engine调用失败，THEN THE AI_DM SHALL 回退到文字主持模式并通知玩家

## 需求 11：LLM适配层

**用户故事：** 作为系统管理员，我希望系统能灵活接入不同的大语言模型提供商，以便根据需要切换或升级AI能力。

#### 验收标准

1. THE LLM_Adapter SHALL 提供统一的接口用于发送提示词和接收生成结果
2. WHEN 配置LLM提供商时，THE LLM_Adapter SHALL 支持通过环境变量配置API密钥和端点地址
3. IF LLM API返回错误响应，THEN THE LLM_Adapter SHALL 实施最多3次的指数退避重试策略
4. IF 重试次数耗尽后仍失败，THEN THE LLM_Adapter SHALL 返回包含错误详情的结构化错误对象
5. WHEN LLM_Adapter发送请求时，THE LLM_Adapter SHALL 记录请求的token数量和响应时间用于监控

## 需求 12：玩家账户系统

**用户故事：** 作为玩家，我希望拥有自己的账户，以便记录我的游戏历史、管理个人信息和跨设备登录。

#### 验收标准

1. THE Player_Account SHALL 支持邮箱注册和登录
2. WHEN 玩家登录后，THE Player_Account SHALL 展示个人主页，包含昵称、头像、游戏统计（总游玩次数、参与剧本数、解锁结局数）
3. WHEN 玩家参与Game_Session时，THE Player_Account SHALL 自动记录游戏历史，包含剧本名称、扮演角色、游戏时间、达成结局
4. WHEN 玩家未登录时，THE Game_Platform SHALL 要求玩家登录或注册后才能加入Game_Session
5. THE Player_Account SHALL 支持修改昵称和头像

## 需求 13：收藏与成就奖励系统

**用户故事：** 作为玩家，我希望根据游玩次数和表现获得收藏品和成就奖励，以便增加游戏的长期吸引力和成就感。

#### 验收标准

1. WHEN 玩家完成一局Game_Session后，THE Collection SHALL 自动为玩家解锁该局对应的结局卡和角色卡收藏品
2. WHEN 玩家在同一Script中达成不同结局时，THE Collection SHALL 分别记录每个结局卡，玩家可在个人主页查看已收集和未收集的结局
3. THE Achievement SHALL 定义以下基于游玩次数的成就里程碑：首次游玩（1次）、初入江湖（5次）、推理达人（10次）、侦探大师（25次）、传奇侦探（50次）
4. WHEN 玩家游玩次数达到成就里程碑时，THE Achievement SHALL 自动解锁对应成就徽章并通知玩家
5. WHEN 玩家在游戏中获得AI_DM的高评价（推理表现评分≥8）时，THE Achievement SHALL 解锁特殊成就徽章（如"明察秋毫"、"逻辑之王"）
6. THE Player_Account SHALL 在个人主页展示已解锁的成就徽章和收藏品列表

## 需求 14：AI关键剧情视频生成（可选）

**用户故事：** 作为剧本创作者，我希望能为关键剧情生成AI视频，以便在游戏中播放增强玩家的沉浸感。

#### 验收标准

1. WHEN Generator生成Script时，THE Generator SHALL 标记关键剧情节点（如案件发生、重大反转、结局揭示）为可生成视频的场景
2. WHEN 剧本创作者选择为关键剧情生成视频时，THE Video_Generator SHALL 根据剧情文本描述调用AI视频生成服务，生成对应的短视频（10-30秒）
3. WHEN Video_Generator生成视频后，THE Video_Generator SHALL 将视频文件与对应的Script和剧情节点关联存储
4. WHEN AI_DM在游戏中推进到已关联视频的剧情节点时，THE Game_Platform SHALL 向所有玩家同步播放对应的剧情视频
5. IF 视频生成失败或视频文件不存在，THEN THE Game_Platform SHALL 回退到文字叙述模式，不影响游戏正常进行
6. THE Video_Generator SHALL 为视频生成功能标记为可选项，剧本可以在无视频的情况下正常运行

## 需求 15：插件系统与资源存储

**用户故事：** 作为系统管理员，我希望系统具备可扩展的插件架构，以便灵活接入不同的AI生成服务和云存储服务。

#### 验收标准

1. THE Plugin_System SHALL 定义统一的插件接口规范，支持以下插件类型：存储插件（Storage）、图片生成插件（ImageGen）、音乐生成插件（MusicGen）、视频生成插件（VideoGen）、TTS语音插件（TTSGen）
2. THE Asset_Storage SHALL 提供统一的资源存取接口，默认使用本地文件存储，可通过存储插件切换到云存储（如腾讯COS、AWS S3等）
3. WHEN 系统配置了云存储插件时，THE Asset_Storage SHALL 将所有生成的多媒体资源（图片、视频、音乐、语音）上传到配置的云存储服务
4. THE Plugin_System SHALL 支持通过配置文件注册和启用/禁用插件，无需修改核心代码
5. WHEN 插件调用失败时，THE Plugin_System SHALL 记录错误日志并回退到默认行为（如云存储失败回退到本地存储）

## 需求 16：AI多媒体资源生成（可选）

**用户故事：** 作为剧本创作者，我希望系统能通过AI生成游戏所需的图片、音乐等多媒体资源，以便增强游戏的沉浸感。

#### 验收标准

1. WHEN 剧本创作者选择生成图片资源时，THE AI_Image_Generator SHALL 根据剧本中的场景描述和角色描述，生成场景图、角色立绘和线索卡插图
2. WHEN 剧本创作者选择生成音乐资源时，THE AI_Music_Generator SHALL 根据剧本的主题风格和氛围，生成背景音乐和氛围音效
3. WHEN AI生成多媒体资源后，THE Asset_Storage SHALL 将资源文件与对应的Script关联存储
4. WHEN AI_DM在游戏中推进到特定场景时，THE Game_Platform SHALL 自动播放关联的背景音乐和展示场景图片
5. IF 多媒体资源生成失败或不存在，THEN THE Game_Platform SHALL 正常运行游戏，不影响核心游戏流程
6. THE AI_Image_Generator 和 AI_Music_Generator SHALL 均为可选功能，通过插件系统接入，剧本可在无多媒体资源的情况下正常运行

## 需求 17：容器化部署与CI/CD

**用户故事：** 作为开发者，我希望系统能通过Docker容器化部署并配置自动化CI/CD流水线，以便实现可靠的部署和持续交付。

#### 验收标准

1. THE System SHALL 提供Dockerfile用于构建前端和后端的容器镜像
2. THE System SHALL 提供docker-compose.yml文件，定义所有服务（前端、后端、数据库MySQL和Redis）的编排配置
3. WHEN 执行docker-compose up命令时，THE System SHALL 启动所有服务并使系统可访问
4. THE System SHALL 提供GitHub Actions工作流配置文件，包含代码检查、测试运行和镜像构建步骤
5. WHEN 代码推送到main分支时，THE System SHALL 触发CI/CD流水线自动执行构建和测试

## 需求 18：多语言国际化支持

**用户故事：** 作为国际用户，我希望系统支持多语言切换，以便不同语言的用户都能使用本平台。

#### 验收标准

1. THE Game_Platform SHALL 支持至少中文和英文两种语言，用户可在界面中切换
2. THE Game_Platform SHALL 使用 Vue I18n 实现前端国际化，所有界面文本通过语言包管理，不硬编码
3. THE System SHALL 在后端 API 响应中支持根据请求语言返回对应语言的错误信息和提示文本
4. WHEN Generator生成Script时，THE Generator SHALL 根据用户选择的语言生成对应语言的剧本内容
5. THE System SHALL 支持后续扩展更多语言，语言包采用独立文件管理，新增语言只需添加对应语言包文件
