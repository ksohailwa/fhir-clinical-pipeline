import { z } from "zod";

export const CodingSchema = z.object({
  system: z.string().optional(),
  code: z.string().optional(),
  display: z.string().optional(),
});

export const CodeableConceptSchema = z.object({
  coding: z.array(CodingSchema).optional(),
  text: z.string().optional(),
});

export const HumanNameSchema = z.object({
  use: z.string().optional(),
  family: z.string().optional(),
  given: z.array(z.string()).optional(),
  prefix: z.array(z.string()).optional(),
});

export const PatientSchema = z.object({
  resourceType: z.literal("Patient"),
  id: z.string(),
  name: z.array(HumanNameSchema).optional(),
  gender: z.string().optional(),
  birthDate: z.string().optional(),
  deceasedDateTime: z.string().optional(),
});

export const ConditionSchema = z.object({
  resourceType: z.literal("Condition"),
  id: z.string(),
  code: CodeableConceptSchema.optional(),
  clinicalStatus: CodeableConceptSchema.optional(),
  onsetDateTime: z.string().optional(),
  abatementDateTime: z.string().optional(),
});

export const ObservationSchema = z.object({
  resourceType: z.literal("Observation"),
  id: z.string(),
  code: CodeableConceptSchema,
  effectiveDateTime: z.string().optional(),
  valueQuantity: z
    .object({
      value: z.number().optional(),
      unit: z.string().optional(),
      code: z.string().optional(),
    })
    .optional(),
  valueCodeableConcept: CodeableConceptSchema.optional(),
  valueString: z.string().optional(),
});

export const MedicationRequestSchema = z.object({
  resourceType: z.literal("MedicationRequest"),
  id: z.string(),
  status: z.string().optional(),
  authoredOn: z.string().optional(),
  medicationCodeableConcept: CodeableConceptSchema.optional(),
});

export const BundleSchema = z.object({
  resourceType: z.literal("Bundle"),
  link: z.array(z.object({ relation: z.string(), url: z.string() })).optional(),
  entry: z.array(z.object({ resource: z.unknown() })).optional(),
});

export type CodeableConcept = z.infer<typeof CodeableConceptSchema>;
export type HumanName = z.infer<typeof HumanNameSchema>;
export type FhirPatient = z.infer<typeof PatientSchema>;
export type FhirCondition = z.infer<typeof ConditionSchema>;
export type FhirObservation = z.infer<typeof ObservationSchema>;
export type FhirMedicationRequest = z.infer<typeof MedicationRequestSchema>;
