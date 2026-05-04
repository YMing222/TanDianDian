const presetFlavors = ['不辣', '微辣', '中辣', '重辣', '少盐', '少糖', '不要香菜', '不要葱'];

Page({
  data: {
    vendorId: '',
    name: '',
    category: '',
    phone: '',
    description: '',
    defaultFlavorOptions: [],
    defaultFlavorMultiSelect: false,
    customFlavor: '',
    presetFlavors,
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
        description: vendor.description || '',
        defaultFlavorOptions: vendor.defaultFlavorOptions || [],
        defaultFlavorMultiSelect: !!vendor.defaultFlavorMultiSelect
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

  onCustomFlavorInput(event) {
    this.setData({ customFlavor: event.detail.value });
  },

  toggleDefaultFlavorMulti(event) {
    this.setData({ defaultFlavorMultiSelect: event.detail.value });
  },

  togglePresetFlavor(event) {
    const flavor = event.currentTarget.dataset.flavor;
    this.toggleFlavor(flavor);
  },

  addCustomFlavor() {
    const flavor = this.data.customFlavor.trim();
    if (!flavor) {
      wx.showToast({ title: '请填写口味名称', icon: 'none' });
      return;
    }
    this.toggleFlavor(flavor, true);
    this.setData({ customFlavor: '' });
  },

  removeFlavor(event) {
    const flavor = event.currentTarget.dataset.flavor;
    this.setData({
      defaultFlavorOptions: this.data.defaultFlavorOptions.filter((item) => item !== flavor)
    });
  },

  toggleFlavor(flavor, forceAdd = false) {
    const current = this.data.defaultFlavorOptions;
    if (!forceAdd && current.includes(flavor)) {
      this.setData({ defaultFlavorOptions: current.filter((item) => item !== flavor) });
      return;
    }

    if (current.includes(flavor)) return;
    this.setData({ defaultFlavorOptions: [...current, flavor] });
  },

  isPresetSelected(flavor) {
    return this.data.defaultFlavorOptions.includes(flavor);
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
          description: this.data.description,
          defaultFlavorOptions: this.data.defaultFlavorOptions,
          defaultFlavorMultiSelect: this.data.defaultFlavorMultiSelect
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
