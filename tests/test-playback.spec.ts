import { expect } from '@playwright/test';
import { stage_click_relative, test_check_no_errors } from './util';

test_check_no_errors('test keyframe operations in pattern pane', async ({ page }) => {
	page.setDefaultNavigationTimeout(8000);
  	page.setDefaultTimeout(2000);
	await page.goto('/');


	await stage_click_relative(page, '#timelinestage', true, 449 / 1088, 43 / 235);

	await page.getByRole('combobox').selectOption('stop');
	await expect(page.getByLabel('av_timerTime sec')).toHaveValue('0');
	await page.getByLabel('av_timerTime sec').fill('0.950');

	await page.getByRole('button', { name: 'play_arrow' }).click();
	await page.getByRole('button', { name: 'play_arrow' }).waitFor();
	await expect(parseFloat(await page.getByLabel('av_timerTime sec').inputValue())).toBeGreaterThanOrEqual(1);

	await page.getByRole('button', { name: 'play_arrow' }).click();
	await page.getByRole('button', { name: 'pause' }).click();
	await expect(parseFloat(await page.getByLabel('av_timerTime sec').inputValue())).toBeLessThanOrEqual(0.9);
});