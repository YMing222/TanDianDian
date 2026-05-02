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

async function listProducts(vendorId) {
  const res = await db.collection('products')
    .where({ vendorId })
    .orderBy('sort', 'asc')
    .get();
  return res.data;
}

async function assertOwnedProduct(productId, vendorId) {
  if (!productId) {
    throw new Error('productId is required');
  }

  const res = await db.collection('products').doc(productId).get();
  if (!res.data || res.data.vendorId !== vendorId) {
    throw new Error('product not found');
  }
}

function normalizeProduct(event, vendorId) {
  const name = String(event.name || '').trim();
  const price = Number(event.price);
  const sort = Number.parseInt(event.sort, 10) || 1;

  if (!name) {
    throw new Error('product name is required');
  }

  if (!Number.isFinite(price) || price < 0) {
    throw new Error('product price is invalid');
  }

  return {
    vendorId,
    name,
    description: String(event.description || '').trim(),
    price,
    sort,
    isOnSale: !!event.isOnSale,
    isSoldOut: !!event.isSoldOut
  };
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { action, vendorId, productId } = event;

  if (!vendorId) {
    throw new Error('vendorId is required');
  }

  await getOwnedVendor(vendorId, wxContext.OPENID);

  if (action === 'list') {
    return { products: await listProducts(vendorId) };
  }

  if (action === 'save') {
    const now = new Date();
    const data = {
      ...normalizeProduct(event, vendorId),
      updatedAt: now,
      updatedBy: wxContext.OPENID
    };

    if (productId) {
      await assertOwnedProduct(productId, vendorId);
      await db.collection('products').doc(productId).update({ data });
      return { ok: true, productId };
    }

    const result = await db.collection('products').add({
      data: {
        ...data,
        createdAt: now,
        createdBy: wxContext.OPENID
      }
    });
    return { ok: true, productId: result._id };
  }

  if (action === 'updateFlags') {
    await assertOwnedProduct(productId, vendorId);
    const data = { updatedAt: new Date(), updatedBy: wxContext.OPENID };

    if (typeof event.isOnSale === 'boolean') {
      data.isOnSale = event.isOnSale;
    }

    if (typeof event.isSoldOut === 'boolean') {
      data.isSoldOut = event.isSoldOut;
    }

    await db.collection('products').doc(productId).update({ data });
    return { ok: true, productId };
  }

  if (action === 'delete') {
    await assertOwnedProduct(productId, vendorId);
    await db.collection('products').doc(productId).remove();
    return { ok: true, productId };
  }

  throw new Error('unknown product action');
};
