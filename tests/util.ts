import { Page, test as test_base, expect } from "@playwright/test";

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