export function preventWhenLoadingOrDisabled(
  isLoading: boolean,
  disabled: boolean,
) {
  return (e: Event) => {
    if (isLoading || disabled) {
      e.preventDefault();
    }
  };
}

export function preventEscapeWhenLoadingOrDisabled(
  isLoading: boolean,
  disabled: boolean,
) {
  return (e: KeyboardEvent) => {
    if (isLoading || disabled) {
      e.preventDefault();
    }
  };
}
