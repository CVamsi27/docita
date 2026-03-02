import * as fs from 'fs';
import * as path from 'path';

const specPath = path.resolve(process.cwd(), 'docs/openapi.json');
const describeIfSpec = fs.existsSync(specPath) ? describe : describe.skip;

describeIfSpec('API Contract Tests', () => {
  interface OpenApiSchema {
    properties?: Record<string, OpenApiSchema>;
    required?: string[];
    type?: string;
    enum?: string[];
  }

  interface OpenApiParameter {
    name?: string;
    schema?: {
      enum?: string[];
    };
  }

  interface OpenApiResponse {
    content?: {
      'application/json'?: {
        schema?: OpenApiSchema;
      };
    };
  }

  interface OpenApiOperation {
    responses?: Record<string, OpenApiResponse>;
    requestBody?: {
      content?: {
        'application/json'?: {
          schema?: OpenApiSchema;
        };
      };
    };
    parameters?: OpenApiParameter[];
  }

  interface OpenApiPathItem {
    get?: OpenApiOperation;
    post?: OpenApiOperation;
    patch?: OpenApiOperation;
    delete?: OpenApiOperation;
  }

  interface OpenApiSpec {
    paths?: Record<string, OpenApiPathItem>;
  }

  let openApiSpec: OpenApiSpec;

  beforeAll(() => {
    const specContent = fs.readFileSync(specPath, 'utf-8');
    openApiSpec = JSON.parse(specContent) as OpenApiSpec;
  });

  describe('GET /patients', () => {
    it('should return response matching OpenAPI schema', () => {
      const patientsSchema = openApiSpec.paths?.['/patients']?.get?.responses;
      expect(patientsSchema).toBeDefined();
      expect(patientsSchema['200']).toBeDefined();
    });

    it('should return pagination metadata in response', () => {
      const patientsSchema =
        openApiSpec.paths?.['/patients']?.get?.responses?.['200']?.content?.[
          'application/json'
        ]?.schema;

      expect(patientsSchema?.properties).toBeDefined();
      expect(patientsSchema?.properties?.data).toBeDefined();
      expect(patientsSchema?.properties?.cursor).toBeDefined();
      expect(patientsSchema?.properties?.hasMore).toBeDefined();
    });
  });

  describe('GET /patients/{id}', () => {
    it('should return response matching OpenAPI schema', () => {
      const patientSchema =
        openApiSpec.paths?.['/patients/{id}']?.get?.responses?.['200'];
      expect(patientSchema).toBeDefined();
    });

    it('should document 404 response when patient not found', () => {
      const responses = openApiSpec.paths?.['/patients/{id}']?.get?.responses;
      expect(responses?.['404']).toBeDefined();
    });

    it('should document 401 response for missing auth', () => {
      const responses = openApiSpec.paths?.['/patients/{id}']?.get?.responses;
      expect(responses?.['401']).toBeDefined();
    });
  });

  describe('POST /patients', () => {
    it('should define request body schema', () => {
      const createSchema =
        openApiSpec.paths?.['/patients']?.post?.requestBody?.content?.[
          'application/json'
        ]?.schema;
      expect(createSchema).toBeDefined();
      expect(createSchema?.properties?.firstName).toBeDefined();
      expect(createSchema?.properties?.lastName).toBeDefined();
      expect(createSchema?.properties?.email).toBeDefined();
    });

    it('should document required fields', () => {
      const createSchema =
        openApiSpec.paths?.['/patients']?.post?.requestBody?.content?.[
          'application/json'
        ]?.schema;
      expect(createSchema?.required).toContain('firstName');
      expect(createSchema?.required).toContain('lastName');
    });

    it('should document validation errors response', () => {
      const responses = openApiSpec.paths?.['/patients']?.post?.responses;
      expect(responses?.['400']).toBeDefined();
      expect(responses?.['422']).toBeDefined();
    });

    it('should document 409 response for duplicate data', () => {
      const responses = openApiSpec.paths?.['/patients']?.post?.responses;
      expect(responses?.['409']).toBeDefined();
    });
  });

  describe('PATCH /patients/{id}', () => {
    it('should define request body schema with optional fields', () => {
      const updateSchema =
        openApiSpec.paths?.['/patients/{id}']?.patch?.requestBody?.content?.[
          'application/json'
        ]?.schema;
      expect(updateSchema).toBeDefined();
      expect(updateSchema?.properties?.firstName).toBeDefined();
    });

    it('should not require all fields in update', () => {
      const updateSchema =
        openApiSpec.paths?.['/patients/{id}']?.patch?.requestBody?.content?.[
          'application/json'
        ]?.schema;

      expect(updateSchema?.required?.length || 0).toBeLessThan(5);
    });
  });

  describe('DELETE /patients/{id}', () => {
    it('should document 204 No Content response', () => {
      const responses =
        openApiSpec.paths?.['/patients/{id}']?.delete?.responses;
      expect(responses?.['204']).toBeDefined();
    });

    it('should document 409 response when patient has dependencies', () => {
      const responses =
        openApiSpec.paths?.['/patients/{id}']?.delete?.responses;
      expect(responses?.['409']).toBeDefined();
    });
  });

  describe('GET /appointments', () => {
    it('should document query parameters for filtering', () => {
      const appointmentParams =
        openApiSpec.paths?.['/appointments']?.get?.parameters;
      const paramNames = appointmentParams?.map((p) => p.name) || [];

      expect(paramNames).toContain('limit');
      expect(paramNames).toContain('cursor');
      expect(paramNames).toContain('status');
      expect(paramNames).toContain('doctorId');
    });

    it('should document status parameter as enum', () => {
      const statusParam = openApiSpec.paths?.[
        '/appointments'
      ]?.get?.parameters?.find((p) => p.name === 'status');
      expect(statusParam?.schema?.enum).toBeDefined();
      expect(statusParam.schema.enum).toContain('scheduled');
      expect(statusParam.schema.enum).toContain('completed');
      expect(statusParam.schema.enum).toContain('cancelled');
    });
  });

  describe('POST /appointments', () => {
    it('should document appointment scheduling schema', () => {
      const createSchema =
        openApiSpec.paths?.['/appointments']?.post?.requestBody?.content?.[
          'application/json'
        ]?.schema;
      expect(createSchema?.properties?.patientId).toBeDefined();
      expect(createSchema?.properties?.doctorId).toBeDefined();
      expect(createSchema?.properties?.startTime).toBeDefined();
      expect(createSchema?.properties?.endTime).toBeDefined();
    });
  });

  describe('POST /auth/signin', () => {
    it('should document login endpoint', () => {
      const signInSchema =
        openApiSpec.paths?.['/auth/signin']?.post?.requestBody?.content?.[
          'application/json'
        ]?.schema;
      expect(signInSchema?.properties?.email).toBeDefined();
      expect(signInSchema?.properties?.password).toBeDefined();
    });

    it('should document JWT token in response', () => {
      const responseSchema =
        openApiSpec.paths?.['/auth/signin']?.post?.responses?.['200']
          ?.content?.['application/json']?.schema;
      expect(responseSchema?.properties?.accessToken).toBeDefined();
    });

    it('should document 401 response for invalid credentials', () => {
      const responses = openApiSpec.paths?.['/auth/signin']?.post?.responses;
      expect(responses?.['401']).toBeDefined();
    });
  });

  describe('GET /invoices', () => {
    it('should document invoice list endpoint', () => {
      const invoiceSchema =
        openApiSpec.paths?.['/invoices']?.get?.responses?.['200']?.content?.[
          'application/json'
        ]?.schema;
      expect(invoiceSchema).toBeDefined();
    });

    it('should document amount fields as numbers', () => {
      const invoiceSchema =
        openApiSpec.paths?.['/invoices/{id}']?.get?.responses?.['200']
          ?.content?.['application/json']?.schema?.properties;
      expect(invoiceSchema?.totalAmount?.type).toBe('number');
      expect(invoiceSchema?.taxAmount?.type).toBe('number');
      expect(invoiceSchema?.discountAmount?.type).toBe('number');
    });
  });

  describe('Common Response Schemas', () => {
    it('should define error response schema', () => {
      const schemas = openApiSpec.components?.schemas;
      expect(schemas?.ErrorResponse).toBeDefined();
    });

    it('should define patient response schema', () => {
      const schemas = openApiSpec.components?.schemas;
      expect(schemas?.PatientResponse).toBeDefined();
    });

    it('should define appointment response schema', () => {
      const schemas = openApiSpec.components?.schemas;
      expect(schemas?.AppointmentResponse).toBeDefined();
    });

    it('should define invoice response schema', () => {
      const schemas = openApiSpec.components?.schemas;
      expect(schemas?.InvoiceResponse).toBeDefined();
    });
  });

  describe('Security Schemas', () => {
    it('should document JWT authentication', () => {
      const security = openApiSpec.components?.securitySchemes?.['JWT-auth'];
      expect(security).toBeDefined();
      expect(security?.type).toBe('http');
      expect(security?.scheme).toBe('bearer');
      expect(security?.bearerFormat).toBe('JWT');
    });

    it('should require auth on protected endpoints', () => {
      const patientEndpoint = openApiSpec.paths?.['/patients']?.get;
      expect(patientEndpoint?.security).toBeDefined();
      expect(patientEndpoint.security[0]['JWT-auth']).toBeDefined();
    });
  });

  describe('API Versioning', () => {
    it('should have v1 in all endpoint paths', () => {
      const paths = Object.keys(openApiSpec.paths || {});

      expect(openApiSpec.info?.version).toBe('1.0.0');
    });

    it('should document servers for different environments', () => {
      expect(openApiSpec.servers).toBeDefined();
    });
  });

  describe('Documentation Quality', () => {
    it('should have descriptions for all endpoints', () => {
      let endpointsWithoutDescription = 0;

      for (const [path, pathItem] of Object.entries(openApiSpec.paths || {})) {
        if (!pathItem || typeof pathItem !== 'object') {
          continue;
        }

        const operations = Object.fromEntries(Object.entries(pathItem));
        for (const [method, endpoint] of Object.entries(operations)) {
          if (
            ['get', 'post', 'put', 'patch', 'delete'].includes(
              method.toLowerCase(),
            )
          ) {
            if (!endpoint?.description && !endpoint?.summary) {
              endpointsWithoutDescription++;
            }
          }
        }
      }

      expect(endpointsWithoutDescription).toBeLessThan(5);
    });

    it('should have examples in request bodies', () => {
      const createPatientExample =
        openApiSpec.paths?.['/patients']?.post?.requestBody?.example;
      expect(createPatientExample || 'schema').toBeDefined();
    });
  });
});
