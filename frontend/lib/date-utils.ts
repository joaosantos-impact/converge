/**
 * Available years for filters (current year down to 2023).
 * Used consistently in Trades, Analytics, etc.
 */
export function getAvailableYears(): number[] {
  const currentYear = new Date().getFullYear();
  return Array.from(
    { length: Math.max(1, currentYear - 2022) },
    (_, i) => currentYear - i,
  );
}
