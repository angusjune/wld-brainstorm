Component({
  properties: {
    balance: {
      type: Number,
      value: 0,
    },
    vibrate: {
      type: Boolean,
      value: true,
    },
    disabled: {
      type: Boolean,
      value: false,
    },
    loading: {
      type: Boolean,
      value: false,
    },
    confirmText: {
      type: String,
      value: "下一步",
    },
    value: {
      type: String,
      value: "",
    },
    cursor: {
      type: Number,
      value: 0,
    },
    maxLength: {
      type: Number,
      value: -1,
    },
    backspaceName: {
      type: String,
      value: "backspace",
    },
    confirmName: {
      type: String,
      value: "confirm",
    },
    hideName: {
      type: String,
      value: "hide",
    },
  },
  data: {
    _intv: null,
    _longPressed: false,
  },
  observers: {
    loading: function (loading) {
      this.setData({ disabled: loading });
    },
    balance: function (balance) {
      this.setData({
        recoms: [
          balance > 10000 && { label: "借\u202f1\u202f万", value: 10000 },
          balance > 20000 && { label: "借\u202f2\u202f万", value: 20000 },
          balance > 30000 && { label: "借\u202f3\u202f万", value: 30000 },
          { label: "借全部", value: balance },
        ],
      });
    },
  },
  methods: {
    onTapRecomBtn(e) {
      const value = e.currentTarget.dataset.val.toString();
      const cursor = value.length;
      this.triggerEvent("input", { value, cursor });
      wx.vibrateShort({ type: "light" });
    },
    onKeyTap(e) {
      const keyVal = e.target.dataset.value;

      let eventName = "";
      let { value, cursor } = this.data;

      if (keyVal === undefined || this.data.disabled) {
        return;
      }

      if (
        keyVal !== this.data.backspaceName &&
        keyVal !== this.data.confirmName &&
        keyVal !== this.data.hideName
      ) {
        const currentLength = value.length;
        const newLength = currentLength + keyVal.length; //输入期望内容后的长度
        const maxLength = this.data.maxLength;

        // 输入内容超出最大长度
        if (newLength > maxLength && maxLength > -1) {
          const acceptableLength = maxLength - currentLength; // 仍可输入的长度
          const acceptedKeyVal = keyVal.substring(0, acceptableLength);

          // 仅输入至最大长度允许的内容长度
          value = value.slice(0, cursor) + acceptedKeyVal + value.slice(cursor);
          cursor += acceptedKeyVal.length;

          this.triggerEvent("maxlengthreached", {
            value,
            cursor,
            acceptedKeyVal,
          });
        } else {
          value = value.slice(0, cursor) + keyVal + value.slice(cursor);
          cursor += keyVal.length;
        }

        eventName = "input";
      } else if (keyVal === this.data.backspaceName) {
        // 按下删除键
        value =
          value.substring(0, cursor - 1) +
          value.substring(cursor, value.length);

        // 移动光标
        if (cursor > 0) {
          cursor--;
        }

        eventName = "input";
      } else if (keyVal === this.data.confirmName) {
        // 按下确认键
        eventName = "confirm";
      } else if (keyVal === this.data.hideName) {
        // 按下确认键
        eventName = "hide";
      }

      this.setData({ value, cursor });

      const detail = { value, cursor, keyVal };
      this.triggerEvent(eventName, detail);
    },

    onKeyTouchStart(e) {
      if (this.data.vibrate && !this.data._longPressed) {
        wx.vibrateShort({ type: "light" });
      }
    },

    onKeyLongPress(e) {
      this.setData({
        _intv: setInterval(() => {
          this.onKeyTap(e);
        }, 50),
        _longPressed: true,
      });
    },

    onKeyTouchEnd(e) {
      this.onKeyTap(e);
      clearInterval(this.data._intv);
      this.setData({ _intv: null, _longPressed: false });
    },
  },
});
