const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

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
    isOpen,
    businessHours,
    locationText,
    announcement,
    latitude,
    longitude,
    locationPhotoFileID
  } = event;

  if (!vendorId) {
    throw new Error('vendorId is required');
  }

  const existing = await getOwnedVendor(vendorId, wxContext.OPENID);

  const data = {
    isActive: existing.isActive !== false,
    isOpen: !!isOpen,
    businessHours: String(businessHours || '').trim(),
    locationText: String(locationText || '').trim(),
    announcement: String(announcement || '').trim(),
    latitude,
    longitude,
    locationPhotoFileID: locationPhotoFileID || '',
    updatedAt: new Date(),
    updatedBy: wxContext.OPENID
  };

  await db.collection('vendors').doc(vendorId).update({ data });
  return { ok: true, vendorId };
};
