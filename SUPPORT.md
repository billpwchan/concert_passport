# 使用帮助与常见问题

先读 [README](README.md) 与[开发指南](docs/DEVELOPMENT.md)。Bug 使用[问题报告](https://github.com/billpwchan/concert_passport/issues/new?template=bug_report.yml)，功能建议使用[建议表单](https://github.com/billpwchan/concert_passport/issues/new?template=feature_request.yml)，来源或日期纠错使用[数据来源表单](https://github.com/billpwchan/concert_passport/issues/new?template=source_request.yml)。提交前搜索已有 Issue，并附 revision 和不含隐私的复现。

## 启动后没有演出，是不是坏了？

普通模式从空目录开始，`npm run dev` 只启动 Web。先运行明确标注虚构数据的 `npm run demo` 体验 UI；真实目录还需要配置内部随机密钥并单独启动 worker。已启动 worker 时到 `/sources` 查看来源限制、任务积压与待复核状态。

## 必须购买 API key 吗？

不需要。默认 `CONCERT_PASSPORT_DATA_MODE=official` 只启用支持的公开官方来源路径。商业 API 需要主动选择 `hybrid` 与有效凭证；SearXNG 也是可选服务。源站拒绝访问会显示降级，无法保证全市场覆盖。

## 为什么有官方链接，却不能证明有票？

链接核验说明目的页身份与演出匹配，不是库存查询。演出内容、链接与价格公告使用独立证据时间；最终库存和购买条件以官方页面为准。

## 日期冲突、无法导出日历怎么办？

项目会保留互相矛盾的来源证据，并暂停不确定场次的日历导出。用公开官方活动页报告问题；不要直接改成你猜测的时间，或提交含票码的截图。运维复核流程见[数据管线](docs/KEYLESS_DATA.md)。

## 能部署在纯静态托管或无持久磁盘的函数上吗？

当前默认实现使用 `node:sqlite`、持久队列与独立 worker，需要有持久磁盘的 Node 服务。使用[通用 Compose](deploy/README.md#portable-installation)或按同样边界配置单实例主机。迁移到其他平台前需要重新设计存储和调度。

## 收藏和现场记录保存在哪里？

SQLite 保存个人记录。匿名状态通过浏览器 cookie 识别，同一部署上可在登录时合并到账号。清除匿名 cookie 会丢失浏览器与原身份的关联；不要把它当作跨设备同步。Passport 的 JSON 导出是私人数据，谨慎存放。

## Web 与 iOS 功能一样吗？

目前不同。Web 是完整体验主线，原生端含 SwiftUI / MapKit 与核心生命周期逻辑，部分交互仍在内存。见 [iOS 说明](apps/ios/README.md)。

## `node:sqlite`、Swift 或构建报错？

确认 Node 版本至少 22.13，推荐使用 `.nvmrc` 指定的 Node 22；安装使用 `npm ci --prefix apps/web`。不要为排错先运行 `npm audit fix --force`。Swift 核心要求 Swift 6 与匹配的 SDK；缓存权限和工具链问题见[开发排错](docs/DEVELOPMENT.md#常见开发问题)。

## 可以下载和复用截图里的艺人照片吗？

代码采用 MIT，第三方媒体不因此获得再授权。先查[素材清单](docs/ASSETS.md)与[第三方说明](THIRD_PARTY_NOTICES.md)，必要时替换成自己的合规素材。

涉及漏洞、跨用户数据或凭证泄露，直接按[安全指南](SECURITY.md)私下报告。当前不提供商业客服、固定响应时间或可用性保证。
