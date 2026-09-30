# 参与贡献

欢迎从一个能复现、能验证的小改动开始。Bug 修复、来源 fixture、翻译、无障碍与运维说明都很有价值；第一次参与不需要理解整个采集系统。

## 从哪里开始

先按 [README](README.md#本地体验) 运行隔离演示。需要理解代码时，看[开发指南](docs/DEVELOPMENT.md)；计划较大的改动，先用[功能建议](https://github.com/billpwchan/concert_passport/issues/new?template=feature_request.yml)说明用户问题和验收方式，避免投入后才发现方向冲突。

| 改动 | 推荐的最小范围 | 相关位置 |
| --- | --- | --- |
| 翻译 | 一个流程的五种语言与格式校验 | `apps/web/lib/i18n/catalog/`、`tests/i18n.test.ts` |
| 来源解析 | 一个公开 fixture + 明确预期字段 + 失败路径 | `apps/web/lib/collection/`、`tests/fixtures/collection/` |
| 前端 | 一个组件在桌面、小屏、键盘与减少运动模式下的修复 | `apps/web/components/` |
| 业务逻辑 | 一个用户动作或时区边界的回归 | `apps/web/lib/domain/`、`apps/web/tests/` |
| 文档 | 当前行为、可以运行的命令、有效链接 | `docs/`、`scripts/check-repository.mjs` |

## 开发与提交

1. Fork 仓库或使用你有权限的 checkout，创建聚焦分支，例如 `fix/calendar-timezone`。Codex 创建分支默认使用 `codex/` 前缀。
2. 按开发指南安装 Web 依赖，使用临时数据库、fixture 或演示数据验证。
3. 对有行为风险的改动补充有意义的回归测试；简单文案和样式改动以对应静态/视觉检查为主。
4. 在同一个 PR 更新受影响的文档、环境示例、素材来源与迁移说明。
5. 使用 [PR 模板](.github/PULL_REQUEST_TEMPLATE.md)说明用户可见结果、验证与风险。中英文描述均可。

根目录完整检查：

```bash
npm ci --prefix apps/web
npm run check
```

按改动范围执行即可：

```bash
npm run check:repo   # 本地文档/图片链接、锚点、许可证与工程元信息
npm run test:repo    # 仓库检查器的回归测试
npm test            # 仓库检查器 + Web 测试
npm run lint
npm run typecheck
npm run build
```

原生代码或生命周期语义变化还需 `cd apps/ios && swift test`。Web 与 iOS 分别实现领域语义；Swift 核心测试通过不等于 iOS App 真机验收通过。UI 变化请附桌面与约 390px 小屏截图，并检查键盘焦点、长文案、空数据、缺图及 `prefers-reduced-motion`。

提交主题直接描述变化，例如 `fix: preserve venue timezone in calendar export`。不强制提交消息工具；保持一个 PR 围绕一个明确问题，避免顺手批量格式化无关文件。检查锁文件与 `package.json` 一起更新，CI 依赖 `npm ci`。

## 必须保留的产品与工程约束

- 演示、社区提交和机器解析候选不能冒充已核验的真实演出；保留来源与独立证据时间。
- 存储演出绝对时间及 IANA 场馆时区；日期范围不能被猜成多个确定场次。时间冲突必须进入复核，日历出口保持一致。
- 域名可信与某场演出授权是两层校验。保留主机/路径限制、robots、请求预算、重定向边界、限时抓取与退避。
- 默认 `official` 模式。商业连接器需要显式 `hybrid`；来源故障不能用示例数据填空或清除个人收藏。
- 不加入购票队列自动化、验证码绕过、卖方凭证存储或非官方转售流程。
- 个人回忆与票码、座位、精确未来行程和私密备注保持独立的数据边界；公开分享须有专门的隐私投影与用户确认。
- SQLite 使用 `node:sqlite` 和[现有版本迁移](apps/web/db/migrations.ts)。不引入第二套迁移系统；schema 改动需验证升级、旧记录保留与回滚边界。

## 数据来源与素材贡献

新来源说明地区、tier、capability、允许的主机/路径、公开入口、更新策略和故障回退。附带可重放的最小 fixture，注明源 URL、取得时间与使用条件；去掉 cookie、token 和个人信息。测试不依赖实时售票网站。

新视觉资产在 [ASSETS](docs/ASSETS.md)记录来源、权利状态与用途。原创品牌图和第三方海报分开；不要生成艺人照片来冒充真实活动影像。无法确认再分发条件的素材先以链接和说明讨论，不直接提交整套资源。

## 社区与许可

遵循[行为准则](CODE_OF_CONDUCT.md)，漏洞按[安全指南](SECURITY.md)私下报告。不要提交密钥、真实用户 SQLite / WAL / SHM、备份、票码、私人行程或编译产物。

原创代码与文档按 [MIT](LICENSE)许可贡献，不要求额外 CLA；第三方内容需独立说明权利条件。维护者会按用户价值、范围、证据与维护成本 review，不承诺固定回复或合并时间。
