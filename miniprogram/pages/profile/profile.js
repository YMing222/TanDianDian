Page({
  data: {
    checkingMerchant: false,
    loadingOpenid: false,
    openid: ''
  },

  async openMerchant() {
    if (this.data.checkingMerchant) return;

    this.setData({ checkingMerchant: true });
    try {
      const res = await wx.cloud.callFunction({ name: 'vendorGetMine' });
      const result = res.result || {};

      if (!result.authorized) {
        wx.showModal({
          title: '暂未开通商家权限',
          content: '请先联系平台管理员，把你的微信 openid 加到对应摊位的 ownerOpenids 中。',
          showCancel: false
        });
        return;
      }

      getApp().globalData.vendor = result.vendor;
      wx.navigateTo({ url: '/pages/merchant/dashboard/dashboard' });
    } catch (error) {
      console.warn('check merchant permission failed', error);
      wx.showToast({ title: '权限校验失败', icon: 'none' });
    } finally {
      this.setData({ checkingMerchant: false });
    }
  },

  async getOpenid() {
    if (this.data.loadingOpenid) return;

    this.setData({ loadingOpenid: true });
    try {
      const res = await wx.cloud.callFunction({ name: 'getOpenid' });
      const openid = res.result && res.result.openid;
      this.setData({ openid });
      wx.showToast({ title: '已获取 OpenID', icon: 'success' });
    } catch (error) {
      console.warn('get openid failed', error);
      wx.showToast({ title: '获取失败', icon: 'none' });
    } finally {
      this.setData({ loadingOpenid: false });
    }
  },

  copyOpenid() {
    if (!this.data.openid) {
      wx.showToast({ title: '请先获取 OpenID', icon: 'none' });
      return;
    }

    wx.setClipboardData({
      data: this.data.openid,
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    });
  }
});
