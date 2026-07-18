# CLAUDE.md — ginTest 项目指引

## 项目背景

ginTest 是一个基于 T3 全家桶（create-t3-app v7.40）的 Next.js 全栈项目。使用 Drizzle ORM（替代 Prisma）并去除了 NextAuth.js 认证模块。

## 技术栈

- **框架**：Next.js 15（App Router + Pages Router 并存）
- **语言**：TypeScript 5.8
- **样式**：Tailwind CSS 4（@tailwindcss/postcss）
- **API**：tRPC 11 + React Query + Superjson
- **数据库**：Drizzle ORM + Drizzle Kit（默认 SQLite / @libsql/client）
- **校验**：Zod + @t3-oss/env-nextjs
- **包管理**：npm

## 开发偏好与风格要求

1. **简洁优先**：不做无谓的抽象，不写多余代码。如果 200 行能写成 50 行，就重写
2. **精准修改**：只修改需求范围内的代码，不重构未损坏的相邻代码，不格式化未改动的区域
3. **清理自己产生的垃圾**：修改后如果产生了未使用的 import/变量/函数，必须一并清理
4. **代码注释精简**：只在代码不自解释的地方加注释，且每处只加一行短说明

## 项目状态（当前基线）

- 项目已完成脚手架初始化，认证模块已移除，编译通过
- 数据库仅有 `posts` 表（id, name, createdAt, updatedAt）
- tRPC 仅保留 `post.hello` 一个公共查询
- 前端页面为创世 T3 默认模板（已去掉登录相关 UI）

## 常用命令

| 命令 | 用途 |
|------|------|
| `npm run dev` | 启动开发服务器（Turbo） |
| `npm run build` | 构建生产版本 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run db:push` | 推送 Drizzle schema 到数据库 |
| `npm run db:generate` | 生成迁移文件 |
| `npm run db:migrate` | 执行迁移 |
| `npm run db:studio` | 启动 Drizzle Studio |

## 常见规则与限制

- 如需新增 Drizzle schema 表，使用 `createTable` 函数（带 ginTest_ 前缀）而非 `sqliteTable`
- 环境变量必须在 `src/env.js` 中定义校验规则
- tRPC router 在 `src/server/api/routers/` 目录下创建，并在 `src/server/api/root.ts` 中注册
- 文件路径使用 `~` 别名（映射到 `./src`）

## 沟通风格

- 中文交流，直接、务实，不寒暄
- 代码变更前说明计划，变更后确认编译通过

## 会话启动协议（重要）

每次新会话开始时，**必须先依次读取以下三个文件**，然后在首条回复中确认"已加载"：

1. `CLAUDE.md`（本文件）— 项目指引与开发规范
2. `project-context.md` — 当前项目状态快照
3. `AGENTS.md` — 仓库贡献指南（结构、命令、约定）

**确认格式示例**：
>"已加载 CLAUDE.md、project-context.md 和 AGENTS.md，当前项目状态已同步。"

## 上下文文件体系（Hooks）

项目使用三个钩子文件来保持 Agent 跨会话的上下文连续性：

| 文件 | 角色 | 更新频率 |
|------|------|----------|
| `CLAUDE.md` | 固定行为指引 | 一次写好，极少变更 |
| `project-context.md` | 动态项目快照 | 里程碑节点手动更新 |
| `AGENTS.md` | 仓库贡献指南 | 随项目演进补充 |

**更新 project-context.md 的时机**：
- 完成一个功能模块后
- 做出关键决策后（技术选型、架构变更）
- 上下文即将达到限制时（Agent 可主动判断）
- 用户明确要求"更新总结"时

### 更新 project-context.md 的内容要求

必须包含以下 7 个章节：
1. 项目目标与当前范围
2. 关键决策记录
3. 已完成模块/功能
4. 待办事项 & 下一步计划
5. 重要架构思路与技术选择
6. 文件修改记录（最近重要变更）
7. 已学到的经验教训 & 避坑记录
