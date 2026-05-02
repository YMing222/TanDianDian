App({
  globalData: {
    cloudEnv: 'cloud1-d4g43wspydccf06e4',
    userInfo: null,
    vendor: null,
    role: 'customer'
  },

  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: this.globalData.cloudEnv,
        traceUser: true
      });
    }
  }
});
