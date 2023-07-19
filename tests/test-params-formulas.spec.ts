import { test, expect, Page } from '@playwright/test';


async function setup_radius_formula(page: Page) {
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
}
async function check_radius(page: Page) {
  await expect(page.getByLabel('radius mm')).toHaveValue('`proximity` * 20 + 15');
  await expect(page.locator('user-param-control > input:first-child').nth(0)).toHaveValue("proximity");
};

test('check if formulas show in user param pane', async ({ page }) => {
  // page.setDefaultTimeout(1000); # just keeping default for now

  await setup_radius_formula(page);
  await check_radius(page);

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
  await check_radius(page);
  await check_am_freq();

});

test('check parameter in formula rename', async ({ page }) => {
  // page.setDefaultTimeout(1000); # just keeping default for now

  // Recording...
  await setup_radius_formula(page);
  await check_radius(page);
  await page.getByText('infraredIntensity').click();
  await page.locator("details.intensity").getByLabel('value').click();
  await page.locator("details.intensity").getByLabel('value').fill('proximity');
  await page.locator('user-param-control').getByRole('textbox').click();
  await page.locator('user-param-control').getByRole('textbox').fill('prox2c');
  await page.locator('user-param-control').getByRole('textbox').press('Enter');
  await expect(page.getByLabel('radius mm')).toHaveValue('`prox2c` * 20 + 15');

  //check for autocomplete to show correctly
  await page.getByLabel('radius mm').click();
  await expect(page.getByText("`prox2c` * 20 + 15formula")).toBeVisible();
});