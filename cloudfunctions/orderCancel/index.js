const cloud = require('wx-server-sdk');
const { requestRefund } = require('./wxpay');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

async function getPayConfig(vendorId) {
  const res = await db.collection('vendor_pay_configs')
    .where({ vendorId, enabled: true })
    .limit(1)
    .get();
  if (!res.data.length) {
    throw new Error('vendor pay config not found');
  }
  return res.data[0];
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { orderId } = event;

  if (!orderId) {
    throw new Error('orderId is required');
  }

  const orderRes = await db.collection('orders').doc(orderId).get();
  const order = orderRes.data;
  if (!order || order.openid !== wxContext.OPENID) {
    throw new Error('permission denied');
  }

  if (order.status === 'accepted' || order.status === 'completed') {
    throw new Error('accepted order cannot be canceled');
  }

  if (order.paymentStatus === 'paid') {
    const payConfig = await getPayConfig(order.vendorId);
    const refund = await requestRefund(payConfig, { ...order, _id: orderId }, '顾客接单前取消');
    await db.collection('orders').doc(orderId).update({
      data: {
        status: 'canceled',
        statusText: '已取消',
        paymentStatus: 'refunding',
        outRefundNo: refund.outRefundNo,
        refundId: refund.result.refund_id || '',
        refundReason: '顾客接单前取消',
        refundRequestedAt: new Date(),
        updatedAt: new Date()
      }
    });
    return { ok: true, refunding: true };
  }

  await db.collection('orders').doc(orderId).update({
    data: {
      status: 'canceled',
      statusText: '已取消',
      paymentStatus: order.paymentStatus === 'refunded' ? 'refunded' : 'unpaid',
      updatedAt: new Date()
    }
  });

  return { ok: true, refunding: false };
};
