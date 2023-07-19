import { test, expect } from '@playwright/test';


test('check if formulas show in user param pane', async ({ page }) => {
  // page.setDefaultTimeout(1000); # just keeping default for now

  // Recording...
  await page.goto('http://localhost:8000/');
  await page.locator('canvas').nth(3).click({
    position: {
      x: 112,
      y: 202
    }
  });
  await page.locator('.timeline').press('Control+a');
  await page.getByText('brushBrush').click();
  await page.getByLabel('radius mm').click();
  await page.getByLabel('radius mm').fill('proximity * 20 + 15');
  await page.locator('.center').click();
  const check_radius = async () => {
    await expect(page.getByLabel('radius mm')).toHaveValue('`proximity` * 20 + 15');
    await expect(page.locator('user-param-control > input:first-child').nth(0)).toHaveValue("proximity");
  };
  await check_radius();

  await page.getByLabel('am_freq hz').click();
  await page.getByLabel('am_freq hz').fill('rumble*25');
  await page.locator('.center').click();
  const check_am_freq = async () => {
    await expect(page.getByLabel('am_freq hz')).toHaveValue('`rumble` * 25');
    await expect(page.locator('user-param-control > input:first-child').nth(1)).toHaveValue("rumble");
  };
  await check_am_freq();


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
  await check_radius();
  await check_am_freq();

});