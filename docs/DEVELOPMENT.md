# 开发指南

本指南描述当前 checkout 的开发方式。历史设计稿、生产快照与未来功能从[文档导航](README.md)进入，不作为本地启动前提。

## 环境与命令

Web 使用 Node **22.13+**，推荐 Node 22，与 CI / Docker 的主要版本一致。`node:sqlite` 和 Node 的 TypeScript stripping 是最低版本的实际原因。原生核心使用 Swift 6；iOS App 需要 Xcode 与 iOS 17+ SDK。

在仓库根目录：

```bash
# 有 nvm 时先运行 nvm use
npm ci --prefix apps/web
cp apps/web/.env.example apps/web/.env.local
npm run demo
```

演示在 `http://localhost:3106` 启动，强制独立临时 SQLite，场次明确标注虚构。退出演示后，用 `npm run dev` 在 `http://localhost:3000` 开发真实目录。根目录 package 只聚合命令，不引入新的 workspace、依赖管理器或根级第三方依赖；Web 的锁文件仍在 `apps/web/`。

| 根目录命令 | 用途 |
| --- | --- |
| `npm run dev` / `npm run demo` | 普通开发 / 独立虚构演示 |
| `npm test` | 仓库检查器与 Web 测试 |
| `npm run check:repo` / `npm run test:repo` | 文档、仓库元信息 / 检查器回归 |
| `npm run lint` / `npm run typecheck` | Web 静态检查 |
| `npm run build` / `npm start` | Web 生产构建 / 启动已构建产物 |
| `npm run check` | 仓库检查、检查器测试与全部 Web 检查 |
| `npm run audit:sources` | 需要公网的隔离官方来源采集审计 |

`dev`、`demo` 和 `build` 的 npm hook 会从安装的 MapLibre 包生成版本化地图 worker、共享模块及原始 LICENSE。生成目录 `apps/web/public/generated/maplibre/` 不进入 Git；Docker 构建重新生成并随 `public` 目录分发。这样保留 worker 的相对 ESM 导入，避免 Turbopack 为资源改名后出现「控件可见、地图无法加载」的问题。直接运行 `next` CLI 时，先执行 `node scripts/prepare-map-worker.mjs`（Web 工作目录）。

## 配置与数据隔离

完整示例见 [Web 环境模板](../apps/web/.env.example)。Next 读取 `apps/web/.env.local`；独立 worker 使用 Node `--env-file`，不会自动读取 Next 的配置文件。

| 配置 | 默认 / 用途 |
| --- | --- |
| `CONCERT_PASSPORT_DATA_MODE` | `official`；只有显式 `hybrid` 才开启商业连接器 |
| `CONCERT_PASSPORT_DB_PATH` | 相对 Web 工作目录的 `./data/concert-passport.sqlite` |
| `CONCERT_PASSPORT_MEDIA_CACHE_PATH` | `./data/media-cache`，本地可丢弃媒体缓存 |
| `CONCERT_PASSPORT_SITE_URL` | `http://localhost:3000`；生产覆盖为公开 HTTPS origin |
| `INGESTION_CRON_SECRET` | 默认空；启用内部任务前生成随机值，app 与 worker 一致 |
| `INTERNAL_APP_URL` | worker 使用的 Web 地址；本地显式指定 `http://localhost:3000` |

没有 key 也能开发 UI 和采集官方页面。商业凭证、内部密钥和真实数据库不进入 Git。演示脚本会主动清空可能从 `.env.local` 重新加载的商业凭证，且不启动 worker。

普通 `npm run build` 可读取 `.env.local`，某些服务端页面会访问数据库。运行生产验证或维护已有用户数据时，用独立路径：

```bash
# 以下命令在仓库根目录执行；该临时目录不与个人/生产数据共用
repo_check_dir=$(mktemp -d)
CONCERT_PASSPORT_DB_PATH="$repo_check_dir/check.sqlite" \
CONCERT_PASSPORT_MEDIA_CACHE_PATH="$repo_check_dir/media" \
CONCERT_PASSPORT_DATA_MODE=official npm run check
```

Web 测试自行建立临时数据库；CI 的构建路径位于 runner 临时目录。不要把测试数据库复制到线上。

## 建议的代码阅读顺序

| 想改的行为 | 阅读路径 |
| --- | --- |
| 用户浏览与交互 | `app/page.tsx` → `components/home-hub.tsx` → `components/show-finder.tsx` |
| 演出查询 | `app/api/v1/discover/route.ts` → `lib/discovery/service.ts` → `db/events.ts` |
| 官方采集 | `scripts/ingestion-worker.mjs` → `app/api/internal/collection/run/route.ts` → `lib/collection/runner.ts` → `db/collection.ts` |
| 解析与可信度 | `lib/collection/parser.ts`、`conflicts.ts`、`lib/sources/link-resolution/` |
| 个人记录 | `app/api/v1/plans/route.ts`、`app/api/v1/passport/route.ts` → `db/passport.ts` |
| 账号与匿名合并 | `lib/server/auth.ts`、`lib/server/data-session.ts` → `db/auth.ts` |
| 时间与生命周期 | `lib/domain/`，以及对应 Web / Swift 核心测试 |
| 图片与本地化 | `lib/sources/media/`、`lib/server/media-url.ts`、`lib/i18n/` |

上述 Web 路径均相对 `apps/web/`。领域纯函数适合放 `lib/domain/`；数据库模块负责持久化，路由负责输入/鉴权/HTTP 契约，组件负责展示和用户动作。修改时沿用现有边界，避免把来源抓取放进客户端。

## 按风险选择验证

- 文档/元信息：`npm run check:repo` 与 `npm run test:repo`；README 在窄屏和 GitHub 风格下看一遍。
- 业务或来源：相关 regression + `npm test`、lint、typecheck、build。fixtures 取代实时网站；真实审计单独执行。
- UI：静态检查与 build，人工覆盖桌面、约 390px、键盘、减少运动、空数据和缺图。
- schema：在副本上运行升级并对比原有用户记录；验证旧应用读取新库的兼容边界。参见[部署恢复](../deploy/README.md#consistent-backups-and-migration-proof)。
- Swift 或共享生命周期语义：`cd apps/ios && swift test`，涉及 App 时再做 Xcode / 设备验证。

仓库检查只验证本地文档目标、Markdown 标题/显式锚点、图片文件、部分工程一致性及敏感文件名，不联网检查外部链接，也不等同于完整 Markdown parser 或 secret scanner。它会检查 Git 跟踪及未忽略的文件，防止文档误引用只存在于本机的素材。

## 镜像中的许可文件

Docker builder 使用 `scripts/collect-notices.mjs` 收集已安装依赖的许可与 attribution 文件，runner 同时保留项目 `LICENSE` 与生成的 `THIRD_PARTY_LICENSES.txt`。收集器只读依赖文件、不联网、不运行包脚本，并跳过 symlink 与隐藏目录；它不代表已完成完整授权审计。`apps/web/LICENSE` 是根许可证的构建上下文副本，仓库检查会阻止二者漂移。

## 常见开发问题

| 症状 | 处理 |
| --- | --- |
| `node:sqlite` 或类型 stripping 不可用 | `node --version`，切换 Node 22.13+，使用同一 Node 执行 npm 和脚本 |
| 首页目录为空 | 确认是否运行普通模式；需要 worker 或使用演示，不用临时样例污染真实目录 |
| worker 401 | app / worker 内部密钥一致，Web 修改 `.env.local` 后重启；检查 worker 显式加载配置 |
| 来源 403 / robots / 429 | 保留拒绝访问和退避；查 `/sources`，用合法公开 fixture 修复解析，不能绕过限制 |
| `npm ci` 失败 | 确认在 Web 目录或加 `--prefix apps/web`；manifest 与锁文件必须匹配 |
| Swift 缓存权限或 SDK 不匹配 | 用匹配 Xcode toolchain；受限环境可指定可写 scratch/module cache 路径，见下方 |

若系统选择的是 Command Line Tools 且报 `no such module 'Testing'`，在安装完整 Xcode 的机器上为当前命令指定 `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`，不必更改全局设置。Swift 受限环境示例，在 `apps/ios` 执行：

```bash
swift_check_dir=$(mktemp -d)
SWIFTPM_MODULECACHE_OVERRIDE="$swift_check_dir/modules" \
CLANG_MODULE_CACHE_PATH="$swift_check_dir/modules" \
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
xcrun swift test --scratch-path "$swift_check_dir/build" --disable-sandbox
```

只在自己的开发环境使用上述缓存设置；它不会安装工具链，也不会证明 App 真机功能正确。
