require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { google } = require('googleapis');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());

const SHEET_ID = process.env.SHEET_ID;
const RANGE = process.env.RANGE;
const telegramApiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: SCOPES
});

const API_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(API_TOKEN, { polling: true });

function escapeMarkdownV2(text) {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/\./g, '\\.')
        .replace(/\-/g, '\\-')
        .replace(/\_/g, '\\_')
        .replace(/\*/g, '\\*')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/\~/g, '\\~')
        .replace(/\`/g, '\\`')
        .replace(/\>/g, '\\>')
        .replace(/\#/g, '\\#')
        .replace(/\+/g, '\\+')
        .replace(/\=/g, '\\=')
        .replace(/\|/g, '\\|')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .replace(/\!/g, '\\!');
}

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const message = `Your ChatID is *${chatId}*\\. Please enter this ChatID into the app to receive OTP verification code\\.`;
    bot.sendMessage(chatId, message, { parse_mode: 'MarkdownV2' });
});

bot.onText(/\/create/, (msg) => {
    const chatId = msg.chat.id;

    let responseText = "Welcome to *AppVerify Code*\\, a *free* OTP verification code sending service for *individuals and businesses*\\.\n" +
        "Instead of having to pay to use OTP verification services\\, you just need to register to use *AppVerify Code*'s service " +
        "with a little understanding of API and you can use it\\.";

    const options = {
        reply_markup: {
            inline_keyboard: [
                [{ text: "✔ Register", url: "https://appverifycode.glide.page" }],
                [{ text: "📃 Document", url: "https://hitech-corporation.gitbook.io/appverifycode-api/" }]
            ]
        },
        parse_mode: 'MarkdownV2'
    };

    bot.sendMessage(chatId, responseText, options);
});


async function getSheetData() {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: RANGE,
    });
    return res.data.values;
}

app.get('/api/otpVerification', async (req, res) => {
    const { avc_authkey } = req.query;
    if (!avc_authkey) {
        return res.status(400).json({ error: 'avc_authkey is required' });
    }

    const rows = await getSheetData();
    const row = rows.find(r => r[3] === avc_authkey);

    if (row) {
        const response = {
            "api-type": "GET",
            "response": "200",
            "avc_authkey": avc_authkey,
            "status": "found",
            "authkey_info": {
                "tg_username": row[0],
                "tg_appname": row[1],
                "tg_appbot": row[2]
            }
        };
        return res.json(response);
    } else {
        return res.status(404).json({ "status": "authkey not found" });
    }
});

app.post('/api/otpVerification', async (req, res) => {
    const { avc_authkey, chat_id } = req.query;
    if (!avc_authkey) {
        return res.status(400).json({ error: 'avc_authkey is required' });
    }

    if (!chat_id) {
        return res.status(400).json({ error: 'chat_id is required' });
    }

    const rows = await getSheetData();
    const row = rows.find(r => r[3] === avc_authkey);

    if (row) {
        const randomCode = Math.floor(Math.random() * (99999999 - 10000000 + 1)) + 10000000;

        const message = `Your verification code is ||*${escapeMarkdownV2(randomCode.toString())}*||\\. Please keep it secret and don't share it with anyone\\.\nCode sent by *${escapeMarkdownV2(row[1])}* \\(${escapeMarkdownV2(row[2])}\\)\\.`;

        try {
            const telegramRes = await axios.post(telegramApiUrl, {
                chat_id: chat_id,
                text: message,
                parse_mode: 'MarkdownV2'
            });

            if (telegramRes.status === 200) {
                const response = {
                    "api-type": "POST",
                    "response": "200",
                    "avc_authkey": avc_authkey,
                    "status": "found",
                    "authkey_info": {
                        "tg_username": row[0],
                        "tg_appname": row[1],
                        "tg_appbot": row[2]
                    },
                    "sendStatus": {
                        "status": "200",
                        "sendTo": chat_id,
                        "content": message
                    },
                    "verificationCode": randomCode
                };
                return res.json(response);
            } else {
                return res.status(500).json({ error: 'Failed to send Telegram message', details: telegramRes.data });
            }
        } catch (error) {
            return res.status(500).json({ error: 'Telegram API error', details: error.response ? error.response.data : error.message });
        }
    } else {
        return res.status(404).json({ "status": "authkey not found" });
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on port ${process.env.PORT || 3000}`);
});