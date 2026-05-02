Page({
  data: {
    vendorId: '',
    name: '',
    category: '',
    phone: '',
    description: '',
    isSaving: false
  },

  onShow() {
    this.loadProfile();
  },

  async loadProfile() {
    try {
      const res = await wx.cloud.callFunction({ name: 'vendorGetMine' });
      const result = res.result || {};
      if (!result.authorized) {
        wx.showToast({ title: '暂无商家权限', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 500);
        return;
      }

      const vendor = result.vendor;
      getApp().globalData.vendor = vendor;
      this.setData({
        vendorId: vendor._id,
        name: vendor.name || '',
        category: vendor.category || '',
        phone: vendor.phone || '',
        description: vendor.description || ''
      });
    } catch (error) {
      console.warn('load vendor profile failed', error);
      wx.showToast({ title: '资料加载失败', icon: 'none' });
    }
  },

  onNameInput(event) {
    this.setData({ name: event.detail.value });
  },

  onCategoryInput(event) {
    this.setData({ category: event.detail.value });
  },

  onPhoneInput(event) {
    this.setData({ phone: event.detail.value });
  },

  onDescriptionInput(event) {
    this.setData({ description: event.detail.value });
  },

  async save() {
    if (!this.data.vendorId || this.data.isSaving) return;
    if (!this.data.name.trim()) {
      wx.showToast({ title: '请填写摊位名称', icon: 'none' });
      return;
    }

    this.setData({ isSaving: true });
    try {
      await wx.cloud.callFunction({
        name: 'vendorSaveProfile',
        data: {
          vendorId: this.data.vendorId,
          name: this.data.name,
          category: this.data.category,
          phone: this.data.phone,
          description: this.data.description
        }
      });
      wx.showToast({ title: '已保存', icon: 'success' });
    } catch (error) {
      console.warn('save vendor profile failed', error);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ isSaving: false });
    }
  }
});
