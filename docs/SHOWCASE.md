# 项目展示与公开准备

这份资料可用于 GitHub About、Release、开发者社区和个人项目介绍。内容对应当前实现；传播效果需要真实反馈验证，不保证 Star、排名或关注数量。

## 仓库展示信息

可直接使用的结构化资料在 [repository-meta.json](../.github/repository-meta.json)。它是维护者建议配置，不会自动修改 GitHub 设置。

**中文一句话：** 面向亚太 K-pop 观众的演出发现与私人现场档案：无商业 API key、官方来源可追溯、五种语言、可自部署。

**English:** Keyless, source-aware K-pop concert discovery and a private live-music passport for APAC fans. Self-hosted with Next.js, SQLite and SwiftUI.

建议 Topics 围绕真实用途与技术：`kpop`、`concerts`、`concert-discovery`、`self-hosted`、`nextjs`、`react`、`typescript`、`sqlite`、`swiftui`、`maplibre`、`open-source`。不添加与项目无关的热词。

README 的 CI 徽章目前静态说明检查范围，不伪装成远端检查已通过；公开且远端 CI 运行后，可改为 `ci.yml` 的动态状态徽章。

GitHub 社交预览可直接上传本轮制作的 **[1280×640 PNG](assets/social-preview.png)**，其[可编辑 SVG 源文件](assets/social-preview.svg)也已保留。需要展示实际产品时可使用[真实首页截图](assets/home-desktop.png)。README 使用[原创 SVG 封面](assets/readme-hero.svg)，适合仓库内展示；第三方摄影的授权边界继续适用。

## 可以直接使用的发布文案

### 中文开发者社区

> 做了一个「演出护照」：给跨城看 K-pop 的人，把发现演出、核对官方信息、收藏候选和记录现场连在一起。
>
> 项目默认不依赖商业 API key，直接接入支持的官方公开目录与活动页。抓取快照、艺人身份、时间冲突和官方链接分别核验；数据不确定就明确提示，保留证据。Web 支持五种语言，演示模式使用隔离虚构数据。
>
> 技术上是 Next.js + SQLite 的完整有状态产品，包含持久采集队列、独立 worker、事务迁移、个人记录合并、来源 fixture、SwiftUI 客户端和自部署配置。想研究真实数据产品，或补一个来源解析/翻译/无障碍修复，欢迎来一起做。
>
> 当前是 early access，覆盖不完整，通知与付费功能还没上线。代码采用 MIT，第三方媒体条件单独列出。

公开后附[仓库](https://github.com/billpwchan/concert_passport)和[在线体验](https://concert-passport.52-198-144-26.sslip.io)，搭配一张真实截图与一段实际操作录屏。现有 `product-tour.gif` 是截图轮播，不写成操作录像。

### English developer introduction

> Concert Passport helps APAC K-pop fans discover a show, check its official source, save it, and keep a private memory of the night. The default collector needs no commercial API key; uncertain identities and conflicting times remain review candidates. Built with Next.js, SQLite, an independent worker and a SwiftUI client. Five Web languages, an isolated fictional demo, replayable fixtures and portable self-hosting are included. MIT code; separate rights for third-party media. Early access, with incomplete coverage.

## 公开前的具体检查

2026-09-30 只读检查时，远端仓库为 **private**，About / homepage / Topics 为空。README 和许可证文件进入远端后，GitHub 才会识别相应内容；本地修改不会自动改变仓库可见性或元数据。

1. 整理本次要发布的提交，保留其他未提交工作；候选经过本地检查与远端 CI。
2. 检查当前文件和 Git 历史中的 `.env`、密钥、用户数据、备份和私人路径；有泄露先轮换凭证并处理历史。
3. 检查已提交第三方图片的公开再分发条件；不明确的素材替换或移除，保留证明记录。MIT 不替第三方素材授权。
4. 确认在线体验、无密钥演示和跨语言入口仍可用；提供有意义的真实空状态。
5. 由维护者确认是否公开，并在 GitHub 设置 About、homepage、Topics、适用的私密漏洞报告、分支保护与 secret scanning。
6. 创建有实际发布范围和已知限制的 Release；再在相关社区分享项目链接，让读者能体验和贡献。

初次贡献任务应真实可完成，创建 Issue 后再添加 `good first issue` / `help wanted` 等标签；不为了看起来热闹批量制造空任务。Discussions、赞助与邮件通知只在实际启用后添加入口。

## 后续看什么

- 新访问者能否说清产品用途，并独立跑起 demo。
- 搜索 → 查看证据 → 收藏 → 出席记录是否顺畅，空目录时是否理解下一步。
- 来源或翻译 PR 是否容易提出、复现、review 和持续维护。
- Star / Fork / Watch 与真实反馈一起观察，不用快照数字冒充长期增长。

用修复记录、可重放的来源示例、跨时区边界和发布成果建立回访理由。最值得持续传播的素材是能被使用、验证和贡献的进展。
