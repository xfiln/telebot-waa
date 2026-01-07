const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const readline = require('readline');

const CONFIG = {
    BASE_URL: 'https://app.live3d.io',
    CDN_URL: 'https://temp.live3d.io/',
    ENDPOINTS: {
        UPLOAD: '/aitools/upload-img',
        CREATE: '/aitools/of/create',
        STATUS: '/aitools/of/check-status'
    },
    SECRETS: {
        FP: '78dc286eaeb7fb88586e07f0d18bf61b',
        APP_ID: 'aifaceswap',
        PUBLIC_KEY: `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCwlO+boC6cwRo3UfXVBadaYwcX
0zKS2fuVNY2qZ0dgwb1NJ+/Q9FeAosL4ONiosD71on3PVYqRUlL5045mvH2K9i8b
AFVMEip7E6RMK6tKAAif7xzZrXnP1GZ5Rijtqdgwh+YmzTo39cuBCsZqK9oEoeQ3
r/myG9S+9cR5huTuFQIDAQAB
-----END PUBLIC KEY-----`
    },
    HEADERS: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'sec-ch-ua-platform': '"Android"',
        'theme-version': '83EmcUoQTUv50LhNx0VrdcK8rcGexcP35FcZDcpgWsAXEyO4xqL5shCY6sFIWB2Q',
        'origin': 'https://live3d.io',
        'referer': 'https://live3d.io/',
        'priority': 'u=1, i'
    }
};

// Polling configuration
const POLL_INTERVAL_MS = 3000; // ms between status checks
const MAX_ATTEMPTS = 120; // total attempts (~6 minutes)
const QUEUE_ABORT_RANK = 80; // abort early if queue rank is too large

const utils = {
    genHex: (bytes) => crypto.randomBytes(bytes).toString('hex'),
    
    genRandomString: (length) => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
        return result;
    },

    aesEncrypt: (plaintext, keyStr, ivStr) => {
        const key = Buffer.from(keyStr, 'utf8');
        const iv = Buffer.from(ivStr, 'utf8');
        const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
        let encrypted = cipher.update(plaintext, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted;
    },

    rsaEncrypt: (data) => {
        const buffer = Buffer.from(data, 'utf8');
        const encrypted = crypto.publicEncrypt({
            key: CONFIG.SECRETS.PUBLIC_KEY,
            padding: crypto.constants.RSA_PKCS1_PADDING,
        }, buffer);
        return encrypted.toString('base64');
    },

    generateHeaders: () => {
        const aesKey = utils.genRandomString(16);
        const xCode = Date.now().toString();
        const xGuide = utils.rsaEncrypt(aesKey);
        const plaintextFp = `${CONFIG.SECRETS.APP_ID}:${CONFIG.SECRETS.FP}`;
        const fp1 = utils.aesEncrypt(plaintextFp, aesKey, aesKey);

        return {
            ...CONFIG.HEADERS,
            'x-code': xCode,
            'x-guide': xGuide,
            'fp': CONFIG.SECRETS.FP,
            'fp1': fp1
        };
    }
};

const deepNude = {
    generate: async (imagePath) => {
        const originFrom = utils.genHex(8);
        const requestFrom = 9;

        console.log(`\n=== Live3D Generator [Hex: ${originFrom}] ===`);

        try {
            if (!fs.existsSync(imagePath)) return console.log(`[!] File ${imagePath} tidak ditemukan.`);
            
            process.stdout.write(`[1/3] Uploading image... `);
            
            const form = new FormData();
            form.append('file', fs.createReadStream(imagePath));
            form.append('fn_name', 'cloth-change');
            form.append('request_from', requestFrom.toString());
            form.append('origin_from', originFrom);

            const uploadHeaders = { ...utils.generateHeaders(), ...form.getHeaders() };
            
            const uploadRes = await axios.post(CONFIG.BASE_URL + CONFIG.ENDPOINTS.UPLOAD, form, { headers: uploadHeaders });
            let serverPath = uploadRes.data?.data;
            if (typeof serverPath === 'object' && serverPath.path) serverPath = serverPath.path;

            if (!serverPath) throw new Error("Gagal mendapatkan path server.");
            console.log(`Done.`);

            process.stdout.write(`[2/3] Submitting task... `);
            
            const submitPayload = {
                "fn_name": "cloth-change",
                "call_type": 3,
                "input": {
                    "source_image": serverPath,
                    "prompt": "best quality, naked, nude",
                    "cloth_type": "full_outfits",
                    "request_from": requestFrom,
                    "type": 1
                },
                "request_from": requestFrom,
                "origin_from": originFrom
            };

            const submitRes = await axios.post(CONFIG.BASE_URL + CONFIG.ENDPOINTS.CREATE, submitPayload, {
                headers: { ...utils.generateHeaders(), 'Content-Type': 'application/json' }
            });

            const taskId = submitRes.data?.data?.task_id;
            if (!taskId) throw new Error("Gagal mendapatkan Task ID.");
            console.log(`Done (ID: ${taskId})`);

            let isCompleted = false;
            let attempts = 0;
            let resultUrl = null;
            let lastStatus = null;
            let lastRank = null;
            const maxAttempts = MAX_ATTEMPTS;

            while (!isCompleted && attempts < maxAttempts) {
                attempts++;
                await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

                const statusPayload = {
                    "task_id": taskId,
                    "fn_name": "cloth-change",
                    "call_type": 3,
                    "consume_type": 0,
                    "request_from": requestFrom,
                    "origin_from": originFrom
                };

                const statusRes = await axios.post(CONFIG.BASE_URL + CONFIG.ENDPOINTS.STATUS, statusPayload, {
                    headers: { ...utils.generateHeaders(), 'Content-Type': 'application/json' }
                });

                const data = statusRes.data?.data;
                if (!data) continue;

                const status = data.status;
                lastStatus = status;
                lastRank = (typeof data.rank === 'number') ? data.rank : (data.rank ? Number(data.rank) : null);

                if (readline && typeof readline.clearLine === 'function') {
                    try {
                        readline.clearLine(process.stdout, 0);
                        if (typeof readline.cursorTo === 'function') readline.cursorTo(process.stdout, 0);
                    } catch (err) {
                        if (process.stdout && typeof process.stdout.write === 'function') process.stdout.write('\r');
                    }
                } else if (process.stdout && typeof process.stdout.write === 'function') {
                    process.stdout.write('\r');
                }
                
                if (status === 2) {
                    resultUrl = data.result_image;
                    if (resultUrl && !resultUrl.startsWith('http')) {
                        resultUrl = CONFIG.CDN_URL + resultUrl;
                    }
                    process.stdout.write(`[3/3] Status: Success!\n`);
                    isCompleted = true;
                } else if (status === 1) {
                    const dots = ".".repeat((attempts % 3) + 1);
                    process.stdout.write(`[3/3] Status: Generating${dots} `);
                } else {
                    process.stdout.write(`[3/3] Status: Queue (Rank ${data.rank})... `);
                }
            }

            if (!resultUrl) {
                if (lastRank && typeof lastRank === 'number' && lastRank > QUEUE_ABORT_RANK) {
                    throw new Error(`Timeout: queue too long (lastRank=${lastRank}, attempts=${attempts})`);
                }
                throw new Error(`Timeout generating image (lastStatus=${lastStatus}, lastRank=${lastRank}, attempts=${attempts})`);
            }

            console.log(`\n[RESULT] ${resultUrl}\n`);
            return resultUrl;

        } catch (error) {
            console.log(`\n[X] Error: ${error.message}`);
            if (error.response) console.log(`    Server Msg: ${JSON.stringify(error.response.data)}`);
            return null;
        }
    },

    create: async (filePath) => {
        console.log('😂 Sabar lagi di telanjangin...');
        try {
            const res = await deepNude.generate(filePath);
            if (!res) throw new Error('Failed to generate');
            return { success: true, author: 'shannz', result: res };
        } catch (err) {
            return { success: false, author: 'shannz', result: err.message };
        }
    }
};

module.exports = { deepNude };