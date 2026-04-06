"""
[TC-BUG-005] 测试审核通过时 exam_date 解析失败的事务回滚问题

Bug 描述: review.py approve 接口中, exam_date 解析失败时
task.status 已被改为 "approved", 但后续异常时只是改为 "rejected" 并 flush,
没有显式 rollback, 可能导致数据不一致

预期行为: exam_date 解析失败时, 整个事务应该回滚, 不应有数据被修改
实际行为: 可能部分修改被持久化
"""
import pytest
from uuid import UUID
from datetime import date
from sqlalchemy import select

from app.models.document import DocumentRecord, OCRExtractionResult, ReviewTask
from app.models.member import MemberProfile


@pytest.mark.asyncio
async def test_approve_review_task_invalid_exam_date_no_partial_commit(state_client, monkeypatch):
    """
    验证: 当 exam_date 解析失败时, 不应该有部分数据被提交
    
    这个测试模拟一个场景: task.status 已经设为 "approved", 
    但 exam_date 解析失败, 此时:
    - task.status 应该变回 rejected
    - document.status 应该变回 rule_conflict  
    - 不应该创建任何 ExamRecord 或 Observation
    """
    client, session_factory = state_client
    
    member_resp = await client.post(
        "/api/v1/members",
        json={
            "name": "Partial Commit Test",
            "gender": "female",
            "date_of_birth": "2020-06-15",
            "member_type": "child",
        },
    )
    member_id = member_resp.json()["id"]
    
    upload_resp = await client.post(
        "/api/v1/documents/upload",
        data={"member_id": member_id},
        files={"file": ("test2.jpg", b"test2", "image/jpeg")},
    )
    document_id = upload_resp.json()["document_id"]
    doc_uuid = UUID(document_id)
    
    async with session_factory() as session:
        doc = await session.scalar(
            select(DocumentRecord).where(DocumentRecord.id == doc_uuid)
        )
        if doc:
            doc.status = "uploaded"
            
        ocr_result = OCRExtractionResult(
            document_id=doc_uuid,
            raw_json={"raw": "data"},
            processed_items={
                "exam_date": "not-a-valid-date",
                "institution": "Test Hospital",
                "observations": [
                    {"metric_code": "height", "value_numeric": 120.0, "unit": "cm", "side": None}
                ]
            },
            confidence_score=0.9,
            rule_conflict_details=None,
        )
        session.add(ocr_result)
        
        review_task = ReviewTask(
            document_id=doc_uuid,
            status="pending",
            reviewer_id=None,
            audit_trail={"events": []},
        )
        session.add(review_task)
        await session.commit()
    
    tasks_resp = await client.get("/api/v1/review-tasks")
    tasks = tasks_resp.json()
    task_id = next((t["id"] for t in tasks if t["document_id"] == document_id), None)
    
    if task_id:
        approve_resp = await client.post(
            f"/api/v1/review-tasks/{task_id}/approve",
            json={"revised_items": [{"metric_code": "exam_date", "value": "bad-date"}]}
        )
        
        result = approve_resp.json()
        
        async with session_factory() as session:
            review_task = await session.scalar(
                select(ReviewTask).where(ReviewTask.document_id == doc_uuid)
            )
            doc = await session.scalar(
                select(DocumentRecord).where(DocumentRecord.id == doc_uuid)
            )
            from app.models.observation import ExamRecord
            exam_records = (await session.scalars(
                select(ExamRecord).where(ExamRecord.document_id == doc_uuid)
            )).all()
            
            assert review_task is not None
            assert review_task.status == "rejected", (
                f"BUG: 应该是 rejected, 实际是 {review_task.status}"
            )
            assert doc is not None
            assert doc.status in ["rule_conflict", "review_rejected"], (
                f"BUG: 应该是 rule_conflict/review_rejected, 实际是 {doc.status}"
            )
            assert len(exam_records) == 0, (
                "BUG: 不应该创建 ExamRecord"
            )
