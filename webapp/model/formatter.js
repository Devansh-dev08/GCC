sap.ui.define([], function () {
    'use strict';
    return {
        Char16: function (value) {
            if (value) {
                return value.substring(0, 16);
            }
        },

        Char50: function (value) {
            if (value) {
                return value.substring(0, 50);
            }
        },

        deciPlaces: function (value) {
            if (value) {
                var numValue = Number(value);
                return numValue.toFixed(2);
            }
        }
    }

});