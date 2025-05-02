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

            getId: function (oId) {
                return this.getView().byId(oId)
            },

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
                this.byId("addEmergencyContact1").setEditable(bEditable);
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
                this.byId("_IDGenCheckBox2").setEditable(bEditable);
            },

            enableSecC: function (bEditable) {
                var aControls = this.getView().getControlsByFieldGroupId("secCFields");
                aControls.forEach(function (oControl) {
                    if (oControl.getId != undefined && !oControl.getId().includes("SimpleForm")) {
                        if (oControl.getEditable != undefined && oControl.getEditable() == !bEditable) {
                            oControl.setEditable(bEditable);
                        }
                    }
                });
            },

            checkingFields: function () {

                this.getView().getModel("oneModel").setProperty("/MessageLog", []);

                var errorFlag = false;
                // checking section A fields
                var aControls = this.getView().getControlsByFieldGroupId("secAFields");
                aControls.forEach(function (oControl) {
                    if (oControl.getId != undefined && oControl.getId()) {
                        if ((oControl.getValue != undefined && oControl.getValue() == "" && oControl.getRequired != undefined && oControl.getRequired()) || (oControl.getValueState != undefined && oControl.getValueState() === sap.ui.core.ValueState.Error)) {
                            oControl.setValueState(sap.ui.core.ValueState.Error);
                            errorFlag = true;
                            this._messLog(oControl.getValueStateText());
                        }
                        else if (oControl.getValue != undefined && oControl.getValue() != "") {
                            oControl.setValueState(sap.ui.core.ValueState.None);
                        }
                    }
                }.bind(this));

                if (this.byId("_IDGenComboBox1").getSelectedKey() == "N") {
                    // checking section B
                    if (this.byId("_IDGenPanel4").getVisible()) {
                        var aControls = this.getView().getControlsByFieldGroupId("secBFields");
                        aControls.forEach(function (oControl) {
                            if (oControl.getId != undefined && oControl.getId()) {
                                if ((oControl.getValue != undefined && oControl.getValue() == "" && oControl.getRequired != undefined && oControl.getRequired()) || (oControl.getValueState != undefined && oControl.getValueState() === sap.ui.core.ValueState.Error)) {
                                    oControl.setValueState(sap.ui.core.ValueState.Error);
                                    errorFlag = true;
                                    this._messLog(oControl.getValueStateText());
                                }
                                else if (oControl.getValue != undefined && oControl.getValue() != "") {
                                    oControl.setValueState(sap.ui.core.ValueState.None);
                                }
                            }
                        }.bind(this));
                    }

                    // checking first emergency contact
                    if (this.byId("addEmergencyContact1").getSelected()) {
                        var aControls = this.getView().getControlsByFieldGroupId("emerFirstFields");
                        aControls.forEach(function (oControl) {
                            if (oControl.getId != undefined && oControl.getId()) {
                                if ((oControl.getValue != undefined && oControl.getValue() == "" && oControl.getRequired != undefined && oControl.getRequired()) || (oControl.getValueState != undefined && oControl.getValueState() === sap.ui.core.ValueState.Error)) {
                                    oControl.setValueState(sap.ui.core.ValueState.Error);
                                    errorFlag = true;
                                    if (oControl.getValueStateText)
                                        this._messLog(oControl.getValueStateText());
                                }
                            }
                        }.bind(this));
                    }

                    // checking second emergency contacts
                    if (this.byId("_IDGenCheckBox2").getSelected()) {
                        var aControls = this.getView().getControlsByFieldGroupId("emerSecondFields");
                        aControls.forEach(function (oControl) {
                            if (oControl.getId != undefined && oControl.getId()) {
                                if ((oControl.getValue != undefined && oControl.getValue() == "" && oControl.getRequired != undefined && oControl.getRequired()) || (oControl.getValueState != undefined && oControl.getValueState() === sap.ui.core.ValueState.Error)) {
                                    oControl.setValueState(sap.ui.core.ValueState.Error);
                                    errorFlag = true;
                                    if (oControl.getValueStateText)
                                        this._messLog(oControl.getValueStateText());
                                }
                            }
                        }.bind(this));
                    }
                }

                // checking section C
                if (this.byId("_IDGenPanel45").getVisible()) {
                    var aControls = this.getView().getControlsByFieldGroupId("secCFields");
                    aControls.forEach(function (oControl) {
                        if (oControl.getId != undefined && oControl.getId()) {
                            if ((oControl.getValue != undefined && oControl.getValue() == "" && oControl.getRequired != undefined && oControl.getRequired()) || (oControl.getValueState != undefined && oControl.getValueState() === sap.ui.core.ValueState.Error)) {
                                oControl.setValueState(sap.ui.core.ValueState.Error);
                                errorFlag = true;
                                if (oControl.getValueStateText)
                                    this._messLog(oControl.getValueStateText());
                            }
                        }
                    }.bind(this));
                }
            },

            _messLog: function (message) {
                var obj = {
                    "Icon": "sap-icon://status-error",
                    "Message": message,
                }
                let logMessage = this.getView().getModel("oneModel").getProperty("/MessageLog");
                logMessage.push(obj);
                this.getView().getModel("oneModel").setProperty("/MessageLog", logMessage);
            },

            batchCall: function (aData, serviceURL) {
                return new Promise(
                    function (resolve, reject) {
                        try {
                            let a = new sap.ui.model.odata.ODataModel(serviceURL + "/odata/v2", true);
                            a.bTokenHandling = false;
                            let batchData = [];
                            a.clearBatch();
                            aData.forEach(function (oItem) {
                                batchData.push(a.createBatchOperation(
                                    //   "/EmpEmployment?$filter=userId eq '" + oItem.userId + "'",
                                    oItem,
                                    "GET"
                                ));
                            });
                            a.addBatchReadOperations(batchData);
                            a.setUseBatch(true);
                            a.submitBatch(function (data) {
                                resolve(data.__batchResponses);
                            });
                        } catch (e) {
                            reject(e);
                        }
                    });
            }
        });
    });