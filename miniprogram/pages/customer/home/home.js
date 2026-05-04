const db = wx.cloud ? wx.cloud.database() : null;

Page({
  data: {
    vendors: [],
    userLocation: null
  },

  onShow() {
    this.loadVendors();
  },

  async loadVendors() {
    if (!db) return;

    try {
      const res = await db.collection('vendors').where({ isActive: true }).limit(20).get();
      const vendors = res.data.map((item) => this.formatVendor(item));
      this.setData({
        vendors: this.data.userLocation ? this.sortVendorsByDistance(vendors, this.data.userLocation) : vendors
      });
    } catch (error) {
      console.warn('load vendors failed', error);
      wx.showToast({ title: '摊位加载失败', icon: 'none' });
    }
  },

  formatVendor(vendor) {
    return {
      ...vendor,
      statusText: vendor.isOpen ? '正在出摊' : '暂停出摊',
      distanceText: vendor.distanceText || '距离待计算',
      locationText: vendor.locationText || '暂未设置出摊位置',
      businessHours: vendor.businessHours || '今日未填写'
    };
  },

  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          userLocation: {
            latitude: res.latitude,
            longitude: res.longitude
          },
          vendors: this.sortVendorsByDistance(this.data.vendors, res)
        });
        wx.showToast({ title: '已获取定位', icon: 'success' });
      },
      fail: () => wx.showToast({ title: '定位失败', icon: 'none' })
    });
  },

  getDistanceText(location, vendor) {
    const distance = this.getDistanceValue(location, vendor);
    if (distance === null) return '距离待计算';

    return distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`;
  },

  getDistanceValue(location, vendor) {
    if (!vendor.latitude || !vendor.longitude) return null;

    return this.getDistance(
      location.latitude,
      location.longitude,
      vendor.latitude,
      vendor.longitude
    );
  },

  getDistance(lat1, lng1, lat2, lng2) {
    const radius = 6378137;
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLng = (lng2 - lng1) * rad;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * radius * Math.asin(Math.sqrt(a));
  },

  sortVendorsByDistance(vendors, location) {
    return vendors
      .map((vendor) => {
        const distanceValue = this.getDistanceValue(location, vendor);
        return {
          ...vendor,
          distanceValue,
          distanceText: distanceValue === null ? '距离待计算' : this.getDistanceText(location, vendor)
        };
      })
      .sort((a, b) => {
        if (a.distanceValue === null) return 1;
        if (b.distanceValue === null) return -1;
        return a.distanceValue - b.distanceValue;
      });
  },

  openVendor(event) {
    wx.navigateTo({
      url: `/pages/vendor/detail/detail?id=${event.currentTarget.dataset.id}`
    });
  }
});
