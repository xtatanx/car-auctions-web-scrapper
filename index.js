import 'dotenv/config';
import functions from '@google-cloud/functions-framework';
import { init } from './scrapper.js';

functions.http('initScrapping', async (_, res) => {
  await init();
  res.send('done');
});
