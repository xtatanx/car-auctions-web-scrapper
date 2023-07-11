import { closeBrowser, launchBrowser } from './browserController.js';
import { getProcessedAuction } from './data.js';

async function login(page) {
  await page.goto('https://app.acvauctions.com/login');

  await page
    .getByRole('textbox', { name: /email address/i })
    .fill(process.env.ACV_AUCTIONS_USER);
  await page
    .getByRole('textbox', { name: /password/i })
    .fill(process.env.ACV_AUCTIONS_PASS);
  await page.getByRole('button', { name: /log in/i }).click();
}

export async function collectAuctions() {
  const { page, browser, context } = await launchBrowser();

  await login(page);

  const endedAuctionsBtn = page.locator('#parent-radio-ended_auctions');
  await endedAuctionsBtn.waitFor({ state: 'attached' });
  await endedAuctionsBtn.evaluate((node) => node.click());

  const makeOfferBtn = page.locator('label').filter({ hasText: 'Make Offer' });
  await makeOfferBtn.waitFor({ state: 'visible' });
  await makeOfferBtn.evaluate((node) => node.click());

  const filterToggle = page.locator('#saved-search-261859');
  await filterToggle.waitFor({ state: 'attached' });

  await filterToggle.evaluate((node) => node.click());

  const auctionIds = new Set();
  const LIMIT = 30;
  const now = Date.now();
  let shouldCollect = true;

  while (shouldCollect) {
    try {
      for (let car of await page.locator('.acv-infinite-scroller-item').all()) {
        const link = await car.locator('a:not(.mail-to)');
        const href = await link.getAttribute('href');
        auctionIds.add(href.match(/\d+/)[0]);
      }

      console.log('::: auctionIds.length :::');
      console.log(auctionIds.size);

      await page.evaluate(async () => {
        window.scrollTo(0, window.scrollY + 1000);

        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        await delay(500);
      });
    } catch (e) {
      await closeBrowser(browser, context);
      throw new Error(e);
    }

    console.log('::: timer :::');
    console.log(Math.floor((Date.now() - now) / 1000));
    if (Math.floor((Date.now() - now) / 1000) > LIMIT) {
      shouldCollect = false;
    }
  }

  await closeBrowser(browser, context);

  return [...auctionIds];
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

  let carModel = {
    status: 1,
  };

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
  const { page, browser, context } = await launchBrowser();

  await login(page);

  await page.waitForURL('https://app.acvauctions.com/search?l=live');

  const cars = [];

  for (const auctionId of auctionIds) {
    try {
      const isAlreadyProcessed = await getProcessedAuction(auctionId);
      if (!isAlreadyProcessed) {
        const car = await getCarModel(auctionId, page);

        if (car) {
          cars.push(car);
        }
      }
    } catch (e) {
      console.log('::: scrapAuctions catch :::');
      console.log(e);
    }
  }

  await closeBrowser(browser, context);

  console.log('::::  srcapped cars :::::');
  console.log(cars.length);

  return cars;
}
