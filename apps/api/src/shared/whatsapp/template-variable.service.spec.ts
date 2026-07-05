import { describe, expect, it } from '@jest/globals';
import { TemplateVariableService } from './template-variable.service';

const service = new TemplateVariableService();

describe('TemplateVariableService.replaceVariables', () => {
  it('replaces a placeholder with its value', () => {
    expect(service.replaceVariables('Hi {{name}}', { name: 'Asha' })).toBe(
      'Hi Asha',
    );
  });

  it('replaces every occurrence of a placeholder', () => {
    expect(
      service.replaceVariables('{{name}} {{name}}', { name: 'Asha' }),
    ).toBe('Asha Asha');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(
      service.replaceVariables('Hi {{name}}, code {{otp}}', { name: 'Asha' }),
    ).toBe('Hi Asha, code {{otp}}');
  });

  it('returns the content unchanged when there are no variables', () => {
    expect(service.replaceVariables('No vars here', {})).toBe('No vars here');
  });
});

describe('TemplateVariableService.validateRequiredVariables', () => {
  it('is valid when every required variable is provided', () => {
    const result = service.validateRequiredVariables('t1', { name: 'Asha' }, [
      { name: 'name', required: true },
    ]);
    expect(result).toEqual({ valid: true, missingVariables: [] });
  });

  it('reports a required variable that is missing and has no default', () => {
    const result = service.validateRequiredVariables('t1', {}, [
      { name: 'name', required: true },
    ]);
    expect(result).toEqual({ valid: false, missingVariables: ['name'] });
  });

  it('treats a missing required variable as satisfied when it has a default', () => {
    const result = service.validateRequiredVariables('t1', {}, [
      { name: 'clinic', required: true, defaultValue: 'Docita' },
    ]);
    expect(result.valid).toBe(true);
  });

  it('ignores optional variables that are absent', () => {
    const result = service.validateRequiredVariables('t1', {}, [
      { name: 'note', required: false },
    ]);
    expect(result.valid).toBe(true);
  });
});

describe('TemplateVariableService.fillDefaults', () => {
  it('fills a missing variable from its default', () => {
    expect(
      service.fillDefaults({}, [
        { name: 'clinic', required: true, defaultValue: 'Docita' },
      ]),
    ).toEqual({ clinic: 'Docita' });
  });

  it('does not override a provided value with the default', () => {
    expect(
      service.fillDefaults({ clinic: 'MyClinic' }, [
        { name: 'clinic', required: true, defaultValue: 'Docita' },
      ]),
    ).toEqual({ clinic: 'MyClinic' });
  });

  it('leaves a variable absent when it has no default', () => {
    expect(
      service.fillDefaults({}, [{ name: 'name', required: true }]),
    ).toEqual({});
  });
});

describe('TemplateVariableService.extractVariableNames', () => {
  it('extracts the names of all placeholders in order', () => {
    expect(service.extractVariableNames('Hi {{name}}, code {{otp}}')).toEqual([
      'name',
      'otp',
    ]);
  });

  it('returns an empty array when there are no placeholders', () => {
    expect(service.extractVariableNames('Plain text')).toEqual([]);
  });
});
