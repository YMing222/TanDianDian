const cloud = require('wx-server-sdk');

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
  const useVendorDefaultFlavor = product.useVendorDefaultFlavor !== false;
  if (useVendorDefaultFlavor) {
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
