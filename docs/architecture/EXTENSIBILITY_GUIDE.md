# Docita Extensibility Guide

This guide outlines the architectural patterns, best practices, and guidelines for extending Docita without breaking existing functionality or losing data.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Migration Safety](#database-migration-safety)
3. [Module Architecture](#module-architecture)
4. [Adding New Features](#adding-new-features)
5. [Feature Flags](#feature-flags)
6. [Event-Driven Architecture](#event-driven-architecture)
7. [Plugin System](#plugin-system)
8. [Testing Strategy](#testing-strategy)

---

## Architecture Overview

### Monorepo Structure

```
docita/
├── apps/
│   ├── api/          # NestJS backend
│   ├── app/          # Next.js patient/doctor app
│   ├── admin/        # Admin dashboard
│   └── landing/      # Marketing site
├── packages/
│   ├── db/           # Prisma schema & client
│   ├── types/        # Shared TypeScript types
│   ├── ui/           # Shared UI components
│   └── config/       # Shared configurations
└── docs/             # Documentation
```

### Core Principles

1. **Separation of Concerns**: Repository → Service → Controller
2. **Dependency Injection**: All services are injectable
3. **Module Independence**: Features are encapsulated in modules
4. **Type Safety**: Shared types package ensures consistency
5. **Database First**: Schema changes drive application changes

---

## Database Migration Safety

### Golden Rules

> ️ **NEVER** drop columns, tables, or constraints without a migration plan

#### 1. Additive-Only Migrations

Always prefer adding new columns/tables over modifying existing ones:

```sql
--  GOOD: Add new column with default
ALTER TABLE "Patient" ADD COLUMN "newField" TEXT DEFAULT '';

--  BAD: Drop column (data loss!)
ALTER TABLE "Patient" DROP COLUMN "oldField";
```

#### 2. Safe Column Renaming (3-Phase)

**Phase 1: Add new column**

```sql
ALTER TABLE "Patient" ADD COLUMN "newName" TEXT;
UPDATE "Patient" SET "newName" = "oldName";
```

**Phase 2: Deploy code using both columns**

```typescript
// Read from new, write to both
const value = patient.newName ?? patient.oldName;
await prisma.patient.update({
  where: { id },
  data: { oldName: value, newName: value },
});
```

**Phase 3: Remove old column (after verification)**

```sql
ALTER TABLE "Patient" DROP COLUMN "oldName";
```

#### 3. Safe Type Changes

```sql
--  GOOD: Expand type (varchar(50) → varchar(100))
ALTER TABLE "Patient" ALTER COLUMN "name" TYPE VARCHAR(100);

-- ️ CAREFUL: Shrink type (verify data fits first)
-- First check: SELECT MAX(LENGTH(name)) FROM "Patient";
ALTER TABLE "Patient" ALTER COLUMN "name" TYPE VARCHAR(50);
```

#### 4. Nullable to Non-Nullable

```sql
-- Step 1: Add default value for existing nulls
UPDATE "Patient" SET "field" = 'default' WHERE "field" IS NULL;

-- Step 2: Make non-nullable
ALTER TABLE "Patient" ALTER COLUMN "field" SET NOT NULL;
```

### Migration Script Template

Create migrations using: `pnpm --filter @workspace/db run db:migrate`

```sql
-- Migration: [descriptive_name]
-- Description: Brief description of what this migration does
-- Author: [your name]
-- Date: YYYY-MM-DD

-- Pre-flight checks (verify data state)
DO $$
BEGIN
  -- Check preconditions before migration
  IF EXISTS (SELECT 1 FROM "TableName" WHERE "column" IS NULL) THEN
    RAISE EXCEPTION 'Precondition failed: NULL values exist';
  END IF;
END $$;

-- Backup critical data (for rollback reference)
-- CREATE TABLE "_backup_TableName_YYYYMMDD" AS SELECT * FROM "TableName";

-- Main migration
ALTER TABLE "TableName" ADD COLUMN "newColumn" TYPE DEFAULT value;

-- Data migration (if needed)
UPDATE "TableName" SET "newColumn" = computed_value WHERE condition;

-- Post-flight validation
DO $$
BEGIN
  -- Verify migration succeeded
  IF (SELECT COUNT(*) FROM "TableName" WHERE "newColumn" IS NULL) > 0 THEN
    RAISE EXCEPTION 'Post-migration validation failed';
  END IF;
END $$;
```

---

## Module Architecture

### Standard Module Structure

```
apps/api/src/
└── feature-name/
    ├── feature-name.module.ts      # Module definition
    ├── feature-name.controller.ts  # HTTP endpoints
    ├── feature-name.service.ts     # Business logic
    ├── feature-name.repository.ts  # Data access (optional)
    ├── dto/
    │   ├── create-feature.dto.ts
    │   └── update-feature.dto.ts
    ├── entities/
    │   └── feature.entity.ts
    ├── interfaces/
    │   └── feature.interface.ts
    └── __tests__/
        ├── feature.service.spec.ts
        └── feature.controller.spec.ts
```

### Module Registration Pattern

```typescript
// feature-name.module.ts
import { Module, DynamicModule, Type } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";

export interface FeatureModuleOptions {
  enabled?: boolean;
  providers?: Type<any>[];
}

@Module({})
export class FeatureModule {
  static forRoot(options: FeatureModuleOptions = {}): DynamicModule {
    const { enabled = true, providers = [] } = options;

    if (!enabled) {
      return { module: FeatureModule };
    }

    return {
      module: FeatureModule,
      imports: [PrismaModule],
      controllers: [FeatureController],
      providers: [FeatureService, FeatureRepository, ...providers],
      exports: [FeatureService],
    };
  }
}
```

---

## Adding New Features

### Step-by-Step Checklist

#### 1. Database Schema (if needed)

```prisma
// packages/db/prisma/schema.prisma

// Add new model with all relations
model NewFeature {
  id        String   @id @default(cuid())
  clinicId  String
  // ... fields with sensible defaults
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  clinic    Clinic   @relation(fields: [clinicId], references: [id])

  @@index([clinicId])
}

// Don't forget to add reverse relation to existing models
model Clinic {
  // ... existing fields
  newFeatures NewFeature[]
}
```

#### 2. Generate Migration

```bash
cd packages/db
pnpm db:migrate --name add_new_feature
```

Review the generated migration before applying!

#### 3. Update Shared Types

```typescript
// packages/types/src/new-feature.ts
import { z } from "zod";

export const newFeatureSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  name: z.string().min(1).max(100),
  // ... validation rules
});

export type NewFeature = z.infer<typeof newFeatureSchema>;

// Re-export in packages/types/src/index.ts
export * from "./new-feature";
```

#### 4. Create API Module

```typescript
// apps/api/src/new-feature/new-feature.module.ts
import { Module } from "@nestjs/common";
import { NewFeatureService } from "./new-feature.service";
import { NewFeatureController } from "./new-feature.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [NewFeatureController],
  providers: [NewFeatureService],
  exports: [NewFeatureService],
})
export class NewFeatureModule {}
```

#### 5. Register Module

```typescript
// apps/api/src/app.module.ts
import { NewFeatureModule } from "./new-feature/new-feature.module";

@Module({
  imports: [
    // ... existing imports
    NewFeatureModule,
  ],
})
export class AppModule {}
```

#### 6. Add Feature Flag (for gradual rollout)

```typescript
// apps/api/src/config/feature-flags.ts
export const FEATURE_FLAGS = {
  NEW_FEATURE_ENABLED: process.env.FEATURE_NEW_FEATURE === "true",
} as const;
```

---

## Feature Flags

### Implementation Pattern

```typescript
// packages/types/src/feature-flags.ts
export interface FeatureFlags {
  enableNewFeature: boolean;
  enableBetaUI: boolean;
  maxPatientLimit: number;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  enableNewFeature: false,
  enableBetaUI: false,
  maxPatientLimit: 1000,
};
```

### Database-Driven Feature Flags

```prisma
// Add to schema.prisma
model FeatureFlag {
  id          String   @id @default(cuid())
  key         String   @unique
  value       Json
  description String?
  clinicId    String?  // null = global, specific = per-clinic
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  clinic      Clinic?  @relation(fields: [clinicId], references: [id])

  @@index([key])
  @@index([clinicId])
}
```

### Feature Flag Service

```typescript
// apps/api/src/common/services/feature-flag.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FeatureFlagService {
  constructor(private prisma: PrismaService) {}

  async isEnabled(key: string, clinicId?: string): Promise<boolean> {
    // Check clinic-specific flag first
    if (clinicId) {
      const clinicFlag = await this.prisma.featureFlag.findFirst({
        where: { key, clinicId },
      });
      if (clinicFlag) return clinicFlag.value === true;
    }

    // Fall back to global flag
    const globalFlag = await this.prisma.featureFlag.findFirst({
      where: { key, clinicId: null },
    });

    return globalFlag?.value === true;
  }

  async getValue<T>(
    key: string,
    clinicId?: string,
    defaultValue?: T,
  ): Promise<T> {
    const flag = await this.prisma.featureFlag.findFirst({
      where: { key, clinicId: clinicId ?? null },
    });

    return (flag?.value as T) ?? defaultValue;
  }
}
```

---

## Event-Driven Architecture

### Event System for Loose Coupling

```typescript
// apps/api/src/common/events/domain-events.ts
export enum DomainEvents {
  // Patient Events
  PATIENT_CREATED = "patient.created",
  PATIENT_UPDATED = "patient.updated",
  PATIENT_DELETED = "patient.deleted",

  // Appointment Events
  APPOINTMENT_SCHEDULED = "appointment.scheduled",
  APPOINTMENT_COMPLETED = "appointment.completed",
  APPOINTMENT_CANCELLED = "appointment.cancelled",

  // Prescription Events
  PRESCRIPTION_CREATED = "prescription.created",
  PRESCRIPTION_SENT = "prescription.sent",

  // Invoice Events
  INVOICE_CREATED = "invoice.created",
  INVOICE_PAID = "invoice.paid",
}

export interface DomainEvent<T = any> {
  type: DomainEvents;
  payload: T;
  metadata: {
    clinicId: string;
    userId: string;
    timestamp: Date;
    correlationId?: string;
  };
}
```

### Event Emitter Service

```typescript
// apps/api/src/common/services/event-emitter.service.ts
import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DomainEvent, DomainEvents } from "./domain-events";

@Injectable()
export class DomainEventService {
  constructor(private eventEmitter: EventEmitter2) {}

  emit<T>(
    event: DomainEvents,
    payload: T,
    metadata: DomainEvent["metadata"],
  ): void {
    const domainEvent: DomainEvent<T> = {
      type: event,
      payload,
      metadata: {
        ...metadata,
        timestamp: new Date(),
      },
    };

    this.eventEmitter.emit(event, domainEvent);
    this.eventEmitter.emit("domain.*", domainEvent); // Wildcard for audit
  }
}
```

### Event Listener Pattern

```typescript
// apps/api/src/modules/notifications/notification.listener.ts
import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { DomainEvents, DomainEvent } from "../../common/events/domain-events";

@Injectable()
export class NotificationListener {
  @OnEvent(DomainEvents.APPOINTMENT_SCHEDULED)
  async handleAppointmentScheduled(event: DomainEvent) {
    // Send confirmation notification
  }

  @OnEvent(DomainEvents.PRESCRIPTION_CREATED)
  async handlePrescriptionCreated(event: DomainEvent) {
    // Send prescription to patient
  }
}
```

---

## Plugin System

### Plugin Interface

```typescript
// apps/api/src/common/plugins/plugin.interface.ts
import { DynamicModule, Type } from "@nestjs/common";

export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author?: string;
  dependencies?: string[];
}

export interface Plugin {
  metadata: PluginMetadata;
  module: Type<any> | DynamicModule;

  // Lifecycle hooks
  onInit?(): Promise<void>;
  onDestroy?(): Promise<void>;

  // Schema extensions (for extending existing models)
  prismaExtensions?: string;
}
```

### Plugin Registry

```typescript
// apps/api/src/common/plugins/plugin-registry.ts
import { Injectable, Logger } from "@nestjs/common";
import { Plugin, PluginMetadata } from "./plugin.interface";

@Injectable()
export class PluginRegistry {
  private readonly logger = new Logger(PluginRegistry.name);
  private plugins: Map<string, Plugin> = new Map();

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.metadata.name)) {
      throw new Error(`Plugin ${plugin.metadata.name} already registered`);
    }

    // Validate dependencies
    for (const dep of plugin.metadata.dependencies ?? []) {
      if (!this.plugins.has(dep)) {
        throw new Error(`Plugin ${plugin.metadata.name} requires ${dep}`);
      }
    }

    this.plugins.set(plugin.metadata.name, plugin);
    this.logger.log(
      `Plugin registered: ${plugin.metadata.name} v${plugin.metadata.version}`,
    );
  }

  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }
}
```

---

## Testing Strategy

### Test Categories

1. **Unit Tests**: Test individual services/repositories
2. **Integration Tests**: Test module interactions
3. **E2E Tests**: Test complete API flows
4. **Migration Tests**: Verify data integrity after migrations

### Migration Testing Pattern

```typescript
// packages/db/tests/migrations/test-migration-safety.ts
import { PrismaClient } from "@prisma/client";

describe("Migration Safety Tests", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.TEST_DATABASE_URL } },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should preserve existing patient data after migration", async () => {
    // Count before migration
    const beforeCount = await prisma.patient.count();

    // Run migration (in test environment)
    // await runMigration();

    // Verify count unchanged
    const afterCount = await prisma.patient.count();
    expect(afterCount).toBe(beforeCount);
  });

  it("should not have orphaned records", async () => {
    // Check referential integrity
    const orphanedAppointments = await prisma.appointment.findMany({
      where: {
        patient: null,
      },
    });

    expect(orphanedAppointments).toHaveLength(0);
  });
});
```

### Service Test Template

```typescript
// apps/api/src/feature/__tests__/feature.service.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { FeatureService } from "../feature.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("FeatureService", () => {
  let service: FeatureService;
  let prisma: PrismaService;

  const mockPrisma = {
    feature: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FeatureService>(FeatureService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // Add specific test cases
});
```

---

## Best Practices Summary

### DO 

- Always add new columns with defaults
- Use feature flags for new features
- Write migrations that are reversible
- Test migrations on a copy of production data
- Use the repository pattern for data access
- Emit events for cross-module communication
- Keep modules independent and focused

### DON'T 

- Never drop columns without a migration plan
- Never modify column types without checking data
- Never skip migration testing
- Never hardcode feature availability
- Never create circular module dependencies
- Never put business logic in controllers
- Never modify production data directly

---

## Quick Reference Commands

```bash
# Generate Prisma client after schema changes
pnpm --filter @workspace/db run db:generate

# Create a new migration
pnpm --filter @workspace/db run db:migrate --name descriptive_name

# Deploy migrations to production
pnpm --filter @workspace/db run db:migrate:deploy

# Open Prisma Studio for data inspection
pnpm --filter @workspace/db run db:studio

# Run API tests
pnpm --filter @docita/api run test

# Run E2E tests
pnpm --filter @docita/app run test:e2e
```
