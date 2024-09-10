/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"comgccclaimsqa/cf01qa/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
