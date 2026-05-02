const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const now = new Date();
  const { vendorId, items = [], pickupTime, contactPhone, remark } = event;

  if (!vendorId || !items.length || !pickupTime || !contactPhone) {
    throw new Error('invalid order payload');
  }

  const vendorRes = await db.collection('vendors').doc(vendorId).get();
  const vendor = vendorRes.data;
  if (!vendor || vendor.isActive === false || !vendor.isOpen) {
    throw new Error('vendor is unavailable');
  }

  const productIds = items.map((item) => item._id).filter(Boolean);
  const productRes = await db.collection('products')
    .where({
      _id: _.in(productIds),
      vendorId,
      isOnSale: true,
      isSoldOut: false
    })
    .get();

  const productMap = productRes.data.reduce((map, product) => {
    map[product._id] = product;
    return map;
  }, {});

  const orderItems = items.map((item) => {
    const product = productMap[item._id];
    const quantity = Number.parseInt(item.quantity, 10) || 0;
    if (!product || quantity <= 0) {
      throw new Error('invalid order item');
    }

    return {
      _id: product._id,
      name: product.name,
      price: Number(product.price || 0),
      quantity
    };
  });

  const totalAmount = orderItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const order = {
    vendorId,
    vendorName: vendor.name || '',
    openid: wxContext.OPENID,
    items: orderItems,
    pickupTime,
    contactPhone: String(contactPhone || '').trim(),
    remark: String(remark || '').trim(),
    totalAmount,
    status: 'pending',
    statusText: '待商家接单',
    createdAt: now,
    updatedAt: now
  };

  const result = await db.collection('orders').add({ data: order });
  return { orderId: result._id };
};
