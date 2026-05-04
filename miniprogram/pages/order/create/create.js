const db = wx.cloud ? wx.cloud.database() : null;

Page({
  data: {
    vendorId: '',
    vendor: null,
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
      const [vendorRes, productRes] = await Promise.all([
        db.collection('vendors').doc(this.data.vendorId).get(),
        db.collection('products')
          .where({
            vendorId: this.data.vendorId,
            isOnSale: true,
            isSoldOut: false
          })
          .orderBy('sort', 'asc')
          .get()
      ]);

      const vendor = vendorRes.data || {};
      const items = productRes.data.map((item, index) => {
        const flavorConfig = this.getEffectiveFlavorConfig(item, vendor);
        return {
          _id: item._id,
          name: item.name,
          price: Number(item.price || 0),
          priceText: Number(item.price || 0).toFixed(2),
          quantity: index === 0 ? 1 : 0,
          flavorOptions: flavorConfig.options,
          flavorMultiSelect: flavorConfig.multiSelect,
          selectedFlavors: [],
          selectedFlavorText: ''
        };
      });

      this.setData({
        vendor,
        items,
        totalAmount: this.sum(items)
      });
    } catch (error) {
      console.warn('load order products failed', error);
      wx.showToast({ title: '商品加载失败', icon: 'none' });
    }
  },

  getEffectiveFlavorConfig(product, vendor) {
    if (product.useVendorDefaultFlavor !== false) {
      return {
        options: vendor.defaultFlavorOptions || [],
        multiSelect: !!vendor.defaultFlavorMultiSelect
      };
    }

    return {
      options: product.flavorOptions || [],
      multiSelect: !!product.flavorMultiSelect
    };
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
      const quantity = Math.max(0, item.quantity + delta);
      const nextItem = {
        ...item,
        quantity,
        selectedFlavors: quantity > 0 ? item.selectedFlavors : []
      };
      nextItem.selectedFlavorText = nextItem.selectedFlavors.join('、');
      return nextItem;
    });
    this.setData({ items, totalAmount: this.sum(items) });
  },

  toggleFlavor(event) {
    const { id, flavor } = event.currentTarget.dataset;
    const items = this.data.items.map((item) => {
      if (item._id !== id) return item;

      const selected = item.selectedFlavors || [];
      if (item.flavorMultiSelect) {
        const nextSelected = selected.includes(flavor)
          ? selected.filter((value) => value !== flavor)
          : [...selected, flavor];
        return {
          ...item,
          selectedFlavors: nextSelected,
          selectedFlavorText: nextSelected.join('、')
        };
      }

      const nextSelected = selected.includes(flavor) ? [] : [flavor];
      return {
        ...item,
        selectedFlavors: nextSelected,
        selectedFlavorText: nextSelected.join('、')
      };
    });
    this.setData({ items });
  },

  sum(items) {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  },

  validateSelectedItems(selectedItems) {
    const missing = selectedItems.find((item) => item.flavorOptions.length && !item.selectedFlavors.length);
    if (missing) {
      wx.showToast({ title: `请选择${missing.name}的口味`, icon: 'none' });
      return false;
    }
    return true;
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

  async submitOrder() {
    if (this.data.isSubmitting) return;

    const selectedItems = this.data.items.filter((item) => item.quantity > 0);
    if (!selectedItems.length || !this.data.pickupTime || !this.data.contactPhone) {
      wx.showToast({ title: '请选择商品、取餐时间和手机号', icon: 'none' });
      return;
    }

    if (!this.validateSelectedItems(selectedItems)) return;

    this.setData({ isSubmitting: true });
    let orderId = '';
    try {
      const res = await wx.cloud.callFunction({
        name: 'orderCreate',
        data: {
          vendorId: this.data.vendorId,
          items: selectedItems.map((item) => ({
            _id: item._id,
            quantity: item.quantity,
            selectedFlavors: item.selectedFlavors
          })),
          pickupTime: this.data.pickupTime,
          contactPhone: this.data.contactPhone,
          remark: this.data.remark
        }
      });

      orderId = res.result.orderId;
      await this.requestPayment(res.result.payParams);
      wx.showToast({ title: '支付成功', icon: 'success' });
      setTimeout(() => wx.switchTab({ url: '/pages/order/list/list' }), 600);
    } catch (error) {
      console.warn('submit order or pay failed', error);
      if (orderId) {
        wx.showToast({ title: '支付未完成', icon: 'none' });
        setTimeout(() => wx.navigateTo({ url: `/pages/order/detail/detail?id=${orderId}` }), 600);
      } else {
        wx.showToast({ title: '提交失败', icon: 'none' });
      }
    } finally {
      this.setData({ isSubmitting: false });
    }
  }
});
