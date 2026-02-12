/** Number of years to show in year filters (e.g. past 8 years for tax/history) */
const YEARS_BACK = 8;

/**
 * Available years for filters (current year down to 8 years ago).
 * Used consistently in Trades, Analytics, History, Taxes, etc.
 */
export function getAvailableYears(): number[] {
  const currentYear = new Date().getFullYear();
  return Array.from(
    { length: Math.max(1, YEARS_BACK) },
    (_, i) => currentYear - i,
  );
}
