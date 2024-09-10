/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"comgccreports/ex01report/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
