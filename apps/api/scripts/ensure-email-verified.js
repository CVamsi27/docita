"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("@workspace/db"));
function readVerificationEmail() {
    const email = process.env.VERIFICATION_EMAIL?.trim();
    if (!email) {
        throw new Error('VERIFICATION_EMAIL is required');
    }
    return email;
}
async function main() {
    const email = readVerificationEmail();
    try {
        await db_1.default.user.update({
            where: { email },
            data: { emailVerified: true, emailVerificationToken: null },
        });
    }
    finally {
        await db_1.default.$disconnect();
    }
}
main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
});
//# sourceMappingURL=ensure-email-verified.js.map