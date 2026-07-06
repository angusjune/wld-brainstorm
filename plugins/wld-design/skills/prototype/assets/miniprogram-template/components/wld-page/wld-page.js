// components/wld-page/wld-page.js
const app = getApp();

Component({

  /**
   * 组件的属性列表
   */
  properties: {
    navBack: {
      type: Boolean,
      value: true,
    },
    navTitle: {
      type: String,
      value: '微粒贷'
    },
    navSubtitle: {
      type: String,
      value: ''
    },
    background: {
      type: String,
      value: '#fff'
    },
    fixed: {
        type: Boolean,
        value: true
    },
    bare: {
        type: Boolean,
        value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    safeAreaTop: 'padding-top: 91px'
  },

  lifetimes: {
    attached() {
      const platform = (wx.getDeviceInfo() || wx.getSystemInfoSync()).platform
      const isAndroid = platform === 'android'
      const isDevtools = platform === 'devtools'
      const { safeArea: { top = 0, bottom = 0 } = {} } = wx.getWindowInfo() || wx.getSystemInfoSync()
      this.setData({
        safeAreaTop: isDevtools || isAndroid ? `padding-top: ${44 + top}px` : `padding-top: calc(44px + env(safe-area-inset-top))`
      })
    },
  },

  pageLifetimes: {
    show() {
      const pages = getCurrentPages();
      if (!pages.length) return;
      const page = pages[pages.length - 1];
      page.setData(app.buildGlobalDataSync());
      if (typeof page.onGlobalDataSync === 'function') {
        page.onGlobalDataSync();
      }
    },
  },

  /**
   * 组件的方法列表
   */
  methods: {

  }
})
