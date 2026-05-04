const crypto = require('crypto');
const https = require('https');

const API_HOST = 'api.mch.weixin.qq.com';

function getPrivateKey(credentialKey) {
  const key = (process.env[`WXPAY_${credentialKey}_PRIVATE_KEY`] || '').replace(/\\n/g, '\n');
  if (!key) throw new Error(`missing private key env for ${credentialKey}`);
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
  return `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.certSerialNo}"`;
}

function requestJson(method, urlPath, data, config) {
  const body = data ? JSON.stringify(data) : '';
  const authorization = buildAuthorization(method, urlPath, body, config);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: API_HOST,
      path: urlPath,
      method,
      headers: {
        Authorization: authorization,
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

function buildOutRefundNo(orderId) {
  return `RF${orderId}`.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
}

async function requestRefund(config, order, reason) {
  const outRefundNo = order.outRefundNo || buildOutRefundNo(order._id);
  const result = await requestJson('POST', '/v3/refund/domestic/refunds', {
    out_trade_no: order.outTradeNo,
    out_refund_no: outRefundNo,
    reason,
    notify_url: config.refundNotifyUrl,
    amount: {
      refund: order.totalFee,
      total: order.totalFee,
      currency: 'CNY'
    }
  }, config);

  return { result, outRefundNo };
}

module.exports = {
  buildOutRefundNo,
  requestRefund
};
