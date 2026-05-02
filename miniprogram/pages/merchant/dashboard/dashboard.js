Page({
  data: {
    vendorId: '',
    vendorName: '',
    isOpen: false,
    locationText: '',
    loading: true
  },

  onShow() {
    this.loadVendor();
  },

  async loadVendor() {
    try {
      const res = await wx.cloud.callFunction({ name: 'vendorGetMine' });
      const result = res.result || {};
      if (!result.authorized) {
        wx.showToast({ title: '暂无商家权限', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 500);
        return;
      }

      const vendor = result.vendor;
      getApp().globalData.vendor = vendor;
      this.setData({
        vendorId: vendor._id,
        vendorName: vendor.name || '我的摊位',
        isOpen: !!vendor.isOpen,
        locationText: vendor.locationText || '还没有设置今日出摊位置',
        loading: false
      });
    } catch (error) {
      console.warn('load merchant dashboard failed', error);
      wx.showToast({ title: '商家信息加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  async toggleOpen(event) {
    const isOpen = event.detail.value;
    this.setData({ isOpen });

    try {
      await wx.cloud.callFunction({
        name: 'vendorSaveStall',
        data: {
          vendorId: this.data.vendorId,
          isOpen,
          businessHours: getApp().globalData.vendor.businessHours || '',
          locationText: this.data.locationText,
          announcement: getApp().globalData.vendor.announcement || '',
          latitude: getApp().globalData.vendor.latitude,
          longitude: getApp().globalData.vendor.longitude,
          locationPhotoFileID: getApp().globalData.vendor.locationPhotoFileID || ''
        }
      });
    } catch (error) {
      console.warn('toggle stall open failed', error);
      this.setData({ isOpen: !isOpen });
      wx.showToast({ title: '状态更新失败', icon: 'none' });
    }
  },

  goStall() {
    wx.navigateTo({ url: '/pages/merchant/stall/stall' });
  },

  goProducts() {
    wx.navigateTo({ url: '/pages/merchant/products/products' });
  },

  goOrders() {
    wx.navigateTo({ url: '/pages/merchant/orders/orders' });
  },

  goProfile() {
    wx.navigateTo({ url: '/pages/merchant/profile/profile' });
  }
});
