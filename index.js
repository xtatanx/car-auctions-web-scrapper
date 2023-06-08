import dotenv from 'dotenv';
import functions from '@google-cloud/functions-framework';
import { init } from './scrapper.js';

dotenv.config();

functions.http('initScrapping', async (_, res) => {
  await init();
  res.send('done');
});
