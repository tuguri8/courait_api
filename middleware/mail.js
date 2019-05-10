require('dotenv').config();
const AWS = require('aws-sdk');

AWS.config.loadFromPath('./awscreds.json');
AWS.config.update({ region: 'us-west-2' });

const sendMail = async (addr, title, text) => {
  return new Promise(((resolve, reject) => {
    const params = {
      Destination: { /* required */
        CcAddresses: [
          'tuguri8@gmail.com',
        /* more items */
        ],
        ToAddresses: [
          addr,
        /* more items */
        ],
      },
      Message: { /* required */
        Body: { /* required */
          Text: {
            Charset: 'UTF-8',
            Data: text,
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: title,
        },
      },
      Source: '쿠레이트 <tuguri8@gmail.com>', /* required */
      ReplyToAddresses: [
        'tuguri8@gmail.com',
        /* more items */
      ],
    };

    const sendPromise = new AWS.SES({ apiVersion: '2010-12-01' }).sendEmail(params).promise();

    sendPromise.then(
      (data) => {
        console.log(data.MessageId);
        resolve(data.MessageId);
      },
    ).catch(
      (err) => {
        console.log(err);
        reject(err);
      },
    );
  }));
};

module.exports = sendMail;
