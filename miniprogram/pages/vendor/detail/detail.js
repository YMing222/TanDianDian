const db = wx.cloud ? wx.cloud.database() : null;

Page({
  data: {
    vendorId: '',
    vendor: {
      _id: '',
      name: '小吃摊',
      category: '小吃',
      isOpen: false,
      announcement: '',
      locationText: '',
      businessHours: '',
      phone: '',
      latitude: 39.908823,
      longitude: 116.39747,
      locationPhotoFileID: '',
      locationPhotoUrl: '',
      statusText: '暂停出摊'
    },
    products: []
  },

  onLoad(options) {
    this.setData({ vendorId: options.id || '' });
    this.loadVendor();
  },

  async loadVendor() {
    if (!db || !this.data.vendorId) return;

    try {
      const [vendorRes, productRes] = await Promise.all([
        db.collection('vendors').doc(this.data.vendorId).get(),
        db.collection('products')
          .where({ vendorId: this.data.vendorId, isOnSale: true })
          .orderBy('sort', 'asc')
          .get()
      ]);
      const vendor = {
        ...vendorRes.data,
        statusText: vendorRes.data.isOpen ? '正在出摊' : '暂停出摊'
      };

      if (vendor.locationPhotoFileID) {
        const urlRes = await wx.cloud.getTempFileURL({
          fileList: [vendor.locationPhotoFileID]
        });
        vendor.locationPhotoUrl = urlRes.fileList[0] && urlRes.fileList[0].tempFileURL;
      }

      this.setData({
        vendor,
        products: productRes.data.map((product) => ({
          ...product,
          priceText: Number(product.price || 0).toFixed(2),
          statusText: product.isSoldOut ? '已售罄' : ''
        }))
      });
    } catch (error) {
      console.warn('load vendor failed', error);
      wx.showToast({ title: '摊位加载失败', icon: 'none' });
    }
  },

  openMap() {
    const { vendor } = this.data;
    if (!vendor.latitude || !vendor.longitude) {
      wx.showToast({ title: '摊主暂未设置位置', icon: 'none' });
      return;
    }

    wx.openLocation({
      latitude: vendor.latitude,
      longitude: vendor.longitude,
      name: vendor.name,
      address: vendor.locationText
    });
  },

  callVendor() {
    if (!this.data.vendor.phone) {
      wx.showToast({ title: '摊主暂未填写电话', icon: 'none' });
      return;
    }
    wx.makePhoneCall({ phoneNumber: this.data.vendor.phone });
  },

  previewLocationPhoto() {
    const url = this.data.vendor.locationPhotoUrl || this.data.vendor.locationPhotoFileID;
    if (!url) return;
    wx.previewImage({ urls: [url], current: url });
  },

  createOrder() {
    if (!this.data.vendor.isOpen) {
      wx.showToast({ title: '摊主当前未出摊', icon: 'none' });
      return;
    }

    wx.navigateTo({
      url: `/pages/order/create/create?vendorId=${this.data.vendorId}`
    });
  }
});
