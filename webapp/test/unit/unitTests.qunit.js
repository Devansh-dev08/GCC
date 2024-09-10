/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"pd01_qa/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
