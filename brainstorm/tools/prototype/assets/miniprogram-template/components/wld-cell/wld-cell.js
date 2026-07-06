// wld-cell.js
Component({
  /**
   * Component options
   */
  options: {
    // Enable support for multiple named slots
    multipleSlots: true,
  },

  /**
   * Component properties
   */
  properties: {
    // The main text label on the left side
    label: {
      type: String,
      value: "",
    },
    // The value text on the right side (used if the 'value' slot is not provided)
    value: {
      type: String,
      value: "",
    },
    // Whether to show the leading icon slot area
    withLeading: {
      type: Boolean,
      value: false,
    },
    // Whether to show the trailing icon slot area (defaults to true for the chevron)
    withTrailing: {
      type: Boolean,
      value: true,
    },
    // Determines if the cell is tappable and shows a hover state
    tappable: {
      type: Boolean,
      value: true,
    },
    type: {
      type: String,
      value: "default",
    },
    chevronRotate: {
      type: Boolean,
      value: false,
    },
  },

  /**
   * Component initial data
   */
  data: {},

  /**
   * Component methods
   */
  methods: {
    // You can add methods here if needed, for example, to handle taps internally
    // and trigger an event. For simple cases, the parent can listen to the tap
    // event directly.
  },
});
