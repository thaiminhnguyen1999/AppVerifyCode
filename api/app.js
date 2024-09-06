require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { google } = require('googleapis');
const app = express();
app.use(express.json());

const SHEET_ID = process.env.SHEET_ID;
const RANGE = process.env.RANGE;
const telegramApiUrl = process.env.TELEGRAM_API_URL;
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: SCOPES
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
        const message = `Your verification code is ||*${randomCode}*||\\. Please keep it secret and don\\'t share it with anyone\\.\\\n\\Code sent by *${row[1]}*\\.`;


        try {
            console.log(`Sending request to Telegram API: ${telegramApiUrl}`);

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
                console.error('Failed to send Telegram message:', telegramRes.data);
                return res.status(500).json({ error: 'Failed to send Telegram message', details: telegramRes.data });
            }
        } catch (error) {
            console.error('Telegram API error:', error.response ? error.response.data : error.message);
            return res.status(500).json({ error: 'Telegram API error', details: error.response ? error.response.data : error.message });
        }
    } else {
        return res.status(404).json({ "status": "authkey not found" });
    }
});

// Export as Vercel Serverless function
module.exports = app;
