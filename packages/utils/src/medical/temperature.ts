

export function celsiusToFahrenheit(celsius: number): number {
  return Math.round(((celsius * 9) / 5 + 32) * 10) / 10;
}

export function fahrenheitToCelsius(fahrenheit: number): number {
  return Math.round((((fahrenheit - 32) * 5) / 9) * 10) / 10;
}

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

export function isLikelyCelsius(temp: number): boolean {

  return temp < 50;
}

export function smartTemperatureToFahrenheit(
  temp: number | null | undefined,
): number | null {
  if (temp === null || temp === undefined) {
    return null;
  }

  if (isLikelyCelsius(temp)) {
    return celsiusToFahrenheit(temp);
  }

  return temp;
}

export const TEMPERATURE_RANGES = {

  celsius: {
    hypothermia: { max: 35.0 },
    normal: { min: 36.1, max: 37.2 },
    lowGradeFever: { min: 37.3, max: 38.0 },
    fever: { min: 38.1, max: 39.0 },
    highFever: { min: 39.1 },
  },

  fahrenheit: {
    hypothermia: { max: 95.0 },
    normal: { min: 97.0, max: 99.0 },
    lowGradeFever: { min: 99.1, max: 100.4 },
    fever: { min: 100.5, max: 102.2 },
    highFever: { min: 102.3 },
  },
};

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
