const app = getApp();

Component({
  properties: {
    showValue: {
      type: Boolean,
      value: true,
    },
    label: {
      type: String,
      value: "",
    },
    value: {
      type: String,
      value: "",
    },
    tip: {
      type: String,
      value: "",
    },
    unusable: {
      type: Boolean,
      value: false,
    },
    unused: {
      type: Boolean,
      value: false,
    },
    loanCouponStyle: {
      type: Number,
      value: 0,
    },
    shortenBalance: {
      type: String,
      value: "",
    },
  },

  data: {
    tipButtonText: "",
  },

  observers: {
    shortenBalance(val) {
      if (val) {
        this.setData({ tipButtonText: `借\u202f${val}` });
      }
    },
  },

  methods: {
    onTipButtonTap() {
      this.triggerEvent("tipButtonTap");
    },
  },
});
