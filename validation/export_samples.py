import argparse
import json
import os
import shutil
import sys
from pathlib import Path

import requests

VALIDATION_DIR = Path(__file__).resolve().parent
DEFAULT_BASE_URL = os.environ.get("FHIR_BASE_URL", "http://localhost:8080/fhir")
DEFAULT_SAMPLES_DIR = VALIDATION_DIR / "samples"
DEFAULT_PER_TYPE = 20
RESOURCE_TYPES = ("Patient", "Condition", "Observation", "MedicationRequest")
SERVER_META_FIELDS = ("versionId", "lastUpdated", "source")
TIMEOUT_SECONDS = 60


def strip_server_meta(resource: dict) -> dict:
    meta = {k: v for k, v in resource.get("meta", {}).items() if k not in SERVER_META_FIELDS}
    cleaned = {k: v for k, v in resource.items() if k != "meta"}
    return {**cleaned, "meta": meta} if meta else cleaned


def fetch_sample(base_url: str, resource_type: str, count: int) -> list[dict]:
    response = requests.get(
        f"{base_url}/{resource_type}",
        params={"_count": count, "_sort": "_id"},
        headers={"Accept": "application/fhir+json"},
        timeout=TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return [strip_server_meta(entry["resource"]) for entry in response.json().get("entry", [])]


def export(base_url: str, samples_dir: Path, per_type: int) -> dict[str, int]:
    counts: dict[str, int] = {}
    for resource_type in RESOURCE_TYPES:
        target = samples_dir / resource_type.lower()
        shutil.rmtree(target, ignore_errors=True)
        target.mkdir(parents=True)
        resources = fetch_sample(base_url, resource_type, per_type)
        for index, resource in enumerate(resources, start=1):
            path = target / f"{resource_type.lower()}-{index:03d}.json"
            path.write_text(json.dumps(resource, indent=2, ensure_ascii=False), encoding="utf-8")
        counts[resource_type] = len(resources)
    return counts


def main() -> int:
    parser = argparse.ArgumentParser(description="Export sample resources for validation.")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--samples-dir", type=Path, default=DEFAULT_SAMPLES_DIR)
    parser.add_argument("--per-type", type=int, default=DEFAULT_PER_TYPE)
    args = parser.parse_args()
    for resource_type, count in export(args.base_url, args.samples_dir, args.per_type).items():
        print(f"{resource_type}: {count} files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
