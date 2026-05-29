interface TemplateVariable {
  name: string;
  required: boolean;
  defaultValue?: string;
}

export function buildMetaTemplateComponents(
  variables: TemplateVariable[],
  filledVariables: Record<string, string>,
  buttonUrlVariable?: string,
): Array<Record<string, unknown>> {
  const bodyVariableNames = new Set(
    variables
      .map((variable) => variable.name)
      .filter((name) => name !== buttonUrlVariable),
  );

  const bodyParameters = variables
    .filter((variable) => bodyVariableNames.has(variable.name))
    .map((variable) => ({
      type: 'text',
      text: filledVariables[variable.name] ?? variable.defaultValue ?? '',
    }));

  const components: Array<Record<string, unknown>> = [];

  if (bodyParameters.length > 0) {
    components.push({ type: 'body', parameters: bodyParameters });
  }

  if (buttonUrlVariable) {
    const buttonToken = filledVariables[buttonUrlVariable]?.trim();
    if (buttonToken) {
      components.push({
        type: 'button',
        sub_type: 'url',
        index: 0,
        parameters: [{ type: 'text', text: buttonToken }],
      });
    }
  }

  return components;
}
