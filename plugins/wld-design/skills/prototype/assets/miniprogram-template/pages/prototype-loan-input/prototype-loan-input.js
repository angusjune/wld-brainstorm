const app = getApp();

Page({
  data: {
    balance: app.globalData.balance,
    rate: app.globalData.rate,
    shortenBalance: app.shortenBalance,
    inputVal: String(app.globalData.balance),
    inputCursor: String(app.globalData.balance).length,
    inputValid: true,
    showErrorText: false,
    errorText: "",
    focus: false,
    repayDesc: `分\u202f${app.globalData.selectedTerm}\u202f个月，首期约还\u202f¥5,286.00`,
    bankCard: app.globalData.bankCard,
    usage: app.globalData.usage,
    showDrawer: false,
    drawerType: "",
    drawerTitle: "",
    drawerSubtitle: "",
    drawerSelectedIndex: 0,
    drawerItems: []
  },

  onFocusAmount() {
    this.setData({
      focus: true,
      inputCursor: this.data.inputVal.length
    });
  },

  onTapChar(e) {
    this.setData({
      focus: true,
      inputCursor: e.detail.index
    });
  },

  onKeypadInput(e) {
    const { value, cursor } = e.detail;
    const result = app.isAmountValid(value);
    this.setData({
      inputVal: value,
      inputCursor: cursor,
      inputValid: result.valid,
      showErrorText: result.showNow,
      errorText: result.msg
    });
  },

  hideKeypad() {
    this.setData({
      focus: false,
      showErrorText: !this.data.inputValid
    });
  },

  openCouponDrawer() {
    this.setData({
      showDrawer: true,
      drawerType: "coupon",
      drawerTitle: "选择优惠",
      drawerSubtitle: "示例优惠列表，可按设计稿替换",
      drawerSelectedIndex: 0,
      drawerItems: [
        { label: "前 30 天 0 利息", desc: "当前默认优惠" },
        { label: "不使用优惠", desc: "按原年利率计息" }
      ]
    });
  },

  openOptionsDrawer(e) {
    const index = e.detail.index;
    if (index === 0) {
      this.setData({
        showDrawer: true,
        drawerType: "term",
        drawerTitle: "怎么还",
        drawerSubtitle: "选择借多久",
        drawerSelectedIndex: 1,
        drawerItems: [
          { label: "6 个月", desc: "每月还款更高，总利息更少" },
          { label: "12 个月", desc: "当前示例选择" },
          { label: "24 个月", desc: "每月还款更低" }
        ]
      });
    }
  },

  openUsageDrawer() {
    this.setData({
      showDrawer: true,
      drawerType: "usage",
      drawerTitle: "借款用途",
      drawerSubtitle: "示例选项，可替换为设计稿内容",
      drawerSelectedIndex: 0,
      drawerItems: [
        { label: "个人日常消费" },
        { label: "装修" },
        { label: "教育培训" }
      ]
    });
  },

  onDrawerSelect(e) {
    const index = e.detail.index;
    const item = this.data.drawerItems[index];
    if (!item) return;

    if (this.data.drawerType === "usage") {
      this.setData({ usage: { label: item.label, value: index } });
    }
    if (this.data.drawerType === "term") {
      const term = [6, 12, 24][index] || 12;
      app.globalData.selectedTerm = term;
      this.setData({ repayDesc: `分\u202f${term}\u202f个月，首期约还\u202f¥5,286.00` });
    }
    this.setData({ showDrawer: false });
  },

  closeDrawer() {
    this.setData({ showDrawer: false });
  },

  submit() {
    const result = app.isAmountValid(this.data.inputVal);
    this.setData({
      inputValid: result.valid,
      showErrorText: !result.valid,
      errorText: result.msg
    });
    if (!result.valid) return;

    wx.showToast({
      title: "Demo 下一步",
      icon: "none"
    });
  }
});
