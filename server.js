const axios = require('axios');
const cheerio = require('cheerio'); // Import cheerio for HTML parsing
const {
    SQSClient,
    ReceiveMessageCommand,
    DeleteMessageCommand,
} = require("@aws-sdk/client-sqs");

const dotenv = require('dotenv');
dotenv.config();

const TELEGRAM_TOKEN = process.env.MY_TOKEN;
const TELEGRAM_CHAT_ID = process.env.MY_CHAT_ID;

const sendTelegramMessage = async (text, videoUrl) => {
    const apiUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendVideo`;

    try {
        await axios.post(apiUrl, {
            chat_id: TELEGRAM_CHAT_ID,
            video: videoUrl,
            caption: text,
        });
        console.log("Photo with text sent to Telegram successfully!");

    } catch (error) {
        console.error("Error sending message to Telegram:", error);
    }
};


const queue_url = process.env.MY_SQS;
const sqsClient = new SQSClient({
    endpoint: "http://localhost:4566", // LocalStack endpoint
    region: "us-west-2",
});

async function receiveAndProcessSQSMessage() {
    try {
        const receiveMessageCommand = new ReceiveMessageCommand({
            QueueUrl: queue_url,
            MaxNumberOfMessages: 1,
        });

        const data = await sqsClient.send(receiveMessageCommand);

        if (data.Messages && data.Messages.length > 0) {
            const message = data.Messages[0];
            console.log("Received message:", message.Body);

            const response = JSON.parse(message.Body);

            let MessageToUser;
            if(response.type === 'Task'){
                MessageToUser = parseTask(response);
            }else if(response.type === 'Bounty'){
                MessageToUser = parseBounty(response);
            }

            await sendTelegramMessage(MessageToUser, response.videoUrl);

            const deleteMessageCommand = new DeleteMessageCommand({
                QueueUrl: queue_url,
                ReceiptHandle: message.ReceiptHandle,
            });
            await sqsClient.send(deleteMessageCommand);
            console.log("Message deleted from SQS.");
        }
    } catch (error) {
        console.error("Error receiving or processing message from SQS:", error);
    }
}

function parseTask(response){
    const amount = parseFloat(response.asset.amount);
    const decimals = response.asset.decimals || 0;
    let amnt = amount / (10 ** decimals);
    let roundedAmount = amnt.toFixed(2);

    return `🚨 New Task Alert: ${response['title']}! 🚨\n
📝 Overview: ${convertHtmlToText(response.content)}\n
requirements: 
${convertHtmlToText(response.requirements)}\n
💰 Reward: ${roundedAmount}${response.asset.symbol} (~${response.asset.price.toFixed(2)})`;
}

function parseBounty(response){
    const amount = parseFloat(response.asset.amount);
    const decimals = response.asset.decimals || 0;
    let amnt = amount / (10 ** decimals);
    let roundedAmount = amnt.toFixed(2);
    let str = `🚨 New Bounty Alert: ${response['title']}! 🚨\n
📝 Overview: ${convertHtmlToText(response.overview)}\n
requirements: 
${convertHtmlToText(response.requirements)}\n
📅 Deadline: ${new Date(response.endsAt)}\n
💰 Reward: ${roundedAmount}${response.asset.symbol} (~${response.asset.price.toFixed(2)})`;
    return str;
}

function convertHtmlToText(htmlString) {
    const $ = cheerio.load(htmlString);
    return $.text();
}

function pollMessages() {
    setInterval(() => {
        receiveAndProcessSQSMessage();
    }, 5000);
}

pollMessages();
