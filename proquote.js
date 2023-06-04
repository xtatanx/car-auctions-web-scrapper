import playwright, { devices } from 'playwright';
import chromium from 'chrome-aws-lambda';

async function proQuoteCar(car) {
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

  await page.goto('https://seller.copart.com/login.html');

  await page.locator('#username').fill(process.env.PROQUOTE_USER);
  await page.locator('#password').fill(process.env.PROQUOTE_PASS);
  page
    .getByRole('button', {
      name: /sign into your account/i,
    })
    .click();

  await page.waitForURL('**/home.html');

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

  await page.waitForURL('**/proquote.html');

  const vehicleTypeSelect = await page.locator(
    '[data-uname="prqthomeVehicleTypeDropdown"]'
  );
  await vehicleTypeSelect.selectOption({
    label: 'AUTOMOBILE',
  });
  const vehicleVinInput = await page.locator(
    '[data-uname="prqthomeVINTxtBox"]'
  );
  await vehicleVinInput.fill(car.vin);
  const submitProQuoteBtn = await page.locator('[data-uname="prqthomeGoBtn"]');

  await page.evaluate(async () => {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    await delay(500);
  });

  await submitProQuoteBtn.click();

  await page.waitForURL('**/proquote.html/proquotefieldentry');

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

  await page.locator('button[data-uname="prqtFieldGeneratePrqtBtn"]').click();

  await page.waitForURL('**/proquote.html/proquoteresults');

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
  await page.getByPlaceholder('To Range').fill(`${car.odometer.value + 20000}`);
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

  const avgValue = parseFloat(
    avgValueTxt.split('\n')[1].replace('$', '').replace(',', '')
  );

  await context.close();
  await browser.close();

  if (car.price <= avgValue) {
    return {
      ...car,
      proQuote: {
        avg: avgValue,
      },
    };
  }

  return null;
}

export async function getViableCars(cars) {
  const viableCars = [];

  for (const car of cars) {
    console.log(`::: Initiated proquote :::`);
    console.log(cars.indexOf(car));
    console.log(car);
    const viableCar = await proQuoteCar(car);

    if (viableCar) {
      viableCars.push(viableCar);
    }
  }

  return viableCars;
}
