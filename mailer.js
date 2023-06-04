import nodemailer from 'nodemailer';

export async function sendReport(viableCars) {
  const transport = nodemailer.createTransport({
    host: process.env.NODEMAILER_HOST,
    port: 2525,
    auth: {
      user: process.env.MAIL_TRAP_USER,
      pass: process.env.MAIL_TRAP_PASS,
    },
  });

  await transport.sendMail({
    from: 'Jhonnatan <jhonnatanhxc@gmail.com>',
    to: 'jhonnatanhxc@gmail.com',
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
