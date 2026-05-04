const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

function parseBody(event) {
  if (typeof event.body === 'string') {
    return JSON.parse(event.body);
  }
  return event.body || event;
}

function getHeader(headers, name) {
  const lowerName = name.toLowerCase();
  const key = Object.keys(headers || {}).find((item) => item.toLowerCase() === lowerName);
  return key ? headers[key] : '';
}

function verifyNotifySignature(event) {
  const publicKey = (process.env.WXPAY_PLATFORM_PUBLIC_KEY || '').replace(/\\n/g, '\n');
  if (!publicKey || typeof event.body !== 'string') return;

  const timestamp = getHeader(event.headers, 'Wechatpay-Timestamp');
  const nonce = getHeader(event.headers, 'Wechatpay-Nonce');
  const signature = getHeader(event.headers, 'Wechatpay-Signature');
  const message = `${timestamp}\n${nonce}\n${event.body}\n`;
  const ok = crypto
    .createVerify('RSA-SHA256')
    .update(message)
    .verify(publicKey, signature, 'base64');

  if (!ok) {
    throw new Error('invalid wechat pay signature');
  }
}

function getApiV3Key(credentialKey) {
  const key = process.env[`WXPAY_${credentialKey}_API_V3_KEY`];
  if (!key) throw new Error(`missing api v3 key env for ${credentialKey}`);
  return key;
}

function decryptResource(resource, apiV3Key) {
  const raw = Buffer.from(resource.ciphertext, 'base64');
  const ciphertext = raw.slice(0, -16);
  const authTag = raw.slice(-16);
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(apiV3Key, 'utf8'),
    Buffer.from(resource.nonce, 'utf8')
  );
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(resource.associated_data || '', 'utf8'));
  return JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8'));
}

async function decryptWithAnyConfig(resource) {
  const res = await db.collection('vendor_pay_configs')
    .where({ enabled: true })
    .limit(100)
    .get();

  for (const config of res.data) {
    try {
      return {
        config,
        data: decryptResource(resource, getApiV3Key(config.credentialKey))
      };
    } catch (error) {
      // Try the next merchant config.
    }
  }

  throw new Error('unable to decrypt refund notify');
}

function ok() {
  return {
    statusCode: 200,
    body: JSON.stringify({ code: 'SUCCESS', message: '成功' })
  };
}

function fail(error) {
  console.warn('refund notify failed', error);
  return {
    statusCode: 500,
    body: JSON.stringify({ code: 'FAIL', message: error.message })
  };
}

exports.main = async (event) => {
  try {
    verifyNotifySignature(event);
    const body = parseBody(event);
    const decrypted = await decryptWithAnyConfig(body.resource);
    const data = decrypted.data;
    const orders = await db.collection('orders')
      .where({ outRefundNo: data.out_refund_no })
      .limit(1)
      .get();

    if (!orders.data.length) {
      return ok();
    }

    const success = data.refund_status === 'SUCCESS';
    await db.collection('orders').doc(orders.data[0]._id).update({
      data: {
        paymentStatus: success ? 'refunded' : 'refund_failed',
        refundId: data.refund_id || orders.data[0].refundId || '',
        refundedAt: success ? new Date(data.success_time || Date.now()) : orders.data[0].refundedAt || null,
        updatedAt: new Date()
      }
    });

    return ok();
  } catch (error) {
    return fail(error);
  }
};
