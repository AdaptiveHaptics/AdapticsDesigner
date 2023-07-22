import { expect, Page, Locator } from '@playwright/test';
import { test_check_no_errors, reset_konva_dblclick } from './util';

async function click_and_drag_on_canvas(
	page: Page, el: Locator,
	sx: number, sy: number, ex: number, ey: number,
	modifiers: string[] = []
) {
	const bbox = await el.boundingBox();
	if (!bbox) throw new Error('No bounding box found');
	const startPos = { x: bbox.x + sx, y: bbox.y + sy };
	const endPos = { x: bbox.x + ex, y: bbox.y + ey };
	await page.mouse.move(startPos.x, startPos.y);
	await page.mouse.down();
	await page.mouse.move(endPos.x, endPos.y);
	for (const modifier of modifiers) {
		await page.keyboard.down(modifier);
	}
	await page.mouse.up();
	await reset_konva_dblclick(page);
	for (const modifier of modifiers) {
		await page.keyboard.up(modifier);
	}
}

test_check_no_errors('test keyframe operations in pattern pane', async ({ page }) => {
	page.setDefaultNavigationTimeout(8000);
  	page.setDefaultTimeout(1500);
	await page.goto('/');

	{ //test pattern pane creation
		await page.locator('canvas').nth(1).dblclick({
			position: {
				x: 103,
				y: 314
			}
		});
		await reset_konva_dblclick(page);

		await page.locator('canvas').nth(1).dblclick({
			position: {
				x: 103,
				y: 82
			}
		});
		await reset_konva_dblclick(page);

		await page.locator('canvas').nth(1).dblclick({
			position: {
				x: 346,
				y: 82
			}
		});
		await reset_konva_dblclick(page);

		await page.locator('canvas').nth(1).dblclick({
			position: {
				x: 346,
				y: 309
			}
		});
		await reset_konva_dblclick(page);

		{
			const keyframes_expected = JSON.parse('[{"time":0,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":0,"y":0,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]},{"time":500,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":-60,"y":-50,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]},{"time":1000,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":-60,"y":70,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]},{"time":1500,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":65,"y":70,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]},{"time":2000,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":65,"y":-45,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]}]');
			const keyframes = JSON.parse(await page.evaluate(() => JSON.stringify(window["primary_design"].filedata.keyframes)));
			expect(keyframes).toEqual(keyframes_expected);
			expect(keyframes.map(kf => kf.time)).toEqual([0, 500, 1000, 1500, 2000]);
		}
	}

	// delete keyframe
	await page.locator('canvas').nth(1).click({
		modifiers: ['Alt'],
		position: {
			x: 343,
			y: 83
		}
	});

	const assert_s2 = async () => {
		const keyframes_expected = JSON.parse('[{"time":0,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":0,"y":0,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]},{"time":500,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":-60,"y":-50,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]},{"time":1000,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":-60,"y":70,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]},{"time":2000,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":65,"y":-45,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]}]');
		const keyframes = JSON.parse(await page.evaluate(() => JSON.stringify(window["primary_design"].filedata.keyframes)));
		expect(keyframes).toEqual(keyframes_expected);
		expect(keyframes.map(kf => kf.time)).toEqual([0, 500, 1000, 2000]);
	};
	await assert_s2();

	// add keyframe from timeline pane between two keyframes
	await page.locator('canvas').nth(3).dblclick({
		position: {
			x: 346,
			y: 42
		}
	});
	await reset_konva_dblclick(page);
	{
		const keyframes_expected = JSON.parse('[{"time":0,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":0,"y":0,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]},{"time":500,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":-60,"y":-50,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]},{"time":750,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":-60,"y":10,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]},{"time":1000,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":-60,"y":70,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]},{"time":2000,"type":"standard","brush":{"brush":{"name":"circle","params":{"radius":{"type":"f64","value":10},"am_freq":{"type":"f64","value":0}}},"transition":{"name":"linear","params":{}}},"intensity":{"intensity":{"name":"constant","params":{"value":{"type":"f64","value":1}}},"transition":{"name":"linear","params":{}}},"coords":{"coords":{"x":65,"y":-45,"z":0},"transition":{"name":"linear","params":{}}},"cjumps":[]}]');
		const keyframes = JSON.parse(await page.evaluate(() => JSON.stringify(window["primary_design"].filedata.keyframes)));
		expect(keyframes).toEqual(keyframes_expected);
		expect(keyframes.map(kf => kf.time)).toEqual([0, 500, 750, 1000, 2000]);
	}


	// delete just created keyframe from pattern pane
	await page.locator('canvas').nth(1).click({
		modifiers: ['Alt'],
		position: {
			x: 104,
			y: 189
		}
	});
	await reset_konva_dblclick(page);
	await assert_s2();

	{ // test click and drag select on pattern pane
		await click_and_drag_on_canvas(page, page.locator('canvas').nth(1), 56, 42, 256, 328);
		expect(await page.evaluate(() => [...window["primary_design"].selected_keyframes].map(kf => kf.time))).toEqual([0, 500, 1000]);

		// test deselect
		await page.locator('canvas').nth(1).click({
			modifiers: ['Control'],
			position: {
				x: 106,
				y: 309
			}
		});
		expect(await page.evaluate(() => [...window["primary_design"].selected_keyframes].map(kf => kf.time))).toEqual([0, 1000]);

		// test modifier+drag select
		{
			await click_and_drag_on_canvas(page, page.locator('canvas').nth(1), 261, 156, 53, 355, ["Control", "Shift"]);
			expect(await page.evaluate(() => [...window["primary_design"].selected_keyframes].map(kf => kf.time))).toEqual([1000]);

			await click_and_drag_on_canvas(page, page.locator('canvas').nth(1), 261, 156, 53, 355, ["Control"]);
			expect(await page.evaluate(() => [...window["primary_design"].selected_keyframes].map(kf => kf.time).sort((a,b)=>a-b))).toEqual([0, 500, 1000]);
		}


		// timeline pane
		await click_and_drag_on_canvas(page, page.locator('canvas').nth(3), 215, 121, 907, 121);
		expect(await page.evaluate(() => [...window["primary_design"].selected_keyframes].map(kf => kf.time))).toEqual([500, 1000, 2000]);
	}

	await page.locator('canvas').nth(3).click({
		modifiers: ['Alt'],
		position: {
			x: 454,
			y: 38
		}
	});
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


 await page.locator('canvas').nth(3).dblclick({
    position: {
      x: 448,
      y: 34
    }
  });
  await reset_konva_dblclick(page);

  await page.getByText('my_location').click();
  await page.getByLabel('x mm', { exact: true }).click();
  await page.getByLabel('x mm', { exact: true }).fill('80');
  await page.getByLabel('y mm', { exact: true }).click();
  await page.getByLabel('y mm', { exact: true }).fill('0');
  await page.getByLabel('y mm', { exact: true }).press('Enter');
  await page.locator('canvas').nth(3).click({
    position: {
      x: 51,
      y: 36
    }
  });
  await page.getByLabel('x mm', { exact: true }).click();
  await page.getByLabel('x mm', { exact: true }).fill('-80');
  await page.getByLabel('x mm', { exact: true }).press('Enter');

  await page.getByRole('button', { name: 'lens_blur Post Processing' }).click();

  await page.locator("form.pattern").getByLabel('Rotation deg').click();
  await page.locator("form.pattern").getByLabel('Rotation deg').fill('rotation');
  await page.locator("form.pattern").getByLabel('Rotation deg').press('Enter');

  await page.locator('input[name="rotation"]').click();
  await page.locator('input[name="rotation"]').fill('90');
  await page.locator('input[name="rotation"]').press('Enter');

  await page.locator('canvas').nth(1).click({
    position: {
      x: 217,
      y: 62
    }
  });

  expect(await page.evaluate(() => [...window["primary_design"].selected_keyframes].map(kf => kf.time))).toEqual([1000]);

});