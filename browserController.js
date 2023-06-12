import playwright from 'playwright';
import chromium from 'chrome-aws-lambda';
import { isDev } from './utils.js';

export async function launchBrowser() {
  const browser = isDev()
    ? await playwright.chromium.launch({
        headless: false,
      })
    : await playwright.chromium.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
      });

  const context = await browser.newContext();
  const page = await context.newPage();

  return { browser, context, page };
}

export async function closeBrowser(browser, context) {
  await context.close();
  await browser.close();
}
