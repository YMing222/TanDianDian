const db = wx.cloud ? wx.cloud.database() : null;

Page({
  data: {
    vendorId: '',
    vendor: {
      _id: 'demo-yuanyuan',
      name: '元元棒棒鸡',
      category: '凉菜 / 棒棒鸡',
      isOpen: true,
      announcement: '今天 18:00 出摊，招牌棒棒鸡限量供应。',
      locationText: '夜市入口左侧，黄色餐车',
      businessHours: '18:00-23:00',
      phone: '',
      latitude: 39.908823,
      longitude: 116.39747,
      locationPhotoFileID: '',
      locationPhotoUrl: ''
    },
    products: [
      { _id: 'p1', name: '招牌棒棒鸡', description: '微辣，可备注少辣', price: 18 },
      { _id: 'p2', name: '鸡丝凉面', description: '适合提前预约', price: 12 }
    ]
  },

  onLoad(options) {
    this.setData({ vendorId: options.id || 'demo-yuanyuan' });
    this.loadVendor();
  },

  async loadVendor() {
    if (!db) return;
    try {
      const [vendorRes, productRes] = await Promise.all([
        db.collection('vendors').doc(this.data.vendorId).get(),
        db.collection('products').where({ vendorId: this.data.vendorId, isOnSale: true }).get()
      ]);
      const vendor = vendorRes.data;
      if (vendor.locationPhotoFileID) {
        const urlRes = await wx.cloud.getTempFileURL({
          fileList: [vendor.locationPhotoFileID]
        });
        vendor.locationPhotoUrl = urlRes.fileList[0] && urlRes.fileList[0].tempFileURL;
      }
      this.setData({
        vendor,
        products: productRes.data.length ? productRes.data : this.data.products
      });
    } catch (error) {
      console.warn('load vendor failed', error);
    }
  },

  openMap() {
    const { vendor } = this.data;
    wx.openLocation({
      latitude: vendor.latitude,
      longitude: vendor.longitude,
      name: vendor.name,
      address: vendor.locationText
    });
  },

  callVendor() {
    if (!this.data.vendor.phone) {
      wx.showToast({ title: '商家暂未填写电话', icon: 'none' });
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
    wx.navigateTo({
      url: `/pages/order/create/create?vendorId=${this.data.vendorId}`
    });
  }
});
