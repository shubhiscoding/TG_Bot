const axios = require('axios');
const bodyParser = require('body-parser');
const {
    SQSClient,
    SendMessageCommand,
    ReceiveMessageCommand,
    DeleteMessageCommand,
  } = require("@aws-sdk/client-sqs");

const TELEGRAM_TOKEN = 'YOUR_TOKEN';
const TELEGRAM_CHAT_ID = 'Server_ID';

const sendTelegramMessage = async (message) => {
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    try {
        await axios.post(telegramUrl, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
        });
        console.log("Message sent to Telegram successfully!");
    } catch (error) {
        console.error("Error sending message to Telegram:", error);
    }
};

const queue_url = 'http://sqs.us-east-2.localhost.localstack.cloud:4566/000000000000/paid';
const sqsClient = new SQSClient({
    endpoint: "http://localhost:4566",
    region: "us-west-2",
  });

async function sendSQSMessage(message) {
    const sendMessageCommand = new SendMessageCommand({
        QueueUrl: queue_url,
        MessageBody: JSON.stringify({
          "message": message,
        }),
    });

  const messageInfo = await sqsClient.send(sendMessageCommand);
  console.log("Message sent to SQS successfully!", messageInfo);
}

async function receiveSQSMessage() {
    const receiveMessageCommand = new ReceiveMessageCommand({
        QueueUrl: queue_url,
        MaxNumberOfMessages: 1,
    });

    const message = await sqsClient.send(receiveMessageCommand);
    return message.Messages[0];
}

sendSQSMessage('Hello World!').then(() => {
    receiveSQSMessage().then((message) => {
        sendTelegramMessage(message.Body).then(() => {
            const deleteMessageCommand = new DeleteMessageCommand({
                QueueUrl: queue_url,
                ReceiptHandle: message.ReceiptHandle,
            });
            sqsClient.send(deleteMessageCommand);
        });
    });
});