import { Locator, Page, expect } from '@playwright/test';
import { test_check_no_errors, stage_click_relative, click_and_drag_on_canvas_relative } from './util';

test_check_no_errors('test keyframe operations in pattern pane', async ({ page }) => {
	page.setDefaultNavigationTimeout(8000);
  	page.setDefaultTimeout(1500);
	await page.goto('/');

	{ //test pattern pane creation
		await stage_click_relative(page, '#patternstage', true, 95 / 396, 285 / 396);

		await stage_click_relative(page, '#patternstage', true, 95 / 396, 73 / 396);

		await stage_click_relative(page, '#patternstage', true, 310 / 396, 73 / 396);

		await stage_click_relative(page, '#patternstage', true, 310 / 396, 280 / 396);

		{
			const keyframes_expected = JSON.parse('[{"time":0,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":0,"y":0,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]},{"time":500,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":-60,"y":-50,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]},{"time":1000,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":-60,"y":70,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]},{"time":1500,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":65,"y":70,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]},{"time":2000,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":65,"y":-45,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]}]');
			const keyframes = JSON.parse(await page.evaluate(() => JSON.stringify(window["primary_design"].filedata.keyframes)));
			expect(keyframes).toEqual(keyframes_expected);
			expect(keyframes.map(kf => kf.time)).toEqual([0, 500, 1000, 1500, 2000]);
		}
	}

	// delete keyframe
	await stage_click_relative(page, '#patternstage', false, 310 / 396, 73 / 396, { modifiers: ['Alt'] });

	const assert_s2 = async () => {
		const keyframes_expected = JSON.parse('[{"time":0,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":0,"y":0,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]},{"time":500,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":-60,"y":-50,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]},{"time":1000,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":-60,"y":70,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]},{"time":2000,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":65,"y":-45,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]}]');
		const keyframes = JSON.parse(await page.evaluate(() => JSON.stringify(window["primary_design"].filedata.keyframes)));
		expect(keyframes.map(kf => kf.time)).toEqual([0, 500, 1000, 2000]);
		expect(keyframes).toEqual(keyframes_expected);
	};
	await assert_s2();

	// add keyframe from timeline pane between two keyframes
	await stage_click_relative(page, '#timelinestage', true, 346 / 1088, 42 / 235);
	{
		const keyframes_expected = JSON.parse('[{"time":0,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":0,"y":0,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]},{"time":500,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":-60,"y":-50,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]},{"time":750,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":-60,"y":10,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]},{"time":1000,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":-60,"y":70,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]},{"time":2000,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":65,"y":-45,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]}]');
		const keyframes = JSON.parse(await page.evaluate(() => JSON.stringify(window["primary_design"].filedata.keyframes)));
		expect(keyframes).toEqual(keyframes_expected);
		expect(keyframes.map(kf => kf.time)).toEqual([0, 500, 750, 1000, 2000]);
	}


	// delete just created keyframe from pattern pane
	await stage_click_relative(page, '#patternstage', false, 98 / 396, 180 / 396, { modifiers: ['Alt'] });
	await assert_s2();

	{ // test click and drag select on pattern pane
		await click_and_drag_on_canvas_relative(page, page.locator('#patternstage'), 56 / 436, 42 / 436, 256 / 436, 328 / 436);
		expect(await page.evaluate(() => [...window["primary_design"].selected_keyframes].map(kf => kf.time))).toEqual([0, 500, 1000]);

		// test deselect
		await stage_click_relative(page, '#patternstage', false, 106 / 436, 309 / 436, { modifiers: ['Control'] });
		expect(await page.evaluate(() => [...window["primary_design"].selected_keyframes].map(kf => kf.time))).toEqual([0, 1000]);

		// test modifier+drag select
		{
			await click_and_drag_on_canvas_relative(page, page.locator('#patternstage'), 261 / 436, 156 / 436, 53 / 436, 355 / 436, ["Control", "Shift"]);
			expect(await page.evaluate(() => [...window["primary_design"].selected_keyframes].map(kf => kf.time))).toEqual([1000]);

			await click_and_drag_on_canvas_relative(page, page.locator('#patternstage'), 261 / 436, 156 / 436, 53 / 436, 355 / 436, ["Control"]);
			expect(await page.evaluate(() => [...window["primary_design"].selected_keyframes].map(kf => kf.time).sort((a,b)=>a-b))).toEqual([0, 500, 1000]);
		}


		// timeline pane
		await click_and_drag_on_canvas_relative(page, page.locator('#timelinestage'), 215 / 1088, 121 / 235, 907 / 1088, 121 / 235);
		expect(await page.evaluate(() => [...window["primary_design"].selected_keyframes].map(kf => kf.time))).toEqual([500, 1000, 2000]);
	}

	await stage_click_relative(page, '#timelinestage', false, 454 / 1088, 38 / 235, { modifiers: ['Alt'] });
	{
		const keyframes_expected = JSON.parse('[{"time":0,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":0,"y":0,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]}]');
		const keyframes = JSON.parse(await page.evaluate(() => JSON.stringify(window["primary_design"].filedata.keyframes)));
		expect(keyframes).toEqual(keyframes_expected);
	}
});

test_check_no_errors('test parameters update pattern pane geo transform', async ({ page }) => {
	page.setDefaultNavigationTimeout(8000);
  	page.setDefaultTimeout(1500);
	await page.goto('/');


  await stage_click_relative(page, '#timelinestage', true, 448 / 1088, 34 / 235);

  await page.getByText('my_location').click();
  await page.getByLabel('x mm', { exact: true }).click();
  await page.getByLabel('x mm', { exact: true }).fill('80');
  await page.getByLabel('y mm', { exact: true }).click();
  await page.getByLabel('y mm', { exact: true }).fill('0');
  await page.getByLabel('y mm', { exact: true }).press('Enter');
  await stage_click_relative(page, '#timelinestage', false, 51 / 1088, 36 / 235);
  await page.getByLabel('x mm', { exact: true }).click();
  await page.getByLabel('x mm', { exact: true }).fill('-80');
  await page.getByLabel('x mm', { exact: true }).press('Enter');

  await page.getByRole('button', { name: 'lens_blur Post Processing' }).click();

  await page.locator("form.postprocessing").getByLabel('Rotation deg').click();
  await page.locator("form.postprocessing").getByLabel('Rotation deg').fill('rotation');
  await page.locator("form.postprocessing").getByLabel('Rotation deg').press('Enter');

  await page.locator('input[name="rotation"]').click();
  await page.locator('input[name="rotation"]').fill('90');
  await page.locator('input[name="rotation"]').press('Enter');

  await stage_click_relative(page, '#patternstage', false, 217 / 436, 62 / 436);

  expect(await page.evaluate(() => [...window["primary_design"].selected_keyframes].map(kf => kf.time))).toEqual([1000]);

});