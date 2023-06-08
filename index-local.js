import dotenv from 'dotenv';
import { init } from './scrapper.js';
import { proQuoteCar } from './proquote.js';

dotenv.config();

(async () => {
  // while (true) {
  //   await proQuoteCar({
  //     title: '2010 GMC Acadia SLE',
  //     condition: [],
  //     price: 1250,
  //     city: 'Peoria, IL',
  //     vin: '1GKLVLED9AJ101761',
  //     odometer: { type: 'miles', value: 146743 },
  //     year: 2010,
  //     make: 'GMC',
  //     model: 'Acadia',
  //     color: 'Silver',
  //     auctionId: 7304031,
  //     auctionDate: '6/2/2023',
  //     proQuote: { avg: 1296.71 },
  //   });
  // }
  await init();
})();
