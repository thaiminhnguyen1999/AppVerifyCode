require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const TelegramBot = require('node-telegram-bot-api');
const { OAuth2Client } = require('google-auth-library');
const path = require('path');

const app = express();
app.use(express.json());

const SHEET_ID = process.env.SHEET_ID;
const RANGE = "Lists!A2:D";
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: SCOPES
});

const oAuth2Client = new OAuth2Client(
    process.env.OAUTH_CLIENT_ID,
    process.env.OAUTH_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
);
oAuth2Client.setCredentials({
    refresh_token: process.env.OAUTH_REFRESH_TOKEN
});

const telegramApiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
const API_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(API_TOKEN, { polling: true });

async function createTransporter() {
    const accessToken = await oAuth2Client.getAccessToken();
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: process.env.EMAIL_USER,
            clientId: process.env.OAUTH_CLIENT_ID,
            clientSecret: process.env.OAUTH_CLIENT_SECRET,
            refreshToken: process.env.OAUTH_REFRESH_TOKEN,
            accessToken: accessToken.token
        }
    });
}

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
        .replace(/\}/g, '\\}');
}

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const message = `Your ChatID is *${chatId}*\\. Please enter this ChatID into the app to receive OTP verification code\\.`;
    bot.sendMessage(chatId, message, { parse_mode: 'MarkdownV2' });
});

bot.onText(/\/create/, (msg) => {
    const chatId = msg.chat.id;
    const responseText = "Welcome to *AppVerify Code*\\, a *free* OTP verification code sending service for *individuals and businesses*\\.\n" +
        "Register to use *AppVerify Code*'s API with a little understanding of API usage.";

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

app.get('/api/telegram/otpVerification', (_req, res) => {
    return res.status(405).json({
        "error": "GET method is not supported for /api/telegram/otpVerification. Do you mean /api/getData?"
    });
});

app.get('/api/email/otpVerification', (_req, res) => {
    return res.status(405).json({
        "error": "GET method is not supported for /api/email/otpVerification. Do you mean /api/getData?"
    });
});

app.get('/api/getData', async (req, res) => {
    const { avc_authkey } = req.query;
    if (!avc_authkey) {
        return res.status(400).json({ error: 'avc_authkey is required' });
    }

    const rows = await getSheetData();
    const row = rows.find(r => r[3] === avc_authkey);

    if (row) {
        const response = {
            "restful-method": "GET",
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
        return res.status(404).json({ 
            "restful-method": "GET",
            "response": "404",

            "error": "avc_authkey not found" 
        });
    }
});

app.post('/api/telegram/otpVerification', async (req, res) => {
    const { avc_authkey, chat_id } = req.query;
    if (!avc_authkey || !chat_id) {
        return res.status(400).json({ error: 'avc_authkey and chat_id are required' });
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
                return res.json({
                    "restful-method": "POST",
                    "response": "200",
                    "status": "found",
                    "authkey_info": {
                        "tg_username": row[0],
                        "tg_appname": row[1],
                        "tg_appbot": row[2]
                    },
                    "sendTo": {
                        "chatID": chat_id,
                        "username": row[0]
                    },
                    "verificationCode": randomCode
                });
            } else {
                return res.status(500).json({ error: 'Failed to send Telegram message' });
            }
        } catch (error) {
            return res.status(500).json({ error: 'Telegram API error', details: error.message });
        }
    } else {
        return res.status(404).json({
            "restful-method": "POST",
            "response": "404",

            "error": "avc_authkey not found"
        });
    }
});

app.post('/api/email/otpVerification', async (req, res) => {
    const { avc_authkey, email } = req.query;
    if (!avc_authkey || !email) {
        return res.status(400).json({ error: 'avc_authkey and email are required' });
    }

    const rows = await getSheetData();
    const row = rows.find(r => r[3] === avc_authkey);

    if (row) {
        const randomCode = Math.floor(Math.random() * (99999999 - 10000000 + 1)) + 10000000;

        const emailMessage = `
            <div style="text-align: center; font-weight: bold;">AppVerify Code</div>
            <p>Your verification code is <strong>${randomCode}</strong>. Please keep it secret and don't share it with anyone.</p>
            <p>Code sent by <strong>${row[1]} (${row[2]})</strong>.</p>
        `;

        const transporter = await createTransporter();
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'AppVerify Code - OTP Verification',
            html: `
                <div style="text-align: center; font-weight: bold;"><h1>AppVerify Code</h1></div>
                <p>Your verification code is <strong>${randomCode}</strong>. Please keep it secret and don't share it with anyone.</p>
                <p>Code sent by <strong>${row[1]} (${row[2]})</strong>.</p>
                <img src="cid:mailfooter" alt="Mail Footer" style="width: 100% !important; min-width: 100% !important;" />
            `,
            attachments: [{
                filename: 'mail-footer.jpg',
                path: './mail-footer.jpg',
                cid: 'mailfooter'
            }]
        };


        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return res.status(500).json({ error: 'Failed to send email', details: error.message });
            } else {
                return res.json({
                    "restful-method": "POST",
                    "response": "200",
                    "status": "found",
                    "authkey_info": {
                        "tg_username": row[0],
                        "tg_appname": row[1],
                        "tg_appbot": row[2]
                    },
                    "sendTo": {
                        "email": email
                    },
                    "verificationCode": randomCode
                });
            }
        });
    } else {
        return res.status(404).json({
            "restful-method": "POST",
            "response": "404",

            "error": "avc_authkey not found"
        });
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on port ${process.env.PORT || 3000}`);
});
