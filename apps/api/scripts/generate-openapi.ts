#!/usr/bin/env node

/**
 * OpenAPI Spec Generator & Exporter
 *
 * This script generates the OpenAPI (Swagger) JSON specification from the NestJS application
 * and exports it to a file for use in contract testing and client generation.
 *
 * Usage:
 *   pnpm generate-openapi
 *
 * Output:
 *   - docs/openapi.json (OpenAPI 3.0 specification)
 *   - Can be used for:
 *     1. Contract testing (verify API responses match spec)
 *     2. Client generation (auto-generate TypeScript API client)
 *     3. API documentation and discoverability
 */

import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function generateOpenAPI() {
  try {
    console.log('🚀 Generating OpenAPI specification...');

    // Create NestJS application for schema generation
    const app = await NestFactory.create(AppModule, {
      logger: ['error'], // Suppress verbose logs
    });

    // Define OpenAPI spec configuration
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

    // Generate OpenAPI document
    const document = SwaggerModule.createDocument(app, config);

    // Ensure docs directory exists
    const docsDir = path.join(__dirname, '../../docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
      console.log(`📁 Created docs directory: ${docsDir}`);
    }

    // Write OpenAPI spec to file
    const specPath = path.join(docsDir, 'openapi.json');
    fs.writeFileSync(specPath, JSON.stringify(document, null, 2));
    console.log(`✅ OpenAPI specification exported to: ${specPath}`);

    // Generate client types file
    const clientTypesPath = path.join(
      __dirname,
      '../src/common/types/api-client.types.ts',
    );
    const clientTypesContent = generateClientTypes(document);
    fs.writeFileSync(clientTypesPath, clientTypesContent);
    console.log(`✅ Client types exported to: ${clientTypesPath}`);

    // Print spec statistics
    const endpoints = Object.keys(document.paths || {}).length;
    const schemas = Object.keys(document.components?.schemas || {}).length;
    console.log(`📊 Specification Statistics:`);
    console.log(`   - Endpoints: ${endpoints}`);
    console.log(`   - Schemas: ${schemas}`);
    console.log(`   - Version: ${document.info.version}`);

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating OpenAPI specification:', error);
    process.exit(1);
  }
}

/**
 * Generate TypeScript types from OpenAPI schemas
 * This creates a type file that can be used in the frontend and testing
 */
function generateClientTypes(document: any): string {
  const types: string[] = [
    '/**',
    ' * Auto-generated from OpenAPI specification',
    ' * Generated: ' + new Date().toISOString(),
    ' */',
    '',
    '// API Request/Response Types',
    '',
  ];

  // Generate interface for each schema
  if (document.components?.schemas) {
    for (const [schemaName, schema] of Object.entries(
      document.components.schemas,
    )) {
      types.push(`export interface ${schemaName} {`);

      if ((schema as any).properties) {
        for (const [propName, prop] of Object.entries(
          (schema as any).properties,
        )) {
          const propSchema = prop as any;
          const required = (schema as any).required?.includes(propName)
            ? ''
            : '?';
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

/**
 * Convert OpenAPI type to TypeScript type
 */
function getTypeScriptType(schema: any): string {
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
    return `${getTypeScriptType(schema.items)}[]`;
  }
  if (schema.$ref) {
    // Extract schema name from reference
    const refName = schema.$ref.split('/').pop();
    return refName;
  }
  return 'any';
}

// Run the generator
generateOpenAPI();
