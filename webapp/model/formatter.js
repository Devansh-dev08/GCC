sap.ui.define([], function () {
	"use strict";

	return {
		dateTime: function (dateTime) {
			if (dateTime !== null) {
				return dateTime.getDate() + "." + (dateTime.getMonth() + 1) + "." + dateTime.getFullYear();
			}
		},

		dateFormat: function (dateVal) {
			var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "dd MMM yyyy" });
			return dateFormat.format(new Date(dateVal));
		}
	};
});