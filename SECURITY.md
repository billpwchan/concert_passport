# 安全报告与运维边界

## 报告漏洞

如果仓库已启用 GitHub 私密漏洞报告，请使用 **Security → Report a vulnerability**。入口：[创建私密安全报告](https://github.com/billpwchan/concert_passport/security/advisories/new)。此入口是否可用取决于仓库设置。

如果私密入口不可用，请在 Issue 中只请求维护者提供私下联系渠道，或通过维护者 [GitHub 资料页](https://github.com/billpwchan)上公开提供的渠道联系。公开 Issue 不包含利用细节、真实用户数据、凭证或可直接攻击的请求。不要猜测维护者的邮箱。

请提供：受影响 revision / 部署方式、使用合成数据的最小复现、预期与实际权限、潜在影响、建议修复。等待维护者调查和协调披露；当前没有付费漏洞赏金或保证响应时间。

## 维护范围

项目处于 early access，尚无正式 LTS 分支。优先处理当前默认分支与最近可复现部署的安全问题；历史原型和旧发布记录不代表仍受维护。安全修复在[更新记录](CHANGELOG.md)中说明适用范围，部署者应主动跟进。

## 需要重点核验的边界

- 账号与匿名身份、会话轮换、跨用户读写、同源 mutation 和限流。
- SSRF、重定向与媒体 URL；官方来源的主机/路径白名单、响应大小、超时、robots 和请求预算。
- 内部调度接口的鉴权与数据库租约；内部密钥不得发到浏览器。
- 私人 Passport、收藏与导出缓存；公开分享不能复用含私密字段的数据投影。
- SQLite 迁移、持久卷、备份恢复和依赖供应链。

`/api/health` 仅暴露就绪、schema 与采集任务摘要，不包含私人记录；它的 HTTP 200 不保证目录全部新鲜。项目不存储支付卡、卖方账号、身份证件、票码或票据 PDF。

## 部署者约定

使用 HTTPS；内部密钥以 `openssl rand -hex 32` 等方式生成并存于服务端。`.env`、用户数据库、WAL/SHM、备份与私有日志不进入 Git。使用 SQLite backup API 一致性备份，在候选副本上验证迁移后再发布；详见[部署指南](deploy/README.md)。

CI 使用最小 `contents: read` 权限和固定 Action commit；PR 不自动部署或自动合并。上游采用单主分支维护，Dependabot 漏洞告警与自动安全修复保留，常规版本更新 PR 自动创建关闭；维护者负责检查、验证与提交修复。GitHub secret scanning 与 push protection 用于检查支持的凭证类型。仓库本地检查会发现敏感文件名，但它不是内容级 secret scanner；公开资料和 Git 历史仍需按实际内容审查。
