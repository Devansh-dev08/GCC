sap.ui.define([
    "sap/ui/core/mvc/Controller",
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller) {
        "use strict";

        return Controller.extend("com.gcc.newstarterqa.newstarterqa.controller.baseController", {
            onInit: function () { },

            enableSecA: function (bEditable) {
                var aControls = this.getView().getControlsByFieldGroupId("secAFields");
                aControls.forEach(function (oControl) {
                    if (oControl.getId != undefined && !oControl.getId().includes("SimpleForm")) {
                        if (oControl.getEditable != undefined && oControl.getEditable() == !bEditable) {
                            oControl.setEditable(bEditable);
                        }
                    }
                });
                this.byId("_IDGenButton122").setEnabled(bEditable);
            },

            checkSecA: function () {
                var aControls = this.getView().getControlsByFieldGroupId("secAFields");
                var errorFlag = false;
                aControls.forEach(function (oControl) {
                    if (oControl.getId != undefined && !oControl.getId().includes("SimpleForm")) {
                        if ((oControl.getValue != undefined && oControl.getValue() == "" && oControl.getRequired != undefined && oControl.getRequired()) || (oControl.getValueState != undefined && oControl.getValueState() === sap.ui.core.ValueState.Error)) {
                            oControl.setValueState(sap.ui.core.ValueState.Error);
                            errorFlag = true;
                        }
                        else if (oControl.getValue != undefined && oControl.getValue() != "") {
                            oControl.setValueState(sap.ui.core.ValueState.None);
                        }
                    }
                });
                return errorFlag;
            },

            enableSecB: function (bEditable) {
                var aControls = this.getView().getControlsByFieldGroupId("secBFields");
                aControls.forEach(function (oControl) {
                    if (oControl.getId != undefined && !oControl.getId().includes("SimpleForm")) {
                        if (oControl.getEditable != undefined && oControl.getEditable() == !bEditable) {
                            oControl.setEditable(bEditable);
                        }
                    }
                });
            },

            showSecAFields: function (bVisible) {
                this.byId("_IDGenLabel621").setVisible(bVisible);
                this.byId("_IDGenInput10").setVisible(bVisible);
                this.byId("_IDGenLabel6421").setVisible(bVisible);
                this.byId("_IDGenComboBox411").setVisible(bVisible);
                this.byId("_IDGenLabel6411").setVisible(bVisible);
                this.byId("_IDGenInput11").setVisible(bVisible);
                this.byId("_IDGenLabel611").setVisible(bVisible);
                this.byId("_IDGenInput112").setVisible(bVisible);
                this.byId("_IDGenInput112").setEditable(false);
                this.byId("idempCame1").setEditable(false);
            },

            enableFirstEmer: function (bEditable) {
                var aControls = this.getView().getControlsByFieldGroupId("emerFirstFields");
                aControls.forEach(function (oControl) {
                    if (oControl.getId != undefined && !oControl.getId().includes("SimpleForm")) {
                        if (oControl.getEditable != undefined && oControl.getEditable() == !bEditable) {
                            oControl.setEditable(bEditable);
                        }
                    }
                });
            },

            enableSecEmer: function (bEditable) {
                var aControls = this.getView().getControlsByFieldGroupId("emerSecondFields");
                aControls.forEach(function (oControl) {
                    if (oControl.getId != undefined && !oControl.getId().includes("SimpleForm")) {
                        if (oControl.getEditable != undefined && oControl.getEditable() == !bEditable) {
                            oControl.setEditable(bEditable);
                        }
                    }
                });
            },
        });
    });