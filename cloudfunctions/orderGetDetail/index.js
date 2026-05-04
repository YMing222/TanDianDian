const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { orderId } = event;

  if (!orderId) {
    throw new Error('orderId is required');
  }

  const res = await db.collection('orders').doc(orderId).get();
  const order = res.data;
  if (!order || order.openid !== wxContext.OPENID) {
    throw new Error('permission denied');
  }

  return { order };
};
