# 历史记录列表页面 - 设计文档

## 1. 需求概述

### 1.1 问题描述
- 当前无法浏览所有检查记录
- 记录只在成员详情页以看板形式分散展示
- 缺少统一的记录列表入口

### 1.2 解决方案
新增独立的记录列表页面，支持：
- 按成员筛选
- 分页浏览
- 查看记录详情
- 删除记录

---

## 2. API 设计

### 2.1 新增接口

#### GET /api/v1/records
获取记录列表

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| member_id | string | 否 | 成员ID，不传则返回所有成员记录 |
| page | integer | 否 | 页码，默认 1 |
| page_size | integer | 否 | 每页数量，默认 20 |

**响应格式**
```json
{
  "items": [
    {
      "id": "uuid",
      "member_id": "uuid",
      "member_name": "张三",
      "exam_date": "2026-03-31",
      "institution": "XX医院",
      "metrics_count": 5,
      "has_abnormal": false
    }
  ],
  "total": 100,
  "page": 1,
  "page_size": 20,
  "total_pages": 5
}
```

---

## 3. 前端设计

### 3.1 页面路由
- `/records` - 记录列表页
- `/records/[recordId]` - 记录详情页

### 3.2 UI 规格
- 分页表格展示
- 支持按成员筛选
- 显示检查日期、成员姓名、机构、指标数量、异常状态
- 操作列：查看详情、删除

---

## 4. 移动端设计

### 4.1 页面路由
- `/records` - 记录列表页

---

## 5. API 超时设计

### 5.1 现状
- 前端 `safeFetch`: 无超时
- 移动端 `apiRequest`: TIMEOUT 已定义(30s) 但未使用

### 5.2 实现
- 前端: 30s 超时，使用 AbortController
- 移动端: 启用 TIMEOUT 配置
- 错误提示: "请求超时，请稍后重试"
