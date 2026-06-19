/**
 * Floors a numeric value to the nearest lower multiple of `multiple`.
 *
 * Useful for pagination offsets:
 * - Ensures the offset always aligns to the selected page size.
 * - Prevents invalid offsets when the user changes items-per-page.
 *
 * Examples:
 *   floorToNearestMultiple(37, 10) → 30
 *
 *   floorToNearestMultiple(10, 10) → 10
 *
 *   floorToNearestMultiple(5, 10)  → 0
 *
 *   floorToNearestMultiple(undefined, 10) → 0
 *
 * @param value    The number to normalize (e.g., current pageOffset)
 * @param multiple The divisor to align to (e.g., pageSize)
 * @returns        A non-negative aligned number
 */
export function floorToNearestMultiple(
  value: number | undefined,
  multiple: number,
): number {
  if (!value || value < multiple) return 0;
  return value - (value % multiple);
}
