sap.ui.define([], () => {
    "use strict";

    return {
        _formatDate(date1) {
            if (date1) {
                const options = {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                };
                return new Date(date1).toLocaleDateString('en-GB', options);
            }
        }
    }
});