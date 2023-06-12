import playwright from 'playwright';
import { closeBrowser, launchBrowser } from './browserController.js';
import pLimit from 'p-limit';

export async function login(page) {
  await page.goto('https://seller.copart.com/login.html');

  await page.locator('#username').fill(process.env.PROQUOTE_USER);
  await page.locator('#password').fill(process.env.PROQUOTE_PASS);

  await page
    .getByRole('button', {
      name: /sign into your account/i,
    })
    .click();
}

export async function proQuoteCar(car) {
  const { page, browser, context } = await launchBrowser();

  let avgValue;

  try {
    await login(page);

    const proQuoteServicesBtn = page.locator(
      'a[data-uname="proquoteservicesHeader"]'
    );

    await proQuoteServicesBtn.waitFor({ state: 'visible' });

    await proQuoteServicesBtn.hover();

    const proQuoteBtn = page.locator('.menu_click[href="/proquote.html"]');
    proQuoteBtn.waitFor({
      state: 'visible',
    });

    await proQuoteBtn.click();

    await page
      .locator('[data-uname="prqthomeVehicleTypeDropdown"]')
      .selectOption({
        label: 'AUTOMOBILE',
      });

    await page.locator('[data-uname="prqthomeVINTxtBox"]').fill(car.vin);

    await page.evaluate(async () => {
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      await delay(1000);
    });

    await page.locator('[data-uname="prqthomeGoBtn"]').click();

    await page
      .locator('input[data-uname="prqtFieldVehLocationTxtBox"]')
      .fill('08825');

    await page
      .locator('select[data-uname="prqtFieldDrivPrimaryDmgDropdown"]')
      .selectOption({ label: 'NORMAL WEAR' });

    await page
      .locator('input[data-uname="prqtFieldOdometerReadingTxtBox"]')
      .fill(`${car.odometer.value}`);

    await page
      .locator('input[data-uname="prqtFieldIncompleteRprEstChkBox"]')
      .click();

    await page
      .locator('select[data-uname="prqtFieldDocTypDropdown"]')
      .selectOption({ label: 'CLEAN TITLE' });

    await page
      .locator('select[data-uname="prqtFieldKeysDropdown"]')
      .selectOption({ label: 'YES' });

    await page
      .locator('select[data-uname="prqtFieldSecondaryDamageDropdown"]')
      .selectOption({ label: 'MINOR DENT/SCRATCHES' });

    await page
      .locator('select[data-uname="prqtFieldOdometerBrandsDropdown"]')
      .selectOption({ label: 'ACTUAL' });

    await page
      .locator('select[data-uname="prqtFieldDrivRatingDropdown"]')
      .selectOption({ label: 'DRIVES' });

    await page.evaluate(async () => {
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      await delay(500);
    });

    await page.click('button[data-uname="prqtFieldGeneratePrqtBtn"]');

    await page
      .getByRole('button', {
        name: /see similar vehicles in historical sales/i,
      })
      .click();

    await page.getByRole('link', { name: /sale date range/i }).click();
    await page.getByText(/6 months/i).click();

    await page.getByRole('link', { name: /odometer range/i }).click();
    await page
      .getByPlaceholder('From Range')
      .fill(`${car.odometer.value - 20000}`);
    await page
      .getByPlaceholder('To Range')
      .fill(`${car.odometer.value + 20000}`);
    const responsePromise = page.waitForResponse(
      'https://seller.copart.com/api/v1/proquote/historyresult/USA'
    );

    await page.getByRole('button', { name: 'Search' }).click();

    await responsePromise;

    const avgValueTxt = await page
      .locator('p', {
        hasText: 'Average Value',
      })
      .innerText();

    console.log(avgValueTxt);

    if (!avgValueTxt.split('\n')[1]) {
      return null;
    }

    avgValue = parseFloat(
      avgValueTxt.split('\n')[1].replace('$', '').replace(',', '')
    );
  } catch (error) {
    if (error instanceof playwright.errors.TimeoutError) {
      console.log('::: Timeout error :::');
    } else {
      console.log('::: Error getting proquote :::');
    }
    console.log(error);

    await closeBrowser(browser, context);

    return null;
  }

  await closeBrowser(browser, context);

  return {
    ...car,
    proQuote: {
      avg: avgValue,
    },
  };
}

function hasOptimalConditions(car) {
  return (
    !car.condition.some((report) => {
      return ['isInoperable', 'doesNotStart'].includes(report);
    }) && car.odometer.value !== -1
  );
}

export async function getViableCars(cars) {
  const viableCars = [];
  const processedCars = [];
  const carsToProquote = [];

  for (const car of cars) {
    if (hasOptimalConditions(car)) {
      carsToProquote.push(car);
    } else {
      processedCars.push(car);
    }
  }

  const limit = pLimit(5);

  const input = carsToProquote.map((car) => {
    return limit(() => proQuoteCar(car));
  });

  const carsWithProquote = await Promise.all(input);

  for (const carWithProquote of carsWithProquote) {
    if (carWithProquote) {
      processedCars.push(carWithProquote);

      if (carWithProquote.price <= carWithProquote.proQuote.avg) {
        viableCars.push(carWithProquote);
      }
    }
  }

  return [viableCars, processedCars];
}
