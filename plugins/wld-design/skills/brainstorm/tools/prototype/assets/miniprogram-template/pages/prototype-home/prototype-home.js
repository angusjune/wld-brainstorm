const app = getApp();

Page({
  data: {
    balance: app.globalData.balance,
    rate: app.globalData.rate,
    bankCard: app.globalData.bankCard,
    terms: ["6\u202f个月", "12\u202f个月", "24\u202f个月"],
    showDrawer: false
  },

  goLoan() {
    wx.navigateTo({
      url: "/pages/prototype-loan-input/prototype-loan-input"
    });
  },

  onTermChange(e) {
    const selectedIndex = e.detail.selectedIndex;
    app.globalData.selectedTerm = [6, 12, 24][selectedIndex] || 12;
  },

  openDrawer() {
    this.setData({ showDrawer: true });
  },

  closeDrawer() {
    this.setData({ showDrawer: false });
  }
});
