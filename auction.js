import playwright, { devices } from 'playwright';
import chromium from 'chrome-aws-lambda';

export async function collectAuctions() {
  const browser =
    process.env.NODE_ENV === 'development'
      ? await playwright.chromium.launch({
          headless: false,
        })
      : await playwright.chromium.launch({
          args: chromium.args,
          executablePath: await chromium.executablePath,
          headless: chromium.headless,
        });

  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  await page.goto('https://app.acvauctions.com/login');

  await page
    .getByRole('textbox', { name: /email address/i })
    .fill(process.env.ACV_AUCTIONS_USER);
  await page
    .getByRole('textbox', { name: /password/i })
    .fill(process.env.ACV_AUCTIONS_PASS);
  await page.getByRole('button', { name: /log in/i }).click();

  // await page.waitForURL('**/search');

  const endedAuctionsBtn = page.locator('#parent-radio-ended_auctions');
  await endedAuctionsBtn.waitFor({ state: 'attached' });
  endedAuctionsBtn.evaluate((node) => node.click());

  const makeOfferBtn = page.locator('label').filter({ hasText: 'Make Offer' });
  await makeOfferBtn.waitFor({ state: 'visible' });
  makeOfferBtn.evaluate((node) => node.click());

  const filterToggle = page.locator('#saved-search-261859');
  await filterToggle.waitFor({ state: 'attached' });
  filterToggle.evaluate((node) => node.click());

  const auctionIds = [];
  let shouldCollect = true;

  while (shouldCollect) {
    const responsePromise = page.waitForResponse(
      'https://easy-pass.acvauctions.com/bff/filters/auctions/buying/ended'
    );
    const response = await responsePromise;

    if (response.status() === 200) {
      const {
        data: { results },
      } = await response.json();

      if (results.length !== 0) {
        auctionIds.push(...results.map((result) => result.id));
        await page.evaluate(async () => {
          window.scrollTo(0, document.body.scrollHeight);
        });
      } else {
        shouldCollect = false;
      }
    } else {
      shouldCollect = false;
    }
  }

  await context.close();
  await browser.close();

  return auctionIds;
}

const getCarModel = async (auctionId, page) => {
  await page.goto(`https://app.acvauctions.com/auction/${auctionId}`);

  const propertiesToSave = [
    'city',
    'vin',
    'odometer',
    'auction id',
    'auction date',
    'make',
    'model',
    'year',
    'color',
  ];

  let carModel = {};

  const title = page.locator('.vehicle-header-summary__name');
  await title.waitFor({
    state: 'visible',
  });

  carModel.title = await title.innerText();

  carModel.condition = [];

  const condition = await page.locator('.condition-report');
  const isInoperable = await condition.getByText(
    /vehicle inop \(does not move\)/i
  );

  if ((await isInoperable.count()) === 1) {
    carModel.condition.push('isInoperable');
  }

  const doesNotStart = await condition.getByText(
    /engine cranks\, does not start/i
  );

  if ((await doesNotStart.count()) === 1) {
    carModel.condition.push('doesNotStart');
  }

  const price = await page.locator('.price').first();
  carModel.price = parseInt(
    (await price.innerText()).replace('$', '').replace(',', '')
  );

  const details = await page.locator('.auction-vehicle-details');

  const tableRows = await details.locator('tr').all();

  for (const row of tableRows) {
    const label = (await row.locator('.left').innerText()).toLowerCase();
    const value = await row.locator('.right').innerText();

    if (propertiesToSave.includes(label)) {
      if (label === 'odometer') {
        carModel[label] = {
          type: 'miles',
          value:
            value === 'True Mileage Unknown'
              ? -1
              : parseInt(value.replace(',', '')),
        };
      } else if (label === 'year') {
        carModel[label] = parseInt(value);
      } else if (label === 'auction date') {
        carModel.auctionDate = value;
      } else if (label === 'auction id') {
        carModel.auctionId = parseInt(value);
      } else {
        carModel[label] = value;
      }
    }
  }

  return carModel;
};

export async function scrapAuctions(auctionIds) {
  const browser =
    process.env.NODE_ENV === 'development'
      ? await playwright.chromium.launch({
          headless: false,
        })
      : await playwright.chromium.launch({
          args: chromium.args,
          executablePath: await chromium.executablePath,
          headless: chromium.headless,
        });
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  await page.goto('https://app.acvauctions.com/login');

  await page
    .getByRole('textbox', { name: /email address/i })
    .fill(process.env.ACV_AUCTIONS_USER);
  await page
    .getByRole('textbox', { name: /password/i })
    .fill(process.env.ACV_AUCTIONS_PASS);
  await page.getByRole('button', { name: /log in/i }).click();

  const endedAuctionsBtn = page.locator('#parent-radio-ended_auctions');
  await endedAuctionsBtn.waitFor({ state: 'attached' });

  const cars = [];

  for (const auctionId of auctionIds) {
    // TODO - remove to handle all records
    // if (cars.length === 35) break;

    const car = await getCarModel(auctionId, page);
    cars.push(car);
  }

  const result = cars.filter((car) => {
    return (
      !car.condition.some((report) => {
        return ['isInoperable', 'doesNotStart'].includes(report);
      }) && car.odometer.value !== -1
    );
  });

  await context.close();
  await browser.close();

  console.log('::::  srcapped cars :::::');
  console.log(cars.length);
  console.log('::::  cars to proQuote :::::');
  console.log(result.length);

  return result;
}
