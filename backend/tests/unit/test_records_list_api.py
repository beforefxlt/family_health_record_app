"""
[TC-FEATURE-001] Test records list API

Test new GET /api/v1/records endpoint
"""
import pytest
from uuid import UUID
from datetime import date
from sqlalchemy import select

from app.models.member import MemberProfile
from app.models.observation import ExamRecord, Observation


@pytest.mark.asyncio
async def test_list_records_empty(state_client):
    """Test empty records list"""
    client, _ = state_client
    
    resp = await client.get("/api/v1/records")
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["total"] == 0
    assert data["page"] == 1


@pytest.mark.asyncio
async def test_list_records_with_data(state_client):
    """Test records list with data"""
    client, session_factory = state_client
    
    member_resp = await client.post(
        "/api/v1/members",
        json={
            "name": "Test Member",
            "gender": "male",
            "date_of_birth": "2018-01-01",
            "member_type": "child",
        },
    )
    member_id = member_resp.json()["id"]
    
    async with session_factory() as session:
        exam = ExamRecord(
            member_id=UUID(member_id),
            exam_date=date(2026, 3, 31),
            institution_name="Test Hospital",
            baseline_age_months=96
        )
        session.add(exam)
        await session.flush()
        
        obs = Observation(
            exam_record_id=exam.id,
            metric_code="height",
            value_numeric=140.0,
            unit="cm",
            is_abnormal=False,
            confidence_score=1.0
        )
        session.add(obs)
        await session.commit()
    
    resp = await client.get("/api/v1/records")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["member_name"] == "Test Member"
    assert data["items"][0]["metrics_count"] == 1
    assert data["items"][0]["has_abnormal"] == False


@pytest.mark.asyncio
async def test_list_records_pagination(state_client):
    """Test pagination"""
    client, session_factory = state_client
    
    member_resp = await client.post(
        "/api/v1/members",
        json={
            "name": "Page Member",
            "gender": "female",
            "date_of_birth": "2020-01-01",
            "member_type": "child",
        },
    )
    member_id = member_resp.json()["id"]
    member_uuid = UUID(member_id)
    
    async with session_factory() as session:
        for i in range(25):
            exam = ExamRecord(
                member_id=member_uuid,
                exam_date=date(2026, 1, i + 1),
                institution_name=f"Hospital {i}",
                baseline_age_months=72
            )
            session.add(exam)
        await session.commit()
    
    resp = await client.get("/api/v1/records?page=1&page_size=10")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 25
    assert data["page"] == 1
    assert data["page_size"] == 10
    assert data["total_pages"] == 3
    assert len(data["items"]) == 10


@pytest.mark.asyncio
async def test_list_records_filter_by_member(state_client):
    """Test filter by member_id"""
    client, session_factory = state_client
    
    member1_resp = await client.post(
        "/api/v1/members",
        json={
            "name": "Member One",
            "gender": "male",
            "date_of_birth": "2018-01-01",
            "member_type": "child",
        },
    )
    member2_resp = await client.post(
        "/api/v1/members",
        json={
            "name": "Member Two",
            "gender": "female",
            "date_of_birth": "2019-01-01",
            "member_type": "child",
        },
    )
    
    member1_id = member1_resp.json()["id"]
    member2_id = member2_resp.json()["id"]
    
    async with session_factory() as session:
        exam1 = ExamRecord(
            member_id=UUID(member1_id),
            exam_date=date(2026, 3, 1),
            institution_name="Hospital 1",
            baseline_age_months=96
        )
        exam2 = ExamRecord(
            member_id=UUID(member2_id),
            exam_date=date(2026, 3, 15),
            institution_name="Hospital 2",
            baseline_age_months=86
        )
        session.add(exam1)
        session.add(exam2)
        await session.commit()
    
    resp = await client.get(f"/api/v1/records?member_id={member1_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["member_name"] == "Member One"
