import { test } from '@playwright/test';
import { injectAxe, getViolations } from 'axe-playwright';
import * as fs from 'fs';
import * as path from 'path';

// Configuration for pages to audit
const AUDIT_PAGES = [
  { path: '/', name: 'Home' },
  { path: '/features', name: 'Features' },
  { path: '/pricing', name: 'Pricing' },
  { path: '/about', name: 'About' },
];

test.describe('Accessibility Audit - Landing App', () => {
  const violationsByPage: Record<string, {
    pageName: string;
    violationCount: number;
    violations: unknown[];
    summary: { critical: number; serious: number; moderate: number; minor: number };
  }> = {};

  for (const pageConfig of AUDIT_PAGES) {
    test(`should audit ${pageConfig.name} page for accessibility violations`, async ({
      page,
    }) => {
      try {
        // Navigate to page
        await page.goto(pageConfig.path, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Wait for full page load and hydration
        await page.waitForLoadState('networkidle');
        await page.waitForLoadState('domcontentloaded');
        
        // Wait for page to be fully interactive
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));

        // Inject axe
        await injectAxe(page);

        // Get violations
        const violations = await getViolations(page);
        
        violationsByPage[pageConfig.path] = {
          pageName: pageConfig.name,
          violationCount: violations.length,
          violations: violations,
          summary: {
            critical: violations.filter((v: { impact: string }) => v.impact === 'critical').length,
            serious: violations.filter((v: { impact: string }) => v.impact === 'serious').length,
            moderate: violations.filter((v: { impact: string }) => v.impact === 'moderate').length,
            minor: violations.filter((v: { impact: string }) => v.impact === 'minor').length,
          },
        };

        // Log violations for this page
        console.log(`\n📄 ${pageConfig.name} (${pageConfig.path})`);
        console.log(`   Total violations: ${violations.length}`);
        console.log(
          `   Critical: ${violationsByPage[pageConfig.path].summary.critical}, Serious: ${violationsByPage[pageConfig.path].summary.serious}`
        );
      } catch (error) {
        console.error(`Error auditing ${pageConfig.name}:`, error);
      }
    });
  }

  test.afterAll(async () => {
    // Generate report after all tests
    const reportDir = path.join(process.cwd(), 'accessibility-reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const reportPath = path.join(reportDir, `baseline-landing-${timestamp}.json`);

    // Calculate totals
    let totalViolations = 0;
    let totalCritical = 0;
    let totalSerious = 0;

    for (const violations of Object.values(violationsByPage)) {
      totalViolations += violations.violationCount;
      totalCritical += violations.summary.critical;
      totalSerious += violations.summary.serious;
    }

    const report = {
      app: 'landing',
      timestamp: new Date().toISOString(),
      pages: violationsByPage,
      summary: {
        totalPages: AUDIT_PAGES.length,
        totalViolations,
        criticalViolations: totalCritical,
        seriousViolations: totalSerious,
      },
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ Landing accessibility audit complete. Report saved to: ${reportPath}`);
  });
});
