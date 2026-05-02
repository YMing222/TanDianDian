const db = wx.cloud ? wx.cloud.database() : null;

Page({
  data: {
    vendorId: '',
    orders: [],
    isLoading: false
  },

  onShow() {
    this.init();
  },

  async init() {
    try {
      const res = await wx.cloud.callFunction({ name: 'vendorGetMine' });
      const result = res.result || {};
      if (!result.authorized) {
        wx.showToast({ title: '暂无商家权限', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 500);
        return;
      }

      getApp().globalData.vendor = result.vendor;
      this.setData({ vendorId: result.vendor._id });
      await this.loadOrders();
    } catch (error) {
      console.warn('init merchant orders failed', error);
      wx.showToast({ title: '商家信息加载失败', icon: 'none' });
    }
  },

  async loadOrders() {
    if (!db || !this.data.vendorId) return;

    this.setData({ isLoading: true });
    try {
      const res = await db.collection('orders')
        .where({ vendorId: this.data.vendorId })
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      this.setData({
        orders: res.data.map((order) => this.formatOrder(order))
      });
    } catch (error) {
      console.warn('load merchant orders failed', error);
      wx.showToast({ title: '订单加载失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  formatOrder(order) {
    return {
      ...order,
      itemText: (order.items || []).map((item) => `${item.name} x${item.quantity}`).join('，'),
      totalText: Number(order.totalAmount || 0).toFixed(2),
      canAccept: order.status === 'pending',
      canReject: order.status === 'pending',
      canComplete: order.status === 'accepted'
    };
  },

  async updateStatus(event) {
    const { id, status } = event.currentTarget.dataset;
    try {
      await wx.cloud.callFunction({
        name: 'orderUpdateStatus',
        data: {
          orderId: id,
          status
        }
      });
      wx.showToast({ title: '已更新', icon: 'success' });
      await this.loadOrders();
    } catch (error) {
      console.warn('update order status failed', error);
      wx.showToast({ title: '更新失败', icon: 'none' });
    }
  }
});
