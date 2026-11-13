# fhir-clinical-pipeline

Synthetic patients (Synthea) mapped to FHIR R4, loaded into HAPI FHIR, validated against the German Medical Informatics Initiative (MII) core data set profiles, and shown in a web view with a traceable LLM summary.

> Synthetic data. Demonstration only, not for clinical use.

## Layout

| Folder | Purpose |
|---|---|
| `data/` | Synthea output (git-ignored) |
| `etl/` | Python: CSV -> FHIR -> server |
| `validation/` | Validator script and reports |
| `api/` | Node.js + TypeScript backend |
| `web/` | React + TypeScript frontend |
| `k8s/` | Kubernetes manifests |
| `docs/` | Requirements, risks, trace table, data dictionary |

## Generate the data

Requires Java 17. Download `synthea-with-dependencies.jar` from the [Synthea releases page](https://github.com/synthetichealth/synthea/releases) into `data/`.

```bash
cd data
java -jar synthea-with-dependencies.jar -p 100 -s 42 --exporter.csv.export=true --exporter.fhir.export=false
```

## Run the FHIR server

```bash
docker compose up -d
curl http://localhost:8080/fhir/metadata
```

HAPI FHIR 8.12 (R4) on PostgreSQL 16. The first boot takes about 75 seconds.

## Load the data (ETL)

```bash
cd etl
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python run.py --dry-run           # transform only, print counts and skip reasons
python run.py                     # load into FHIR_BASE_URL (default http://localhost:8080/fhir)
python -m pytest
```

`extract.py` reads the CSVs, `transform.py` holds one pure function per resource type, `load.py` sends transaction bundles of 200 `PUT` requests, and `run.py` loads patients first, then conditions, laboratory observations and medication requests.

Mapping decisions:

- Resource ids are deterministic: the Synthea UUID for patients and a hash of the identifying columns for everything else, so a second run updates resources instead of duplicating them.
- Synthea's numeric name suffixes are stripped (`Lindsay928` becomes `Lindsay`).
- Only `laboratory` observations are loaded. Numeric values become `valueQuantity` with UCUM units, and text values become `valueString`.
- Rows are skipped, with a counted reason, when a required column is empty, the code system is unknown, a numeric lab value has no unit, a text lab value has no known code, the patient is unknown, or the row is an exact duplicate.
- Synthea's CSV export turns commas into spaces; descriptions are restored (`Carbon dioxide  total` becomes `Carbon dioxide, total`).
- Text lab results are coded as SNOMED CT using codes recovered from Synthea's FHIR export (`etl/mappings/lab_value_codes.csv`).

Loaded: 113 patients, 3,477 conditions, 20,077 laboratory observations, 3,229 medication requests.

## Validation against German MII profiles

Samples of 20 resources per type are validated with the HL7 FHIR validator against the MII core data set profiles. Details and the classification of every finding are in [validation/README.md](validation/README.md).

| Resource | MII profile | Errors before | Errors after |
|---|---|---:|---:|
| Patient | Patient | 0 | 0 |
| Condition | Diagnose | 0 | 0 |
| Observation | ObservationLab | 84 | 0 |
| MedicationRequest | MedicationRequest | 1 | 0 |

Passing is not the same as being usable in a German data integration centre: diagnoses carry SNOMED CT only (no ICD-10-GM) and medications RxNorm only (no ATC or PZN). Both are allowed by the profiles and documented as limitations.
