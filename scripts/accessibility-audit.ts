import { chromium, Page } from "playwright";
import { injectAxe, checkA11y, getViolations } from "axe-playwright";
import fs from "fs";
import path from "path";

interface AccessibilityViolation {
  id: string;
  impact: "minor" | "moderate" | "serious" | "critical";
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    html: string;
    target: string[];
    failureSummary?: string;
  }>;
}

interface AppAuditResult {
  app: string;
  timestamp: string;
  pages: Array<{
    url: string;
    violations: AccessibilityViolation[];
    violationCount: number;
    criticalCount: number;
    seriousCount: number;
    moderateCount: number;
    minorCount: number;
  }>;
  summary: {
    totalViolations: number;
    criticalViolations: number;
    seriousViolations: number;
    moderateViolations: number;
    minorViolations: number;
  };
}

interface AuditConfig {
  app: string;
  port: number;
  pages: string[];
  serverUrl?: string;
}

const configs: AuditConfig[] = [
  {
    app: "app",
    port: 3000,
    pages: [
      "/",
      "/dashboard",
      "/appointments",
      "/patients",
      "/prescriptions",
      "/documents",
      "/settings",
    ],
  },
  {
    app: "admin",
    port: 3002,
    pages: ["/", "/dashboard", "/users", "/clinics", "/billing", "/settings"],
  },
  {
    app: "landing",
    port: 3001,
    pages: ["/", "/features", "/pricing", "/about"],
  },
];

async function waitForServer(url: string, maxRetries = 30): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`✅ Server ${url} is ready`);
        return;
      }
    } catch (e) {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Server ${url} did not start in time`);
}

async function auditPage(
  page: Page,
  url: string,
  fullUrl: string,
): Promise<AccessibilityViolation[]> {
  console.log(`  📄 Scanning: ${url}`);

  try {
    await page.goto(fullUrl, { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");

    // Inject axe
    await injectAxe(page);

    // Get violations
    const violations = await getViolations(page);

    return violations as AccessibilityViolation[];
  } catch (error) {
    console.error(`    ⚠️  Error scanning ${url}:`, error);
    return [];
  }
}

async function auditApp(config: AuditConfig): Promise<AppAuditResult> {
  const baseUrl = config.serverUrl || `http://localhost:${config.port}`;

  console.log(`\n🔍 Starting audit for: ${config.app} (${baseUrl})`);

  // Wait for server to be ready
  try {
    await waitForServer(baseUrl);
  } catch (error) {
    console.error(`❌ Could not connect to ${config.app}:`, error);
    throw error;
  }

  const browser = await chromium.launch();
  const context = await browser.createBrowserContext({
    viewport: { width: 1280, height: 720 },
  });

  const pageResults: AppAuditResult["pages"] = [];
  let totalViolations = 0;
  let criticalCount = 0;
  let seriousCount = 0;
  let moderateCount = 0;
  let minorCount = 0;

  for (const pagePath of config.pages) {
    const page = await context.newPage();
    const fullUrl = `${baseUrl}${pagePath}`;

    const violations = await auditPage(page, pagePath, fullUrl);

    const critical = violations.filter((v) => v.impact === "critical").length;
    const serious = violations.filter((v) => v.impact === "serious").length;
    const moderate = violations.filter((v) => v.impact === "moderate").length;
    const minor = violations.filter((v) => v.impact === "minor").length;

    totalViolations += violations.length;
    criticalCount += critical;
    seriousCount += serious;
    moderateCount += moderate;
    minorCount += minor;

    pageResults.push({
      url: pagePath,
      violations,
      violationCount: violations.length,
      criticalCount: critical,
      seriousCount: serious,
      moderateCount: moderate,
      minorCount: minor,
    });

    console.log(
      `    Found ${violations.length} violations (${critical} critical, ${serious} serious, ${moderate} moderate, ${minor} minor)`,
    );

    await page.close();
  }

  await context.close();
  await browser.close();

  return {
    app: config.app,
    timestamp: new Date().toISOString(),
    pages: pageResults,
    summary: {
      totalViolations,
      criticalViolations: criticalCount,
      seriousViolations: seriousCount,
      moderateViolations: moderateCount,
      minorViolations: minorCount,
    },
  };
}

async function generateReport(results: AppAuditResult[]): Promise<void> {
  const timestamp = new Date().toISOString().split("T")[0];
  const reportDir = path.join(process.cwd(), "accessibility-reports");

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  // JSON report
  const jsonReportPath = path.join(reportDir, `baseline-${timestamp}.json`);
  fs.writeFileSync(jsonReportPath, JSON.stringify(results, null, 2));
  console.log(`\n📊 JSON Report: ${jsonReportPath}`);

  // Markdown report
  let markdownReport = `# Accessibility Audit Report\n\n**Date:** ${new Date().toLocaleString()}\n\n`;

  let totalViolations = 0;
  let totalCritical = 0;
  let totalSerious = 0;

  for (const appResult of results) {
    markdownReport += `## ${appResult.app.toUpperCase()} App\n\n`;
    markdownReport += `**Summary:**\n`;
    markdownReport += `- Total Violations: ${appResult.summary.totalViolations}\n`;
    markdownReport += `- Critical: ${appResult.summary.criticalViolations}\n`;
    markdownReport += `- Serious: ${appResult.summary.seriousViolations}\n`;
    markdownReport += `- Moderate: ${appResult.summary.moderateViolations}\n`;
    markdownReport += `- Minor: ${appResult.summary.minorViolations}\n\n`;

    totalViolations += appResult.summary.totalViolations;
    totalCritical += appResult.summary.criticalViolations;
    totalSerious += appResult.summary.seriousViolations;

    markdownReport += `### Pages Audited\n\n`;

    for (const page of appResult.pages) {
      if (page.violations.length > 0) {
        markdownReport += `#### ${page.url}\n`;
        markdownReport += `- Violations: ${page.violationCount} (${page.criticalCount}C, ${page.seriousCount}S, ${page.moderateCount}M, ${page.minorCount}m)\n\n`;

        // Group violations by type
        const violationsByType = new Map<string, AccessibilityViolation[]>();
        for (const violation of page.violations) {
          if (!violationsByType.has(violation.id)) {
            violationsByType.set(violation.id, []);
          }
          violationsByType.get(violation.id)!.push(violation);
        }

        for (const [violationType, violations] of violationsByType) {
          const sample = violations[0]!;
          markdownReport += `**${violationType}** (${sample.impact.toUpperCase()})\n`;
          markdownReport += `${sample.description}\n`;
          markdownReport += `[Learn more](${sample.helpUrl})\n`;
          markdownReport += `Affected elements: ${violations.length}\n\n`;
        }
      }
    }

    markdownReport += "\n---\n\n";
  }

  markdownReport += `## Overall Summary\n\n`;
  markdownReport += `- **Total Apps Audited:** ${results.length}\n`;
  markdownReport += `- **Total Violations:** ${totalViolations}\n`;
  markdownReport += `- **Critical Issues:** ${totalCritical}\n`;
  markdownReport += `- **Serious Issues:** ${totalSerious}\n\n`;

  markdownReport += `## Priority Fixes\n\n`;
  markdownReport += `### CRITICAL (Must Fix)\n`;
  markdownReport += `Focus on critical issues first as they severely impact accessibility:\n`;
  markdownReport += `- Keyboard navigation failures\n`;
  markdownReport += `- Missing ARIA labels on interactive elements\n`;
  markdownReport += `- Color contrast violations\n`;
  markdownReport += `- Form label associations\n\n`;

  markdownReport += `### SERIOUS (High Priority)\n`;
  markdownReport += `These affect significant users:\n`;
  markdownReport += `- Missing alt text on images\n`;
  markdownReport += `- Empty buttons/links\n`;
  markdownReport += `- Missing heading structure\n\n`;

  const mdReportPath = path.join(reportDir, `baseline-${timestamp}.md`);
  fs.writeFileSync(mdReportPath, markdownReport);
  console.log(`📄 Markdown Report: ${mdReportPath}`);
}

async function main(): Promise<void> {
  console.log("🚀 Starting Accessibility Audit...\n");
  console.log("📋 Configuration:");
  configs.forEach((c) => {
    console.log(`  - ${c.app}: port ${c.port}, ${c.pages.length} pages`);
  });

  const results: AppAuditResult[] = [];

  for (const config of configs) {
    try {
      const result = await auditApp(config);
      results.push(result);
    } catch (error) {
      console.error(`\n❌ Failed to audit ${config.app}:`, error);
    }
  }

  // Generate reports
  await generateReport(results);

  // Print summary
  console.log("\n✅ Audit Complete!\n");
  console.log("📊 Summary by App:");
  for (const result of results) {
    console.log(
      `  ${result.app}: ${result.summary.totalViolations} violations`,
    );
    console.log(
      `    Critical: ${result.summary.criticalViolations}, Serious: ${result.summary.seriousViolations}`,
    );
  }
}

main().catch(console.error);
