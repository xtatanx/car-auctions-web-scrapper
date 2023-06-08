import dotenv from 'dotenv';
import functions from '@google-cloud/functions-framework';
import { init } from './scrapper.js';

dotenv.config();

functions.http('initScrapping', async (_, res) => {
  try {
    await init();
    res.send('done');
  } catch (e) {
    console.log('::: main catch :::');
    console.log(e);
    res.status(400).send(e);
  }
});
