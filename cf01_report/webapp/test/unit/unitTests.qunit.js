/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"comgccreport/cf01_report/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
