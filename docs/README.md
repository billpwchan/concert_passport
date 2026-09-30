# 文档导航

第一次访问先读[项目介绍](../README.md)，然后运行[本地演示](../README.md#本地体验)。这里按任务组织当前指南；设计推演与历史证据另列，避免把旧设想当作已实现能力。

## 使用、开发与维护

| 任务 | 入口 |
| --- | --- |
| 理解价值与实际界面 | [中文 README](../README.md) · [English](../README.en.md) |
| 环境、根目录命令、代码阅读与排错 | [开发指南](DEVELOPMENT.md) · [常见问题](../SUPPORT.md) |
| 第一次贡献与 review | [贡献指南](../CONTRIBUTING.md) · [行为准则](../CODE_OF_CONDUCT.md) |
| 当前服务边界与接口 | [架构](ARCHITECTURE.md) · [API](API.md) |
| 无密钥官方采集与复跑验收 | [数据管线](KEYLESS_DATA.md) |
| 接入/维护来源 | [来源集成](SOURCE_INTEGRATION_SYSTEM.md) · [来源运维](SOURCE_OPERATIONS.md) |
| 图片、本地化与授权 | [素材清单](ASSETS.md) · [视觉系统](VISUAL_ASSET_SYSTEM.md) · [本地化](LOCALIZATION.md) · [第三方说明](../THIRD_PARTY_NOTICES.md) |
| 自部署、备份、升级与回滚 | [部署指南](../deploy/README.md) · [发布流程](RELEASING.md) |
| 原生客户端 | [iOS 说明](../apps/ios/README.md) |
| 当前优先级与变化 | [路线图](ROADMAP.md) · [更新记录](../CHANGELOG.md) |
| 项目展示与公开准备 | [展示资料](SHOWCASE.md) |
| 漏洞与许可 | [安全指南](../SECURITY.md) · [MIT](../LICENSE) |

## 实测与交付证据

- [2026-09-30 产品交付验收](RELEASE_2026_09_30.md)：验证范围、线上镜像与已知限制。
- [2026-09-30 仓库升级验收](REPOSITORY_UPGRADE_2026_09_30.md)：本次文档/工程改动与实际检查。
- [官方来源隔离采集](observations/2026-09-30-keyless-collection.json)：真实结果、错误与候选。
- [生产目录快照](observations/2026-09-30-production-v32.json)：有日期的状态，不是持续有效的宣传指标。
- [9 月 9 日部署记录](DEPLOYMENT_V31_20260909.md)：当日候选、切换与回滚证据。

## 产品决策与历史工程参考

以下保留研究、探索与当时的状态。阅读时留意时间和「建议 / 已实现」标记；当前配置与接口以代码和上面的当前指南为准。

| 主题 | 历史参考 |
| --- | --- |
| 产品收敛与实施基线 | [9 月 30 日诊断蓝图](REFACTOR_PLAN_2026_09_30.md) · [产品重置](PRODUCT_RESET.md) · [产品蓝图](PRODUCT_BLUEPRINT.md) · [原路线图快照](history/ROADMAP_BEFORE_REPOSITORY_UPGRADE.md) |
| 发现与采集演进 | [发现重构](DISCOVERY_REFACTOR_2026_09.md) · [连续采集 v31](CONTINUOUS_COLLECTION_V31.md) · [自动发现架构](AUTONOMOUS_DISCOVERY_ARCHITECTURE.md) · [艺人目录](SELF_EVOLVING_KPOP_CATALOG.md) |
| 品牌、视觉与研究 | [品牌](BRAND_SYSTEM.md) · [设计方向](DESIGN_DIRECTION.md) · [体验探索](EXPERIENCE_LAB_VISUAL_DIRECTION.md) · [研究](RESEARCH.md) |
| 审计与推广检查 | [实现审计](IMPLEMENTATION_AUDIT.md) · [原始红队](RED_TEAM.md) · [v27](RED_TEAM_V27.md) · [v28](RED_TEAM_V28_AUTONOMY.md) · [v29](PROMOTION_READINESS_V29.md) |

新增文档在这里登记。公共能力应能追溯到代码或具体验收；历史观察保留日期，后续状态通过链接或补记说明，不把旧报告改写成新的实测。
