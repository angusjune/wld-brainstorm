const app = getApp();

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    show: { type: Boolean, value: true },
    repayDesc: {
      type: String,
      value: "",
    },
    cellProps: {
      type: Array,
      value: [
        {
          label: "怎么还",
          value: "...",
        },
        { label: "收款账号", value: "" },
        {
          label: "协议相关",
          value: "",
        },
      ],
    },
    bankCard: {
      type: Object,
      value: {},
    },
    usage: {
      type: Object,
      value: {},
    },
  },

  /**
   * 组件的初始数据
   */
  data: {
    reverse: false,
    isAgreementExpanded: false,
    discountRateFormatted: "",
  },

  attached() {
    this.setData({
      discountRateFormatted: `${app.globalData.discountRate}%`,
    });
  },

  observers: {
    repayDesc(val) {
      if (val) {
        this.setData({ "cellProps[0].value": val });
      }
    },
    bankCard(newVal) {
      if (newVal && newVal.label) {
        this.setData({
          "cellProps[1].value": newVal.label,
        });
      }
    },
    usage(newVal) {
      if (newVal && newVal.label && !this.data.isAgreementExpanded) {
        this.setData({
          "cellProps[2].value": `用于${newVal.label}`,
        });
      }
    },
    show(newVal) {
      this.setData({ reverse: newVal });
    },
    isAgreementExpanded(newVal) {
      if (newVal) {
        this.setData({
          "cellProps[2].value": "",
        });
      } else {
        this.setData({
          "cellProps[2].value": `用于${this.data.usage.label}`,
        });
      }
    },
  },

  /**
   * 组件的方法列表
   */
  methods: {
    onTapCell(e) {
      const { index, cellType } = e.currentTarget.dataset;

      if (cellType === "usage") {
        this.triggerEvent("tapusage");
        return;
      }

      if (index === this.properties.cellProps.length - 1) {
        this.setData({
          isAgreementExpanded: !this.data.isAgreementExpanded,
        });
      } else {
        this.triggerEvent("select", { index });
      }
    },
  },
});

