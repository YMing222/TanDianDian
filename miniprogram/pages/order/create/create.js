const db = wx.cloud ? wx.cloud.database() : null;

Page({
  data: {
    vendorId: '',
    pickupTime: '',
    contactPhone: '',
    remark: '',
    items: [],
    totalAmount: 0,
    isSubmitting: false
  },

  onLoad(options) {
    this.setData({ vendorId: options.vendorId || '' });
    this.loadProducts();
  },

  async loadProducts() {
    if (!db || !this.data.vendorId) return;

    try {
      const res = await db.collection('products')
        .where({
          vendorId: this.data.vendorId,
          isOnSale: true,
          isSoldOut: false
        })
        .orderBy('sort', 'asc')
        .get();

      const items = res.data.map((item, index) => ({
        _id: item._id,
        name: item.name,
        price: Number(item.price || 0),
        priceText: Number(item.price || 0).toFixed(2),
        quantity: index === 0 ? 1 : 0
      }));

      this.setData({
        items,
        totalAmount: this.sum(items)
      });
    } catch (error) {
      console.warn('load order products failed', error);
      wx.showToast({ title: '商品加载失败', icon: 'none' });
    }
  },

  onPickupTimeChange(event) {
    this.setData({ pickupTime: event.detail.value });
  },

  onPhoneInput(event) {
    this.setData({ contactPhone: event.detail.value });
  },

  onRemarkInput(event) {
    this.setData({ remark: event.detail.value });
  },

  plus(event) {
    this.updateQuantity(event.currentTarget.dataset.id, 1);
  },

  minus(event) {
    this.updateQuantity(event.currentTarget.dataset.id, -1);
  },

  updateQuantity(id, delta) {
    const items = this.data.items.map((item) => {
      if (item._id !== id) return item;
      return { ...item, quantity: Math.max(0, item.quantity + delta) };
    });
    this.setData({ items, totalAmount: this.sum(items) });
  },

  sum(items) {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  },

  async submitOrder() {
    if (this.data.isSubmitting) return;

    const selectedItems = this.data.items.filter((item) => item.quantity > 0);
    if (!selectedItems.length || !this.data.pickupTime || !this.data.contactPhone) {
      wx.showToast({ title: '请选择商品、取餐时间和手机号', icon: 'none' });
      return;
    }

    this.setData({ isSubmitting: true });
    try {
      await wx.cloud.callFunction({
        name: 'orderCreate',
        data: {
          vendorId: this.data.vendorId,
          items: selectedItems.map((item) => ({
            _id: item._id,
            quantity: item.quantity
          })),
          pickupTime: this.data.pickupTime,
          contactPhone: this.data.contactPhone,
          remark: this.data.remark
        }
      });

      wx.showToast({ title: '预约已提交', icon: 'success' });
      setTimeout(() => wx.switchTab({ url: '/pages/order/list/list' }), 600);
    } catch (error) {
      console.warn('submit order failed', error);
      wx.showToast({ title: '提交失败', icon: 'none' });
    } finally {
      this.setData({ isSubmitting: false });
    }
  }
});
