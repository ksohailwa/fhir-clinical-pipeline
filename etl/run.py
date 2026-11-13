import argparse
import logging
import sys
from collections import Counter
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

from config import BATCH_SIZE, CSV_DIR, FHIR_BASE_URL
from extract import Row, read_rows
from load import load_resources
from transform import (
    Resource,
    SkipRow,
    to_condition,
    to_medication_request,
    to_observation,
    to_patient,
)

log = logging.getLogger("etl")


@dataclass(frozen=True)
class Stage:
    resource_type: str
    source_file: str
    transform: Callable[[Row], Resource]
    references_patient: bool


STAGES = (
    Stage("Patient", "patients.csv", to_patient, references_patient=False),
    Stage("Condition", "conditions.csv", to_condition, references_patient=True),
    Stage("Observation", "observations.csv", to_observation, references_patient=True),
    Stage("MedicationRequest", "medications.csv", to_medication_request, references_patient=True),
)


@dataclass
class StageResult:
    rows_read: int = 0
    resources: list[Resource] = field(default_factory=list)
    skipped: Counter[str] = field(default_factory=Counter)
    bundles_sent: int = 0


def transform_rows(stage: Stage, rows: list[Row], known_patients: set[str]) -> StageResult:
    result = StageResult(rows_read=len(rows))
    seen_ids: set[str] = set()
    for row in rows:
        try:
            if stage.references_patient and row.get("PATIENT", "").strip() not in known_patients:
                raise SkipRow("unknown patient")
            resource = stage.transform(row)
            if resource["id"] in seen_ids:
                raise SkipRow("duplicate row")
        except SkipRow as skip:
            result.skipped[skip.reason] += 1
            continue
        seen_ids.add(resource["id"])
        result.resources.append(resource)
    return result


def log_stage(stage: Stage, result: StageResult) -> None:
    log.info(
        "%s: %d rows read, %d resources built, %d skipped, %d bundles sent",
        stage.resource_type,
        result.rows_read,
        len(result.resources),
        sum(result.skipped.values()),
        result.bundles_sent,
    )
    for reason, count in result.skipped.most_common():
        log.info("  skipped %6d  %s", count, reason)


def run(csv_dir: Path, base_url: str, batch_size: int, dry_run: bool) -> dict[str, StageResult]:
    results: dict[str, StageResult] = {}
    known_patients: set[str] = set()
    for stage in STAGES:
        path = csv_dir / stage.source_file
        log.info("Reading %s", path)
        result = transform_rows(stage, read_rows(path), known_patients)
        if stage.resource_type == "Patient":
            known_patients = {resource["id"] for resource in result.resources}
        if not dry_run:
            log.info("Loading %d %s resources", len(result.resources), stage.resource_type)
            result.bundles_sent = load_resources(result.resources, base_url, batch_size)
        log_stage(stage, result)
        results[stage.resource_type] = result
    return results


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Load Synthea CSV data into a FHIR server.")
    parser.add_argument("--csv-dir", type=Path, default=CSV_DIR)
    parser.add_argument("--base-url", default=FHIR_BASE_URL)
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    parser.add_argument("--dry-run", action="store_true", help="transform only, send nothing")
    parser.add_argument("--verbose", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)-5s %(name)s %(message)s",
    )
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    log.info("Source %s -> %s%s", args.csv_dir, args.base_url, " (dry run)" if args.dry_run else "")
    run(args.csv_dir, args.base_url, args.batch_size, args.dry_run)
    return 0


if __name__ == "__main__":
    sys.exit(main())
