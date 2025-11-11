const { Client } = require('whatsapp-web.js');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const fs = require('fs');

// -------- EXPRESS SERVER (Render friendly) --------
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('TeleWA Promzy XMD is running!'));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// -------- WHATSAPP CLIENT --------
const SESSION_FILE_PATH = './session.json';
let sessionData = fs.existsSync(SESSION_FILE_PATH) ? require(SESSION_FILE_PATH) : null;

const waClient = new Client({ session: sessionData });

waClient.on('ready', () => console.log('WhatsApp ready!'));
waClient.on('disconnected', reason => console.log('WhatsApp disconnected:', reason));

waClient.initialize();

// -------- TELEGRAM BOT --------
const TELEGRAM_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN'; // Replace with your token
const TELEGRAM_ADMIN = 'YOUR_TELEGRAM_ID';       // Replace with your Telegram ID
const tgBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// -------- MULTI-USER SUPPORT --------
const users = {}; // store connected users

tgBot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if(!users[chatId]) users[chatId] = {};
    tgBot.sendMessage(chatId, 'Welcome to TeleWA Promzy XMD! Use /help for commands.');
});

tgBot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMsg = `
📌 *TeleWA Commands:*
/send <number> <message> - Send WhatsApp message
/read - Show last 10 WhatsApp messages
/groupinfo <groupID> - Get group info
/status - WhatsApp status
    `;
    tgBot.sendMessage(chatId, helpMsg, { parse_mode: 'Markdown' });
});

// -------- SEND WHATSAPP MESSAGE --------
tgBot.onText(/\/send (\d+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const number = match[1];
    const message = match[2];
    const waNumber = number.includes('@c.us') ? number : `${number}@c.us`;

    try {
        await waClient.sendMessage(waNumber, message);
        tgBot.sendMessage(chatId, `✅ Message sent to WhatsApp: ${number}`);
    } catch (err) {
        console.log(err);
        tgBot.sendMessage(chatId, `❌ Failed to send message to ${number}`);
    }
});

// -------- AUTO READ WHATSAPP MESSAGES --------
let lastMessages = [];
waClient.on('message', message => {
    const text = `📩 From ${message.from}:\n${message.body}`;
    lastMessages.push(text);
    if(lastMessages.length > 10) lastMessages.shift(); // keep last 10
    tgBot.sendMessage(TELEGRAM_ADMIN, text);
});

tgBot.onText(/\/read/, (msg) => {
    const chatId = msg.chat.id;
    if(lastMessages.length === 0) return tgBot.sendMessage(chatId, 'No messages yet.');
    tgBot.sendMessage(chatId, lastMessages.join('\n\n'));
});

// -------- GROUP INFO --------
tgBot.onText(/\/groupinfo (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const groupId = match[1].includes('@g.us') ? match[1] : `${match[1]}@g.us`;

    try {
        const group = await waClient.getChatById(groupId);
        const info = `
📌 Name: ${group.name}
👥 Participants: ${group.participants.length}
`;
        tgBot.sendMessage(chatId, info);
    } catch (err) {
        tgBot.sendMessage(chatId, '❌ Failed to get group info.');
    }
});

// -------- CHECK WHATSAPP STATUS --------
tgBot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        const me = await waClient.info;
        tgBot.sendMessage(chatId, `WhatsApp connected as: ${me.pushname}`);
    } catch {
        tgBot.sendMessage(chatId, '❌ Failed to get status.');
    }
});
