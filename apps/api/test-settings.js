const { ClinicSettingsSchema } = require('./src/modules/clinics/schemas/settings.schema');
const result = ClinicSettingsSchema.parse({});
console.log(JSON.stringify(result, null, 2));
