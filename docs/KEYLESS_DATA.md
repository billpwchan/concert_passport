# 无 API key 的演出数据管线

状态：2026-09-30 已实现并完成隔离真实采集；后续部署和产品验证见[当日交付验收](RELEASE_2026_09_30.md)。下方采集数与测试数是对应阶段的历史证据。

## 决策

默认使用 **官方公开目录 → 官方活动页 / 场馆页 → 结构化证据 → canonical 目录**。搜索读取持久目录，后台按来源刷新。Ticketmaster、PredictHQ 和 Brave 是可选增强，不再是冷启动或日常运行的前提。

`CONCERT_PASSPORT_DATA_MODE=official` 是默认值，未知值也按 official 处理。即使环境里仍有旧密钥，这三项商业 API 也不会被调用。只有显式设为 `hybrid` 并提供有效凭证才启用。历史聚合记录保留来源和过期状态，不因切换模式直接删除用户收藏。

## 调研结论与工具选择

| 候选 | 结论与用途 |
| --- | --- |
| **Node fetch + Cheerio 1.2.0** | 已采用。轻量解析官方 HTML、XML 和结构化 JSON；不执行第三方脚本，不依赖 LLM 按次付费。保留现有 SQLite 队列、配额、快照和证据体系。[Cheerio](https://cheerio.js.org/docs/intro/) |
| **Crawlee** | 成熟的请求队列、限流和 robots 支持值得参考；当前已有持久队列，暂不再叠加第二套调度。未来来源规模显著增大时评估替换。[官方选项](https://crawlee.dev/js/api/3.14/cheerio-crawler/interface/CheerioCrawlerOptions) |
| **Crawl4AI** | 可自托管，但官方自托管指南要求至少 4GB 可用内存。现有 app 容器限额 640MB，不适合作为默认常驻采集服务；如未来确需 JS 渲染，应单独部署受限执行服务。[自托管指南](https://docs.crawl4ai.com/core/self-hosting/) |
| **SearXNG** | 继续作为可选的官方链接候选发现。自行部署可提供 JSON 搜索，但上游可限流；本轮主链路在没有 SearXNG 时也已完成采集。搜索片段不作为日期或余票事实。[Search API](https://github.com/searxng/searxng/blob/master/docs/dev/search_api.rst) |
| **MusicBrainz / Wikidata** | 已有免费公开艺人身份模块，保留用于别名、实体与 K-pop 范围确认。它们不证明开售时间，冷启动先用现有启动艺人目录。MusicBrainz 请求速率遵循其每秒一次的限制。[MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API) |
| **Songkick / Bandsintown / setlist.fm** | 不作为无密钥替代。Songkick 当前 API 要求付费许可；Bandsintown key 默认绑定单一艺人；setlist.fm API 仍要求 key。[Songkick](https://www.songkick.com/developer)、[Bandsintown](https://help.artists.bandsintown.com/en/articles/7053475-what-is-the-bandsintown-api)、[setlist.fm](https://api.setlist.fm/docs/1.0/index.html) |

开源工具解决抓取和解析，不自动提供完整演出库。公开站点可访问也不等于数据、海报可任意再分发；源站改变结构、限制访问或要求合作时，显示覆盖缺口并维护适配器。

## 来源与实测

- **Live Nation 区域站**：使用网站自身公开目录和活动页面，不借用第三方 app ID 或私有 token。公开目录通常比逐个售票页稳定，可直接给出活动实体、日期、场馆和巡演图。新加坡、台湾最初抽样分别返回 27、28 条活动；这是所有音乐类别的活动条数，不是 K-pop 发布数。
- **The Star Performing Arts Centre**：新增官方场馆来源和 Cheerio 模板解析，读取可见的日期、演出时间、场馆、活动图和售票链接。隐藏的多日模板不参与推断。XLOV 实测页面给出 2026-10-01 20:00 +08:00，与旧聚合记录冲突；未知艺人或冲突仍需后续核验。[官方活动页](https://www.thestar.sg/events/2026-xlov-asia-tour-serving-x-in-singapore)
- **站点地图**：从 robots.txt 声明的同源 XML 入口发现活动 URL，再读取活动页。只保留允许的主机/路径，限制入口数、深度和条数；不把 sitemap 的 lastmod 当作演出信息。The Star 的 `/sitemap.xml` 实测 404，已移除猜测入口，其目录页仍可工作。[协议](https://www.sitemaps.org/protocol.html)
- **既有 ThaiTicketMajor、JSON-LD 和 Live Nation 页面适配**：保留独立场次解析。只有日期就保存日期；多日公告没有分场时间时不能生成虚构场次。[MusicEvent 结构](https://schema.org/MusicEvent)

### 真实验收快照

2026-09-30 **13:04:46 +08:00**，全新临时数据库、无事件/搜索 API key，检查八个 Live Nation 地区来源与 The Star；4 批共 48 页。

| 指标 | 结果 |
| --- | ---: |
| canonical 演出记录 | 14 |
| 发布/补充操作 | 15（不等于 15 场唯一演出） |
| 页面失败 | 3 |
| 艺人身份待确认候选 | 206（含非 K-pop 活动，不等于待发布演出数） |
| 多日场次待确认候选 | 5 |
| SQLite integrity_check | ok |

最后来源状态：7 个 healthy；香港最后检查的一个页面无法解析；泰国来源发生网络错误。状态是该轮快照，不是长期可用性承诺，也不能用“请求成功”代替“每条场次已核验”。完整机器可读证据见[采集报告](observations/2026-09-30-keyless-collection.json)。

与第一次试跑相比，本轮修复了两个实际发现的故障：

1. JSON 里的转义 HTML 链接曾被当作页面链接，生成 `/%22https://...` 无效 URL。公开 JSON 现在只读取结构化 documents；HTML 使用 DOM 解析，并拒绝畸形路径。
2. 单个详情页的 403 / 404 曾触发整个来源退避，让仍可用的公开目录也停止更新。现在此类故障只延后对应页面，来源标记 partial；429 与服务故障仍按来源退避，遵循 Retry-After。

## 本地运行

在 `apps/web` 配置 `.env.local`：

```dotenv
CONCERT_PASSPORT_DATA_MODE=official
CONCERT_PASSPORT_DB_PATH=./data/concert-passport.sqlite
CONCERT_PASSPORT_MEDIA_CACHE_PATH=./data/media-cache
INGESTION_CRON_SECRET=<自行生成的随机内部密钥>
```

这是本地 app 与 worker 的共享密钥，不是购买的数据 API key。填入真实随机值后启动 Web，再单独启动采集：

```bash
npm run dev
# 另一个终端，同样位于 apps/web
INTERNAL_APP_URL=http://localhost:3000 node --env-file=.env.local scripts/ingestion-worker.mjs
```

worker 保留官方采集、艺人身份、官方链接与媒体任务；默认不运行依赖商业聚合 API 的 ingestion 任务。Wikimedia 身份图片和官方活动图仍可独立取得；没有可靠图片时使用品牌回退。

### 可复跑验收

```bash
npm run audit:sources

# 显式选择来源，控制网络请求规模
npm run audit:sources -- \
  --sources livenation-sg,livenation-tw,the-star-sg \
  --batches 2 --pages 8 --output /tmp/concert-passport-audit.json
```

审计命令强制 official 模式，清除事件/搜索 key，使用全新临时数据库，不复用 `.env` 中的生产数据库路径。输出真实事件、来源结果、候选原因和完整性检查；零发布或数据库不完整时返回非零状态。部分来源失败会如实保留，发布数不代表全区域覆盖率。命令不调用图片下载、搜索引擎或身份扩充服务。

## 更新与运行约束

- 官方采集批次默认每 5 分钟，默认最多 8 页；循环预算 50 秒，队列与租约持久化。
- 普通详情页 6 小时；演出前 14 天内 2 小时，前 2 天内 30 分钟；历史详情页 7 天。
- 已有可信开售时间的页面，开售前后两小时内目标间隔 5 分钟；提前进入观察窗口。此值是到期频率，仍受总吞吐量、源站限制和积压约束。
- 401 与 403 分开记录；403 是拒绝访问，不宣称用户密钥失效。robots 限制、主机白名单、响应大小和重定向边界继续生效。
- 官方来源新增独立健康信息，商业接口未启用不再造成搜索被标记为 API 失败。来源近期成功与具体场次的新鲜度仍是不同概念。
- 部署保留单 app 数据库写入者和独立 worker；生产 `app.env` 显式设置 official，原有持久卷与内部密钥保持一致。最终发布仍执行候选验证与备份流程。

## 工程验证

- Node **22.23.3**（与生产同一主要版本）：106 项测试通过，生产构建通过；ESLint、TypeScript 通过。
- 覆盖残留商业密钥不会发起请求、真实场馆 fixture、隐藏日期与异常时间、HTML/XML 主机边界、队列来源隔离、页面失败与源站限流、开售窗口调度和 JSON 伪链接回归。
- 使用上述真实采集的临时数据库启动本机服务，`/`、`/atlas`、`/sources`、`/api/v1/sources` 与 ITZY 搜索均返回 200。搜索报告 `dataMode=official`、1 条结果、0 个接口错误；未触碰生产数据。

## 仍需继续改进

当前发布范围受艺人目录和解析结构限制；陌生艺人不能直接通过名称发布，多日公告无法凭空拆成各晚开场时间。后续优先维护艺人身份审核、临近开售队列优先级、冲突复核和字段级核验时间，而不是不断添加不稳定的抓取入口。真实站点 fixtures 与来源审计是适配器升级的必要证据。

## September 30 delivery: evidence and priority

The Web now uses `data_verified_at` for the freshness of event facts instead of treating every weak-source observation (`last_seen_at`) as a re-verification. Link checks remain `best_link_verified_at`; price/sale announcements retain their own `event_enrichment.observed_at`. These clocks are evidence timestamps, not live inventory.

Within a due source, pages for shows within 14 days are prioritized, followed by artists explicitly followed by users. Source-level fairness and host budgets still apply. `/api/health` reports a collection delay after 30 minutes without completion; this does not turn a healthy UI into a failed readiness probe.

Independent sources naming the same artist/venue/market with differing times within two hours create `conflicting_performance_time` review candidates. The collector does not publish a second uncertain performance or overwrite the existing time. The event detail warns users and calendar export returns 409. A separate matinee/night gap beyond two hours is not automatically treated as a conflict. This heuristic is intentionally conservative and requires operator judgment; it is not an automatic truth resolver.

An operator resolves a conflict by reviewing the retained document and the current official venue/seller page, updating the canonical facts with the existing audited ingestion/link tooling, and marking the corresponding candidate reviewed. There is no public automatic approval API. Never resolve by deleting the losing source evidence or merely choosing the newest timestamp. Source schema drift and short-name identity ambiguities remain in the review queue.

Map fallback: a small checked-in Wikidata city gazetteer supports approximate city markers when official pages omit venue coordinates. These markers are visibly distinguished and never overwrite canonical venue coordinates. No geocoding API key is needed. See [provenance](ASSETS.md#map-locations).

### 历史数据冲突

读取历史目录时也会检查同一艺人、地区与场馆的近邻时间冲突，包括 The Star Theatre / The Star Performing Arts Centre 的新加坡场馆别名。检测只降低时间确定性，不合并或覆盖记录；首页不会将冲突场次选为主视觉。主视觉还要求近期（72 小时内）核验及可追溯的活动级素材。
