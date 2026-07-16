// components/wld-mask/wld-mask.js
Component({
    /**
     * 组件的属性列表
     */
    properties: {
        show: { type: Boolean, value: false, observer: "onShowChange" },
        tapToClose: { type: Boolean, value: true },
        blur: { type: Boolean, value: false },
    },

    /**
     * 组件的初始数据
     */
    data: {
        visible: false, // Controls if the component is in the DOM (`wx:if`)
        animationData: "", // Holds the current animation class ('fade-enter' or 'fade-leave')
    },

    /**
     * 组件的方法列表
     */
    methods: {
        /**
         * Observer that triggers whenever the `show` property changes.
         */
        onShowChange(newVal, oldVal) {
            if (newVal) {
                // If `show` becomes true, we want to show the mask.
                this.showMask();
            } else {
                // If `show` becomes false, we want to hide the mask.
                this.hideMask();
            }
        },

        /**
         * Logic to display the mask with a fade-in animation.
         */
        showMask() {
            // 1. First, set `visible` to true to add the component to the DOM.
            //    It will be transparent initially due to the base .mask style (opacity: 0).
            this.setData({
                visible: true,
            });

            // 2. In the next paint cycle (using setTimeout), apply the fade-in class.
            //    This delay is crucial to ensure the transition is triggered correctly.
            setTimeout(() => {
                this.setData({
                    animationData: "fade-enter",
                });
            }, 20); // A small delay is enough
        },

        /**
         * Logic to hide the mask with a fade-out animation.
         */
        hideMask() {
            // Apply the fade-out animation class. This will start the
            // opacity transition from 1 to 0.
            this.setData({
                animationData: "fade-leave",
            });
        },

        /**
         * This method is called by `bind:transitionend` in the WXML.
         * It fires when the CSS transition on the mask element completes.
         */
        onAnimationEnd() {
            // We only care about the end of the fade-out animation.
            // The `show` prop will be false when we are hiding the mask.
            if (!this.properties.show) {
                // The fade-out is complete, now we can safely remove the
                // element from the DOM by setting `visible` to false.
                this.setData({
                    visible: false,
                });
            }
        },

        onMaskTap() {
            // If the property is enabled, emit a 'close' event.
            // The parent page will listen for this event to hide the mask.
            if (this.properties.tapToClose) {
                this.triggerEvent("close");
            }
        },

        /**
         * An empty method to catch touchmove events on the mask,
         * preventing scrolling of the page underneath.
         */
        noop() {},
    },
});