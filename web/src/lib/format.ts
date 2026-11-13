export const EMPTY = "—";

export function formatDate(value: string | null): string {
  return value ? value.slice(0, 10) : EMPTY;
}

export function ageInYears(birthDate: string | null, until: Date = new Date()): number | null {
  if (!birthDate) return null;
  const born = new Date(birthDate);
  let age = until.getFullYear() - born.getFullYear();
  const beforeBirthday =
    until.getMonth() < born.getMonth() ||
    (until.getMonth() === born.getMonth() && until.getDate() < born.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function formatValue(value: number | string | null, unit: string | null): string {
  if (value === null) return EMPTY;
  return unit ? `${value} ${unit}` : String(value);
}

export function capitalize(value: string | null): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : EMPTY;
}
