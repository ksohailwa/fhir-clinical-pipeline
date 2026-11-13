# Data dictionary

Source: Synthea CSV export, `java -jar synthea-with-dependencies.jar -p 100 -s 42`.
Synthea counts `-p` as living patients, so the run produced 113 patients (100 alive, 13 deceased).

| File | Rows | Maps to |
|---|---|---|
| `patients.csv` | 113 | Patient |
| `conditions.csv` | 3,477 | Condition |
| `observations.csv` | 57,121 (20,104 laboratory) | Observation (laboratory only) |
| `medications.csv` | 3,229 | MedicationRequest |

## patients.csv

| Column | Meaning | FHIR target |
|---|---|---|
| `Id` | UUID of the patient, used as the FHIR id | `Patient.id` |
| `BIRTHDATE` | Date of birth, `YYYY-MM-DD` | `Patient.birthDate` |
| `DEATHDATE` | Date of death, empty if alive | `Patient.deceasedDateTime` |
| `SSN`, `DRIVERS`, `PASSPORT` | Synthetic US identifiers | not mapped |
| `PREFIX`, `FIRST`, `MIDDLE`, `LAST`, `SUFFIX`, `MAIDEN` | Name parts; Synthea appends digits (`Lindsay928`) | `Patient.name` |
| `MARITAL` | Marital status code (`M`, `S`, ...) | `Patient.maritalStatus` (optional) |
| `RACE`, `ETHNICITY` | US census categories | not mapped (US-specific) |
| `GENDER` | `M` / `F` | `Patient.gender` (`male` / `female`) |
| `BIRTHPLACE` | City, region, country | not mapped |
| `ADDRESS`, `CITY`, `STATE`, `COUNTY`, `FIPS`, `ZIP` | US address | `Patient.address` |
| `LAT`, `LON` | Coordinates of the address | not mapped |
| `HEALTHCARE_EXPENSES`, `HEALTHCARE_COVERAGE`, `INCOME` | Financial attributes | not mapped |

## conditions.csv

| Column | Meaning | FHIR target |
|---|---|---|
| `START` | Onset date | `Condition.onsetDateTime`, `Condition.recordedDate` |
| `STOP` | Resolution date, empty if ongoing | `Condition.abatementDateTime`, `clinicalStatus` |
| `PATIENT` | Patient UUID | `Condition.subject` |
| `ENCOUNTER` | Encounter UUID | `Condition.encounter` (not loaded) |
| `SYSTEM` | Code system; always `SNOMED-CT` in this run | `coding.system` = `http://snomed.info/sct` |
| `CODE` | SNOMED CT concept id | `coding.code` |
| `DESCRIPTION` | SNOMED CT display term | `coding.display` |

## observations.csv

| Column | Meaning | FHIR target |
|---|---|---|
| `DATE` | Effective timestamp, ISO 8601 UTC | `Observation.effectiveDateTime` |
| `PATIENT` | Patient UUID | `Observation.subject` |
| `ENCOUNTER` | Encounter UUID | not loaded |
| `CATEGORY` | `laboratory`, `survey`, `vital-signs`, `social-history`, `exam`, `procedure`, `imaging`, `therapy`, or empty (3,222 rows) | filter: keep `laboratory`; `Observation.category` |
| `CODE` | LOINC code | `coding.system` = `http://loinc.org` |
| `DESCRIPTION` | LOINC display | `coding.display` |
| `VALUE` | Result value, numeric or text | `valueQuantity.value` or `valueString` |
| `UNITS` | UCUM unit, e.g. `mg/dL`, `{score}` | `valueQuantity.unit` / `code` |
| `TYPE` | `numeric` or `text` | chooses the value type |

Laboratory rows: 20,104, of which 3,652 are `text` and 130 have no unit. Decide in the transform whether to skip or map these, and log the reason.

## medications.csv

| Column | Meaning | FHIR target |
|---|---|---|
| `START` | Start timestamp | `MedicationRequest.authoredOn` |
| `STOP` | End timestamp, empty if ongoing (239 rows) | `status`: `active` if empty, else `completed` |
| `PATIENT` | Patient UUID | `MedicationRequest.subject` |
| `PAYER` | Payer UUID | not mapped |
| `ENCOUNTER` | Encounter UUID | not loaded |
| `CODE` | RxNorm code | `medicationCodeableConcept.coding` (`http://www.nlm.nih.gov/research/umls/rxnorm`) |
| `DESCRIPTION` | RxNorm display | `coding.display` |
| `BASE_COST`, `PAYER_COVERAGE`, `DISPENSES`, `TOTALCOST` | Cost data | not mapped |
| `REASONCODE`, `REASONDESCRIPTION` | SNOMED CT reason, often empty | `reasonCode` (optional) |

## Known gaps for German profiles

- Diagnoses are SNOMED CT only; MII Diagnose expects ICD-10-GM.
- Medications are RxNorm; German data uses ATC / PZN.
- Addresses, identifiers and race/ethnicity are US-specific.
