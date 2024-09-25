require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const nodemailer = require('nodemailer');

const telegramApiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

const app = express();
app.use(express.json());

const SHEET_ID = process.env.SHEET_ID;
const RANGE = "avc-app!A2:E";
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
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

const API_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!API_TOKEN) {
    console.error("Error: TELEGRAM_BOT_TOKEN is not defined in the .env file.");
    process.exit(1);
}

const bot = new TelegramBot(API_TOKEN, { polling: true });

const getGoogleSheetsClient = async () => {
    const client = await auth.getClient();
    return google.sheets({ version: 'v4', auth: client });
};

async function getSheetData() {
    const sheets = await getGoogleSheetsClient();
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: RANGE,
    });
    return res.data.values;
}

async function updateSheet(rowIndex, data) {
    const sheets = await getGoogleSheetsClient();
    await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `avc-app!A${rowIndex}:E`,
        valueInputOption: 'RAW',
        resource: { values: [data] }
    });
}

async function deleteFromSheet(rowIndex) {
    const sheets = await getGoogleSheetsClient();
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        resource: {
            requests: [{
                deleteDimension: {
                    range: {
                        sheetId: 0,
                        dimension: 'ROWS',
                        startIndex: rowIndex - 1,
                        endIndex: rowIndex
                    }
                }
            }]
        }
    });
}

async function appendToSheet(data) {
    const sheets = await getGoogleSheetsClient();
    await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: 'avc-app!A:E',
        valueInputOption: 'RAW',
        resource: { values: [data] }
    });
}

function authkeyGenerator(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const nums = '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        if (Math.random() < 0.75) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        } else {
            result += nums.charAt(Math.floor(Math.random() * nums.length));
        }
    }
    return result;
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

function isAllowedDomain(domain) {
    const allowedDomains = [
        'hotmail.com',
        'outlook.com.vn',
        'outlook.com',
        'gmail.com',
        'yahoo.com',
        'microsoft.com',
        'proton.me',
        'protonmail.com',
        'icloud.com',
        'apple.com'
    ];
    return allowedDomains.includes(domain.toLowerCase());
}

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const message = `Your ChatID is <b>${chatId.toString()}</b>. Please enter this ChatID into the app to receive OTP verification code.`;
    bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
});

app.post('/api/email/otpVerification', async (req, res) => {
    const { avc_authkey, email } = req.query;
    if (!avc_authkey || !email) {
        return res.status(400).json({ error: 'avc_authkey and email are required' });
    }

    const domain = email.split('@')[1];
    const rows = await getSheetData();
    const row = rows.find(r => r[3] === avc_authkey);

    if (row) {
        if (isAllowedDomain(domain) || row[4] === 'actived') {
            const randomCode = Math.floor(Math.random() * (99999999 - 10000000 + 1)) + 10000000;
            const sanitizedTelegramBot = row[2].replace(/@/g, '');

            const transporter = await createTransporter();
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'AppVerify Code - OTP Verification',
                html:
                    `<div style="text-align: center; font-weight: bold;"><h1>AppVerify Code</h1></div>
                    <p>Your verification code is <strong>${randomCode}</strong>. Please keep it secret and don't share it with anyone.</p>
                    <p>Code sent by <strong>${row[1]} (<a href="https://t.me/${sanitizedTelegramBot}">${row[2]}</a>)</strong>.</p>
                    <img src="cid:mailfooter" alt="Mail Footer" style="width: 100% !important; min-width: 100% !important;" />`,
                attachments: [{
                    filename: 'mail-footer.jpg',
                    path: './mail-footer.jpg',
                    cid: 'mailfooter'
                }]
            };

            transporter.sendMail(mailOptions, (error) => {
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
            return res.status(403).json({
                error: "User's email address contains business domain name. To send OTP Verification Code, account must have the AVC+ package activated."
            });
        }
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
