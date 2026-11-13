# Validation report: after fixes

Generated 2026-11-13 with the HL7 FHIR validator against `de.medizininformatikinitiative.kerndatensatz.base#2026.0.1`, `de.medizininformatikinitiative.kerndatensatz.laborbefund#2026.0.3`, `de.medizininformatikinitiative.kerndatensatz.medikation#2026.0.1`.

| Resource | Profile | Files | Files with errors | Errors | Warnings | Information |
|---|---|---:|---:|---:|---:|---:|
| Patient | Patient | 20 | 0 | 0 | 20 | 20 |
| Condition | Diagnose | 20 | 0 | 0 | 60 | 0 |
| Observation | ObservationLab | 20 | 0 | 0 | 42 | 1 |
| MedicationRequest | MedicationRequest | 20 | 0 | 0 | 20 | 20 |

## Patient

| Severity | Count | Location | Message id | Example |
|---|---:|---|---|---|
| warning | 20 | `Patient` | `http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6` | Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation) |

## Condition

| Severity | Count | Location | Message id | Example |
|---|---:|---|---|---|
| warning | 20 | `Condition.code.coding[*].system` | `UNKNOWN_CODESYSTEM_VERSION` | A definition for CodeSystem 'http://snomed.info/sct' version 'http://snomed.info/sct/900000000000207008/version/20250701' could not be found, so the code cannot be validated. Valid versions: http://snomed.info/sct/11000146104/version/20240930, http://snomed.info/sct/731000124108/version/20230301, http://snomed.info/sct/731000124108/version/20240301, http://snomed.info/sct/731000124108/version/20250901, http://snomed.info/sct/827022005/version/20241216, http://snomed.info/sct/83821000000107/version/20230412, http://snomed.info/sct/900000000000207008/version/20240201, http://snomed.info/sct/900000000000207008/version/20250201 and http://snomed.info/xsct/31000003106/version/20250909 |
| warning | 20 | `Condition.code.coding[*]` | `Terminology_TX_Error_Coding1` | Error begin -1, end 64, length 64 validating Coding |
| warning | 20 | `Condition` | `http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6` | Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation) |

## Observation

| Severity | Count | Location | Message id | Example |
|---|---:|---|---|---|
| warning | 20 | `Observation` | `http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6` | Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation) |
| warning | 20 | `Observation` | `All_observations_should_have_a_performer` | Best Practice Recommendation: In general, all observations should have a performer |
| warning | 1 | `Observation.code.coding[*]` | `INACTIVE_CONCEPT_FOUND` | The concept '33914-3' has a status of DISCOURAGED and its use should be reviewed |
| warning | 1 | `Observation.value.ofType(Quantity)` | `TYPE_SPECIFIC_CHECKS_DT_QTY_UCUM_ANNOTATIONS` | UCUM Codes that contain human readable annotations like {1.73_m2} can be misleading (e.g. they are ignored when comparing units). Best Practice is not to depend on annotations in the UCUM code, so this usage should be checked |

## MedicationRequest

| Severity | Count | Location | Message id | Example |
|---|---:|---|---|---|
| warning | 20 | `MedicationRequest` | `http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6` | Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation) |
