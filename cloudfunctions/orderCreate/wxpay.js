const crypto = require('crypto');
const https = require('https');

const API_HOST = 'api.mch.weixin.qq.com';

function getEnvValue(name) {
  return process.env[name] || '';
}

function getPrivateKey(credentialKey) {
  const key = getEnvValue(`WXPAY_${credentialKey}_PRIVATE_KEY`).replace(/\\n/g, '\n');
  if (!key) {
    throw new Error(`missing private key env for ${credentialKey}`);
  }
  return key;
}

function randomString(length = 16) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

function sign(message, credentialKey) {
  return crypto
    .createSign('RSA-SHA256')
    .update(message)
    .sign(getPrivateKey(credentialKey), 'base64');
}

function buildAuthorization(method, urlPath, body, config) {
  const nonceStr = randomString(16);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const signature = sign(message, config.credentialKey);
  return {
    nonceStr,
    timestamp,
    authorization: `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.certSerialNo}"`
  };
}

function requestJson(method, urlPath, data, config) {
  const body = data ? JSON.stringify(data) : '';
  const auth = buildAuthorization(method, urlPath, body, config);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: API_HOST,
      path: urlPath,
      method,
      headers: {
        Authorization: auth.authorization,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        const parsed = text ? JSON.parse(text) : {};
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(parsed);
        } else {
          const error = new Error(parsed.message || `wechat pay request failed: ${res.statusCode}`);
          error.detail = parsed;
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function createJsapiTransaction(config, order, openid) {
  return requestJson('POST', '/v3/pay/transactions/jsapi', {
    appid: config.appId,
    mchid: config.mchId,
    description: order.description,
    out_trade_no: order.outTradeNo,
    notify_url: config.payNotifyUrl,
    amount: {
      total: order.totalFee,
      currency: 'CNY'
    },
    payer: { openid }
  }, config);
}

function buildMiniProgramPayParams(config, prepayId) {
  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = randomString(16);
  const packageValue = `prepay_id=${prepayId}`;
  const message = `${config.appId}\n${timeStamp}\n${nonceStr}\n${packageValue}\n`;
  return {
    timeStamp,
    nonceStr,
    package: packageValue,
    signType: 'RSA',
    paySign: sign(message, config.credentialKey)
  };
}

module.exports = {
  buildMiniProgramPayParams,
  createJsapiTransaction,
  randomString
};
