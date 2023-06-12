import { sendReport } from './mailer.js';
import { collectAuctions, scrapAuctions } from './auction.js';
import { getViableCars } from './proquote.js';
import { addPotentialCars, addProcessedAuctions } from './data.js';

export async function init() {
  const auctionIds = await collectAuctions();
  const carsToCompare = await scrapAuctions(auctionIds);
  const [viableCars, processedCars] = await getViableCars(carsToCompare);

  await Promise.all([
    sendReport(viableCars),
    addPotentialCars(viableCars),
    addProcessedAuctions(processedCars),
  ]);

  console.log('::::  processed cars :::::');
  console.log(processedCars.length);

  console.log('::::  viable cars :::::');
  console.log(viableCars.length);
}
