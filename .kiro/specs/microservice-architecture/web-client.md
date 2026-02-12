# web-client（前端）

## 技术栈
- Vue 3 + TypeScript
- Element Plus（UI组件库）
- Vue Router（路由）
- Pinia（状态管理）
- Vue I18n（国际化，语言包为前端静态资源，不依赖后端 API）
- Axios（HTTP请求）

## 页面结构
```
/                          — 首页（热门剧本、最新剧本）
/login                     — 登录
/register                  — 注册
/profile                   — 个人主页（双身份）
/achievements              — 成就与收藏
/scripts                   — 剧本列表
/scripts/:id               — 剧本详情
/scripts/create            — 创建剧本（配置→访谈→选牌→生成）
/game/:sessionId           — 游戏房间（选角→游戏→结果）
/leaderboard               — 剧本排行榜
/designer                  — 设计师主页
/designer/leaderboard      — 设计师排行榜
/designer/skill-cards      — 技能牌管理
/wallet                    — 钱包
/admin/knowledge           — 知识库管理
/admin/toolchain           — AI工具链管理（提示词模板、少样本、推理链、A/B测试、Token用量）
```

## API网关配置（Nginx）

每个服务有唯一的路由前缀，Nginx 配置为简单的一对一映射，消除路由顺序依赖：

```nginx
# auth-service — 认证与账户
location /api/auth         { proxy_pass http://auth-service:3001; }
location /api/account      { proxy_pass http://auth-service:3001; }

# creation-service — 剧本制作（统一前缀）
location /api/creation     { proxy_pass http://creation-service:3002; }

# gameplay-service — 游戏会话
location /api/sessions     { proxy_pass http://gameplay-service:3003; }
location /ws               { proxy_pass http://gameplay-service:3003;
                             proxy_http_version 1.1;
                             proxy_set_header Upgrade $http_upgrade;
                             proxy_set_header Connection "upgrade"; }

# knowledge-service — 知识库
location /api/knowledge    { proxy_pass http://knowledge-service:3004; }

# ai-toolchain-service — AI工具链（统一前缀）
location /api/toolchain    { proxy_pass http://ai-toolchain-service:3005; }

# progression-service — 用户成长
location /api/progression  { proxy_pass http://progression-service:3006; }

# feedback-service — 反馈
location /api/feedback     { proxy_pass http://feedback-service:3007; }
```

注意：`/api/internal/*` 端点不通过 Nginx 暴露，仅在 Docker 内部网络中可达。
