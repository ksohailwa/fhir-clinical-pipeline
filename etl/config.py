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

IDENTIFIER_TYPE = "http://terminology.hl7.org/CodeSystem/v2-0203"
LOINC_LABORATORY_STUDIES = "26436-6"
LAB_IDENTIFIER_SYSTEM = "urn:fhir-clinical-pipeline:sid:lab-observation"
LAB_IDENTIFIER_ASSIGNER = "fhir-clinical-pipeline ETL (synthetic data)"
LAB_VALUE_CODES_PATH = Path(__file__).resolve().parent / "mappings" / "lab_value_codes.csv"

SOURCE_CODE_SYSTEMS = {"SNOMED-CT": SNOMED}

MII_PATIENT_PROFILE = (
    "https://www.medizininformatik-initiative.de/fhir/core/modul-person/StructureDefinition/Patient"
)
MII_DIAGNOSE_PROFILE = (
    "https://www.medizininformatik-initiative.de/fhir/core/modul-diagnose/StructureDefinition/Diagnose"
)
