import pytest

from config import LOINC, MII_PATIENT_PROFILE, RXNORM, SNOMED, UCUM
from transform import (
    SkipRow,
    stable_id,
    to_condition,
    to_medication_request,
    to_observation,
    to_patient,
)

PATIENT_ID = "46976cf7-b0bf-be20-39a5-9f425a52886d"
ENCOUNTER_ID = "46976cf7-b0bf-be20-75f8-255d2772e309"


def patient_row(**overrides: str) -> dict[str, str]:
    row = {
        "Id": PATIENT_ID,
        "BIRTHDATE": "2007-10-26",
        "DEATHDATE": "",
        "PREFIX": "Ms.",
        "FIRST": "Lindsay928",
        "MIDDLE": "Deja232",
        "LAST": "Zieme486",
        "GENDER": "F",
        "ADDRESS": "794 Dicki Neck Unit 4",
        "CITY": "Worcester",
        "STATE": "Massachusetts",
        "ZIP": "01607",
    }
    return {**row, **overrides}


def condition_row(**overrides: str) -> dict[str, str]:
    row = {
        "START": "2017-11-03",
        "STOP": "2018-11-16",
        "PATIENT": PATIENT_ID,
        "ENCOUNTER": ENCOUNTER_ID,
        "SYSTEM": "SNOMED-CT",
        "CODE": "314529007",
        "DESCRIPTION": "Medication review due (situation)",
    }
    return {**row, **overrides}


def observation_row(**overrides: str) -> dict[str, str]:
    row = {
        "DATE": "2024-11-03T06:36:38Z",
        "PATIENT": PATIENT_ID,
        "ENCOUNTER": ENCOUNTER_ID,
        "CATEGORY": "laboratory",
        "CODE": "4548-4",
        "DESCRIPTION": "Hemoglobin A1c/Hemoglobin.total in Blood",
        "VALUE": "6.1",
        "UNITS": "%",
        "TYPE": "numeric",
    }
    return {**row, **overrides}


def medication_row(**overrides: str) -> dict[str, str]:
    row = {
        "START": "2018-10-29T04:59:34Z",
        "STOP": "",
        "PATIENT": PATIENT_ID,
        "ENCOUNTER": ENCOUNTER_ID,
        "CODE": "314076",
        "DESCRIPTION": "lisinopril 10 MG Oral Tablet",
        "REASONCODE": "59621000",
        "REASONDESCRIPTION": "Essential hypertension (disorder)",
    }
    return {**row, **overrides}


class TestPatient:
    def test_maps_normal_row(self) -> None:
        patient = to_patient(patient_row())
        assert patient["id"] == PATIENT_ID
        assert patient["meta"]["profile"] == [MII_PATIENT_PROFILE]
        assert patient["name"] == [
            {"use": "official", "family": "Zieme", "given": ["Lindsay", "Deja"], "prefix": ["Ms."]}
        ]
        assert patient["gender"] == "female"
        assert patient["birthDate"] == "2007-10-26"
        assert patient["address"][0]["postalCode"] == "01607"
        assert "deceasedDateTime" not in patient

    def test_maps_death_date(self) -> None:
        assert to_patient(patient_row(DEATHDATE="1982-09-05"))["deceasedDateTime"] == "1982-09-05"

    def test_skips_missing_birth_date(self) -> None:
        with pytest.raises(SkipRow, match="missing BIRTHDATE"):
            to_patient(patient_row(BIRTHDATE=""))

    def test_unexpected_gender_becomes_unknown(self) -> None:
        assert to_patient(patient_row(GENDER="X"))["gender"] == "unknown"

    def test_omits_empty_optional_fields(self) -> None:
        patient = to_patient(patient_row(MIDDLE="", PREFIX="", ADDRESS=""))
        assert patient["name"][0] == {"use": "official", "family": "Zieme", "given": ["Lindsay"]}
        assert "line" not in patient["address"][0]


class TestCondition:
    def test_maps_normal_row(self) -> None:
        condition = to_condition(condition_row())
        assert condition["subject"] == {"reference": f"Patient/{PATIENT_ID}"}
        assert condition["code"]["coding"] == [
            {"system": SNOMED, "code": "314529007", "display": "Medication review due (situation)"}
        ]
        assert condition["onsetDateTime"] == "2017-11-03"
        assert condition["recordedDate"] == "2017-11-03"
        assert condition["abatementDateTime"] == "2018-11-16"
        assert condition["clinicalStatus"]["coding"][0]["code"] == "resolved"

    def test_ongoing_condition_is_active(self) -> None:
        condition = to_condition(condition_row(STOP=""))
        assert condition["clinicalStatus"]["coding"][0]["code"] == "active"
        assert "abatementDateTime" not in condition

    def test_skips_missing_code(self) -> None:
        with pytest.raises(SkipRow, match="missing CODE"):
            to_condition(condition_row(CODE=""))

    def test_skips_unexpected_code_system(self) -> None:
        with pytest.raises(SkipRow, match="unsupported code system ICD-10"):
            to_condition(condition_row(SYSTEM="ICD-10"))

    def test_id_is_stable(self) -> None:
        assert to_condition(condition_row())["id"] == to_condition(condition_row())["id"]


class TestObservation:
    def test_maps_numeric_lab_row(self) -> None:
        observation = to_observation(observation_row())
        assert observation["status"] == "final"
        assert observation["category"][0]["coding"][0]["code"] == "laboratory"
        assert observation["code"]["coding"][0]["system"] == LOINC
        assert observation["valueQuantity"] == {"value": 6.1, "unit": "%", "system": UCUM, "code": "%"}
        assert observation["effectiveDateTime"] == "2024-11-03T06:36:38Z"

    def test_maps_text_lab_row(self) -> None:
        observation = to_observation(observation_row(VALUE="Cloudy urine", UNITS="", TYPE="text"))
        assert observation["valueString"] == "Cloudy urine"
        assert "valueQuantity" not in observation

    def test_skips_non_laboratory_category(self) -> None:
        with pytest.raises(SkipRow, match="not a laboratory observation"):
            to_observation(observation_row(CATEGORY="vital-signs"))

    def test_skips_missing_value(self) -> None:
        with pytest.raises(SkipRow, match="missing VALUE"):
            to_observation(observation_row(VALUE=""))

    def test_skips_numeric_without_unit(self) -> None:
        with pytest.raises(SkipRow, match="without unit"):
            to_observation(observation_row(UNITS=""))

    def test_skips_unparseable_number(self) -> None:
        with pytest.raises(SkipRow, match="not parseable"):
            to_observation(observation_row(VALUE="high"))


class TestMedicationRequest:
    def test_maps_normal_row(self) -> None:
        request = to_medication_request(medication_row())
        assert request["status"] == "active"
        assert request["intent"] == "order"
        assert request["medicationCodeableConcept"]["coding"][0] == {
            "system": RXNORM,
            "code": "314076",
            "display": "lisinopril 10 MG Oral Tablet",
        }
        assert request["authoredOn"] == "2018-10-29T04:59:34Z"
        assert request["reasonCode"][0]["coding"][0]["code"] == "59621000"

    def test_stopped_medication_is_completed(self) -> None:
        assert to_medication_request(medication_row(STOP="2019-01-01T00:00:00Z"))["status"] == "completed"

    def test_skips_missing_patient(self) -> None:
        with pytest.raises(SkipRow, match="missing PATIENT"):
            to_medication_request(medication_row(PATIENT=""))

    def test_omits_empty_reason(self) -> None:
        assert "reasonCode" not in to_medication_request(medication_row(REASONCODE=""))

    def test_orders_differing_only_in_stop_get_different_ids(self) -> None:
        first = to_medication_request(medication_row(STOP="2024-12-24T01:53:36Z"))
        second = to_medication_request(medication_row(STOP="2025-03-25T01:53:36Z"))
        assert first["id"] != second["id"]


def test_stable_id_fits_fhir_id_rules() -> None:
    resource_id = stable_id("cond", PATIENT_ID, ENCOUNTER_ID, "314529007", "2017-11-03")
    assert len(resource_id) <= 64
    assert all(char.isalnum() or char in "-." for char in resource_id)
