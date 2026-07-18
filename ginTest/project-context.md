# 项目上下文总结 - ginTest

**最后更新时间**：2026-07-18 01:25
**最后更新时间**：2026-07-18 14:25
**最后更新时间**：2026-07-18 14:35
**最后更新时间**：2026-07-18 14:50

## 1. 项目目标与当前范围

基于 T3 全家桶（create-t3-app v7.40）搭建的 Next.js 全栈项目，使用 Drizzle ORM 替代 Prisma，去掉了 NextAuth.js 认证模块。当前处于初始化完成后的基线状态，可直接进入业务开发。

## 2. 关键决策记录

- **使用 Drizzle 而非 Prisma**：明确要求用 Drizzle 替代 Prisma，已在项目创建时通过 `--drizzle true --prisma false` 实现
- **移除 NextAuth.js**：脚手架初始生成的 NextAuth.js 认证模块被完全移除——删除相关文件、依赖、schema 表和环境变量
- **数据库默认 SQLite**：使用 `@libsql/client` 驱动，连接串 `file:./db.sqlite`，可通过 `.env` 切换

## 3. 已完成模块 / 功能

- [x] 项目脚手架搭建（Next.js 15 + TypeScript + Tailwind CSS 4 + tRPC 11 + Drizzle ORM）
- [x] 数据库 schema 精简——仅保留 `posts` 表，去除 `createdById` 外键依赖
- [x] NextAuth.js 相关文件、依赖、环境变量、schema 表（users/accounts/sessions/verificationTokens）全部清理
- [x] tRPC 上下文简化为无 session 状态，移除了 `protectedProcedure`
- [x] post router 精简——仅保留 `hello` 公共查询
- [x] 前端页面移除登录/注销 UI 和 AuthShowcase 组件
- [x] 编译验证通过（`npm run typecheck` 无报错）
- [x] 上下文持久化体系搭建：创建 AGENTS.md（贡献指南），更新 CLAUDE.md（增加会话启动协议和 hooks 说明）
- [x] 任务结束自动提交钩子：创建 `scripts/git-save.sh` 脚本，更新 CLAUDE.md 和 AGENTS.md 加入提交/推送行为规则
- [x] Hello World 特效页面：Canvas 粒子系统 + 动画渐变文字 + 鼠标交互

## 4. 待办事项 & 下一步计划

- [ ] 根据业务需求定义 Drizzle 数据模型
- [ ] 确定路由结构（App Router / Pages Router 混用，当前两者皆有）
- [ ] 添加实际业务逻辑（API、页面、组件）
- [ ] 配置开发环境（如需要可切换 PostgreSQL/MySQL）

## 5. 重要架构思路与技术选择

- **Next.js 15 App Router + Pages Router 并存**：tRPC handler 位于 Pages Router（`src/pages/api/trpc/[trpc].ts`），业务页面可用 App Router
- **tRPC v11 + React Query**：前后端类型安全的 API 调用链路，Superjson 作为序列化工具
- **Drizzle ORM + Drizzle Kit**：schema 驱动，支持 `db:push` / `db:migrate` / `db:studio` 工作流
- **环境变量校验**：使用 `@t3-oss/env-nextjs` + Zod 做运行时校验，通过 `SKIP_ENV_VALIDATION` 跳过
- **Tailwind CSS v4**：使用 `@tailwindcss/postcss` 插件

## 6. 文件修改记录（最近重要变更）

- `package.json` → 移除 `next-auth`、`@auth/drizzle-adapter` 依赖
- `src/server/db/schema.ts` → 删除 users/accounts/sessions/verificationTokens 表及关联关系，posts 表移除 createdById 列
- `src/server/api/trpc.ts` → 删除 session 上下文、auth 引用、protectedProcedure，移除 TRPCError 导入
- `src/server/api/routers/post.ts` → 删除 create/getLatest/getSecretMessage 路由，仅保留 hello 查询
- `src/pages/_app.tsx` → 删除 SessionProvider 和 Session 类型导入
- `src/pages/index.tsx` → 删除 AuthShowcase 组件及 signIn/signOut/useSession 导入
- `src/env.js` → 删除 AUTH_SECRET、AUTH_DISCORD_ID、AUTH_DISCORD_SECRET 校验
- `.env` / `.env.example` → 删除所有 AUTH_* 环境变量
- `src/server/auth/` → 目录及全部文件删除
- `src/app/api/auth/[...nextauth]/` → 目录及文件删除
- `AGENTS.md` → 新建 Repository Guidelines 贡献指南
- `CLAUDE.md` → 新增「会话启动协议」和「上下文文件体系（Hooks）」章节
- `CLAUDE.md` → 新增「任务结束自动提交钩子」章节
- `AGENTS.md` → 新增「Automated Commit & Push Workflow」章节
- `scripts/git-save.sh` → 新建自动提交推送辅助脚本
- `src/pages/index.tsx` → 替换为 Hello World 特效页面（Canvas 粒子动画 + 渐变文字 + 鼠标交互）

## 7. 已学到的经验教训 & 避坑记录

- T3 create-t3-app 的 `--CI` 模式配合 `--drizzle true --prisma false` 等开关可实现无交互脚手架
- 移除认证模块时需联动清理：依赖 → schema 表 → tRPC 上下文 → 页面组件 → 环境变量，任一环节遗漏都会导致编译错误
- `npm run typecheck` 是验证清理是否彻底的最快手段
- 三个 Markdown 文件构成分层 hooks 体系：CLAUDE.md（固定行为）← AGENTS.md（仓库规范）← project-context.md（动态快照）
- 自动 git 推送依赖远程仓库配置（`git remote add origin <url>`），脚本会优雅降级：无 remote 时只提交不推送
- TypeScript strict 模式下 `noUncheckedIndexedAccess` 会导致数组索引访问返回 `T | undefined`，必须显式 null-check
