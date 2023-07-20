import { expect, Page } from '@playwright/test';
import { test_check_no_errors, reset_konva_dblclick } from './util';

async function setup_radius_formula(page: Page) {
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

test_check_no_errors('check if formulas show in user param pane', async ({ page }) => {
  page.setDefaultNavigationTimeout(8000);
  page.setDefaultTimeout(1500);

  await page.goto('/');
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
  await page.goto('/');
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

test_check_no_errors('check parameter in formula rename', async ({ page }) => {
  page.setDefaultNavigationTimeout(8000);
  page.setDefaultTimeout(1500);

  await page.goto('/');
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

test_check_no_errors('delete param with multiple keyframes', async ({ page }) => {
  page.setDefaultNavigationTimeout(8000);
  // page.setDefaultTimeout(5000);

  await page.goto('/');
  await page.locator('canvas').nth(3).dblclick({
    position: {
      x: 249,
      y: 42
    }
  });
  await reset_konva_dblclick(page);
  await page.locator('canvas').nth(3).dblclick({
    position: {
      x: 449,
      y: 43
    }
  });
  await reset_konva_dblclick(page);
  await page.locator('canvas').nth(3).dblclick({
    position: {
      x: 646,
      y: 42
    }
  });
  await reset_konva_dblclick(page);
  await page.locator('.timeline').press('Control+a');
  await page.getByText('brushBrush').click();
  await page.getByLabel('radius mm10constant10create new parameter').click();
  await page.getByLabel('radius mm10constant10create new parameter').fill('radius');
  await page.getByLabel('radius mm').press('Enter');
  await page.locator('user-param-control').getByRole('textbox').click();
  await page.locator('user-param-control').getByRole('textbox').fill('radiusnew');
  await page.locator('user-param-control').getByRole('textbox').press('Enter');
  await page.getByRole('button', { name: 'settings' }).click();
  await page.waitForTimeout(1000);
  // await page.getByRole('button', { name: 'delete_forever' }).click();
  // await page.getByRole('button', { name: 'delete_forever' }).click();
  const dialog_p = new Promise(res => page.once('dialog', dialog => {
    console.log(dialog.message());
    expect(dialog.message()).toBe("Delete parameter 'radiusnew'?");
    res(dialog.accept());
  }));
  await page.getByRole('button', { name: 'delete_forever' }).click();
  await dialog_p;
  // check error_messages == [] in test_check_no_errors
});