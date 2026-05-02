const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async () => {
  const wxContext = cloud.getWXContext();
  const res = await db.collection('orders')
    .where({ openid: wxContext.OPENID })
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  return { orders: res.data };
};
