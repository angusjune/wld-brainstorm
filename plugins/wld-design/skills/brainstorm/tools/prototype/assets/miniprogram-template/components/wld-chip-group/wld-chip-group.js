// components/wld-chip-group/wld-chip-group.js
Component({

  /**
   * 组件的属性列表
   */
  properties: {
    // 芯片数据数组
    items: {
      type: Array,
      value: ['6\u202f个月', '12\u202f个月', '24\u202f个月']
    },
    // 选择模式：single(单选) | multiple(多选) | none(不可选)
    selectionMode: {
      type: String,
      value: 'single'
    },
    // 默认选中的索引（单选模式）
    defaultSelectedIndex: {
      type: Number,
      value: 1
    },
    // 默认选中的索引数组（多选模式）
    defaultSelectedIndexes: {
      type: Array,
      value: []
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    },
    // 最大选择数量（多选模式）
    maxSelection: {
      type: Number,
      value: -1
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    selectedIndex: -1,           // 单选模式下选中的索引
    selectedIndexes: []          // 多选模式下选中的索引数组
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this.initSelection();
    }
  },

  /**
   * 监听属性变化
   */
  observers: {
    'defaultSelectedIndex, defaultSelectedIndexes, selectionMode': function() {
      this.initSelection();
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 初始化选择状态
     */
    initSelection() {
      const { selectionMode, defaultSelectedIndex, defaultSelectedIndexes } = this.properties;
      
      if (selectionMode === 'single') {
        this.setData({
          selectedIndex: defaultSelectedIndex,
          selectedIndexes: []
        });
      } else if (selectionMode === 'multiple') {
        this.setData({
          selectedIndex: -1,
          selectedIndexes: [...defaultSelectedIndexes]
        });
      } else {
        this.setData({
          selectedIndex: -1,
          selectedIndexes: []
        });
      }
    },

    /**
     * 点击芯片事件处理
     */
    onSelect(e) {
      if (this.properties.disabled) {
        return;
      }

      const { index } = e.currentTarget.dataset;
      const { selectionMode, maxSelection, items } = this.properties;
      const clickedIndex = parseInt(index);

      if (selectionMode === 'none') {
        // 不可选模式，只触发点击事件
        this.triggerEvent('chipclick', {
          index: clickedIndex,
          item: items[clickedIndex]
        });
        return;
      }

      if (selectionMode === 'single') {
        // 单选模式
        const newSelectedIndex = clickedIndex;
        // const newSelectedIndex = this.data.selectedIndex === clickedIndex ? -1 : clickedIndex;
        this.setData({
          selectedIndex: newSelectedIndex
        });

        this.triggerEvent('selectionchange', {
          selectedIndex: newSelectedIndex,
          // selectedItem: newSelectedIndex >= 0 ? items[newSelectedIndex] : null,
          // selectedIndexes: newSelectedIndex >= 0 ? [newSelectedIndex] : [],
          // selectedItems: newSelectedIndex >= 0 ? [items[newSelectedIndex]] : []
        });

      } else if (selectionMode === 'multiple') {
        // 多选模式
        let newSelectedIndexes = [...this.data.selectedIndexes];
        const isSelected = newSelectedIndexes.includes(clickedIndex);

        if (isSelected) {
          // 取消选择
          newSelectedIndexes = newSelectedIndexes.filter(i => i !== clickedIndex);
        } else {
          // 添加选择
          if (maxSelection > 0 && newSelectedIndexes.length >= maxSelection) {
            // 达到最大选择数量
            this.triggerEvent('maxselectionreached', {
              maxSelection,
              currentSelection: newSelectedIndexes.length
            });
            return;
          }
          newSelectedIndexes.push(clickedIndex);
        }

        // 排序索引数组
        newSelectedIndexes.sort((a, b) => a - b);

        this.setData({
          selectedIndexes: newSelectedIndexes
        });

        this.triggerEvent('selectionchange', {
          selectedIndex: newSelectedIndexes.length > 0 ? newSelectedIndexes[0] : -1,
          selectedItem: newSelectedIndexes.length > 0 ? items[newSelectedIndexes[0]] : null,
          selectedIndexes: newSelectedIndexes,
          selectedItems: newSelectedIndexes.map(i => items[i])
        });
      }

      // 触发芯片点击事件
      this.triggerEvent('chipclick', {
        index: clickedIndex,
        item: items[clickedIndex]
      });
    },

    /**
     * 获取当前选择状态
     */
    getSelection() {
      const { items, selectionMode } = this.properties;
      const { selectedIndex, selectedIndexes } = this.data;

      if (selectionMode === 'single') {
        return {
          selectedIndex,
          selectedItem: selectedIndex >= 0 ? items[selectedIndex] : null,
          selectedIndexes: selectedIndex >= 0 ? [selectedIndex] : [],
          selectedItems: selectedIndex >= 0 ? [items[selectedIndex]] : []
        };
      } else if (selectionMode === 'multiple') {
        return {
          selectedIndex: selectedIndexes.length > 0 ? selectedIndexes[0] : -1,
          selectedItem: selectedIndexes.length > 0 ? items[selectedIndexes[0]] : null,
          selectedIndexes,
          selectedItems: selectedIndexes.map(i => items[i])
        };
      }

      return {
        selectedIndex: -1,
        selectedItem: null,
        selectedIndexes: [],
        selectedItems: []
      };
    },

    /**
     * 清空选择
     */
    clearSelection() {
      this.setData({
        selectedIndex: -1,
        selectedIndexes: []
      });

      this.triggerEvent('selectionchange', {
        selectedIndex: -1,
        selectedItem: null,
        selectedIndexes: [],
        selectedItems: []
      });
    },

    /**
     * 设置选择（程序化控制）
     */
    // setSelection(indexes) {
    //   const { selectionMode, items } = this.properties;
      
    //   if (selectionMode === 'single') {
    //     const index = Array.isArray(indexes) ? indexes[0] : indexes;
    //     const selectedIndex = typeof index === 'number' && index >= 0 && index < items.length ? index : -1;
        
    //     this.setData({
    //       selectedIndex
    //     });
    //   } else if (selectionMode === 'multiple') {
    //     const validIndexes = (Array.isArray(indexes) ? indexes : [indexes])
    //       .filter(i => typeof i === 'number' && i >= 0 && i < items.length)
    //       .sort((a, b) => a - b);
        
    //     this.setData({
    //       selectedIndexes: validIndexes
    //     });
    //   }
    // }
  }
})