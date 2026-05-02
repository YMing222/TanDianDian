Page({
  data: {
    orders: [],
    isLoading: false
  },

  onShow() {
    this.loadOrders();
  },

  async loadOrders() {
    this.setData({ isLoading: true });
    try {
      const res = await wx.cloud.callFunction({ name: 'orderGetMine' });
      this.setData({
        orders: (res.result.orders || []).map((order) => ({
          ...order,
          vendorName: order.vendorName || '小吃摊',
          itemText: (order.items || []).map((item) => `${item.name} x${item.quantity}`).join('，'),
          totalText: Number(order.totalAmount || 0).toFixed(2)
        }))
      });
    } catch (error) {
      console.warn('load orders failed', error);
      wx.showToast({ title: '订单加载失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  }
});
