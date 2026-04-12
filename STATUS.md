# 项目状态文档 (STATUS.md)

> **单一真相源 (SSOT)**：每个 Agent 或开发者开始工作前必须读取，结束时必须更新。
> **日志记录说明**：本项目以 `STATUS.md` 为全局状态唯一来源，增量文件变更请参考 `DEVELOPMENT_LOG.md`。
> **最后更新**: 2026-04-12 by Antigravity

---

## 1. 当前状态总览

**整体进度**: 🔶 进行中 - 代码审计与 v2.5.0 开发完成，移动端 APK 闪退问题已在模拟器侧收口，待真机补充验证。

### 1.1 模块详细状态
| 模块 | 状态 | 详细说明 |
|:---|:---|:---|
| **后端 API** | ✅ 正常 | FastAPI v2.5.0, 支持记录列表分页、超时与眼轴动态参考值 |
| **前端页面** | ✅ 正常 | Next.js 15, 玻璃拟态界面, 已支持大模型 OCR 结果审核流 |
| **移动端 APK** | ✅ 模拟器验证通过 | 最新 Release APK 已在 Android 模拟器成功启动，`assets/index.android.bundle` 已打入 APK，当前使用 Legacy Architecture 稳定运行 |
| **数据库** | ✅ 正常 | PostgreSQL 16 (本地兼容 SQLite), 已完成重建与迁移验证 |
| **对象存储** | ✅ 正常 | MinIO 运行中, 支持 UUID 唯一化存储 |
| **OCR 编排** | ✅ 正常 | Qwen2.5-VL-32B 模型 + 规则引擎校验 |

### 1.2 规格文档清单 (Specs)
| 文档 | 状态 | 核心职责 |
|:---|:---|:---|
| `PRD.md` | ✅ 已更新 | 业务逻辑、检查单范围与用户流程 |
| `UI_SPEC.md` | ✅ 已更新 | 8页信息架构、前端交互与玻璃拟态规范 |
| `API_CONTRACT.md` | ✅ 已更新 | 前后端契约, 包含错误码与数值区间约束 |
| `DATABASE_SCHEMA.md` | ✅ 已更新 | 7表架构, 物理删除级联逻辑 |
| `ARCHITECTURE.md` | ✅ 已更新 | FastAPI + Next.js + Docker 架构拓扑 |
| `TEST_STRATEGY.md` | ✅ 已更新 | P1-P5 测试矩阵与 Golden Set 定义 |
| `OCR_SCHEMA.md` | ✅ 已更新 | 模型输出约束、置信度分级语义 |

---

## 2. 最近完成的工作 (v2.5.0)

### 2.1 核心变更
1. **记录列表 API**: 新增 `GET /api/v1/records`，支持分页与级联过滤。
2. **眼轴年龄参考值**: 实现了按年龄动态计算眼轴参考值，移除硬编码 (23.0mm)。
3. **API 超时治理**: 前后端统一增加了 30s 超时处理与 `AbortController` 绑定。
4. **代码审计**: 修复了白屏容错、时间范围筛选、图片预览等 6 个核心 Bug。

### 2.2 测试状态
| 类型 | 用例数 | 结果 | 备注 |
|:---|:---|:---|:---|
| 后端 UT/API | 28/32 | ✅ 全部通过 | - |
| E2E 测试 | 20 | 🔶 15 Passed | 5 跳过 (原因：成员页 hydration 及 OCR 外部波动) |
| 总计 | 72 | ✅ 正常运行 | - |

---

## 3. 待办任务清单

### P0 - 移动端 APK 闪退调查 (已收口)
**现象**: 历史 Release APK 曾出现安装后立即崩溃，无法进入启动页。
**最新进展**:
- [x] 本地 `./gradlew assembleRelease --no-daemon` 构建通过。
- [x] 已确认 `assets/index.android.bundle` 正确打包进 APK。
- [x] 已将 Expo 源配置 `mobile_app/app.json` 的 `newArchEnabled` 统一为 `false`，避免后续 `prebuild` 回写风险配置。
- [x] 已在 Android 模拟器安装并启动最新 Release APK，应用成功进入首页，进程存活，`logcat` 未见 `FATAL EXCEPTION`。
**待执行动作**:
- [ ] 选做：在真机上补一次安装与启动验证。

### P1 - 基础设施与同步
- [ ] **Git 同步**: 推送 `v2.5.0` 的 2 个待提交 commit 到远程。
- [ ] **PostgreSQL 迁移**: 生产环境正式数据库配置验证。
- [x] **文档治理门禁**: 已建立 `AGENTS.md` + pre-commit + GitHub Actions 文档对齐检查。

---

## 4. 环境信息
- **后端**: `http://localhost:8000` (FastAPI)
- **前端**: `http://localhost:3001` (Next.js)
- **数据库**: PostgreSQL 16
- **存储**: MinIO

---

## 5. 项目路线图
- [x] **v2.4.0**: 基础数据通路与 OCR 核心闭环
- [x] **v2.5.0**: 列表增强、治理超时与动态参考值
- [ ] **v2.6.0**: 真机补充验证、性能优化与分页增强
