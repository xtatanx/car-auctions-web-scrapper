import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const bucket = storage.bucket('auctions-screenshots');

export async function takeScreenshot(name) {
  await bucket.file(name).save(await page.screenshot());
}
