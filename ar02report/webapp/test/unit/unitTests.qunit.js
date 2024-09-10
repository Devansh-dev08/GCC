/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"comgccreportsar02/ar02report/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
