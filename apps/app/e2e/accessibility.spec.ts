import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';
import * as fs from 'fs';
import * as path from 'path';

// Configuration for pages to audit
const AUDIT_PAGES = [
  { path: '/', name: 'Home' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/appointments', name: 'Appointments' },
  { path: '/patients', name: 'Patients' },
];

test.describe('Accessibility Audit - Main App', () => {
  let violationsByPage: Record<string, any> = {};

  for (const pageConfig of AUDIT_PAGES) {
    test(`should audit ${pageConfig.name} page for accessibility violations`, async ({
      page,
    }) => {
      // Navigate to page
      await page.goto(pageConfig.path, { waitUntil: 'networkidle' });
      
      // Wait for content to load
      await page.waitForLoadState('domcontentloaded');

      // Inject axe
      await injectAxe(page);

      // Get violations
      try {
        const violations = await getViolations(page);
        
        violationsByPage[pageConfig.path] = {
          pageName: pageConfig.name,
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
        console.log(`\n📄 ${pageConfig.name} (${pageConfig.path})`);
        console.log(`   Total violations: ${violations.length}`);
        console.log(
          `   Critical: ${violationsByPage[pageConfig.path].summary.critical}, Serious: ${violationsByPage[pageConfig.path].summary.serious}`
        );

        // Don't fail on accessibility issues in audit mode
        // We're just collecting data
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
    const reportPath = path.join(reportDir, `baseline-app-${timestamp}.json`);

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
      app: 'app',
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
    console.log(`\n✅ Accessibility audit complete. Report saved to: ${reportPath}`);
  });
});
