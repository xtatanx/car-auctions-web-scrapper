import dotenv from 'dotenv';
import { collectAuctions, scrapAuctions } from './auction.js';
import { getViableCars } from './proquote.js';
import functions from '@google-cloud/functions-framework';
import { sendReport } from './mailer.js';

dotenv.config();

functions.http('initScrapping', async (_, res) => {
  try {
    const auctionIds = await collectAuctions();
    const carsToCompare = await scrapAuctions(auctionIds);
    const viableCars = await getViableCars(carsToCompare);
    await sendReport(viableCars);

    console.log('::::  viable cars :::::');
    console.log(viableCars.length);
    console.log(viableCars);

    res.send('done');
  } catch (e) {
    res.status(400).send(e);
    console.log(e);
  }
});
