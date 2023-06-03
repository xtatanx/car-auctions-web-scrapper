import { chromium, devices } from 'playwright';

async function proQuoteCar(car) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext(devices['Desktop Chrome']);
  const page = await context.newPage();

  await page.goto('https://seller.copart.com/login.html');

  const emailInput = await page.$('#username');
  await emailInput.fill(process.env.PROQUOTE_USER);
  const passInput = await page.$('#password');
  await passInput.fill(process.env.PROQUOTE_PASS);
  const SignInBtn = page.getByRole('button', {
    name: /sign into your account/i,
  });
  await SignInBtn.click();

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

  const vehicleTypeSelect = await page.$(
    '[data-uname="prqthomeVehicleTypeDropdown"]'
  );
  await vehicleTypeSelect.selectOption({
    label: 'AUTOMOBILE',
  });
  const vehicleVinInput = await page.$('[data-uname="prqthomeVINTxtBox"]');
  await vehicleVinInput.fill(car.vin);
  const submitProQuoteBtn = await page.locator('[data-uname="prqthomeGoBtn"]');

  await page.evaluate(async () => {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    await delay(200);
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

  const avgValue = parseFloat(
    (
      await page
        .locator('p', {
          hasText: 'Average Value',
        })
        .innerText()
    )
      .split('\n')[1]
      .replace('$', '')
      .replace(',', '')
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
}

export async function getViableCars(cars) {
  const viableCars = [];

  for (const car of cars) {
    const viableCar = await proQuoteCar(car);

    if (viableCar) {
      viableCars.push(viableCar);
    }
  }

  return viableCars;
}
