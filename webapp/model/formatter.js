sap.ui.define([], () => {
    "use strict";

    return {
        dateFormat (date1) {
            if (date1) {
                var options = {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }
                return date1.toLocaleDateString('en-GB', options);k
            }
        },

        colorChange (value) {
            if (value) {
                return ""
            }
            else return "TblCellColorChng";
        },

        WSDataFormat (value) {
            if (value) return "true";
            else return "false";
        }
    }
})
