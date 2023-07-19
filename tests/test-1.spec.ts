import { test, expect } from '@playwright/test';


test('check formula parsing', async ({ page }) => {
  // Recording...
  await page.goto('http://localhost:8000/');
  // await page.locator('canvas').nth(3).dblclick({
  //     position: {
  //       x: 249,
  //       y: 47
  //     }
  //   });
  // await page.waitForTimeout(300); // to prevent konva reading 2x double click as 3x double click
  await page.locator('canvas').nth(3).click({
    position: {
      x: 295,
      y: 190
    }
  });
  await page.locator('.timeline').press('Control+a');

  await page.getByText('brushBrush').click();
  await page.getByLabel('radius mm').dblclick();
  await page.getByLabel('radius mm').fill('radius + 15');
  await page.getByRole('button', { name: '`radius` + 15 formula' }).click();
  await page.locator('.center').click();
  await expect(page.getByLabel('radius mm')).toHaveValue('`radius` + 15');

  // check again after reload
  await page.goto('http://localhost:8000/');
  await page.locator('canvas').nth(3).click({
    position: {
      x: 204,
      y: 170
    }
  });
  await page.locator('.timeline').press('Control+a');
  await page.getByText('brushBrush').click();
  await expect(page.getByLabel('radius mm')).toHaveValue('`radius` + 15');

});