import { expect, test } from '@playwright/test';

test.describe('StatusBadge Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/visual-test/status-badge');
    await page.waitForLoadState('networkidle');
  });

  test('renders all status variants correctly in light mode', async ({ page }) => {
    await expect(page).toHaveScreenshot('status-badge-light.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('renders all status variants correctly in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('status-badge-dark.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('renders size variants correctly', async ({ page }) => {
    const sizeSection = page.locator('section').nth(1);
    
    await expect(sizeSection).toHaveScreenshot('status-badge-sizes.png', {
      animations: 'disabled',
    });
  });

  test('renders priority badges correctly', async ({ page }) => {
    const prioritySection = page.locator('section').nth(2);
    
    await expect(prioritySection).toHaveScreenshot('priority-badge-variants.png', {
      animations: 'disabled',
    });
  });

  test('renders priority badges in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(500);
    
    const prioritySection = page.locator('section').nth(2);
    
    await expect(prioritySection).toHaveScreenshot('priority-badge-dark.png', {
      animations: 'disabled',
    });
  });

  test('renders common use cases correctly', async ({ page }) => {
    const useCasesSection = page.locator('section').nth(3);
    
    await expect(useCasesSection).toHaveScreenshot('status-badge-use-cases.png', {
      animations: 'disabled',
    });
  });
});
