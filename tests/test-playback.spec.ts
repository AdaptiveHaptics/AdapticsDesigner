import { expect } from '@playwright/test';
import { test_check_no_errors, reset_konva_dblclick } from './util';

test_check_no_errors('test keyframe operations in pattern pane', async ({ page }) => {
	page.setDefaultNavigationTimeout(8000);
  	page.setDefaultTimeout(1500);
	await page.goto('/');

	await page.locator('canvas').nth(3).dblclick({
		position: {
		x: 449,
		y: 43
		}
	});
	await reset_konva_dblclick(page);

	await page.getByRole('combobox').selectOption('stop');
	await expect(page.getByLabel('av_timerTime ms')).toHaveValue('0');
	await page.getByLabel('av_timerTime ms').fill('950');

	await page.getByRole('button', { name: 'play_arrow' }).click();
	await page.getByRole('button', { name: 'play_arrow' }).waitFor();
	await expect(parseFloat(await page.getByLabel('av_timerTime ms').inputValue())).toBeGreaterThanOrEqual(1000);

	await page.getByRole('button', { name: 'play_arrow' }).click();
	await page.getByRole('button', { name: 'pause' }).click();
	await expect(parseFloat(await page.getByLabel('av_timerTime ms').inputValue())).toBeLessThanOrEqual(900);
});