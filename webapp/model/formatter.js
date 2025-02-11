sap.ui.define([], function () {
    "use strict";

    return {
        dateFormat: function (dateVal) {
            if (dateVal) {
                var temp = dateVal.split("/").reverse().join("-");
                var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "MMM dd, YYYY" });
                return dateFormat.format(new Date(temp));
            }
        }
    };
});