import { Page, test as test_base, expect, Locator } from "@playwright/test";

export async function reset_konva_dblclick(page: Page) {
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

export async function click_and_drag_on_canvas(
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