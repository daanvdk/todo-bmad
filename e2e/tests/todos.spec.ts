import { test, expect } from '@playwright/test'

test('app loads without errors', async ({ page }) => {
  await page.goto('/')
  await expect(page).not.toHaveTitle('Error')
  await expect(page.locator('body')).toBeVisible()
})
