// components/wld-select-group/wld-select-group.js
Component({
    /**
     * 组件的属性列表
     */
    properties: {
        items: {
            type: Array,
            value: [],
        },
        selectedIndex: {
            type: Number,
            value: 0,
        },
    },

    /**
     * 组件的初始数据
     */
    data: {
        indexDifference: 0,
    },

    /**
     * 组件的方法列表
     */
    methods: {
        onSelect(e) {
            const index = e.currentTarget.dataset.index;
            this.setData({
                selectedIndex: index,
                indexDifference: Math.abs(index - this.data.selectedIndex),
            });
            this.triggerEvent("selectOption", { index });
        },
    },
});
