Page({
  data: {
    orderId: '',
    order: null,
    items: [],
    isLoading: false
  },

  onLoad(options) {
    this.setData({ orderId: options.id || '' });
    this.loadOrder();
  },

  async loadOrder() {
    if (!this.data.orderId) return;

    this.setData({ isLoading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'orderGetDetail',
        data: { orderId: this.data.orderId }
      });
      const order = res.result.order;
      this.setData({
        order: {
          ...order,
          vendorName: order.vendorName || '小吃摊',
          totalText: Number(order.totalAmount || 0).toFixed(2)
        },
        items: (order.items || []).map((item) => ({
          ...item,
          priceText: Number(item.price || 0).toFixed(2),
          subtotalText: Number((item.price || 0) * (item.quantity || 0)).toFixed(2),
          flavorText: item.flavorText || ''
        }))
      });
    } catch (error) {
      console.warn('load order detail failed', error);
      wx.showToast({ title: '订单详情加载失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  }
});
