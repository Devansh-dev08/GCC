sap.ui.define([], () => {
    "use strict";

    return {
        dateFormat (date1) {
            if (date1) {
                var options = {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                }
                return date1.toLocaleDateString('en-GB', options);
            }
        }
    }
})