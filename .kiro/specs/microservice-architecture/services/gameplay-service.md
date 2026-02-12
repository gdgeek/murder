# gameplay-service（剧本杀游玩）

## 数据库表

- `game_sessions` — 游戏会话
- `session_players` — 会话玩家
- `chat_messages` — 聊天记录（也用Redis）
- `vote_records` — 投票记录

## REST API

### 会话管理
```
POST   /api/sessions               — 创建会话（选择剧本）
GET    /api/sessions/:id           — 获取会话信息
GET    /api/sessions/:id/qrcode    — 获取二维码URL
POST   /api/sessions/:id/join      — 加入会话
POST   /api/sessions/:id/select-character — 选角
POST   /api/sessions/:id/start     — 开始游戏
```

## WebSocket 事件

客户端 → 服务端：
```json
{ "type": "join_session", "sessionId": "...", "token": "..." }
{ "type": "select_character", "characterId": "..." }
{ "type": "ready" }
{ "type": "chat_message", "content": "..." }
{ "type": "vote", "optionId": "..." }
{ "type": "ask_dm", "question": "..." }
{ "type": "submit_suggestion", "content": "..." }
```

服务端 → 客户端：
```json
{ "type": "player_joined", "player": {...} }
{ "type": "player_left", "userId": "..." }
{ "type": "character_selected", "userId": "...", "characterId": "..." }
{ "type": "game_started" }
{ "type": "round_update", "round": {...} }
{ "type": "clue_received", "clue": {...} }
{ "type": "chat_message", "userId": "...", "content": "...", "timestamp": "..." }
{ "type": "vote_initiated", "question": "...", "options": [...] }
{ "type": "vote_result", "result": {...} }
{ "type": "branch_outcome", "narrative": "..." }
{ "type": "dm_speech", "text": "...", "audioUrl": "..." }
{ "type": "game_ended", "ending": {...}, "evaluations": [...] }
{ "type": "video_play", "videoUrl": "..." }
{ "type": "error", "message": "..." }
```

## 事件发布
- `events:game:completed` — 游戏结束时
- `events:game:evaluation-ready` — AI DM 评价生成完成
- `events:script:played` — 剧本被游玩一次
