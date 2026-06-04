"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const adapter_pg_1 = require("@prisma/adapter-pg");
const db_1 = require("@workspace/db");
const bcrypt = __importStar(require("bcrypt"));
const dotenv_1 = require("dotenv");
const pg_1 = require("pg");
const node_path_1 = __importDefault(require("node:path"));
(0, dotenv_1.config)({ path: node_path_1.default.resolve(__dirname, '../.env.production') });
const INTERNAL_ADMIN_EMAIL = 'admin@docita.work';
const PROFESSIONAL_USER_EMAILS = [
    'srija210v@gmail.com',
    'cvamsik99@gmail.com',
];
const UNLIMITED_QUOTA = 999999;
const PROFESSIONAL_STORAGE_GB = 500;
function requireEnv(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return value;
}
function formatName(email) {
    const localPart = email.split('@')[0] ?? email;
    return localPart
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}
function clinicIdForEmail(email) {
    return `prod-professional-${email
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}`;
}
function getPeriodEnd(periodStart) {
    return new Date(periodStart.getFullYear() + 1, periodStart.getMonth(), periodStart.getDate(), periodStart.getHours(), periodStart.getMinutes(), periodStart.getSeconds(), periodStart.getMilliseconds());
}
async function upsertInternalUser(prisma, password) {
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();
    await prisma.user.upsert({
        where: { email: INTERNAL_ADMIN_EMAIL },
        update: {
            password: passwordHash,
            name: 'Internal Admin',
            role: db_1.Role.INTERNAL,
            clinicId: null,
            emailVerified: true,
            onboardingStep: 'COMPLETED',
            onboardingCompletedAt: now,
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            passwordChangedAt: now,
        },
        create: {
            email: INTERNAL_ADMIN_EMAIL,
            password: passwordHash,
            name: 'Internal Admin',
            role: db_1.Role.INTERNAL,
            clinicId: null,
            emailVerified: true,
            onboardingStep: 'COMPLETED',
            onboardingCompletedAt: now,
            passwordChangedAt: now,
        },
    });
}
async function provisionProfessionalUser(prisma, email, password) {
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();
    const periodEnd = getPeriodEnd(now);
    const name = formatName(email);
    const fallbackClinicId = clinicIdForEmail(email);
    return prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({
            where: { email },
            select: { id: true, clinicId: true },
        });
        const clinicId = existingUser?.clinicId ?? fallbackClinicId;
        const clinicName = `${name || 'Professional'} Clinic`;
        await tx.clinic.upsert({
            where: { id: clinicId },
            update: {
                name: clinicName,
                email,
                active: true,
                tier: db_1.ClinicTier.PROFESSIONAL,
                subscriptionStatus: db_1.SubscriptionStatus.ACTIVE,
                trialEndsAt: null,
                currency: 'INR',
            },
            create: {
                id: clinicId,
                name: clinicName,
                address: 'Bengaluru, Karnataka, India',
                phone: '+910000000000',
                email,
                active: true,
                tier: db_1.ClinicTier.PROFESSIONAL,
                type: 'GENERAL',
                currency: 'INR',
                subscriptionStatus: db_1.SubscriptionStatus.ACTIVE,
                referralCode: `PRO-${clinicId.slice(-8).toUpperCase()}`,
                settings: {
                    provisionedBy: 'seed-prod-users',
                    provisionedAt: now.toISOString(),
                    operatingCountryCode: 'IN',
                    facilityLabel: 'CLINIC',
                },
            },
        });
        await tx.mrnSequence.upsert({
            where: { clinicId },
            update: {},
            create: {
                clinicId,
                prefix: 'DOC',
                lastNumber: 0,
            },
        });
        const user = await tx.user.upsert({
            where: { email },
            update: {
                password: passwordHash,
                name: name || email,
                role: db_1.Role.ADMIN_DOCTOR,
                clinicId,
                emailVerified: true,
                onboardingStep: 'COMPLETED',
                onboardingCompletedAt: now,
                failedLoginAttempts: 0,
                accountLockedUntil: null,
                passwordChangedAt: now,
            },
            create: {
                email,
                password: passwordHash,
                name: name || email,
                role: db_1.Role.ADMIN_DOCTOR,
                clinicId,
                emailVerified: true,
                onboardingStep: 'COMPLETED',
                onboardingCompletedAt: now,
                passwordChangedAt: now,
            },
        });
        await tx.doctorClinic.upsert({
            where: {
                doctorId_clinicId: {
                    doctorId: user.id,
                    clinicId,
                },
            },
            update: {
                role: db_1.Role.ADMIN_DOCTOR,
                active: true,
            },
            create: {
                doctorId: user.id,
                clinicId,
                role: db_1.Role.ADMIN_DOCTOR,
                active: true,
            },
        });
        await tx.subscription.upsert({
            where: { clinicId },
            update: {
                plan: db_1.ClinicTier.PROFESSIONAL,
                billingCycle: db_1.BillingCycle.YEARLY,
                basePriceCents: 0,
                currency: 'INR',
                status: db_1.SubscriptionStatus.ACTIVE,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                includedPatients: UNLIMITED_QUOTA,
                includedAppointments: UNLIMITED_QUOTA,
                includedStorageGB: PROFESSIONAL_STORAGE_GB,
                includedUsers: UNLIMITED_QUOTA,
                cancelAtPeriodEnd: false,
                autoPayEnabled: false,
                trialEnd: null,
                cancelledAt: null,
            },
            create: {
                clinicId,
                plan: db_1.ClinicTier.PROFESSIONAL,
                billingCycle: db_1.BillingCycle.YEARLY,
                basePriceCents: 0,
                currency: 'INR',
                status: db_1.SubscriptionStatus.ACTIVE,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                includedPatients: UNLIMITED_QUOTA,
                includedAppointments: UNLIMITED_QUOTA,
                includedStorageGB: PROFESSIONAL_STORAGE_GB,
                includedUsers: UNLIMITED_QUOTA,
                cancelAtPeriodEnd: false,
                autoPayEnabled: false,
            },
        });
        await tx.auditLog.create({
            data: {
                clinicId,
                userId: user.id,
                action: 'PROD_USER_PROVISIONED',
                entityType: 'User',
                entityId: user.id,
                metadata: {
                    role: db_1.Role.ADMIN_DOCTOR,
                    tier: db_1.ClinicTier.PROFESSIONAL,
                    access: 'unlimited',
                    source: 'seed-prod-users',
                },
            },
        });
        return { email, clinicId, userId: user.id };
    });
}
async function main() {
    const databaseUrl = requireEnv('DATABASE_URL');
    const internalPassword = requireEnv('DOCITA_INTERNAL_ADMIN_PASSWORD');
    const professionalPassword = requireEnv('DOCITA_PROFESSIONAL_USERS_PASSWORD');
    const pool = new pg_1.Pool({ connectionString: databaseUrl });
    const adapter = new adapter_pg_1.PrismaPg(pool);
    const prisma = new db_1.PrismaClient({ adapter });
    try {
        await upsertInternalUser(prisma, internalPassword);
        const professionalUsers = [];
        for (const email of PROFESSIONAL_USER_EMAILS) {
            professionalUsers.push(await provisionProfessionalUser(prisma, email, professionalPassword));
        }
        process.stdout.write(JSON.stringify({
            internalUser: INTERNAL_ADMIN_EMAIL,
            professionalUsers,
        }, null, 2));
        process.stdout.write('\n');
    }
    finally {
        await prisma.$disconnect();
        await pool.end();
    }
}
main().catch((error) => {
    process.stderr.write(`Prod user provisioning failed: ${String(error)}\n`);
    process.exit(1);
});
//# sourceMappingURL=seed-prod-users.local.js.map