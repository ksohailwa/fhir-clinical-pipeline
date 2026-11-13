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
