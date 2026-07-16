const app = getApp();

Component({
  properties: {
    value: {
      type: String,
      value: "",
    },
    cursor: {
      type: Number,
      value: 0,
    },
    focus: {
      type: Boolean,
      value: false,
    },
    error: {
      type: Boolean,
      value: false,
    },
    showErrorText: {
      type: Boolean,
      value: false,
    },
    errorText: {
      type: String,
      value: "",
    },
    helperText: {
      type: String,
      value: "",
    },
    placeholder: {
      type: String,
      value: "",
    },
    animating: {
      type: Boolean,
      value: false,
    },
    initDelay: {
      type: Number,
      value: 0,
    },
    delayBetweenChars: {
      type: Number,
      value: 0,
    },
    inputStyle: {
      type: Number,
      value: 0,
    },
  },

  data: {},

  methods: {
    onTap() {
      this.triggerEvent("focus");
    },

    onTapChar(e) {
      const charIndex = e.currentTarget.dataset.index;
      this.triggerEvent("tapchar", { index: charIndex });
    },
  },
});
