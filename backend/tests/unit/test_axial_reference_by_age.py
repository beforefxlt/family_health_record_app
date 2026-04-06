"""
[TC-BUG-006] Test axial reference should be calculated dynamically by age

Bug: _build_axial_growth_payload uses hardcoded 23.0mm reference value
Expected: Use age-based reference values
"""
import pytest

from app.routers.members import _build_axial_growth_payload, _get_axial_reference_by_age


def test_axial_reference_dynamic_by_age():
    test_cases = [
        {"age_months": 12, "expected_ref": 21.0},
        {"age_months": 23, "expected_ref": 21.0},
        {"age_months": 24, "expected_ref": 21.5},
        {"age_months": 36, "expected_ref": 21.5},
        {"age_months": 47, "expected_ref": 21.5},
        {"age_months": 48, "expected_ref": 22.0},
        {"age_months": 60, "expected_ref": 22.0},
        {"age_months": 71, "expected_ref": 22.0},
        {"age_months": 72, "expected_ref": 22.5},
        {"age_months": 96, "expected_ref": 22.5},
        {"age_months": 119, "expected_ref": 22.5},
        {"age_months": 120, "expected_ref": 23.0},
        {"age_months": 180, "expected_ref": 23.0},
        {"age_months": 215, "expected_ref": 23.0},
        {"age_months": 216, "expected_ref": 23.5},
        {"age_months": 240, "expected_ref": 23.5},
        {"age_months": 360, "expected_ref": 23.5},
    ]
    
    for case in test_cases:
        ref = _get_axial_reference_by_age(case["age_months"])
        assert ref == case["expected_ref"], f"Age {case['age_months']} months: expected {case['expected_ref']}mm, got {ref}mm"


def test_axial_growth_payload_with_age():
    observations = [
        {"metric_code": "axial_length", "side": "left", "value_numeric": 21.5},
        {"metric_code": "axial_length", "side": "right", "value_numeric": 21.3},
    ]
    
    result_avg = (21.5 + 21.3) / 2
    
    result_old = _build_axial_growth_payload(observations)
    assert result_old["reference_used"] == 23.0
    assert result_old["deviation_vs_reference"] == round(result_avg - 23.0, 3)
    
    result_2yo = _build_axial_growth_payload(observations, 24)
    assert result_2yo["reference_used"] == 21.5
    assert result_2yo["deviation_vs_reference"] == round(result_avg - 21.5, 3)
    
    result_4yo = _build_axial_growth_payload(observations, 48)
    assert result_4yo["reference_used"] == 22.0
    assert result_4yo["deviation_vs_reference"] == round(result_avg - 22.0, 3)
    
    result_6yo = _build_axial_growth_payload(observations, 72)
    assert result_6yo["reference_used"] == 22.5
    assert result_6yo["deviation_vs_reference"] == round(result_avg - 22.5, 3)
    
    result_adult = _build_axial_growth_payload(observations, 240)
    assert result_adult["reference_used"] == 23.5
    assert result_adult["deviation_vs_reference"] == round(result_avg - 23.5, 3)
