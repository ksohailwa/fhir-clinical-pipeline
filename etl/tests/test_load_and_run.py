from unittest.mock import MagicMock

import pytest

from load import chunked, load_resources, to_bundle
from run import STAGES, transform_rows

PATIENT_ID = "p-1"


def test_bundle_uses_put_with_own_ids() -> None:
    bundle = to_bundle([{"resourceType": "Patient", "id": PATIENT_ID}])
    assert bundle["type"] == "transaction"
    assert bundle["entry"][0]["request"] == {"method": "PUT", "url": f"Patient/{PATIENT_ID}"}


def test_chunked_splits_into_batches() -> None:
    assert [len(batch) for batch in chunked(list(range(450)), 200)] == [200, 200, 50]


def test_chunked_rejects_zero_batch_size() -> None:
    with pytest.raises(ValueError):
        list(chunked([1], 0))


def test_load_resources_posts_one_bundle_per_batch() -> None:
    session = MagicMock()
    session.post.return_value.ok = True
    resources = [{"resourceType": "Patient", "id": str(index)} for index in range(5)]
    assert load_resources(resources, "http://fhir", batch_size=2, session=session) == 3
    assert session.post.call_count == 3


def test_transform_rows_skips_unknown_patient_and_duplicates() -> None:
    condition_stage = next(stage for stage in STAGES if stage.resource_type == "Condition")
    row = {
        "START": "2020-01-01",
        "STOP": "",
        "PATIENT": PATIENT_ID,
        "ENCOUNTER": "e-1",
        "SYSTEM": "SNOMED-CT",
        "CODE": "38341003",
        "DESCRIPTION": "Hypertension",
    }
    orphan = {**row, "PATIENT": "missing"}
    result = transform_rows(condition_stage, [row, dict(row), orphan], {PATIENT_ID})
    assert len(result.resources) == 1
    assert result.skipped == {"duplicate row": 1, "unknown patient": 1}
