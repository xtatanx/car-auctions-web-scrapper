import { Firestore } from '@google-cloud/firestore';
import { isDev } from './utils';
const config = {
  projectId: process.env.FIRESTORE_PROJECT_ID,
};

if (isDev()) {
  config.credentials = {
    client_email: process.env.FIRESTORE_CLIENT_EMAIL,
    private_key: process.env.FIRESTORE_PRIVATE_KEY,
  };
}

const db = new Firestore(config);

export async function addProcessedAuctions(cars) {
  console.log('::: adding processed auctions :::');
  const batch = db.batch();

  for (let car of cars) {
    const carRef = db.collection('processedAuctions').doc(`${car.auctionId}`);
    batch.set(carRef, { auctionId: car.auctionId });
  }

  return batch.commit();
}

export async function addPotentialCars(cars) {
  console.log('::: adding processed potential cars :::');
  const batch = db.batch();

  for (let car of cars) {
    const carRef = db.collection('potentialCars').doc(`${car.auctionId}`);
    batch.set(carRef, car);
  }

  return batch.commit();
}

export async function getProcessedAuction(auctionId) {
  console.log(`::: get processed auction ${auctionId} :::`);
  const processedAuctionRef = db
    .collection('processedAuctions')
    .doc(`${auctionId}`);
  const doc = await processedAuctionRef.get();

  if (doc.exists) {
    return doc.data();
  } else {
    return null;
  }
}

export async function getAllProcessedAuctions() {
  console.log('::: get all processed auctions :::');
  const processedAuctionsRef = db.collection('processedAuctions');
  const snapshot = await processedAuctionsRef.get();

  return snapshot.docs.map((doc) => doc.data());
}

export async function getAllPotentialCars() {
  console.log('::: get all potential cars :::');
  const potentialCarsRef = db.collection('potentialCars');
  const snapshot = await potentialCarsRef.get();

  return snapshot.docs.map((doc) => doc.data());
}
