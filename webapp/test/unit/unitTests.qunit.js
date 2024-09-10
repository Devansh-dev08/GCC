/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"comgcceformsex01/ex01/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
