// components/wld-button/wld-button.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    type: {
      type: String,
      value: "primary",
    },
    disabled: {
      type: Boolean,
      value: false,
    },
    showGlare: {
      type: Boolean,
      value: false,
    },
    size: {
      type: String,
      value: "normal",
    },
    fullWidth: {
      type: Boolean,
      value: false,
    },
  },

  /**
   * 组件的初始数据
   */
  data: {},

  /**
   * 组件的方法列表
   */
  methods: {
    onTap: function () {
      if (this.data.type === "circle") {
        wx.vibrateShort({
          type: "light",
        });
      }
    },
  },
});
