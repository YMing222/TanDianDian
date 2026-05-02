const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

const statusTextMap = {
  pending: '待商家接单',
  accepted: '商家已接单',
  rejected: '商家已拒单',
  completed: '已完成自取',
  canceled: '已取消'
};

async function assertOwnedOrder(orderId, openid) {
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

  return order;
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { orderId, status } = event;
  if (!orderId || !statusTextMap[status]) {
    throw new Error('invalid order status payload');
  }

  await assertOwnedOrder(orderId, wxContext.OPENID);

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
