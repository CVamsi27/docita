/**
 * Temperature Conversion Utilities
 *
 * Database stores temperature in Celsius (medical standard).
 * UI displays in Fahrenheit for US-based users.
 *
 * Conversion formulas:
 * - Celsius to Fahrenheit: (C × 9/5) + 32
 * - Fahrenheit to Celsius: (F - 32) × 5/9
 */

/**
 * Convert Celsius to Fahrenheit
 * @param celsius - Temperature in Celsius
 * @returns Temperature in Fahrenheit, rounded to 1 decimal place
 */
export function celsiusToFahrenheit(celsius: number): number {
  return Math.round(((celsius * 9) / 5 + 32) * 10) / 10;
}

/**
 * Convert Fahrenheit to Celsius
 * @param fahrenheit - Temperature in Fahrenheit
 * @returns Temperature in Celsius, rounded to 1 decimal place
 */
export function fahrenheitToCelsius(fahrenheit: number): number {
  return Math.round((((fahrenheit - 32) * 5) / 9) * 10) / 10;
}

/**
 * Format temperature for display with unit
 * Assumes input is in Celsius (from database) and converts to Fahrenheit for display
 * @param celsius - Temperature in Celsius from database
 * @param showUnit - Whether to show the °F unit (default: true)
 * @returns Formatted temperature string in Fahrenheit
 */
export function formatTemperature(
  celsius: number | null | undefined,
  showUnit: boolean = true,
): string {
  if (celsius === null || celsius === undefined) {
    return "—";
  }
  const fahrenheit = celsiusToFahrenheit(celsius);
  return showUnit ? `${fahrenheit}°F` : `${fahrenheit}`;
}

/**
 * Parse temperature input (Fahrenheit) and convert to Celsius for storage
 * @param fahrenheitInput - Temperature input in Fahrenheit
 * @returns Temperature in Celsius for database storage
 */
export function parseTemperatureInput(
  fahrenheitInput: string | number,
): number | null {
  const fahrenheit =
    typeof fahrenheitInput === "string"
      ? parseFloat(fahrenheitInput)
      : fahrenheitInput;

  if (isNaN(fahrenheit)) {
    return null;
  }

  return fahrenheitToCelsius(fahrenheit);
}

/**
 * Check if a temperature value is likely in Celsius
 * (Used for backward compatibility with existing data)
 * @param temp - Temperature value
 * @returns true if likely Celsius, false if likely Fahrenheit
 */
export function isLikelyCelsius(temp: number): boolean {
  // Normal human body temp range in Celsius: ~35-42°C
  // Normal human body temp range in Fahrenheit: ~95-108°F
  // If value is less than 50, it's almost certainly Celsius
  return temp < 50;
}

/**
 * Smart temperature converter - handles both old (Fahrenheit) and new (Celsius) data
 * Returns Fahrenheit for display
 * @param temp - Temperature value (could be Celsius or Fahrenheit based on when stored)
 * @returns Temperature in Fahrenheit for display
 */
export function smartTemperatureToFahrenheit(
  temp: number | null | undefined,
): number | null {
  if (temp === null || temp === undefined) {
    return null;
  }

  // If the value looks like it's already in Celsius, convert it
  if (isLikelyCelsius(temp)) {
    return celsiusToFahrenheit(temp);
  }

  // Value is likely already in Fahrenheit (legacy data)
  return temp;
}

/**
 * Normal temperature ranges for clinical reference
 */
export const TEMPERATURE_RANGES = {
  // In Celsius (storage)
  celsius: {
    hypothermia: { max: 35.0 },
    normal: { min: 36.1, max: 37.2 },
    lowGradeFever: { min: 37.3, max: 38.0 },
    fever: { min: 38.1, max: 39.0 },
    highFever: { min: 39.1 },
  },
  // In Fahrenheit (display)
  fahrenheit: {
    hypothermia: { max: 95.0 },
    normal: { min: 97.0, max: 99.0 },
    lowGradeFever: { min: 99.1, max: 100.4 },
    fever: { min: 100.5, max: 102.2 },
    highFever: { min: 102.3 },
  },
};

/**
 * Get temperature status based on Celsius value
 * @param celsius - Temperature in Celsius
 * @returns Status string for clinical context
 */
export function getTemperatureStatus(
  celsius: number | null | undefined,
): "hypothermia" | "normal" | "lowGradeFever" | "fever" | "highFever" | null {
  if (celsius === null || celsius === undefined) {
    return null;
  }

  const ranges = TEMPERATURE_RANGES.celsius;

  if (celsius <= ranges.hypothermia.max) return "hypothermia";
  if (celsius >= ranges.normal.min && celsius <= ranges.normal.max)
    return "normal";
  if (
    celsius >= ranges.lowGradeFever.min &&
    celsius <= ranges.lowGradeFever.max
  )
    return "lowGradeFever";
  if (celsius >= ranges.fever.min && celsius <= ranges.fever.max)
    return "fever";
  if (celsius >= ranges.highFever.min) return "highFever";

  return "normal";
}
