const cloud = require('wx-server-sdk');
const {
  buildMiniProgramPayParams,
  createJsapiTransaction
} = require('./wxpay');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

async function getPayConfig(vendorId) {
  const res = await db.collection('vendor_pay_configs')
    .where({ vendorId, enabled: true })
    .limit(1)
    .get();
  if (!res.data.length) throw new Error('vendor pay config not found');
  return res.data[0];
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { orderId } = event;
  if (!orderId) throw new Error('orderId is required');

  const orderRes = await db.collection('orders').doc(orderId).get();
  const order = orderRes.data;
  if (!order || order.openid !== wxContext.OPENID) {
    throw new Error('permission denied');
  }

  if (order.paymentStatus === 'paid') {
    throw new Error('order already paid');
  }

  if (order.status !== 'unpaid') {
    throw new Error('order cannot be paid');
  }

  const payConfig = await getPayConfig(order.vendorId);
  const payRes = await createJsapiTransaction(payConfig, {
    outTradeNo: order.outTradeNo,
    totalFee: order.totalFee,
    description: `${order.vendorName || '摊点点'}预约点单`
  }, wxContext.OPENID);
  const prepayId = payRes.prepay_id;
  const payParams = buildMiniProgramPayParams(payConfig, prepayId);

  await db.collection('orders').doc(orderId).update({
    data: {
      paymentStatus: 'paying',
      prepayId,
      updatedAt: new Date()
    }
  });

  return { orderId, payParams };
};
