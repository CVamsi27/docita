export function createEnvironmentReader(Failure) {
  return {
    required(name) {
      const value = process.env[name];
      if (!value || value.trim() !== value || /[\r\n\0]/.test(value)) {
        throw new Failure(`${name} must be configured explicitly.`);
      }
      return value;
    },
    integer(name, fallback, maximum) {
      const value = process.env[name] ?? String(fallback);
      if (
        !/^[1-9]\d*$/.test(value) ||
        !Number.isSafeInteger(Number(value)) ||
        Number(value) > maximum
      ) {
        throw new Failure(`${name} is outside its bounded range.`);
      }
      return Number(value);
    },
  };
}
