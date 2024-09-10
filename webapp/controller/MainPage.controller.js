sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/ui/core/routing/History",
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, MessageBox, History) {
        "use strict";
        var createSettings = false;

        return Controller.extend("com.gcc.eforms.settingsapp.settingsapp.controller.MainPage", {
            onInit: function () {

                var model1 = new sap.ui.model.json.JSONModel();
                this.getOwnerComponent().getModel().read("/zrtgtgw_settings_appSet",
                    {
                        success: function (data) {
                            if (data.results.length != 1) {
                                createSettings = true;
                                data = {
                                    results: [{
                                        Vendorblocked: false,
                                        Futureinvoice: false,
                                        Pathattachment: "",
                                        Pathinvoicedata: "",
                                        Pathinvoiceheader: ""
                                    }]
                                }
                            }
                            const curretData = Object.assign({}, data.results[0]);
                            model1.setProperty("/CurrentVal", curretData);
                            model1.setProperty("/UpdatedVal", data.results[0]);
                            this.getView().setModel(model1, "Data")
                        }.bind(this),
                        error: function (e) {
                            MessageBox.error(`Could not proceed because ${JSON.parse(e.responseText).error.message.value}`)
                        }
                    });
            },

            onChange: function (oEvent) {

                var currentValue = Object.entries(this.getView().getModel("Data").getProperty("/CurrentVal"));
                var updatedVal = Object.entries(this.getView().getModel("Data").getProperty("/UpdatedVal"));

                for (let key in currentValue) {
                    if (currentValue[key][1] !== updatedVal[key][1]) {
                        this.getView().byId("_IDGenButton3").setEnabled(true);
                        break;
                    }
                    else {
                        this.getView().byId("_IDGenButton3").setEnabled(false);
                    }
                }
            },

            onReset: function () {
                var currentVal = Object.assign({}, this.getView().getModel("Data").getProperty("/CurrentVal"))
                this.getView().getModel("Data").setProperty("/UpdatedVal", currentVal);
                this.getView().byId("_IDGenButton3").setEnabled(false);

            },

            onSave: function () {
                MessageBox.alert("Are you sure you want to Save the Data?", {
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                    onClose: function (oAction) {
                        if (oAction === sap.m.MessageBox.Action.YES) {
                            var data = this.getView().getModel("Data").getProperty("/UpdatedVal");
                            var RequestPayload = {
                                "Mandt": createSettings ? "" : data.Mandt,
                                "Vendorblocked": data.Vendorblocked,
                                "Futureinvoice": data.Futureinvoice,
                                "Pathattachment": data.Pathattachment,
                                "Pathinvoicedata": data.Pathinvoicedata,
                                "Pathinvoiceheader": data.Pathinvoiceheader
                            }
                            if (createSettings) {
                                this.getOwnerComponent().getModel().create(`/zrtgtgw_settings_appSet`, RequestPayload, {
                                    success: function () {
                                        MessageBox.success("Data saved successfully!", {
                                            actions: [sap.m.MessageBox.Action.OK],
                                            onClose: function (oAction) {
                                                if (oAction) {
                                                    var oHistory, sPreviousHash;
                                                    oHistory = History.getInstance();
                                                    sPreviousHash = oHistory.getPreviousHash();
                                                    if (sPreviousHash == undefined) {
                                                        window.history.go(-1);
                                                    }
                                                }
                                            }
                                        })
                                    },
                                    error: function (e) {
                                        MessageBox.error(`Data could not be saved because ${JSON.parse(e.responseText).error.message.value}`)
                                    }
                                })
                            }
                            else {
                                this.getOwnerComponent().getModel().update(`/zrtgtgw_settings_appSet(Mandt='${data.Mandt}')`, RequestPayload, {
                                    success: function () {
                                        MessageBox.success("Data saved successfully!", {
                                            actions: [sap.m.MessageBox.Action.OK],
                                            onClose: function (oAction) {
                                                if (oAction) {
                                                    var oHistory, sPreviousHash;
                                                    oHistory = History.getInstance();
                                                    sPreviousHash = oHistory.getPreviousHash();
                                                    if (sPreviousHash == undefined) {
                                                        window.history.go(-1);
                                                    }
                                                }
                                            }
                                        })
                                    },
                                    error: function (e) {
                                        MessageBox.error(`Data could not be saved because ${JSON.parse(e.responseText).error.message.value}`)
                                    }
                                })
                            }
                        }
                    }.bind(this)
                })
            },

            onCancel: function () {

                MessageBox.alert(`This will discard all the changes done.
                Do you wish to proceed?`, {
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                    onClose: function (oAction) {
                        if (oAction === sap.m.MessageBox.Action.YES) {
                            var oHistory, sPreviousHash;
                            oHistory = History.getInstance();
                            sPreviousHash = oHistory.getPreviousHash();
                            if (sPreviousHash == undefined) {
                                window.history.go(-1);
                            }
                        }
                    }
                })
            }
        });
    });
