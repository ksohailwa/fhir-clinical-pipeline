import csv
import hashlib
import math
import re
from functools import cache
from typing import Any

from config import (
    CONDITION_CATEGORY,
    CONDITION_CLINICAL,
    CONDITION_VERIFICATION,
    ID_HASH_LENGTH,
    IDENTIFIER_TYPE,
    LAB_IDENTIFIER_ASSIGNER,
    LAB_IDENTIFIER_SYSTEM,
    LAB_VALUE_CODES_PATH,
    LOINC,
    LOINC_LABORATORY_STUDIES,
    MII_DIAGNOSE_PROFILE,
    MII_PATIENT_PROFILE,
    OBSERVATION_CATEGORY,
    RXNORM,
    SOURCE_CODE_SYSTEMS,
    UCUM,
)
from extract import Row

Resource = dict[str, Any]

GENDERS = {"M": "male", "F": "female"}
LABORATORY = "laboratory"
_TRAILING_DIGITS = re.compile(r"\d+$")


class SkipRow(Exception):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


def stable_id(prefix: str, *parts: str) -> str:
    digest = hashlib.sha1("|".join(parts).encode("utf-8")).hexdigest()[:ID_HASH_LENGTH]
    return f"{prefix}-{digest}"


def _value(row: Row, column: str) -> str:
    return (row.get(column) or "").strip()


def _require(row: Row, *columns: str) -> None:
    missing = [column for column in columns if not _value(row, column)]
    if missing:
        raise SkipRow(f"missing {', '.join(missing)}")


def _clean_name(value: str) -> str:
    return _TRAILING_DIGITS.sub("", value.strip())


def _patient_reference(row: Row) -> dict[str, str]:
    return {"reference": f"Patient/{_value(row, 'PATIENT')}"}


def _without_empty(fields: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in fields.items() if value not in ("", None, [], {})}


def restore_commas(text: str) -> str:
    """Synthea's CSV export replaces each comma with a space, so ', ' arrives as two spaces."""
    return text.replace("  ", ", ")


def _description(row: Row, column: str = "DESCRIPTION") -> str:
    return restore_commas(_value(row, column))


@cache
def lab_value_codes() -> dict[str, tuple[str, str]]:
    with LAB_VALUE_CODES_PATH.open(encoding="utf-8", newline="") as handle:
        return {row["display"]: (row["system"], row["code"]) for row in csv.DictReader(handle)}


def _codeable(system: str, code: str, display: str) -> dict[str, Any]:
    coding = _without_empty({"system": system, "code": code, "display": display})
    return _without_empty({"coding": [coding], "text": display})


def to_patient(row: Row) -> Resource:
    _require(row, "Id", "LAST", "FIRST", "BIRTHDATE")
    given = [_clean_name(row[column]) for column in ("FIRST", "MIDDLE") if _value(row, column)]
    name = _without_empty(
        {
            "use": "official",
            "family": _clean_name(row["LAST"]),
            "given": given,
            "prefix": [_value(row, "PREFIX")] if _value(row, "PREFIX") else [],
        }
    )
    address = _without_empty(
        {
            "line": [_value(row, "ADDRESS")] if _value(row, "ADDRESS") else [],
            "city": _value(row, "CITY"),
            "state": _value(row, "STATE"),
            "postalCode": _value(row, "ZIP"),
            "country": "US",
        }
    )
    return _without_empty(
        {
            "resourceType": "Patient",
            "id": _value(row, "Id"),
            "meta": {"profile": [MII_PATIENT_PROFILE]},
            "name": [name],
            "gender": GENDERS.get(_value(row, "GENDER"), "unknown"),
            "birthDate": _value(row, "BIRTHDATE"),
            "deceasedDateTime": _value(row, "DEATHDATE"),
            "address": [address],
        }
    )


def to_condition(row: Row) -> Resource:
    _require(row, "PATIENT", "CODE", "START")
    system = SOURCE_CODE_SYSTEMS.get(_value(row, "SYSTEM"))
    if system is None:
        raise SkipRow(f"unsupported code system {_value(row, 'SYSTEM') or '(empty)'}")
    stop = _value(row, "STOP")
    clinical_status = "resolved" if stop else "active"
    return _without_empty(
        {
            "resourceType": "Condition",
            "id": stable_id(
                "cond", row["PATIENT"], _value(row, "ENCOUNTER"), row["CODE"], row["START"]
            ),
            "meta": {"profile": [MII_DIAGNOSE_PROFILE]},
            "clinicalStatus": {"coding": [{"system": CONDITION_CLINICAL, "code": clinical_status}]},
            "verificationStatus": {
                "coding": [{"system": CONDITION_VERIFICATION, "code": "confirmed"}]
            },
            "category": [
                {"coding": [{"system": CONDITION_CATEGORY, "code": "encounter-diagnosis"}]}
            ],
            "code": _codeable(system, _value(row, "CODE"), _description(row)),
            "subject": _patient_reference(row),
            "onsetDateTime": row["START"],
            "abatementDateTime": stop,
            "recordedDate": row["START"],
        }
    )


def _observation_value(row: Row) -> dict[str, Any]:
    raw = _value(row, "VALUE")
    if not raw:
        raise SkipRow("missing VALUE")
    if _value(row, "TYPE") == "text":
        text = restore_commas(raw)
        coded = lab_value_codes().get(text)
        if coded is None:
            raise SkipRow("text value without a known code")
        system, code = coded
        return {"valueCodeableConcept": _codeable(system, code, text)}
    try:
        number = float(raw)
    except ValueError:
        raise SkipRow("numeric VALUE not parseable") from None
    if not math.isfinite(number):
        raise SkipRow("numeric VALUE not finite")
    unit = _value(row, "UNITS")
    if not unit:
        raise SkipRow("numeric value without unit")
    return {"valueQuantity": {"value": number, "unit": unit, "system": UCUM, "code": unit}}


def to_observation(row: Row) -> Resource:
    if _value(row, "CATEGORY") != LABORATORY:
        raise SkipRow("not a laboratory observation")
    _require(row, "PATIENT", "CODE", "DATE")
    resource_id = stable_id(
        "obs",
        row["PATIENT"],
        _value(row, "ENCOUNTER"),
        row["CODE"],
        row["DATE"],
        _value(row, "VALUE"),
    )
    return {
        "resourceType": "Observation",
        "id": resource_id,
        "identifier": [
            {
                "type": {"coding": [{"system": IDENTIFIER_TYPE, "code": "OBI"}]},
                "system": LAB_IDENTIFIER_SYSTEM,
                "value": resource_id,
                "assigner": {"display": LAB_IDENTIFIER_ASSIGNER},
            }
        ],
        "status": "final",
        "category": [
            {
                "coding": [
                    {"system": LOINC, "code": LOINC_LABORATORY_STUDIES},
                    {"system": OBSERVATION_CATEGORY, "code": LABORATORY},
                ]
            }
        ],
        "code": _codeable(LOINC, row["CODE"], _description(row)),
        "subject": _patient_reference(row),
        "effectiveDateTime": row["DATE"],
        **_observation_value(row),
    }


def to_medication_request(row: Row) -> Resource:
    _require(row, "PATIENT", "CODE", "START")
    reason = (
        [
            _codeable(
                SOURCE_CODE_SYSTEMS["SNOMED-CT"],
                _value(row, "REASONCODE"),
                _description(row, "REASONDESCRIPTION"),
            )
        ]
        if _value(row, "REASONCODE")
        else []
    )
    return _without_empty(
        {
            "resourceType": "MedicationRequest",
            "id": stable_id(
                "med",
                row["PATIENT"],
                _value(row, "ENCOUNTER"),
                row["CODE"],
                row["START"],
                _value(row, "STOP"),
            ),
            "status": "completed" if _value(row, "STOP") else "active",
            "intent": "order",
            "medicationCodeableConcept": _codeable(RXNORM, row["CODE"], _description(row)),
            "subject": _patient_reference(row),
            "authoredOn": row["START"],
            "reasonCode": reason,
        }
    )
