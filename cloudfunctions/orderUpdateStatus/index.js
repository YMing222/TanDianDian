const cloud = require('wx-server-sdk');
const { requestRefund } = require('./wxpay');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

const statusTextMap = {
  pending: '待商家接单',
  accepted: '商家已接单',
  rejected: '商家已拒单',
  completed: '已完成自取',
  canceled: '已取消'
};

async function getOwnedOrder(orderId, openid) {
  const orderRes = await db.collection('orders').doc(orderId).get();
  const order = orderRes.data;
  if (!order) {
    throw new Error('order not found');
  }

  const vendorRes = await db.collection('vendors').doc(order.vendorId).get();
  const vendor = vendorRes.data;
  if (!vendor || !(vendor.ownerOpenids || []).includes(openid)) {
    throw new Error('permission denied');
  }

  return { ...order, _id: orderId };
}

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

async function rejectWithRefund(order) {
  if (order.paymentStatus === 'refunded' || order.paymentStatus === 'refunding') {
    await db.collection('orders').doc(order._id).update({
      data: {
        status: 'rejected',
        statusText: statusTextMap.rejected,
        updatedAt: new Date()
      }
    });
    return;
  }

  if (order.paymentStatus !== 'paid') {
    await db.collection('orders').doc(order._id).update({
      data: {
        status: 'rejected',
        statusText: statusTextMap.rejected,
        updatedAt: new Date()
      }
    });
    return;
  }

  const payConfig = await getPayConfig(order.vendorId);
  const refund = await requestRefund(payConfig, order, '商家拒单自动退款');
  await db.collection('orders').doc(order._id).update({
    data: {
      status: 'rejected',
      statusText: statusTextMap.rejected,
      paymentStatus: 'refunding',
      outRefundNo: refund.outRefundNo,
      refundId: refund.result.refund_id || '',
      refundReason: '商家拒单自动退款',
      refundRequestedAt: new Date(),
      updatedAt: new Date()
    }
  });
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { orderId, status } = event;
  if (!orderId || !statusTextMap[status]) {
    throw new Error('invalid order status payload');
  }

  const order = await getOwnedOrder(orderId, wxContext.OPENID);

  if (status === 'rejected') {
    await rejectWithRefund(order);
    return { ok: true };
  }

  if (order.paymentStatus !== 'paid') {
    throw new Error('order is not paid');
  }

  await db.collection('orders').doc(orderId).update({
    data: {
      status,
      statusText: statusTextMap[status],
      updatedAt: new Date(),
      updatedBy: wxContext.OPENID
    }
  });

  return { ok: true };
};
