import * as fs from "fs";
import * as path from "path";

async function main() {
  // Load .env manually first
  const envPath = path.resolve(__dirname, "../.env");
  console.log(`Looking for .env at: ${envPath}`);

  if (fs.existsSync(envPath)) {
    console.log(".env file found.");
    const envConfig = fs.readFileSync(envPath, "utf-8");
    envConfig.split("\n").forEach((line) => {
      // Skip comments
      if (line.trim().startsWith("#")) return;
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        let val = valueParts.join("=").trim();
        // Strip surrounding quotes if present
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
    console.log(".env file NOT found.");
  }

  console.log(
    "DATABASE_URL is " + (process.env.DATABASE_URL ? "set" : "NOT set"),
  );
  if (process.env.DATABASE_URL) {
    // Mask the password for safety
    console.log(
      "DATABASE_URL starts with:",
      process.env.DATABASE_URL.substring(0, 15) + "...",
    );
  }

  // Now import prisma dynamically so it picks up the env vars
  const { default: prisma } = await import("../src/index");

  console.log("Attempting to connect to the database...");
  try {
    // A simple query to trigger the connection
    const count = await prisma.user.count();
    console.log(`Successfully connected. User count: ${count}`);
    await prisma.$disconnect();
  } catch (error) {
    console.error("Failed to connect:", error);
    process.exit(1);
  }
}

main();
