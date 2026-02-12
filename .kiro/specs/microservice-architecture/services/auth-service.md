# auth-service（认证与账户）

## 职责

轻量级认证服务，只负责用户身份验证和基本资料管理。是所有服务的基础依赖，应保持高稳定性。

## 数据库表

- `player_accounts` — 用户账户（id, email, password_hash, nickname, avatar_url, created_at）

## REST API

### 认证
```
POST   /api/auth/register          — 邮箱注册
POST   /api/auth/login             — 登录，返回JWT
POST   /api/auth/refresh           — 刷新token
```

### 账户
```
GET    /api/account/profile        — 获取个人资料（基本信息）
PUT    /api/account/profile        — 更新个人资料（昵称、头像）
```

### 内部API
```
POST   /api/internal/auth/verify   — 验证JWT token，返回用户信息
GET    /api/internal/users/:id     — 获取用户基本信息（昵称、头像）
GET    /api/internal/users/batch   — 批量获取用户基本信息
  Query: { ids: string[] }
```
