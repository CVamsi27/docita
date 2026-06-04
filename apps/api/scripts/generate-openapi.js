"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("../src/app.module");
async function main() {
    process.env.OPENAPI_GEN = "1";
    process.env.NODE_ENV = process.env.NODE_ENV ?? "production";
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: false,
    });
    const builder = new swagger_1.DocumentBuilder()
        .setTitle("Docita API")
        .setDescription("Generated from Zod schemas via nestjs-zod.")
        .setVersion(process.env.APP_VERSION ?? "1.0.0")
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, builder);
    const repoRoot = (0, node_path_1.join)(__dirname, "..", "..", "..");
    const outPath = (0, node_path_1.join)(repoRoot, "docs/api/openapi.json");
    (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(outPath), { recursive: true });
    (0, node_fs_1.writeFileSync)(outPath, JSON.stringify(document, null, 2) + "\n");
    await app.close();
    console.log(`[openapi] wrote ${outPath}`);
}
main().catch((err) => {
    console.error("[openapi] failed:", err);
    process.exit(1);
});
//# sourceMappingURL=generate-openapi.js.map