const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

function normalizeFlavorOptions(options) {
  const seen = {};
  return (Array.isArray(options) ? options : [])
    .map((item) => String(item || '').trim())
    .filter((item) => {
      if (!item || seen[item]) return false;
      seen[item] = true;
      return true;
    });
}

async function getOwnedVendor(vendorId, openid) {
  const res = await db.collection('vendors').doc(vendorId).get();
  const vendor = res.data;
  if (!vendor || !(vendor.ownerOpenids || []).includes(openid)) {
    throw new Error('permission denied');
  }
  return vendor;
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const {
    vendorId,
    name,
    category,
    phone,
    description,
    defaultFlavorOptions,
    defaultFlavorMultiSelect
  } = event;

  if (!vendorId) {
    throw new Error('vendorId is required');
  }

  await getOwnedVendor(vendorId, wxContext.OPENID);

  const data = {
    name: String(name || '').trim(),
    category: String(category || '').trim(),
    phone: String(phone || '').trim(),
    description: String(description || '').trim(),
    defaultFlavorOptions: normalizeFlavorOptions(defaultFlavorOptions),
    defaultFlavorMultiSelect: !!defaultFlavorMultiSelect,
    updatedAt: new Date(),
    updatedBy: wxContext.OPENID
  };

  if (!data.name) {
    throw new Error('vendor name is required');
  }

  await db.collection('vendors').doc(vendorId).update({ data });
  return { ok: true, vendorId };
};
