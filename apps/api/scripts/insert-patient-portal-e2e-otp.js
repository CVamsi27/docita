"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = __importDefault(require("@workspace/db"));
function readPhoneNumber() {
    const raw = process.env.PORTAL_E2E_PHONE?.trim();
    if (!raw) {
        throw new Error('PORTAL_E2E_PHONE is required');
    }
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) {
        return `+91${digits}`;
    }
    if (digits.length === 12 && digits.startsWith('91')) {
        return `+${digits}`;
    }
    return raw.startsWith('+') ? raw : `+${digits}`;
}
async function main() {
    const phoneNumber = readPhoneNumber();
    const otp = process.env.PORTAL_E2E_OTP?.trim() || '123456';
    const otpHash = await bcrypt_1.default.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const now = new Date();
    await db_1.default.patientOtp.updateMany({
        where: {
            phoneNumber,
            usedAt: null,
        },
        data: {
            usedAt: now,
        },
    });
    await db_1.default.patientOtp.create({
        data: {
            phoneNumber,
            otpHash,
            expiresAt,
            attempts: 0,
        },
    });
    process.stdout.write(JSON.stringify({
        phoneNumber,
        expiresAt: expiresAt.toISOString(),
    }));
}
async function run() {
    try {
        await main();
    }
    finally {
        await db_1.default.$disconnect();
    }
}
run().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
});
//# sourceMappingURL=insert-patient-portal-e2e-otp.js.map