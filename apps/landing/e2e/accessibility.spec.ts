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
  let violationsByPage: Record<string, any> = {};

  for (const page of AUDIT_PAGES) {
    test(`should audit ${page.name} page for accessibility violations`, async ({
      page,
    }) => {
      try {
        // Navigate to page
        await page.goto(page.path, { waitUntil: 'networkidle', timeout: 30000 });
        
        // Wait for content to load
        await page.waitForLoadState('domcontentloaded');

        // Inject axe
        await injectAxe(page);

        // Get violations
        const violations = await getViolations(page);
        
        violationsByPage[page.path] = {
          pageName: page.name,
          violationCount: violations.length,
          violations: violations,
          summary: {
            critical: violations.filter((v: any) => v.impact === 'critical').length,
            serious: violations.filter((v: any) => v.impact === 'serious').length,
            moderate: violations.filter((v: any) => v.impact === 'moderate').length,
            minor: violations.filter((v: any) => v.impact === 'minor').length,
          },
        };

        // Log violations for this page
        console.log(`\n📄 ${page.name} (${page.path})`);
        console.log(`   Total violations: ${violations.length}`);
        console.log(
          `   Critical: ${violationsByPage[page.path].summary.critical}, Serious: ${violationsByPage[page.path].summary.serious}`
        );
      } catch (error) {
        console.error(`Error auditing ${page.name}:`, error);
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

    for (const violations of Object.values(violationsByPage) as any[]) {
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
