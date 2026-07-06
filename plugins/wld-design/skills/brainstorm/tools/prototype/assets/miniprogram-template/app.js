App({
  globalData: {
    balance: 60000,
    rate: 14.4,
    discountRate: 10.8,
    selectedTerm: 12,
    bankCard: {
      label: "工商银行\u202f(2004)",
      value: "icbc"
    },
    usage: {
      label: "个人日常消费",
      value: "daily"
    }
  },

  get shortenBalance() {
    const balance = this.globalData.balance;
    return balance % 10000 === 0
      ? `${balance / 10000}\u202f万`
      : `¥${balance}`;
  },

  isAmountValid(value, min = 100, max = this.globalData.balance) {
    if (value === "" || value == null) {
      return { valid: false, msg: "", showNow: false };
    }

    const amount = Number(value);
    if (Number.isNaN(amount)) {
      return { valid: false, msg: "请输入数字金额", showNow: true };
    }
    if (amount < min) {
      return { valid: false, msg: `单笔借钱金额最低\u202f¥${min}`, showNow: false };
    }
    if (amount > max) {
      return { valid: false, msg: `当前最多借\u202f¥${max}`, showNow: true };
    }
    if (amount % 100 !== 0) {
      return { valid: false, msg: "借钱金额需为\u202f100\u202f的倍数", showNow: false };
    }

    return { valid: true, msg: "", showNow: false };
  },

  buildGlobalDataSync() {
    const g = this.globalData;
    return {
      balance: g.balance,
      rate: g.rate,
      discountRate: g.discountRate,
      shortenBalance: this.shortenBalance,
      selectedTerm: g.selectedTerm,
      bankCard: g.bankCard,
      usage: g.usage
    };
  }
});
