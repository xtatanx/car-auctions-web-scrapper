import { sendReport } from './mailer.js';
import { collectAuctions, scrapAuctions } from './auction.js';
import { getViableCars } from './proquote.js';

export async function init() {
  const auctionIds = await collectAuctions();
  console.log('::: auctionIds :::');
  console.log(auctionIds);
  const carsToCompare = await scrapAuctions(auctionIds);
  const viableCars = await getViableCars(carsToCompare);
  await sendReport(viableCars);

  console.log('::::  viable cars :::::');
  console.log(viableCars.length);
  console.log(viableCars);
}
