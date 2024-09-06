/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"comgccabsenceqa/ar02qa/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
