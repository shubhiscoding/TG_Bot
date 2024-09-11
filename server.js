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


const Task_Created_Queue_url = process.env.MY_TASK_CREATED_SQS;
const Task_Paid_Queue_url = process.env.MY_TASK_PAID_SQS;
const sqsClient = new SQSClient({
    endpoint: "http://localstack:4566",
    region: "us-west-2",
    credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
    },
});

async function receiveAndProcessSQSMessage(queue_url, type) {
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
            if(type === 'CreateTask'){
                MessageToUser = parseTask(response);
            }else if(type === 'TaskPaid'){
                MessageToUser = parseTaskPaid(response);
            }
            let videoUrl = response.videoUrl;
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

// Create Message for Task Created
function parseTask(response){
    const amount = parseFloat(response.asset.amount);
    const decimals = response.asset.decimals || 0;
    let amnt = amount / (10 ** decimals);
    let roundedAmount = amnt.toFixed(2);

    return `🚨 New Task Alert: ${response['title']}! 🚨\n
📝 Task Overview:\n
${convertHtmlToText(response.content)}\n
✅ Requirements:\n 
${convertHtmlToText(response.requirements)}\n
💰 Reward: ${roundedAmount}${response.asset.symbol} (~$${response.asset.price.toFixed(2)})`;
}

// Create Message for Bounty Created
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

// Create Message for Task Paid (Waiting for Task Paid Payload)
function parseTaskPaid(response){
    const amount = parseFloat(response.submission.asset.amount);
    const decimals = response.submission.asset.decimals || 0;
    let amnt = amount / (10 ** decimals);
    let roundedAmount = amnt.toFixed(2);
    
    return `🎉 ${response.submission.user.username} Just Got Paid! 🎉\n 🎯 Task: ${response.task.title}\n
📝Description: ${response.task.content}\n
💵 Payment Details:\n
Amount: ${roundedAmount}${response.submission.asset.symbol} (~$${response.submission.asset.price.toFixed(2)})\n`
}

function convertHtmlToText(htmlString) {
    const $ = cheerio.load(htmlString);

    $('br').replaceWith('\n');

    $('p').each(function () {
        $(this).append('\n');
    });

    $('ul').each(function () {
        const listItems = $(this).find('li');
        listItems.each(function () {
            const listItemText = $(this).text().trim();
            $(this).text(`• ${listItemText}\n`);
        });
    });

    $('ol').each(function () {
        const listItems = $(this).find('li');
        listItems.each(function (index) {
            const listItemText = $(this).text().trim();
            $(this).text(`${index + 1}. ${listItemText}\n`);
        });
    });

    return $.text().trim();
}

function pollMessages() {
    setInterval(() => {
        receiveAndProcessSQSMessage(Task_Created_Queue_url, 'CreateTask');
        receiveAndProcessSQSMessage(Task_Paid_Queue_url, 'TaskPaid');
    }, 5000);
}
pollMessages();