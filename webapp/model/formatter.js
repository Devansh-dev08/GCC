sap.ui.define([], () => {
    "use strict";

    return {

        dateFormat(dateVal) {
            if (dateVal) {
                var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "dd MMM yyyy" });
                return dateFormat.format(new Date(dateVal));
            }
        }

    }
});