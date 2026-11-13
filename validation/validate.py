import argparse
import json
import os
import re
import subprocess
import sys
from collections import Counter
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

VALIDATION_DIR = Path(__file__).resolve().parent
VALIDATOR_JAR = VALIDATION_DIR / "validator_cli.jar"
SAMPLES_DIR = VALIDATION_DIR / "samples"
OUTPUT_DIR = VALIDATION_DIR / "out"
FHIR_VERSION = "4.0.1"
JAVA = os.environ.get("JAVA_BIN", "java")
TOP_ISSUES_PER_PROFILE = 15
MESSAGE_ID_URL = "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id"
FILE_URL = "http://hl7.org/fhir/StructureDefinition/operationoutcome-file"
MII = "https://www.medizininformatik-initiative.de/fhir/core"

IMPLEMENTATION_GUIDES = (
    "de.medizininformatikinitiative.kerndatensatz.base#2026.0.1",
    "de.medizininformatikinitiative.kerndatensatz.laborbefund#2026.0.3",
    "de.medizininformatikinitiative.kerndatensatz.medikation#2026.0.1",
)


@dataclass(frozen=True)
class Target:
    resource_type: str
    profile: str

    @property
    def samples(self) -> Path:
        return SAMPLES_DIR / self.resource_type.lower()


TARGETS = (
    Target("Patient", f"{MII}/modul-person/StructureDefinition/Patient"),
    Target("Condition", f"{MII}/modul-diagnose/StructureDefinition/Diagnose"),
    Target("Observation", f"{MII}/modul-labor/StructureDefinition/ObservationLab"),
    Target("MedicationRequest", f"{MII}/modul-medikation/StructureDefinition/MedicationRequest"),
)

SEVERITIES = ("fatal", "error", "warning", "information")
_INDEX = re.compile(r"\[\d+\]")


@dataclass(frozen=True)
class Issue:
    file: str
    severity: str
    message_id: str
    location: str
    text: str


@dataclass
class TargetResult:
    target: Target
    files: int
    issues: list[Issue] = field(default_factory=list)

    def count(self, severity: str) -> int:
        return sum(1 for issue in self.issues if issue.severity == severity)

    @property
    def files_with_errors(self) -> int:
        return len({i.file for i in self.issues if i.severity in ("fatal", "error")})


def _extension(element: dict, url: str) -> str:
    for extension in element.get("extension", []):
        if extension.get("url") == url:
            return extension.get("valueString") or extension.get("valueCode") or ""
    return ""


def parse_outcomes(document: dict) -> list[Issue]:
    outcomes = (
        [entry["resource"] for entry in document.get("entry", [])]
        if document.get("resourceType") == "Bundle"
        else [document]
    )
    issues: list[Issue] = []
    for outcome in outcomes:
        file_name = Path(_extension(outcome, FILE_URL)).name
        for issue in outcome.get("issue", []):
            location = ",".join(issue.get("expression") or issue.get("location") or [])
            issues.append(
                Issue(
                    file=file_name,
                    severity=issue.get("severity", "error"),
                    message_id=_extension(issue, MESSAGE_ID_URL) or "(none)",
                    location=_INDEX.sub("[*]", location),
                    text=issue.get("details", {}).get("text", ""),
                )
            )
    return issues


def run_validator(target: Target) -> Path:
    OUTPUT_DIR.mkdir(exist_ok=True)
    output = OUTPUT_DIR / f"{target.resource_type.lower()}.json"
    files = sorted(str(path) for path in target.samples.glob("*.json"))
    if not files:
        raise SystemExit(f"No samples in {target.samples}; run export_samples.py first")
    command = [JAVA, "-jar", str(VALIDATOR_JAR), *files, "-version", FHIR_VERSION]
    for guide in IMPLEMENTATION_GUIDES:
        command += ["-ig", guide]
    command += ["-profile", target.profile, "-output", str(output)]
    print(f"Validating {len(files)} {target.resource_type} files against {target.profile}")
    completed = subprocess.run(command, capture_output=True, text=True, encoding="utf-8")
    if not output.exists():
        sys.stderr.write(completed.stdout[-4000:] + completed.stderr[-4000:])
        raise SystemExit(f"Validator produced no output for {target.resource_type}")
    return output


def validate(target: Target, reuse_output: bool) -> TargetResult:
    output = OUTPUT_DIR / f"{target.resource_type.lower()}.json"
    if not (reuse_output and output.exists()):
        output = run_validator(target)
    issues = parse_outcomes(json.loads(output.read_text(encoding="utf-8")))
    return TargetResult(target, len(list(target.samples.glob("*.json"))), issues)


def _escape(text: str) -> str:
    return text.replace("|", "\\|").replace("\n", " ")


def render_report(results: list[TargetResult], label: str) -> str:
    lines = [
        f"# Validation report: {label}",
        "",
        f"Generated {date.today().isoformat()} with the HL7 FHIR validator against "
        + ", ".join(f"`{guide}`" for guide in IMPLEMENTATION_GUIDES)
        + ".",
        "",
        "| Resource | Profile | Files | Files with errors | Errors | Warnings | Information |",
        "|---|---|---:|---:|---:|---:|---:|",
    ]
    for result in results:
        profile_name = result.target.profile.rsplit("/", 1)[-1]
        lines.append(
            f"| {result.target.resource_type} | {profile_name} | {result.files} "
            f"| {result.files_with_errors} | {result.count('error') + result.count('fatal')} "
            f"| {result.count('warning')} | {result.count('information')} |"
        )
    for result in results:
        lines += ["", f"## {result.target.resource_type}", ""]
        grouped = Counter(
            (issue.severity, issue.message_id, issue.location)
            for issue in result.issues
            if issue.severity in ("fatal", "error", "warning")
        )
        if not grouped:
            lines.append("No errors or warnings.")
            continue
        examples = {
            (issue.severity, issue.message_id, issue.location): issue.text
            for issue in reversed(result.issues)
        }
        lines += [
            "| Severity | Count | Location | Message id | Example |",
            "|---|---:|---|---|---|",
        ]
        ordered = sorted(
            grouped.items(), key=lambda item: (SEVERITIES.index(item[0][0]), -item[1])
        )
        for (severity, message_id, location), count in ordered[:TOP_ISSUES_PER_PROFILE]:
            lines.append(
                f"| {severity} | {count} | `{location}` | `{message_id}` "
                f"| {_escape(examples[(severity, message_id, location)])} |"
            )
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate sample resources against MII profiles.")
    parser.add_argument("--label", default="current")
    parser.add_argument("--report", type=Path, default=VALIDATION_DIR / "report.md")
    parser.add_argument("--reuse-output", action="store_true", help="re-render from out/*.json")
    parser.add_argument("--only", choices=[t.resource_type for t in TARGETS], action="append")
    args = parser.parse_args()
    targets = [t for t in TARGETS if not args.only or t.resource_type in args.only]
    results = [validate(target, args.reuse_output) for target in targets]
    args.report.write_text(render_report(results, args.label), encoding="utf-8")
    for result in results:
        print(
            f"{result.target.resource_type}: {result.files_with_errors}/{result.files} files with errors, "
            f"{result.count('error') + result.count('fatal')} errors, {result.count('warning')} warnings"
        )
    print(f"Report written to {args.report}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
