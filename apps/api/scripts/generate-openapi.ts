#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '@/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const logger = new Logger('GenerateOpenApi');

type OpenApiPropertySchema = {
  type?: string;
  enum?: string[];
  items?: OpenApiPropertySchema;
  $ref?: string;
};

type OpenApiSchemaObject = {
  properties?: Record<string, OpenApiPropertySchema>;
  required?: string[];
};

function isSchemaObject(value: unknown): value is OpenApiSchemaObject {
  return !!value && typeof value === 'object';
}

async function generateOpenAPI() {
  try {
    logger.log('Generating OpenAPI documentation...');

    const app = await NestFactory.create(AppModule, {
      logger: ['error'],
    });

    const config = new DocumentBuilder()
      .setTitle('Docita API')
      .setDescription(
        'Healthcare practice management API for appointments, patients, prescriptions, and billing.',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token',
        },
        'JWT-auth',
      )
      .addTag('auth', 'Authentication endpoints')
      .addTag('patients', 'Patient management')
      .addTag('appointments', 'Appointment scheduling')
      .addTag('prescriptions', 'Prescription management')
      .addTag('invoices', 'Billing and invoices')
      .addTag('clinics', 'Clinic management')
      .addTag('whatsapp', 'WhatsApp messaging')
      .addTag('medical-coding', 'Medical coding and diagnosis')
      .addTag('audit', 'Audit log access')
      .addTag('documents', 'Document management')
      .build();

    const document = SwaggerModule.createDocument(app, config);

    const docsDir = path.join(__dirname, '../../docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
      logger.log(`Created docs directory: ${docsDir}`);
    }

    const specPath = path.join(docsDir, 'openapi.json');
    fs.writeFileSync(specPath, JSON.stringify(document, null, 2));

    const clientTypesPath = path.join(
      __dirname,
      '../src/common/types/api-client.types.ts',
    );
    const clientTypesContent = generateClientTypes(document);
    fs.writeFileSync(clientTypesPath, clientTypesContent);

    const endpoints = Object.keys(document.paths || {}).length;
    const schemas = Object.keys(document.components?.schemas || {}).length;

    logger.log(`OpenAPI spec generated: ${specPath}`);
    logger.log(`Generated ${endpoints} endpoints and ${schemas} schemas`);
    logger.log(`TypeScript client types generated: ${clientTypesPath}`);

    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error('Error generating OpenAPI docs', error);

    process.exit(1);
  }
}

function generateClientTypes(document: unknown): string {
  const openApiDoc = document as {
    components?: {
      schemas?: Record<string, unknown>;
    };
  };

  const types: string[] = [
    '// Auto-generated API client types',
    '// Generated from OpenAPI specification',
    '',
    '/* eslint-disable @typescript-eslint/no-explicit-any */',
    '',
  ];

  if (openApiDoc.components?.schemas) {
    for (const [schemaName, schema] of Object.entries(
      openApiDoc.components.schemas,
    )) {
      types.push(`export interface ${schemaName} {`);

      if (isSchemaObject(schema) && schema.properties) {
        for (const [propName, prop] of Object.entries(schema.properties)) {
          const propSchema = prop;
          const required = schema.required?.includes(propName) ? '' : '?';
          const type = getTypeScriptType(propSchema);
          types.push(`  ${propName}${required}: ${type};`);
        }
      }

      types.push('}');
      types.push('');
    }
  }

  return types.join('\n');
}

function getTypeScriptType(schema: OpenApiPropertySchema): string {
  if (schema.type === 'string') {
    if (schema.enum) {
      return schema.enum.map((v: string) => `'${v}'`).join(' | ');
    }
    return 'string';
  }
  if (schema.type === 'number' || schema.type === 'integer') {
    return 'number';
  }
  if (schema.type === 'boolean') {
    return 'boolean';
  }
  if (schema.type === 'array') {
    return schema.items ? `${getTypeScriptType(schema.items)}[]` : 'unknown[]';
  }
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop();
    return refName ?? 'unknown';
  }
  return 'any';
}

generateOpenAPI();
