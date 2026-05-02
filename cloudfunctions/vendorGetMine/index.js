const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async () => {
  const wxContext = cloud.getWXContext();
  const res = await db.collection('vendors')
    .where({
      ownerOpenids: wxContext.OPENID,
      isActive: true
    })
    .limit(1)
    .get();

  if (!res.data.length) {
    return {
      authorized: false,
      vendor: null
    };
  }

  return {
    authorized: true,
    vendor: res.data[0]
  };
};
