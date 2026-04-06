# 项目状态文档 (STATUS.md)

> **单一真相源**：每个 Agent 开始工作前必须读取，结束时必须更新。
> **最后更新**: 2026-04-06 by Agent

---

## 当前状态

**整体进度**: 🔶 进行中 - 移动端上传流程 Bug 修复，APK 构建遇到网络问题

| 模块 | 状态 | 说明 |
|------|------|------|
| 后端 API | ✅ 正常 | FastAPI 运行在端口 8000 |
| 后端测试 | ✅ 正常 | pytest 通过 |
| 前端页面 | ✅ 正常 | Next.js 运行在端口 3001 |
| 移动端代码修复 | ✅ 完成 | upload.tsx 上传后自动触发 OCR |
| 移动端 APK 构建 | 🔶 阻塞 | Gradle 下载/网络问题 |

---

## 今日完成的工作

### 1. 移动端上传流程 Bug 修复

**问题描述**:
- 手机上传图片点击确认后，系统提示"上传成功，正在处理检查单"
- 点击"查看审核"后弹出错误"加载失败"

**根因分析**:
- 上传文档后文档状态是 `uploaded`，但没有自动触发 OCR
- 跳转到 `/review/${document_id}` 是错误的（此时 review_task 尚未创建）
- 正确的流程：上传 → 自动触发 OCR → OCR 完成后根据状态跳转

**修复内容** (`mobile_app/src/app/upload.tsx`):
- 上传成功后自动调用 `/api/v1/documents/${document_id}/submit-ocr` 触发 OCR
- 根据 OCR 返回的 status 决定跳转：
  - `approved`/`persisted` → 识别成功，提示"数据已自动入库"
  - `rule_conflict`/`ocr_failed` → 需要审核，跳转审核页
  - 其他状态 → 提示查看审核或返回
- 处理 `duplicate` 状态（重复上传）

### 2. 代码修改

```typescript
// upload.tsx - 核心修改
if (data.document_id) {
  if (data.status === 'duplicate') {
    Alert.alert('已存在', data.message || '该检查单已上传过', [
      { text: '确定', onPress: () => router.back() }
    ]);
    return;
  }

  // 自动触发 OCR
  const ocrResponse = await fetch(
    `${getApiBaseUrl(host)}/api/v1/documents/${data.document_id}/submit-ocr`,
    { method: 'POST' }
  );

  const ocrResult = await ocrResponse.json();

  if (ocrResult.status === 'approved' || ocrResult.status === 'persisted') {
    Alert.alert('识别成功', '数据已自动入库', [
      { text: '确定', onPress: () => router.replace(`/member/${memberId || ''}`) }
    ]);
  } else if (ocrResult.status === 'rule_conflict' || ocrResult.status === 'ocr_failed') {
    Alert.alert('需要审核', '请核对检查单数据', [
      { text: '去审核', onPress: () => router.replace(`/review/${data.document_id}`) }
    ]);
  }
}
```

---

## 待完成的任务

### P0 - APK 构建（阻塞）

**问题**: Gradle 下载失败或网络代理问题

**原因**:
- Windows 环境下 Gradle wrapper 下载 gradle-8.14.3-bin.zip 失败
- 多次下载的 checksum 不一致（疑似网络代理问题）
- 尝试手动下载成功，但 gradlew 验证仍失败

**解决方案**:

1. **手动下载 Gradle**:
```powershell
# 删除损坏的缓存
Remove-Item -Path "C:\Users\Administrator\.gradle\wrapper\dists\gradle-8.14.3-bin" -Recurse -Force -Confirm:$false

# 手动下载（配置代理）
$env:HTTP_PROXY="http://127.0.0.1:10800"
curl.exe -L "https://services.gradle.org/distributions/gradle-8.14.3-bin.zip" -o "C:\Users\Administrator\.gradle\wrapper\dists\gradle-8.14.3-bin\cv11ve7ro1n3o1j4so8xd9n66\gradle-8.14.3-bin.zip"

# 构建
cd C:\Users\Administrator\qa-prompts\family_health_record_app\mobile_app\android
.\gradlew.bat assembleRelease --no-daemon
```

2. **或者禁用 Gradle 校验**（不推荐用于生产）:
```properties
# gradle-wrapper.properties
validateDistributionUrl=false
```

### P1 - 验证修复

APK 构建成功后需要在模拟器上测试：
1. 打开 App，上传检查单图片
2. 点击"确认上传"
3. 验证是否自动触发 OCR 并正确跳转

---

## 环境状态

**Docker 服务**:
- 后端: http://localhost:8000
- 前端: http://localhost:3001
- 数据库: PostgreSQL 16
- 存储: MinIO

**移动端项目路径**:
- 代码: `C:\Users\Administrator\qa-prompts\family_health_record_app\mobile_app`
- Android 目录: `mobile_app/android`

---

## 关键文件变更

| 文件 | 变更 |
|------|------|
| `mobile_app/src/app/upload.tsx` | 上传成功后自动触发 OCR |
| `mobile_app/android/gradle.properties` | 添加代理配置 |
| `mobile_app/android/gradle/wrapper/gradle-wrapper.properties` | 禁用 URL 校验 |