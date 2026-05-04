const cloud = require('wx-server-sdk');
const {
  buildMiniProgramPayParams,
  createJsapiTransaction,
  randomString
} = require('./wxpay');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

function normalizeSelectedFlavors(flavors) {
  const seen = {};
  return (Array.isArray(flavors) ? flavors : [])
    .map((item) => String(item || '').trim())
    .filter((item) => {
      if (!item || seen[item]) return false;
      seen[item] = true;
      return true;
    });
}

function getEffectiveFlavorConfig(product, vendor) {
  if (product.useVendorDefaultFlavor !== false) {
    return {
      options: Array.isArray(vendor.defaultFlavorOptions) ? vendor.defaultFlavorOptions : [],
      multiSelect: !!vendor.defaultFlavorMultiSelect
    };
  }

  return {
    options: Array.isArray(product.flavorOptions) ? product.flavorOptions : [],
    multiSelect: !!product.flavorMultiSelect
  };
}

function assertValidFlavors(item, product, vendor) {
  const config = getEffectiveFlavorConfig(product, vendor);
  const selectedFlavors = normalizeSelectedFlavors(item.selectedFlavors);

  if (!config.options.length) {
    return { selectedFlavors: [], flavorText: '' };
  }

  if (!selectedFlavors.length) {
    throw new Error('flavor is required');
  }

  if (!config.multiSelect && selectedFlavors.length > 1) {
    throw new Error('only one flavor is allowed');
  }

  const invalid = selectedFlavors.some((flavor) => !config.options.includes(flavor));
  if (invalid) {
    throw new Error('invalid flavor selected');
  }

  return {
    selectedFlavors,
    flavorText: selectedFlavors.join('、')
  };
}

function yuanToFen(amount) {
  return Math.round(Number(amount || 0) * 100);
}

function buildOutTradeNo() {
  return `TD${Date.now()}${randomString(6)}`.slice(0, 32);
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

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const now = new Date();
  const { vendorId, items = [], pickupTime, contactPhone, remark } = event;

  if (!vendorId || !items.length || !pickupTime || !contactPhone) {
    throw new Error('invalid order payload');
  }

  const [vendorRes, payConfig] = await Promise.all([
    db.collection('vendors').doc(vendorId).get(),
    getPayConfig(vendorId)
  ]);
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

    const flavor = assertValidFlavors(item, product, vendor);
    return {
      _id: product._id,
      name: product.name,
      price: Number(product.price || 0),
      quantity,
      selectedFlavors: flavor.selectedFlavors,
      flavorText: flavor.flavorText
    };
  });

  const totalAmount = orderItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const totalFee = yuanToFen(totalAmount);
  if (totalFee <= 0) {
    throw new Error('invalid order amount');
  }

  const outTradeNo = buildOutTradeNo();
  const order = {
    vendorId,
    vendorName: vendor.name || '',
    openid: wxContext.OPENID,
    items: orderItems,
    pickupTime,
    contactPhone: String(contactPhone || '').trim(),
    remark: String(remark || '').trim(),
    totalAmount,
    totalFee,
    status: 'unpaid',
    statusText: '待支付',
    paymentStatus: 'paying',
    outTradeNo,
    mchId: payConfig.mchId,
    createdAt: now,
    updatedAt: now
  };

  const addRes = await db.collection('orders').add({ data: order });
  const orderId = addRes._id;

  try {
    const payRes = await createJsapiTransaction(payConfig, {
      outTradeNo,
      totalFee,
      description: `${vendor.name || '摊点点'}预约点单`
    }, wxContext.OPENID);
    const prepayId = payRes.prepay_id;
    const payParams = buildMiniProgramPayParams(payConfig, prepayId);

    await db.collection('orders').doc(orderId).update({
      data: {
        prepayId,
        updatedAt: new Date()
      }
    });

    return { orderId, payParams };
  } catch (error) {
    await db.collection('orders').doc(orderId).update({
      data: {
        paymentStatus: 'unpaid',
        status: 'unpaid',
        statusText: '待支付',
        payError: error.message,
        updatedAt: new Date()
      }
    });
    throw error;
  }
};
