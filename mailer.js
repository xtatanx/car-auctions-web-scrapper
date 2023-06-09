import nodemailer from 'nodemailer';
import { isDev } from './utils';

function getTransport() {
  if (isDev()) {
    return nodemailer.createTransport({
      host: process.env.NODEMAILER_HOST,
      port: 2525,
      auth: {
        user: process.env.MAIL_TRAP_USER,
        pass: process.env.MAIL_TRAP_PASS,
      },
    });
  }

  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });
}

export async function sendReport(viableCars) {
  const transport = getTransport();

  await transport.sendMail({
    from: process.env.MAIL_FROM,
    to: process.env.MAIL_TO,
    subject: 'Your daily dose of auctions',
    text: viableCars.length
      ? `This is a series of auctions you might be interested:
    
    ${viableCars
      .map(
        (car) => `
      Auction ID: ${car.auctionId}
      Auction date: ${car.auctionDate}
      Vin: ${car.vin}
      Title: ${car.title}
      Make: ${car.make}
      Model: ${car.model}
      Color: ${car.color}
      City: ${car.city}
      Price: $${car.price}
      ProQuote: $${car.proQuote.avg}
      Year: ${car.year}
      Odometer: ${car.odometer.value} miles
      URL: https://app.acvauctions.com/auction/${car.auctionId}
    `
      )
      .join('\n')}
  
    Regards
    `
      : `Hello, we were not able to find any good matches in the current run. Enjoy your day.`,
  });
}
