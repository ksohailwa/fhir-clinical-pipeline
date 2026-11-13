# Validation against the MII core data set

Samples of 20 resources per type are exported from the FHIR server and checked with the HL7 FHIR validator (7.0.5) against the Medical Informatics Initiative (MII) profiles.

| Resource | Profile | Package |
|---|---|---|
| Patient | `.../modul-person/StructureDefinition/Patient` | `de.medizininformatikinitiative.kerndatensatz.base#2026.0.1` |
| Condition | `.../modul-diagnose/StructureDefinition/Diagnose` | `de.medizininformatikinitiative.kerndatensatz.base#2026.0.1` |
| Observation | `.../modul-labor/StructureDefinition/ObservationLab` | `de.medizininformatikinitiative.kerndatensatz.laborbefund#2026.0.3` |
| MedicationRequest | `.../modul-medikation/StructureDefinition/MedicationRequest` | `de.medizininformatikinitiative.kerndatensatz.medikation#2026.0.1` |

## Run

```bash
curl -L -o validator_cli.jar https://github.com/hapifhir/org.hl7.fhir.core/releases/latest/download/validator_cli.jar
python export_samples.py                       # 20 resources per type -> samples/
python validate.py --label "after fixes"       # -> report.md
```

`validate.py` uses `java` from `PATH`, or `JAVA_BIN` if set. The first run downloads the packages into `~/.fhir/packages` (about 5 minutes).

## Results

| Resource | Errors before | Errors after | Files with errors before | Files with errors after |
|---|---:|---:|---:|---:|
| Patient | 0 | 0 | 0/20 | 0/20 |
| Condition | 0 | 0 | 0/20 | 0/20 |
| Observation | 84 | 0 | 20/20 | 0/20 |
| MedicationRequest | 1 | 0 | 1/20 | 0/20 |

Full reports: [report-before.md](report-before.md), [report.md](report.md).

## Findings

### Mapping gaps, fixed in the ETL

| Finding | Cause | Fix |
|---|---|---|
| `Observation.identifier`: minimum 1, slice `analyseBefundCode` required | MII lab results need a lab-assigned identifier of type `OBI` with system, value and assigner | Identifier built from the resource id, typed `v2-0203#OBI`, with a project namespace and assigner |
| `Observation.category.coding`: minimum 2, slice `loinc-observation` required | MII expects LOINC `26436-6` (Laboratory studies) next to the HL7 `laboratory` category | Second category coding added |
| `valueString` not allowed; valid types are Quantity, CodeableConcept, Range, Ratio | The ETL mapped text results (urinalysis) to `valueString` | Text results mapped to SNOMED CT `valueCodeableConcept` through [lab_value_codes.csv](../etl/mappings/lab_value_codes.csv) |
| Wrong display name, e.g. `Carbon dioxide  total` for LOINC 20565-8 | Synthea's CSV export replaces every comma with a space | `restore_commas` turns the two-space sequence back into `, ` for all descriptions |

### Source data gaps, documented

- **Text lab results lose their code in the CSV.** Synthea's CSV export keeps only the SNOMED CT display. [build_lab_value_codes.py](../etl/tools/build_lab_value_codes.py) recovers the 33 codes from Synthea's own FHIR export of the same seed, instead of guessing them. 13 rows (4 distinct values, e.g. `less than 1.8`) are uncoded text even in Synthea's FHIR export; they are skipped and logged.
- **No ICD-10-GM on diagnoses.** The Diagnose profile accepts a SNOMED CT coding (slice `sct`), so the resources pass. German routine and billing data is coded in ICD-10-GM, so a query or cohort definition keyed on ICD-10-GM would find none of these diagnoses. Fixing this needs a SNOMED CT to ICD-10-GM map, which is out of scope.
- **SNOMED CT edition unknown to the terminology server.** The validator could not check codes against the 2025-07-01 International edition and reports it as a warning.

### Out of scope, documented

- **Medications are RxNorm.** MII MedicationRequest slices for PZN and ATC are optional and the slicing is open, so RxNorm passes. German data uses PZN and ATC, and RxNorm has no official mapping to either.
- **Best-practice warnings** remain: no narrative (`dom-6`) and no `Observation.performer`. Synthea's CSV has no performer, and a generated narrative adds nothing for a research pipeline.

## Limits of this check

Twenty resources per type is a sample, not the full data set. The sample is the first 20 by id, which happens to include two coded text results. Validation proves profile conformance, not that the data is clinically correct.
