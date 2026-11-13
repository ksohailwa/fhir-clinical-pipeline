import os
from pathlib import Path

FHIR_BASE_URL = os.environ.get("FHIR_BASE_URL", "http://localhost:8080/fhir")
CSV_DIR = Path(__file__).resolve().parent.parent / "data" / "output" / "csv"
BATCH_SIZE = 200
REQUEST_TIMEOUT_SECONDS = 180
ID_HASH_LENGTH = 16

SNOMED = "http://snomed.info/sct"
LOINC = "http://loinc.org"
RXNORM = "http://www.nlm.nih.gov/research/umls/rxnorm"
UCUM = "http://unitsofmeasure.org"
OBSERVATION_CATEGORY = "http://terminology.hl7.org/CodeSystem/observation-category"
CONDITION_CLINICAL = "http://terminology.hl7.org/CodeSystem/condition-clinical"
CONDITION_VERIFICATION = "http://terminology.hl7.org/CodeSystem/condition-ver-status"
CONDITION_CATEGORY = "http://terminology.hl7.org/CodeSystem/condition-category"

SOURCE_CODE_SYSTEMS = {"SNOMED-CT": SNOMED}

MII_PATIENT_PROFILE = (
    "https://www.medizininformatik-initiative.de/fhir/core/modul-person/StructureDefinition/Patient"
)
MII_DIAGNOSE_PROFILE = (
    "https://www.medizininformatik-initiative.de/fhir/core/modul-diagnose/StructureDefinition/Diagnose"
)
