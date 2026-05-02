Page({
  data: {
    vendorId: '',
    isOpen: true,
    startTime: '18:00',
    endTime: '23:00',
    locationText: '',
    announcement: '',
    latitude: 39.908823,
    longitude: 116.39747,
    locationPhotoFileID: '',
    locationPhotoUrl: '',
    isUploadingPhoto: false
  },

  onShow() {
    this.loadStall();
  },

  async loadStall() {
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
      let locationPhotoUrl = '';

      if (vendor.locationPhotoFileID) {
        const urlRes = await wx.cloud.getTempFileURL({
          fileList: [vendor.locationPhotoFileID]
        });
        locationPhotoUrl = urlRes.fileList[0] && urlRes.fileList[0].tempFileURL;
      }

      const [startTime = this.data.startTime, endTime = this.data.endTime] = (vendor.businessHours || '').split('-');
      this.setData({
        vendorId: vendor._id,
        isOpen: !!vendor.isOpen,
        startTime,
        endTime,
        locationText: vendor.locationText || '',
        announcement: vendor.announcement || '',
        latitude: vendor.latitude || this.data.latitude,
        longitude: vendor.longitude || this.data.longitude,
        locationPhotoFileID: vendor.locationPhotoFileID || '',
        locationPhotoUrl
      });
    } catch (error) {
      console.warn('load stall failed', error);
      wx.showToast({ title: '出摊信息加载失败', icon: 'none' });
    }
  },

  toggleOpen(event) {
    this.setData({ isOpen: event.detail.value });
  },

  onStartChange(event) {
    this.setData({ startTime: event.detail.value });
  },

  onEndChange(event) {
    this.setData({ endTime: event.detail.value });
  },

  onLocationInput(event) {
    this.setData({ locationText: event.detail.value });
  },

  onAnnouncementInput(event) {
    this.setData({ announcement: event.detail.value });
  },

  useCurrentLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({ latitude: res.latitude, longitude: res.longitude });
        wx.showToast({ title: '已获取当前位置', icon: 'success' });
      },
      fail: () => wx.showToast({ title: '定位失败', icon: 'none' })
    });
  },

  chooseStallPhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      camera: 'back',
      success: async (res) => {
        const filePath = res.tempFiles[0].tempFilePath;
        await this.uploadStallPhoto(filePath);
      }
    });
  },

  async uploadStallPhoto(filePath) {
    if (!this.data.vendorId) {
      wx.showToast({ title: '请先加载商家信息', icon: 'none' });
      return;
    }

    this.setData({ isUploadingPhoto: true });
    try {
      const extension = this.getFileExtension(filePath);
      const cloudPath = `vendors/${this.data.vendorId}/stall-location-${Date.now()}.${extension}`;
      const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath });
      this.setData({
        locationPhotoFileID: uploadRes.fileID,
        locationPhotoUrl: filePath
      });
      await this.save(false);
      wx.showToast({ title: '照片已上传', icon: 'success' });
    } catch (error) {
      console.warn('upload stall photo failed', error);
      wx.showToast({ title: '照片上传失败', icon: 'none' });
    } finally {
      this.setData({ isUploadingPhoto: false });
    }
  },

  getFileExtension(filePath) {
    const match = filePath.match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1] : 'jpg';
  },

  previewLocationPhoto() {
    const url = this.data.locationPhotoUrl || this.data.locationPhotoFileID;
    if (!url) return;
    wx.previewImage({ urls: [url], current: url });
  },

  async save(showToast = true) {
    if (!this.data.vendorId) return;

    try {
      await wx.cloud.callFunction({
        name: 'vendorSaveStall',
        data: {
          vendorId: this.data.vendorId,
          isOpen: this.data.isOpen,
          businessHours: `${this.data.startTime}-${this.data.endTime}`,
          locationText: this.data.locationText,
          announcement: this.data.announcement,
          latitude: this.data.latitude,
          longitude: this.data.longitude,
          locationPhotoFileID: this.data.locationPhotoFileID
        }
      });
      if (showToast) {
        wx.showToast({ title: '已保存', icon: 'success' });
      }
    } catch (error) {
      console.warn('save stall failed', error);
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  }
});
