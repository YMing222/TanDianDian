const paymentStatusTextMap = {
  unpaid: '待支付',
  paying: '支付确认中',
  paid: '已支付',
  refunding: '退款中',
  refunded: '已退款',
  refund_failed: '退款失败'
};

Page({
  data: {
    orderId: '',
    order: null,
    items: [],
    isLoading: false,
    isPaying: false,
    isCanceling: false
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
      const canPay = order.status === 'unpaid' && order.paymentStatus !== 'paid';
      const canCancel = ['unpaid', 'pending'].includes(order.status)
        && !['refunding', 'refunded'].includes(order.paymentStatus);

      this.setData({
        order: {
          ...order,
          vendorName: order.vendorName || '小吃摊',
          totalText: Number(order.totalAmount || 0).toFixed(2),
          paymentStatusText: paymentStatusTextMap[order.paymentStatus] || '未知支付状态',
          canPay,
          canCancel
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
  },

  requestPayment(payParams) {
    return new Promise((resolve, reject) => {
      wx.requestPayment({
        ...payParams,
        success: resolve,
        fail: reject
      });
    });
  },

  async payAgain() {
    if (this.data.isPaying) return;
    this.setData({ isPaying: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'orderPay',
        data: { orderId: this.data.orderId }
      });
      await this.requestPayment(res.result.payParams);
      wx.showToast({ title: '支付成功', icon: 'success' });
      await this.loadOrder();
    } catch (error) {
      console.warn('pay order failed', error);
      wx.showToast({ title: '支付未完成', icon: 'none' });
      await this.loadOrder();
    } finally {
      this.setData({ isPaying: false });
    }
  },

  cancelOrder() {
    if (!this.data.order || this.data.isCanceling) return;
    wx.showModal({
      title: '取消订单',
      content: this.data.order.paymentStatus === 'paid'
        ? '商家接单前取消会自动发起原路退款，确定继续吗？'
        : '确定取消这个订单吗？',
      success: async (res) => {
        if (!res.confirm) return;
        this.setData({ isCanceling: true });
        try {
          await wx.cloud.callFunction({
            name: 'orderCancel',
            data: { orderId: this.data.orderId }
          });
          wx.showToast({ title: '已取消', icon: 'success' });
          await this.loadOrder();
        } catch (error) {
          console.warn('cancel order failed', error);
          wx.showToast({ title: '取消失败', icon: 'none' });
        } finally {
          this.setData({ isCanceling: false });
        }
      }
    });
  }
});
