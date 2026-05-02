const db = wx.cloud ? wx.cloud.database() : null;

Page({
  data: {
    vendors: [
      {
        _id: 'demo-yuanyuan',
        name: '元元棒棒鸡',
        category: '凉菜 / 棒棒鸡',
        statusText: '营业中',
        distanceText: '约 800m',
        locationText: '夜市入口左侧，黄色餐车',
        businessHours: '18:00-23:00'
      }
    ]
  },

  onShow() {
    this.loadVendors();
  },

  async loadVendors() {
    if (!db) return;
    try {
      const res = await db.collection('vendors').where({ isActive: true }).limit(20).get();
      if (res.data.length) {
        this.setData({
          vendors: res.data.map((item) => ({
            ...item,
            statusText: item.isOpen ? '营业中' : '未出摊',
            distanceText: item.distanceText || '距离待计算',
            locationText: item.locationText || '位置待发布'
          }))
        });
      }
    } catch (error) {
      console.warn('load vendors failed', error);
    }
  },

  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        wx.showToast({ title: '已获取位置', icon: 'success' });
        console.info('location', res);
      },
      fail: () => wx.showToast({ title: '定位失败', icon: 'none' })
    });
  },

  openVendor(event) {
    wx.navigateTo({
      url: `/pages/vendor/detail/detail?id=${event.currentTarget.dataset.id}`
    });
  }
});
