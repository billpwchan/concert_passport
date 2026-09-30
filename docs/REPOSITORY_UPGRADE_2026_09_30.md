# 2026-09-30 · 仓库升级验收

这轮工作围绕项目展示、初次体验、贡献流程和可维护的仓库规范。原有产品和部署工作保留；没有把仓库整理当作新的生产发布。

## 改动范围

- 中文 README 与英文入口、原创 SVG 封面、真实页面导览、演示优先的启动与代码阅读路径。
- 原创 1280×640 PNG 社交预览及可编辑 SVG、可直接使用的中英文发布文案与 About / Topics 建议。
- 维护者选定的 MIT、第三方素材边界、贡献/安全/支持/行为规范、更新记录与当前路线图。
- 当前开发/架构/发布指南、按任务组织的文档导航、保留原文的历史路线图快照。
- 根目录聚合命令、编辑与 Git 约定、Issue/PR 表单、CODEOWNERS、Dependabot、CI 最小权限/固定 SHA/临时构建数据库。
- 无第三方依赖的仓库链接、锚点、素材及工程一致性检查，附独立回归测试。
- 显式 Web Turbopack 根目录，修复新增根级锁文件引发的警告；Docker 构建保留项目 MIT 及收集到的依赖许可文本。

## 实际验证

| 检查 | 结果与边界 |
| --- | --- |
| 根目录 `npm run check` | Node 22.23.3，退出码 0；使用新的临时 SQLite 与媒体路径，商业凭证和内部密钥清空 |
| Web 测试 | **116 / 116**，包含新依赖 notice 收集的嵌套文件保留、symlink/隐藏路径边界 |
| 仓库检查器测试 | **10 / 10**，包含中文/重复锚点、代码围栏、缺图、未纳入 Git 的本地资产、路径越界、许可漂移与移动 Action tag |
| Web 静态与生产构建 | ESLint、TypeScript、Next.js 生产构建通过；最终构建没有根锁文件发现警告 |
| Swift 核心 | **3 / 3**；使用已有 Xcode 的 Swift toolchain 和可写临时缓存，没有安装工具链或更改全局设置 |
| 文档与元信息 | **49 份 Markdown** 的本地目标/锚点、素材及 package/lock/license 一致性通过；不联网检测外部链接，不等同于 secret scanner |
| 模板与 Compose | **6 份 YAML** 及建议元数据语法/边界检查通过；通用 Compose 用 `config --no-env-resolution --quiet` 静态验证 |
| 依赖许可文本 | 本地只读收集 **555** 份已安装依赖 notice，保留原文；Dockerfile 已加入生成与拷贝步骤，未在本轮重建镜像，未宣称完整授权审计 |
| 演示启动 | 根目录 `npm run demo` 实际启动，浏览器显示隔离虚构数据横幅与六个演示场次，不启动 worker |
| README 视觉 | 本地 marked / GitHub 风格预览，默认窗口与 **390px** 检查；本地图片均加载、锚点导航有效、窄屏无整页横向溢出 |
| 原创视觉 | 两份 SVG XML 解析通过，PNG 人工检查，社交预览 1280×640 |
| Git 补丁 | `git diff --check` 通过；Web 原有依赖版本保持，锁文件只同步本次许可元信息 |

本机默认 Command Line Tools 最初无法导入 `Testing`；为当前命令指定完整 Xcode 后通过。该排错方法写入[开发指南](DEVELOPMENT.md#常见开发问题)。Node 的 SQLite experimental warning 仍属于当前运行时提示。

README 采用本地渲染完成视觉验收。GitHub 原生 callout / Mermaid 渲染未单独验收；远端 Actions 的结果以关联 PR 与工作流记录为准。

## 发布边界

初次本地验收时，远端只读检查显示仓库为 private，About / homepage / Topics 为空。维护者随后授权将累计应用与仓库改动统一整理、提交并合并到主分支；Git 交付以关联 PR 与远端提交为准。仓库可见性、生产数据和生产部署不属于本次 Git 交付；检查使用独立临时数据，没有创建公开 Release。

截图对应历史日期，第三方媒体不由 MIT 再授权；公开前核对素材公开再分发条件与历史隐私信息。具体公开准备和文案见[展示资料](SHOWCASE.md)，发布过程见[发布指南](RELEASING.md)。代码、文档和 CI 配置完成不代表 Star / Follow 增长已经验证。
