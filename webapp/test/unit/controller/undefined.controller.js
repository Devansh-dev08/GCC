/*global QUnit*/

sap.ui.define([
	"comgcceformsex01/ex01/controller/.controller"
], function (Controller) {
	"use strict";

	QUnit.module(" Controller");

	QUnit.test("I should test the  controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
