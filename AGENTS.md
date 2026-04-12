# AGENTS.md

本文件是仓库级协作约束。历史项目迁移时原版 `AGENTS.md` 丢失，本版依据 `BUG_LOG.md`、`DEPLOY.md`、`retrospective`、`TEST_GUIDELINE.md` 中已经落地引用的规则恢复。

## 最高原则

1. 规格优先。任何实现、测试、修复都必须先对照契约和规格，不凭记忆写代码。
2. 测试兜底。Bug 修复必须补回归测试，并执行受影响范围内的全量验证。
3. 文档同步。代码、规格、状态、缺陷记录必须在同一个提交周期内收口。
4. 生产纯净。测试逻辑、Mock 分支、脏数据、临时开关不得遗留在生产路径。

## 恢复的负向提示词

### NP-01 禁止无意义分支或占位逻辑

- 禁止提交 `x ? a : a`、永远为空字符串、永远同值返回的分支。
- 如果一个条件分支无法产生不同业务结果，先删掉再提交。

### NP-02 禁止直接用数组索引假定“最新时间点”

- 时间序列必须先按业务时间排序，再取 latest/previous。
- 同次检查的左右眼不能被误判成“当前/上次”。
- 禁止把 `series[0]`、原始 filter 结果尾项、单侧 labels 当作天然正确答案。

### NP-03 写集成/契约测试前必须先确认真实 API 契约

- 先读 `API_CONTRACT.md` / `MOBILE_API_CONTRACT.md` / schema / 真实接口响应。
- 不允许凭猜测写字段名、路径、枚举值、响应结构。
- 测试断言必须以契约为准，不以“我觉得应该是这样”为准。

### NP-04 修复 Bug 后禁止只跑单个用例

- 修复后必须跑受影响域的全量测试，而不是只跑一个 happy path。
- 前端/移动端至少跑对应 `npm test` 全量。
- 后端至少跑对应 pytest 集合；涉及构建链路时还必须跑构建验证。

### NP-05 禁止硬编码运行时环境地址或设备相关配置

- 禁止把 `localhost`、`10.0.2.2`、MinIO 地址、后端地址散落在业务代码里。
- 所有运行时地址必须走统一配置层，支持模拟器/真机/部署环境切换。

### NP-06 禁止把测试专用逻辑写进生产代码

- 不允许在生产代码里保留 `if e2e`, `if test_mode`, mock 返回、测试后门、假数据兜底。
- 测试替身必须放到测试目录、fixture、mock server 或独立环境里。

### NP-07 禁止在组件中堆砌临时布尔表达式驱动关键业务状态

- 空状态、看板展示、卡片门控、指标切换等关键逻辑必须抽成可测试的纯函数或明确规则。
- 禁止把复杂业务判断直接塞进 JSX 条件表达式后不做测试。

### NP-08 E2E/手动测试后必须清理数据库

- 任何 E2E、联调、手动录入、演示数据写入后，必须执行清理。
- 提交前必须确保数据库没有测试脏数据残留。
- 可使用 `admin/reset`、`check_dirty_data.py` 或等价清理流程。

## 文档同步规则

### 必改文档

- 任何代码/配置改动：`STATUS.md`、`DEVELOPMENT_LOG.md`
- 后端路由、服务、Schema：`docs/specs/API_CONTRACT.md`
- 数据模型、数据库、SQL：`docs/specs/DATABASE_SCHEMA.md`
- Web 页面、组件、交互：`docs/specs/UI_SPEC.md`
- 移动端页面、组件、交互：`docs/specs/MOBILE_UI_SPEC.md`
- 移动端 API/配置：`docs/specs/MOBILE_API_CONTRACT.md`
- 测试、回归用例、测试入口：`docs/specs/TEST_STRATEGY.md`
- 构建、部署、工程结构：`docs/specs/ARCHITECTURE.md`
- Bug 修复、回归缺陷：`docs/BUG_LOG.md`

### 提交流程

1. 改代码
2. 改对应规格文档
3. 改 `STATUS.md`
4. 改 `DEVELOPMENT_LOG.md`
5. 如属缺陷修复，改 `docs/BUG_LOG.md`
6. 运行 `python scripts/check_docs_alignment.py`
7. `git commit` 信息必须包含中文
8. 通过后再 commit

## 门禁

- pre-commit 会执行 `scripts/check_docs_alignment.py`
- commit-msg 会执行 `scripts/check_commit_message.py`
- GitHub Actions 会执行同一门禁
- 门禁失败时，不接受“文档下次补”的提交
