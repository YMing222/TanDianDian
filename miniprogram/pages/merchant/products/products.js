const emptyForm = {
  _id: '',
  name: '',
  description: '',
  price: '',
  sort: 1,
  isOnSale: true,
  isSoldOut: false
};

Page({
  data: {
    vendorId: '',
    products: [],
    showForm: false,
    isEditing: false,
    isLoading: false,
    isSaving: false,
    form: { ...emptyForm }
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
      await this.loadProducts();
    } catch (error) {
      console.warn('init products failed', error);
      wx.showToast({ title: '商家信息加载失败', icon: 'none' });
    }
  },

  async loadProducts() {
    if (!this.data.vendorId) return;

    this.setData({ isLoading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'productManage',
        data: {
          action: 'list',
          vendorId: this.data.vendorId
        }
      });

      this.setData({
        products: (res.result.products || []).map((item) => this.formatProduct(item))
      });
    } catch (error) {
      console.warn('load products failed', error);
      wx.showToast({ title: '商品加载失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  formatProduct(product) {
    const isSoldOut = !!product.isSoldOut;
    const isOnSale = !!product.isOnSale;
    return {
      ...product,
      priceText: Number(product.price || 0).toFixed(2),
      statusText: isSoldOut ? '已售罄' : (isOnSale ? '上架中' : '已下架'),
      saleActionText: isOnSale ? '下架' : '上架',
      soldOutActionText: isSoldOut ? '恢复供应' : '设为售罄'
    };
  },

  openAddForm() {
    this.setData({
      showForm: true,
      isEditing: false,
      form: { ...emptyForm }
    });
  },

  editProduct(event) {
    const product = this.data.products.find((item) => item._id === event.currentTarget.dataset.id);
    if (!product) return;

    this.setData({
      showForm: true,
      isEditing: true,
      form: {
        _id: product._id,
        name: product.name || '',
        description: product.description || '',
        price: String(product.price || ''),
        sort: product.sort || 1,
        isOnSale: !!product.isOnSale,
        isSoldOut: !!product.isSoldOut
      }
    });
  },

  closeForm() {
    this.setData({
      showForm: false,
      isEditing: false,
      form: { ...emptyForm }
    });
  },

  onFormInput(event) {
    const { field } = event.currentTarget.dataset;
    this.setData({
      [`form.${field}`]: event.detail.value
    });
  },

  onFormSwitch(event) {
    const { field } = event.currentTarget.dataset;
    this.setData({
      [`form.${field}`]: event.detail.value
    });
  },

  async saveProduct() {
    if (!this.data.vendorId || this.data.isSaving) return;

    const form = this.data.form;
    const name = form.name.trim();
    const price = Number(form.price);
    const sort = Number.parseInt(form.sort, 10) || 1;

    if (!name) {
      wx.showToast({ title: '请填写商品名称', icon: 'none' });
      return;
    }

    if (form.price === '' || !Number.isFinite(price) || price < 0) {
      wx.showToast({ title: '请填写正确价格', icon: 'none' });
      return;
    }

    this.setData({ isSaving: true });
    try {
      await wx.cloud.callFunction({
        name: 'productManage',
        data: {
          action: 'save',
          vendorId: this.data.vendorId,
          productId: form._id,
          name,
          description: form.description.trim(),
          price,
          sort,
          isOnSale: !!form.isOnSale,
          isSoldOut: !!form.isSoldOut
        }
      });

      wx.showToast({ title: '已保存', icon: 'success' });
      this.closeForm();
      await this.loadProducts();
    } catch (error) {
      console.warn('save product failed', error);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ isSaving: false });
    }
  },

  toggleSale(event) {
    this.toggleProductField(event.currentTarget.dataset.id, 'isOnSale');
  },

  toggleSoldOut(event) {
    this.toggleProductField(event.currentTarget.dataset.id, 'isSoldOut');
  },

  async toggleProductField(id, field) {
    const product = this.data.products.find((item) => item._id === id);
    if (!product) return;

    const value = !product[field];
    try {
      await wx.cloud.callFunction({
        name: 'productManage',
        data: {
          action: 'updateFlags',
          vendorId: this.data.vendorId,
          productId: id,
          [field]: value
        }
      });

      const products = this.data.products.map((item) => (
        item._id === id ? this.formatProduct({ ...item, [field]: value }) : item
      ));
      this.setData({ products });
    } catch (error) {
      console.warn('toggle product field failed', error);
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  deleteProduct(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: '删除商品',
      content: '删除后顾客将无法再看到该商品，确定继续吗？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await wx.cloud.callFunction({
            name: 'productManage',
            data: {
              action: 'delete',
              vendorId: this.data.vendorId,
              productId: id
            }
          });
          wx.showToast({ title: '已删除', icon: 'success' });
          await this.loadProducts();
        } catch (error) {
          console.warn('delete product failed', error);
          wx.showToast({ title: '删除失败', icon: 'none' });
        }
      }
    });
  }
});
