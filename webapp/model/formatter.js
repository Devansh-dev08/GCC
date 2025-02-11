sap.ui.define([], function () {
    "use strict";

    return {
        decimalPlaces: function (value) {
            if (value) {
                if (value.includes("."))
                    return value.toFixed(2);
                else return value;
            }
        }
    };
});