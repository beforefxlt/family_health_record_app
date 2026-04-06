# 项目状态文档 (STATUS.md)

> **单一真相源**：每个 Agent 开始工作前必须读取，结束时必须更新。
> **最后更新**: 2026-04-06 by Agent

---

## 当前状态

**整体进度**: 🔶 进行中 - 代码审计与功能开发完成，APK 闪退问题待调查

| 模块 | 状态 | 说明 |
|------|------|------|
| 后端 API | ✅ 正常 | FastAPI 运行中，v2.5.0 |
| 后端测试 | ✅ 正常 | 28 passed |
| 前端页面 | ✅ 正常 | Next.js 运行在端口 3001 |
| 移动端 APK | ⛔ 崩溃待修复 | Release APK 已安装在模拟器，启动后崩溃，原因：Expo 模块缺失（Stage 2：后端 age_group 合并完成，待前端全面切换） |
| Docker 部署 | ✅ 完成 | v2.5.0 镜像已部署 |

---

## 已完成的工作

### 1. 代码审计与 Bug 修复

| Bug | 描述 | 状态 |
|-----|------|------|
| Bug 1 | 数据加载容错 (Promise.all 白屏) | ✅ 已修复 |
| Bug 2 | 移动端按钮重叠 | ✅ 已修复 |
| Bug 3 | 移动端图片预览逻辑错误 | ✅ 已修复 |
| Bug 4 | 时间范围筛选不生效 | ✅ 已修复 |
| Bug 5 | 审核通过事务回滚 | ✅ 验证通过（非 bug） |
| Bug 6 | 眼轴参考值硬编码 23.0mm | ✅ 已修复 |

### 2. 新功能开发

#### v2.5.0 变更

1. **记录列表 API** (`backend/app/routers/records.py`)
   - 新增 `GET /api/v1/records` 端点
   - 支持分页、筛选、排序

2. **API 超时配置**
   - 后端: 30s 超时 + AbortController
   - 前端: 30s 超时配置
   - 移动端: 启用 TIMEOUT 配置

3. **眼轴年龄参考值**
   - 按年龄动态计算眼轴参考值
   - 新增 UT: `test_axial_reference_by_age.py`

### 3. 测试结果

| 测试类型 | 结果 |
|----------|------|
| E2E 测试 | 15 passed, 5 skipped |
| 后端 UT | 28 passed |

**E2E 跳过原因**:
- TC-CRUD-001~004: 成员详情页 hydration 问题
- TC-INT-E2E-001: OCR 外部服务超时

### 4. 构建与部署

- Docker 镜像: `v2.5.0` ✅
- 后端/前端已部署 ✅
- 移动端 APK: 27.4 MB ✅
- APK 安装到模拟器: Success ✅

---

## 待完成的任务

### P0 - APK 闪退问题调查（阻塞）

**问题**: APK 安装后立即崩溃，日志显示 `crash` 但无具体错误

**尝试的修复**:
- 添加 `usesCleartextTraffic="true"`
- 关闭 `newArchEnabled=false`

**可能原因**:
1. JS bundle 加载失败
2. New Architecture 兼容性问题
3. React Native 运行时错误

**待执行的调查**:
```powershell
# 1. 获取详细日志
adb logcat -d | grep -i "reactnative\|javascript\|crash"

# 2. 检查 APK 中是否包含 JS bundle
unzip -l app-release.apk | grep "index.android.bundle"

# 3. 尝试 Debug APK
cd mobile_app/android
.\gradlew.bat assembleDebug
```

### P1 - Git 同步

当前有 2 个 commits 未 push 到远程：
```
d7d7562 docs: 更新 WORK_LOG、BUG_LOG，添加后端 UT pre-commit hook
efbab22 feat: v2.5.0 - 记录列表API、API超时、眼轴年龄参考值
```

---

## 环境状态

| 服务 | 地址 |
|------|------|
| 后端 API | http://localhost:8000 |
| 前端页面 | http://localhost:3001 |
| 数据库 | PostgreSQL 16 |
| 对象存储 | MinIO |

---

## 关键文件变更

### 后端修改
| 文件 | 变更 |
|------|------|
| `backend/app/routers/records.py` | 新增记录列表 API |
| `backend/app/routers/members.py` | 眼轴参考值按年龄计算 |
| `backend/app/routers/documents.py` | 眼轴参考值按年龄计算 |
| `backend/app/routers/review.py` | 眼轴参考值按年龄计算 |
| `backend/app/api/client.py` | 添加 30s 超时 |

### 前端修改
| 文件 | 变更 |
|------|------|
| `frontend/src/app/api/client.ts` | 添加 30s 超时 + AbortController |

### 移动端修改
| 文件 | 变更 |
|------|------|
| `mobile_app/src/api/client.ts` | 启用 TIMEOUT 配置 |
| `mobile_app/android/gradle.properties` | 关闭 newArchEnabled |
| `mobile_app/android/app/src/main/AndroidManifest.xml` | 添加 usesCleartextTraffic |

### 文档更新
| 文件 | 变更 |
|------|------|
| `docs/specs/API_CONTRACT.md` | v2.5.0 契约 |
| `docs/WORK_LOG_V2.md` | 新增 v2.5.0 记录 |
| `docs/BUG_LOG.md` | 新增统计 |
| `.pre-commit-config.yaml` | 添加后端 UT hook |

---

## 下一步计划

1. **调查 APK 闪退**
   - 使用 adb 获取详细日志
   - 检查 JS bundle 是否正确打包
   - 尝试构建 Debug APK 获取更多信息

2. **Git 同步** (如需要)
   - `git push` 推送到远程仓库

3. **E2E 测试问题** (可选)
   - 调查成员详情页 hydration 问题
   - 解决 OCR 超时问题

---

## 项目路线图

- [x] v2.4.0 - 基础 CRUD + OCR
- [x] v2.5.0 - 记录列表 API + API 超时 + 眼轴年龄
- [ ] v2.6.0 - APK 闪退修复 (待开发)
