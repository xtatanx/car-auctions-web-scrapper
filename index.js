import dotenv from 'dotenv';
import { collectAuctions, scrapAuctions } from './auction.js';
import { getViableCars } from './proquote.js';

dotenv.config();

(async () => {
  try {
    const auctionIds = await collectAuctions();
    const carsToCompare = await scrapAuctions(auctionIds);
    const viableCars = await getViableCars(carsToCompare);

    console.log('::::  viable cars :::::');
    console.log(viableCars.length);
    console.log(viableCars);
  } catch (e) {
    console.log(e);
  }
})();
