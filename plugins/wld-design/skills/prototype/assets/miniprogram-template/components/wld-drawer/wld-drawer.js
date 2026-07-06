// components/wld-drawer/wld-drawer.js
Component({
    /**
     * 组件的属性列表
     */
    properties: {
        show: { type: Boolean, value: false, observer: "onShowChange" },
        title: { type: String },
        subtitle: { type: String },
        fullWidth: { type: Boolean, value: false },
    },

    /**
     * 组件的初始数据
     */
    data: {
        visible: false,
        animationData: "",
    },

    /**
     * 组件的方法列表
     */
    methods: {
        onShowChange(newVal, oldVal) {
            if (newVal) {
                this.showDrawer();
            } else {
                this.hideDrawer();
            }
        },

        showDrawer() {
            this.setData({
                visible: true,
            });
            setTimeout(() => {
                this.setData({
                    animationData: "slideInUp",
                });
            }, 20);
        },

        hideDrawer() {
            this.setData({
                animationData: "slideOutDown",
            });
        },

        closeDrawer() {
            this.setData({
                show: false,
            });
            this.triggerEvent("close");
        },
        onAnimationEnd() {
            if (!this.properties.show) {
                this.setData({
                    visible: false,
                });
            }
        },
    },
});