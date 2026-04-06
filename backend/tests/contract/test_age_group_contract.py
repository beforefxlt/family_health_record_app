import pytest


@pytest.mark.asyncio
async def test_age_group_contracts(test_client):
    # Create adult member and verify age_group is present and correct
    adult_resp = await test_client.post(
        "/api/v1/members",
        json={
            "name": "ContractAdult",
            "gender": "male",
            "date_of_birth": "1990-01-01",
            "member_type": "adult",
        },
    )
    assert adult_resp.status_code == 201
    adult_data = adult_resp.json()
    assert adult_data.get("age_group") == "adult"

    # Create elderly member and verify age_group is elderly
    elderly_resp = await test_client.post(
        "/api/v1/members",
        json={
            "name": "ContractElder",
            "gender": "female",
            "date_of_birth": "1940-01-01",
            "member_type": "adult",
        },
    )
    assert elderly_resp.status_code == 201
    elderly_data = elderly_resp.json()
    assert elderly_data.get("age_group") == "elderly"
