import { Page, test as test_base, expect, Locator } from "@playwright/test";

async function reset_konva_dblclick(page: Page) {
	//await page.waitForTimeout(500); // wait for konva timer to expire
	await page.evaluate(() => { window["Konva"]._mouseInDblClickWindow = window["Konva"]._pointerInDblClickWindow = window["Konva"]._touchInDblClickWindow = false; });
}

export const test_check_no_errors = test_base.extend({
	page: async ({ page }, use) => {
		const error_messages: string[] = [];
		page.on('console', msg => {
			if (msg.type() === 'error') error_messages.push(`[${msg.type()}] ${msg.text()}`)
		});
		await use(page);
		expect(error_messages).toEqual([]);
	}
});

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

export async function stage_click_relative(page: Page, selector: string, dbl: boolean, x_perc: number, y_perc: number, options: Parameters<Page['click']>[1] = {}) {
	const loc = page.locator(selector);
	const bb = await loc.boundingBox();
	if (!bb) throw new Error("bounding box not found");

	const click_opts = {
		position: {
			x: bb.width * x_perc,
			y: bb.height * y_perc
		},
		...options
	};
	if (dbl) {
		await loc.dblclick(click_opts);
	} else {
		await loc.click(click_opts);
	}
	await reset_konva_dblclick(page);
}

export async function click_and_drag_on_canvas_relative(
	page: Page, el: Locator,
	sx_perc: number, sy_perc: number, ex_perc: number, ey_perc: number,
	modifiers: string[] = []
) {
	const bbox = await el.boundingBox();
	if (!bbox) throw new Error('No bounding box found');

	const sx = bbox.width * sx_perc;
	const sy = bbox.height * sy_perc;
	const ex = bbox.width * ex_perc;
	const ey = bbox.height * ey_perc;
	return await click_and_drag_on_canvas(page, el, sx, sy, ex, ey, modifiers);
}