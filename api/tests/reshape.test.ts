import {
  displayOf,
  formatName,
  sortByDateDescending,
  toLabItem,
  toPatientSummary,
  UNKNOWN_DISPLAY,
} from "../src/record/reshape";

describe("displayOf", () => {
  it("prefers the coding display", () => {
    expect(displayOf({ coding: [{ code: "4548-4", display: "Hemoglobin A1c" }], text: "HbA1c" })).toBe(
      "Hemoglobin A1c",
    );
  });

  it("falls back to text, then code, then Unknown", () => {
    expect(displayOf({ coding: [{ code: "4548-4" }], text: "HbA1c" })).toBe("HbA1c");
    expect(displayOf({ coding: [{ code: "4548-4" }] })).toBe("4548-4");
    expect(displayOf(undefined)).toBe(UNKNOWN_DISPLAY);
  });
});

describe("formatName", () => {
  it("joins given and family names of the official name", () => {
    expect(
      formatName([
        { use: "maiden", family: "Old" },
        { use: "official", family: "Test", given: ["Anna", "Maria"] },
      ]),
    ).toBe("Anna Maria Test");
  });

  it("returns Unknown when no name is present", () => {
    expect(formatName(undefined)).toBe(UNKNOWN_DISPLAY);
  });
});

describe("toPatientSummary", () => {
  it("maps missing optional fields to null", () => {
    expect(toPatientSummary({ resourceType: "Patient", id: "p1" })).toEqual({
      id: "p1",
      name: UNKNOWN_DISPLAY,
      birthDate: null,
      gender: null,
      deceasedDate: null,
    });
  });
});

describe("toLabItem", () => {
  const base = {
    resourceType: "Observation" as const,
    id: "obs-1",
    code: { coding: [{ code: "4548-4", display: "Hemoglobin A1c" }] },
    effectiveDateTime: "2024-11-03T06:36:38Z",
  };

  it("maps a quantity with its unit", () => {
    expect(toLabItem({ ...base, valueQuantity: { value: 6.1, unit: "%" } })).toMatchObject({
      value: 6.1,
      unit: "%",
    });
  });

  it("falls back to the UCUM code when the unit text is missing", () => {
    expect(toLabItem({ ...base, valueQuantity: { value: 6.1, code: "%" } }).unit).toBe("%");
  });

  it("maps a coded value to its display without a unit", () => {
    const item = toLabItem({
      ...base,
      valueCodeableConcept: { coding: [{ code: "167297006", display: "Blood not detected in urine" }] },
    });
    expect(item).toMatchObject({ value: "Blood not detected in urine", unit: null });
  });

  it("returns null value when the observation has none", () => {
    expect(toLabItem(base)).toMatchObject({ value: null, unit: null });
  });
});

describe("sortByDateDescending", () => {
  it("puts newest first and missing dates last", () => {
    const sorted = sortByDateDescending(
      [{ d: "2020-01-01" }, { d: null }, { d: "2024-05-01" }],
      (item) => item.d,
    );
    expect(sorted.map((item) => item.d)).toEqual(["2024-05-01", "2020-01-01", null]);
  });
});
