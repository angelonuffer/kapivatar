import { test as base } from '@playwright/test';

export const test = base.extend({
  externalRequests: [async ({ page }, use) => {
    await page.route(/^https?:\/\//, async (route) => {
      const url = new URL(route.request().url());
      if (
        url.origin === 'http://127.0.0.1:3000'
        || ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)
      ) {
        await route.continue();
      } else {
        const contentType = route.request().resourceType() === 'stylesheet'
          ? 'text/css'
          : route.request().resourceType() === 'script'
            ? 'application/javascript'
            : 'application/octet-stream';
        await route.fulfill({ status: 200, contentType, body: '' });
      }
    });
    await use();
  }, { auto: true }],
});
