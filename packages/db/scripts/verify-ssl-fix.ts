import * as fs from "fs";
import * as path from "path";

async function main() {

  const envPath = path.resolve(__dirname, "../.env");

  if (fs.existsSync(envPath)) {

    const envConfig = fs.readFileSync(envPath, "utf-8");
    envConfig.split("\n").forEach((line) => {

      if (line.trim().startsWith("#")) return;
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        let val = valueParts.join("=").trim();

        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        process.env[key.trim()] = val;
      }
    });
  } else {

  }

  
  if (process.env.DATABASE_URL) {

    
  }

  const { default: prisma } = await import("../src/index");

  try {

    const count = await prisma.user.count();

    await prisma.$disconnect();
  } catch (error) {

    process.exit(1);
  }
}

main();
