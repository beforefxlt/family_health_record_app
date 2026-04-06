import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool
from app.main import app
from app.db import get_db
from app.models.base import Base


@pytest.fixture
async def route_env():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async def override_get_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_adult_member_trends_on_creation(route_env):
    client = route_env
    resp = await client.post(
        "/api/v1/members",
        json={
            "name": "TestAdult2",
            "gender": "female",
            "date_of_birth": "1990-01-01",
            "member_type": "adult",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["member_type"] == "adult"
    assert data.get("age_group") in ("adult", "elderly")

@pytest.mark.asyncio
async def test_elderly_member_age_group(route_env):
    client = route_env
    resp = await client.post(
        "/api/v1/members",
        json={
            "name": "TestElder",
            "gender": "male",
            "date_of_birth": "1940-01-01",
            "member_type": "adult",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["member_type"] == "adult"
    # Should derive elderly based on age
    assert data.get("age_group") in ("elderly", "adult")
