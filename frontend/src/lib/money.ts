export function hundredthsToNumber(value: string | bigint): number {
  return Number(value) / 100;
}

export function formatMultiplier(value: string | bigint | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return hundredthsToNumber(value).toFixed(2);
}
