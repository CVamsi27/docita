import { buildMetaTemplateComponents } from './whatsapp-template-components.util';

describe('buildMetaTemplateComponents', () => {
  it('builds body parameters in template variable order and omits button-only vars', () => {
    const components = buildMetaTemplateComponents(
      [
        { name: 'clinicName', required: true },
        { name: 'patientName', required: true },
        { name: 'doctorName', required: true },
      ],
      {
        clinicName: 'Apollo Clinic',
        patientName: 'Priya Sharma',
        doctorName: 'Dr. Kumar',
        rxToken: 'rx-abc',
        rxLink: 'https://docita.work/rx/rx-abc',
      },
      'rxToken',
    );

    expect(components).toEqual([
      {
        type: 'body',
        parameters: [
          { type: 'text', text: 'Apollo Clinic' },
          { type: 'text', text: 'Priya Sharma' },
          { type: 'text', text: 'Dr. Kumar' },
        ],
      },
      {
        type: 'button',
        sub_type: 'url',
        index: 0,
        parameters: [{ type: 'text', text: 'rx-abc' }],
      },
    ]);
  });

  it('omits button component when token is empty', () => {
    const components = buildMetaTemplateComponents(
      [{ name: 'clinicName', required: true }],
      { clinicName: 'Apollo Clinic', invToken: '' },
      'invToken',
    );

    expect(components).toEqual([
      {
        type: 'body',
        parameters: [{ type: 'text', text: 'Apollo Clinic' }],
      },
    ]);
  });
});
