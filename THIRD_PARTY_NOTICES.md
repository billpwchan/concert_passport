# 第三方内容与依赖

[MIT License](LICENSE)适用于本项目原创代码、文档与原创品牌 SVG。第三方内容由相应权利人拥有；项目许可证不覆盖其独立授权条件。

| 内容 | 来源与处理 |
| --- | --- |
| 官方活动照片、海报与 Logo | 主办方、场馆、售票平台或艺人官方渠道；以活动级来源证据关联，用途和历史资产说明见 [ASSETS](docs/ASSETS.md) 与 [视觉资产系统](docs/VISUAL_ASSET_SYSTEM.md) |
| Wikimedia 图片 | 具体文件页的作者、许可与 attribution 元数据；按每张素材的许可处理，不把 Wikimedia 域名视为统一授权 |
| Wikidata 城市坐标 | P625 结构化数据，具体实体及 CC0 来源记录见 [Map locations](docs/ASSETS.md#map-locations)；仅表示城市近似位置 |
| MusicBrainz / Wikidata 身份数据 | 用于身份匹配，遵循上游数据与 API 条件；身份来源不能证明演出事实或媒体权利 |
| 地图样式与底图 | MapLibre 客户端与 OpenFreeMap 样式、底图各自条件；保留运行时显示的 provider / OpenStreetMap attribution。构建时生成的 MapLibre worker 与共享模块保留上游 LICENSE，随版本化静态目录一起分发 |
| 开发依赖 | 各包独立许可证与 notice；精确版本由 [Web 锁文件](apps/web/package-lock.json)记录，Docker 构建会收集实际安装依赖中的 LICENSE / NOTICE / COPYING，并保存在镜像 `/app/THIRD_PARTY_LICENSES.txt`；包含开发与 bundled 依赖，不等同于完整授权审计 |

产品截图仅说明对应日期的 UI，不证明余票、当前目录完整性或媒体再分发权限。解析 fixture 只保留测试必要片段，新增素材须记录原 URL、取得时间、用途与可确认的条件。公开来源可访问不等于可无限抓取、复制或商业再分发。

本文件是内容边界说明，不是已完成所有依赖授权审计的声明。对素材归属或移除有疑问，使用[支持渠道](SUPPORT.md)，涉及私密信息则请求维护者提供私下联系。
