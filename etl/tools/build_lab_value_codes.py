"""Build the text-to-SNOMED lookup for coded laboratory values.

Synthea's CSV export keeps only the display text of coded laboratory results
(e.g. "Cloudy urine (finding)"). Its FHIR export of the same seed keeps the
code. This script reads that FHIR export and writes display -> code pairs.

    java -jar synthea-with-dependencies.jar -p 100 -s 42 \
      --exporter.csv.export=false --exporter.fhir.export=true \
      --exporter.baseDirectory=./output-fhir
    python tools/build_lab_value_codes.py ../data/output-fhir/fhir
"""

import argparse
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

DEFAULT_OUTPUT = Path(__file__).resolve().parent.parent / "mappings" / "lab_value_codes.csv"


def collect(fhir_dir: Path) -> dict[str, set[tuple[str, str]]]:
    codes: dict[str, set[tuple[str, str]]] = defaultdict(set)
    for path in fhir_dir.glob("*.json"):
        bundle = json.loads(path.read_text(encoding="utf-8"))
        for entry in bundle.get("entry", []):
            resource = entry.get("resource", {})
            if resource.get("resourceType") != "Observation":
                continue
            categories = {
                coding.get("code")
                for category in resource.get("category", [])
                for coding in category.get("coding", [])
            }
            if "laboratory" not in categories:
                continue
            for coding in resource.get("valueCodeableConcept", {}).get("coding", []):
                if coding.get("display") and coding.get("code"):
                    codes[coding["display"]].add((coding["system"], coding["code"]))
    return codes


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("fhir_dir", type=Path)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    codes = collect(args.fhir_dir)
    ambiguous = {display: pairs for display, pairs in codes.items() if len(pairs) > 1}
    if ambiguous:
        print(f"Ambiguous displays, not written: {sorted(ambiguous)}", file=sys.stderr)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["display", "system", "code"])
        for display in sorted(codes):
            if display not in ambiguous:
                system, code = next(iter(codes[display]))
                writer.writerow([display, system, code])
    print(f"Wrote {len(codes) - len(ambiguous)} codes to {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
