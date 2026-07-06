// components/wld-checkbox/wld-checkbox.js
var tickSvg = (function () {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">'
        + '<path d="M6 13l4 4 9-10" fill="none" stroke="#333" '
        + 'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" '
        + 'stroke-dasharray="20" stroke-dashoffset="20">'
        + '<animate attributeName="stroke-dashoffset" from="20" to="0" '
        + 'dur="0.3s" fill="freeze"/>'
        + '</path></svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
})();

Component({
    properties: {
        checked: {
            type: Boolean,
            value: false
        },
        disabled: {
            type: Boolean,
            value: false
        }
    },

    data: {
        tickSvg: tickSvg
    },

    methods: {
        onTap() {
            if (this.data.disabled) return;
            this.triggerEvent('change', { checked: !this.data.checked });
        }
    }
})
