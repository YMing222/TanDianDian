const db = wx.cloud ? wx.cloud.database() : null;
const _ = db ? db.command : null;
const visiblePaymentStatuses = ['paid', 'refunding', 'refunded', 'refund_failed'];

Page({
  data: {
    vendorId: '',
    orders: [],
    isLoading: false,
    realtimeMode: ''
  },

  watcher: null,
  pollTimer: null,

  onShow() {
    this.init();
  },

  onHide() {
    this.stopRealtime();
  },

  onUnload() {
    this.stopRealtime();
  },

  async init() {
    this.stopRealtime();
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
      this.startRealtime();
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
        .where({
          vendorId: this.data.vendorId,
          paymentStatus: _.in(visiblePaymentStatuses)
        })
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      this.setOrders(res.data);
    } catch (error) {
      console.warn('load merchant orders failed', error);
      wx.showToast({ title: '订单加载失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  startRealtime() {
    if (!db || !this.data.vendorId) {
      this.startPolling();
      return;
    }

    try {
      this.watcher = db.collection('orders')
        .where({
          vendorId: this.data.vendorId,
          paymentStatus: _.in(visiblePaymentStatuses)
        })
        .orderBy('createdAt', 'desc')
        .watch({
          onChange: (snapshot) => {
            this.setData({ realtimeMode: '实时更新中' });
            this.setOrders(snapshot.docs || []);
          },
          onError: (error) => {
            console.warn('watch merchant orders failed', error);
            this.closeWatcher();
            this.startPolling();
          }
        });
    } catch (error) {
      console.warn('start merchant order watch failed', error);
      this.startPolling();
    }
  },

  startPolling() {
    this.stopPolling();
    this.setData({ realtimeMode: '轮询更新中' });
    this.pollTimer = setInterval(() => {
      this.loadOrders();
    }, 8000);
  },

  stopRealtime() {
    this.closeWatcher();
    this.stopPolling();
  },

  closeWatcher() {
    if (this.watcher && this.watcher.close) {
      this.watcher.close();
    }
    this.watcher = null;
  },

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    this.pollTimer = null;
  },

  setOrders(orders) {
    this.setData({
      orders: (orders || []).map((order) => this.formatOrder(order))
    });
  },

  formatOrder(order) {
    return {
      ...order,
      itemText: (order.items || []).map((item) => {
        const flavor = item.flavorText ? `（${item.flavorText}）` : '';
        return `${item.name} x${item.quantity}${flavor}`;
      }).join('，'),
      totalText: Number(order.totalAmount || 0).toFixed(2),
      refundText: order.paymentStatus === 'refunding' ? '退款中' : (order.paymentStatus === 'refunded' ? '已退款' : ''),
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
