/*global XLSX:true*/
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/library",
    "sap/ui/core/Item",
    "sap/m/upload/Uploader",
    "sap/m/StandardListItem"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, MessageBox, MobileLibrary, Item, Uploader, ListItem) {
        "use strict";

        var ListMode = MobileLibrary.ListMode, guidId = "", prefix = "", displayMode = false;

        var CustomUploader = Uploader.extend("zerotouch.UploadSetCustomUploader.CustomUploader", {
            metadata: {}
        });

        CustomUploader.prototype.uploadItem = function (oItem, aHeaders) {
            var sNewUploadUrl = prefix + "/sap/opu/odata/sap/ZRTRGTGW_CONS_INV_SRV/zrtgtgw_ci_fileSet"; // This value may be result of a backend request eg.
            aHeaders.push(new Item({ key: "Posting", text: "PostingAttachment" }));
            this.setUploadUrl(sNewUploadUrl);

            Uploader.prototype.uploadItem.call(this, oItem, aHeaders);
        };

        CustomUploader.prototype.downloadItem = function (oItem, aHeaders, bAskForLocation) {
            var sNewDownloadUrl = oItem.getUrl(); // This value may be result of a backend request eg.
            aHeaders.push(new Item({ key: "SomeGetKey", text: "SomeGetText" }));
            this.setDownloadUrl(sNewDownloadUrl);

            Uploader.prototype.downloadItem.call(this, oItem, aHeaders, bAskForLocation);
        };

        return Controller.extend("zerotouch.controller.Main", {
            onInit: function () {
                this.excelData = new sap.ui.model.json.JSONModel();
                this.getView().setModel(this.excelData, "excelData");
                prefix = sap.ui.require.toUrl(this.getOwnerComponent().getManifestEntry('/sap.app/id').replaceAll('.', '/'));
                this.getOwnerComponent().getRouter().getRoute("RouteMain").attachPatternMatched(this._onRouteMatched, this);
            },

            AttachingEvents: function () {
                var oUploadSet = sap.ui.getCore().byId("UploadSet2"),
                    oCustomUploader = new CustomUploader();

                oUploadSet.setUploader(oCustomUploader);
                oUploadSet.registerUploaderEvents(oCustomUploader);

                // Attach separate set of event handlers to demonstrate custom progress monitoring
                oCustomUploader.attachUploadStarted(this.onUploadStarted.bind(this));
                oCustomUploader.attachUploadCompleted(this.onUploadCompleted.bind(this));
                oCustomUploader.attachUploadAborted(this.onUploadAborted.bind(this));
            },

            _onRouteMatched: function (oEvent) {
                var oModel = new sap.ui.model.json.JSONModel();
                const url = this.getBaseURL() + "/user-api/currentUser";

                // Fetching the Guid ID and mode in the url
                var query = oEvent.getParameter('arguments')["?query"];

                var mock = {
                    firstname: "Dummy",
                    lastname: "User",
                    email: "devansh.agarwal@hcl.com",
                    name: "",
                    displayName: "Dummy User (dummy.user@com)"
                };

                oModel.loadData(url);
                oModel.dataLoaded(oModel)
                    .then(() => {
                        if (!oModel.getData().email) {
                            oModel.setData(mock);
                            var useremail = "devansh.agarwal@hcl.com";
                        }
                        else {
                            var useremail = oModel.getData().email;
                        }

                        if (query == undefined) {

                            // If fresh form is launched

                            // Generating GUID ID for the form
                            this.getOwnerComponent().getModel().read(`/zrtrgtgw_guidSet`, {
                                success: function (oData) {
                                    if (oData && oData.results[0].guid_id) {
                                        this.excelData.setProperty("/GuidId", oData.results[0]);
                                        guidId = oData.results[0].guid_id;
                                    }
                                }.bind(this),
                                error: function (resp) {
                                    MessageBox.error(JSON.parse(resp.responseText).error.message.value)
                                }.bind(this)
                            });

                            // Fetching Budget Holder ID from S4 by sending email
                            this.getOwnerComponent().getModel().read(`/zrtrgtgw_budget_holderSet('${useremail}')`, {
                                success: function (oData) {
                                    if (oData && oData.userid) {
                                        this.getView().byId('_IDGenInput1').setValue(oData.userid);
                                        this.excelData.setProperty("/BudgetHolder", oData);
                                    }
                                }.bind(this),
                                error: function (resp) {
                                    MessageBox.error(JSON.parse(resp.responseText).error.message.value)
                                }.bind(this)
                            });

                            // Fetching reasons from S4
                            this.getOwnerComponent().getModel().read(`/zrtgtgw_ci_reasonSet`, {
                                success: function (oData) {
                                    if (oData && oData.results) {
                                        this.excelData.setProperty("/reasonDropdown", oData.results);
                                    }
                                }.bind(this),
                                error: function (resp) {
                                    MessageBox.error(JSON.parse(resp.responseText).error.message.value)
                                }.bind(this)
                            });
                        }
                        else {
                            // Form opened by approver
                            displayMode = true;
                            this.getView().byId("Table").setMode("None");
                            this.getView().getModel("excelData").setProperty("/Parameters", query);
                            guidId = query.guidId;

                            // getting the data from the s4 table 
                            this.getOwnerComponent().getModel().read(`/zrtgtgw_ci_headSet('${guidId}')`, {
                                success: function (oData) {

                                    // binding the data in the frontend
                                    this.getView().byId("_IDGenInput1").setValue(oData.BudgetHolder)
                                    this.getView().byId("_IDGenInput2").setValue(oData.BudgetManager)
                                    this.getView().byId("_IDGenComboBox1").setValue(oData.Reason)
                                    this.getView().byId("_IDGenDatePicker1").setValue(oData.SubmitDate)
                                    this.getView().byId("_IDGenLink1").setText(oData.InvoiceAttach)
                                    this.getView().byId("_IDGenLink1").setEnabled(oData.InvoiceAttach != "No Attachment" ? true : false)
                                    if (oData.InvoiceAttach != "No Attachment") {
                                        this.getView().byId("_IDGenLink1").setHref(`${prefix}/sap/opu/odata/sap/ZRTRGTGW_CONS_INV_SRV/zrtgtgw_ci_fileSet(FileName='${oData.InvoiceAttach}',Guid='${guidId}')/$value`)
                                    }
                                    this.getView().byId("_IDGenInput3").setValue(oData.TotalExVat)
                                    this.getView().byId("_IDGenInput4").setValue(oData.Tax)
                                    this.getView().byId("_IDGenInput5").setValue(oData.Total)
                                    this.getView().byId("_IDGenCheckBox1").setSelected(true);
                                }.bind(this),
                                error: function (resp) {
                                    console.log(resp);
                                    sap.ui.core.BusyIndicator.hide();
                                }.bind(this)
                            });

                            var filterLog = []
                            filterLog.push(new sap.ui.model.Filter("Guid", sap.ui.model.FilterOperator.EQ, guidId))
                            this.getOwnerComponent().getModel().read(`/zrtgtgw_ci_itemSet`, {
                                filters: [filterLog],
                                success: function (oData) {
                                    // binding items
                                    this.excelData.setProperty("/items", oData.results)
                                }.bind(this),
                                error: function (resp) {
                                    console.log(resp);
                                    sap.ui.core.BusyIndicator.hide();
                                }.bind(this)
                            });
                            var oTable = this.getView().byId("Table");
                        }
                    })
            },

            getBaseURL: function () {
                var appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
                var appPath = appId.replaceAll(".", "/");
                var appModulePath = jQuery.sap.getModulePath(appPath);
                return appModulePath;
            },

            _onExcelUpload: function (e) {
                var oHeaderItem = e.getParameter("files")[0],
                    slugVal = oHeaderItem.name;

                var oFileUploader = this.getView().byId("_IDGenFileUploader1")
                var oDataModel = this.getOwnerComponent().getModel();
                oFileUploader.destroyHeaderParameters();
                oDataModel.setTokenHandlingEnabled(true);
                oDataModel.refreshSecurityToken(function () {
                    // Refreshing csrf token and fetching it
                    var token = oDataModel.getSecurityToken();
                    if (token) {
                        // Adding file name in slug value
                        oFileUploader.addHeaderParameter(new sap.ui.unified.FileUploaderParameter({
                            name: "SLUG",
                            value: slugVal
                        }));
                        // Adding Guid ID in the header field 
                        oFileUploader.addHeaderParameter(new sap.ui.unified.FileUploaderParameter({
                            name: "guid",
                            value: guidId
                        }));
                        oFileUploader.addHeaderParameter(new sap.ui.unified.FileUploaderParameter({
                            name: "isExcel",
                            value: true
                        }));
                        // Adding csrf token in header
                        oFileUploader.addHeaderParameter(new sap.ui.unified.FileUploaderParameter({
                            name: "X-CSRF-Token",
                            value: token
                        }));
                    };
                })
                oFileUploader.setUploadUrl(prefix + "/sap/opu/odata/sap/ZRTRGTGW_CONS_INV_SRV/zrtgtgw_ci_fileSet");
                oFileUploader.setSendXHR(true);
                oFileUploader.upload();
            },

            _onExcelComplete: function (oEvent) {
                this._sendingS4([]);
            },

            _onTableUpdateFinished: function () {
                if (!displayMode) {
                    var oTable = this.getView().byId("Table");
                    var headerAmt = 0, taxAmt = 0, path;
                    var oModel = this.getView().getModel("excelData");
                    oTable.getItems().forEach(function (item, index, o) {
                        // code for hiding checkboxes on the line items
                        var data = item.getBindingContext("excelData").getObject();
                        item._oMultiSelectControl.setVisible(data.Vendor != "");

                        // code for calculating total amount of each header item
                        if (data.Vendor != "") {
                            if (path) {
                                item.getBindingContext("excelData").getModel().setProperty(path + "/ItemValue", headerAmt * (-1));
                                item.getBindingContext("excelData").getModel().setProperty(path + "/VATAmount", taxAmt);
                            }
                            path = item.getBindingContext("excelData").getPath();
                            headerAmt = 0, taxAmt = 0;
                        }
                        else {
                            headerAmt += Number(data.ItemValue);
                            taxAmt += Number(data.VatAmount);
                        }

                        if (index + 1 == o.length) {
                            item.getBindingContext("excelData").getModel().setProperty(path + "/ItemValue", headerAmt * (-1));
                            item.getBindingContext("excelData").getModel().setProperty(path + "/VATAmount", taxAmt);
                        }
                        //code for calculating total amount of each header item ends here

                    }.bind(this));
                    this._calculateAmount(oTable.getItems());
                    this._findManager(oTable.getItems());
                }
            },

            checkErrors: function (items) {

                var oModel = this.getView().getModel("excelData");
                var messageLog = oModel.getProperty("/MessageLog") ? oModel.getProperty("/MessageLog") : [];
                items.forEach(function (data, index, o) {
                    // code for validating the Input
                    if (data.Vendor != "") {
                        //validating Reference Number
                        !this.specialCharacterCheck(data.Reference) ? messageLog.push({ Item: index + 1, Message: "Reference may only contain standard alphanumeric characters" }) : "";

                        //validating Invoice Date
                        !this.invoiceDateCheck(data.InvoiceDate) ? messageLog.push({ Item: index + 1, Message: "Invoice Date cannot be future dated" }) : "";
                    } else {
                        //validating gl code
                        !this.glCheck(data.GlCode) ? messageLog.push({ Item: index + 1, Message: "Only codes starting with 2,3,4 or 5 may be used for expenditures" }) : "";

                        //validating Item Description
                        !this.specialCharacterCheck(data.ItemDesc) ? messageLog.push({ Item: index + 1, Message: "Special characters, line feeds or carriage returns are not permitted in this description" }) : "";
                    }
                }.bind(this));

                if (messageLog.length > 0) {
                    if (!this._messLog) {
                        oModel.setProperty("/ErrorMessages", messageLog);
                        this._messLog = sap.ui.xmlfragment("zerotouch.fragment.ErrorMessages", this);
                        this.getView().addDependent(this._messLog);
                        this._messLog.open();
                    }
                    return true;
                } else return false;
            },

            onMessageClose: function () {
                if (this._messLog) {
                    this._messLog.destroy(true);
                }
                window.location.assign(window.location.origin + "/site" + window.location.search.split("&")[0] + window.location.hash.split("?")[0])
            },

            _AddRow: function () {
                this._addRow = sap.ui.xmlfragment("zerotouch.fragment.Addrowpopup", this);
                this.getView().addDependent(this._addRow);
                var addFirstRow = {
                    Vendor: "",
                    VendorName: "",
                    InvoiceDate: "",
                    MaxInvDate: new Date(),
                    Reference: "",
                    items: [{
                        Cciowbs: "",
                        CciowbsName: "",
                        CostCentre: "",
                        IoNumber: "",
                        Wbs: "",
                        BudgetHold: "",
                        BudgetHoldEmail: "",
                        LedgerCode: "",
                        GLDesc: "",
                        ItemVal: "",
                        VATCode: "",
                        VATAmount: "",
                        ItemDesc: ""
                    }]
                };
                this.getView().getModel("excelData").setProperty("/addRow", addFirstRow);
                this._addRow.open();
            },

            _DelRow: function (oEvent) {
                MessageBox.warning(`Selected items will be deleted.
                Do you wish to continue?`, {
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    emphasizedAction: MessageBox.Action.YES,
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.YES) {
                            var oTable = this.getView().byId("Table");
                            var oProperty = this.getView().getModel("excelData").getProperty("/items");
                            var aSelectedItems = oTable.getSelectedItems();
                            for (var i = aSelectedItems.length - 1; i >= 0; i--) {
                                var oItem = aSelectedItems[i];
                                var iIndex = oTable.indexOfItem(oItem);
                                oProperty.splice(iIndex, 1);
                            }
                            oTable.removeSelections();
                            this.getView().getModel("excelData").setProperty("/items", oProperty);
                        }
                    }.bind(this)
                })
            },

            _onCloseFrag: function () {
                if (this._addRow) {
                    this._addRow.destroy(true);
                }
                // this._addRow.close();
            },

            _onSelectionChange: function (oEvent) {
                var performChecked = [];
                var data = oEvent.getSource().getItems();
                var oTable = oEvent.getSource().getSelectedContextPaths();
                var path = oEvent.getParameter("listItem").getBindingContext("excelData").getPath();
                var indice = Number(path.split("/")[2]);
                for (let i = indice + 1; i < data.length; i++) {
                    if (data[i].getBindingContext("excelData").getProperty("Vendor") == "") {
                        performChecked.push(data[i]);
                    }
                    else {
                        break;
                    }
                }

                performChecked.forEach(function (oItem) {
                    oItem.setSelected(oEvent.getParameter("selected"));
                })

            },

            _AddRowPop: function () {
                var oModel = this.getView().getModel("excelData").getProperty("/addRow");
                var len = oModel.items.length;
                if (oModel.items[len - 1].Cciowbs == "") {
                    MessageBox.error("Kindly enter the Cost Centre/Internal Order/WBS first.");
                }
                else {
                    var addFirstRow = {
                        Cciowbs: "",
                        CciowbsName: "",
                        CostCentre: "",
                        IoNumber: "",
                        Wbs: "",
                        BudgetHold: "",
                        BudgetHoldEmail: "",
                        LedgerCode: "",
                        GLDesc: "",
                        ItemVal: "",
                        VATCode: "",
                        VATAmount: "",
                        ItemDesc: "",
                        Approvers: []
                    };
                    oModel.items.push(addFirstRow);
                    this.getView().getModel("excelData").setProperty("/addRow", oModel);
                }
            },

            _DelRowPop: function (oEvent) {
                var oTable = sap.ui.getCore().byId(oEvent.getSource().getParent().getParent().getId());
                var oProperty = this.getView().getModel("excelData").getProperty("/addRow");
                var aSelectedItems = oTable.getSelectedItems();
                for (var i = aSelectedItems.length - 1; i >= 0; i--) {
                    var oItem = aSelectedItems[i];
                    var iIndex = oTable.indexOfItem(oItem);
                    oProperty.items.splice(iIndex, 1);
                }
                oTable.removeSelections();
                if (oProperty.items.length == 0) {
                    var oProperty = {
                        Vendor: "",
                        VendorName: "",
                        InvoiceDate: "",
                        Reference: "",
                        items: [{
                            Cciowbs: "",
                            CciowbsName: "",
                            CostCentre: "",
                            IoNumber: "",
                            Wbs: "",
                            BudgetHold: "",
                            BudgetHoldEmail: "",
                            LedgerCode: "",
                            GLDesc: "",
                            ItemVal: "",
                            VATCode: "",
                            VATAmount: "",
                            ItemDesc: "",
                            Approvers: []
                        }]
                    };
                }
                this.getView().getModel("excelData").setProperty("/addRow", oProperty);
            },

            specialCharacterCheck: function (value) {
                const specialCharRegex = /^[a-zA-Z0-9 -]+$/
                if (!specialCharRegex.test(value)) return false;
                else return true;
            },

            invoiceDateCheck: function (value) {
                if (new Date(value) > new Date()) return false;
                else return true;
            },

            glCheck: function (value) {
                const glRegex = /^[^2-5]{1}/
                if (glRegex.test((Number(value).toString()))) return false;
                else return true;
            },

            onVendorChange: function (oEvent) {

                var oModel = this.getView().getModel("excelData");
                var Vendor = oEvent.getSource().getValue();
                const id = oEvent.getSource().getId();
                if (Vendor != "" || Vendor != null) {
                    this.getOwnerComponent().getModel().read(`/zrtrgtgw_vendorSet('${Vendor}')`, {
                        success: function (oData) {
                            if (oData.message) {
                                sap.ui.getCore().byId(id).setValueState(sap.ui.core.ValueState.Error);
                                oModel.setProperty("/addRow/VendorName", "");
                                MessageBox.error(oData.message);
                            }
                            else if (oData && oData.name1) {
                                oModel.setProperty("/addRow/VendorName", oData.name1 + (oData.name2 ? " " : "") + oData.name2);
                                sap.ui.getCore().byId(id).setValueState(sap.ui.core.ValueState.None);
                            }
                        }.bind(this),
                        error: function (resp) {
                            console.log(resp.responseText)
                            oModel.setProperty("/addRow/VendorName", "");
                            sap.ui.getCore().byId(id).setValueState(sap.ui.core.ValueState.Error);
                        }.bind(this)
                    });
                }
            },

            onReferenceChange: function (oEvent) {
                var value = oEvent.getSource().getValue();
                if (value) {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                    const checkValidations = this.specialCharacterCheck(value)
                    if (!checkValidations) {
                        MessageBox.error("Reference may only contain standard alphanumeric characters.");
                        oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                    }
                    else oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                }
                else
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
            },

            onInvoiceChange: function (oEvent) {
                var valid = oEvent.getParameter("valid");
                if (!valid) {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                }
                else {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                    const dateValidations = this.invoiceDateCheck(oEvent.getSource().getDateValue());
                }
            },

            onCcChage: function (oEvent) {

                var oModel = this.getView().getModel("excelData");
                var oBind = oEvent.getSource().getBindingContext("excelData");
                var sPath = oBind.getPath();
                const id = oEvent.getSource().getId();
                var CostCenter = oEvent.getSource().getValue().toUpperCase().replace(/\-/g, "");
                if (CostCenter != "" || CostCenter != null) {
                    // Checking if the entered value matches any pattern
                    const testingPattern = [
                        // regex for Cost Center
                        { CostCentre: /^\d{6}$/ },
                        //regex for WBS
                        // If WBS starts with X
                        { Wbs: /^([X])([A-Z])(\d{6})([A-Z])$/ },
                        // if WBS starts with Y
                        { Wbs: /^([Y])(\d{4})(\d{5})([A-Z]{3})$/ },
                        //regex for Internal Order
                        { IoNumber: /^[OGCVRTPWA]\d{8}$/ }
                    ]

                    // creating a flag to clear other values from the json (CC, IO, WBS)
                    var patternMatched = false;
                    for (const key of testingPattern) {
                        // checking whether the entered value is a Cost Centre or Internal Order or WBS
                        const ccIoWbs = Object.entries(key)[0][0], reg = Object.entries(key)[0][1];
                        if (reg.test(CostCenter)) {
                            patternMatched = true;
                            sap.ui.getCore().byId(id).setValueState(sap.ui.core.ValueState.None);
                            var reqValue = reg.exec(CostCenter).slice(1).join("-") ? reg.exec(CostCenter).slice(1).join("-") : reg.exec(CostCenter)[0];
                            oModel.setProperty(sPath + "/" + ccIoWbs, reqValue);
                            oEvent.getSource().setValue(reqValue);
                            var filterLog = []
                            filterLog.push(new sap.ui.model.Filter("CcWbsIo", sap.ui.model.FilterOperator.EQ, reqValue))
                            this.getOwnerComponent().getModel().read(`/zrtgtgw_ci_ccSet`, {
                                filters: [filterLog],
                                success: function (oData) {
                                    if (oData.results[0] && oData.results[0].CcWbsIo && oData.results[0].Description && oData.results[0].budgetManager) {
                                        oModel.setProperty("/Approvers", oData.results);
                                        oModel.setProperty(sPath + "/CciowbsName", oData.results[0].Description);
                                        oModel.setProperty(sPath + "/BudgetHold", oData.results[0].budgetManager);
                                        oModel.setProperty(sPath + "/BudgetHoldEmail", oData.results[0].budgetManagerEmail);
                                        this.findBgtMngr(oModel, oModel.getProperty(sPath + "/ItemValue"), sPath);
                                        sap.ui.getCore().byId(id).setValueState(sap.ui.core.ValueState.None);
                                    }
                                    else if (oData.results[0] && oData.results[0].Description) {
                                        oModel.setProperty("/Approvers", []);
                                        oModel.setProperty(sPath + "/CciowbsName", "");
                                        oModel.setProperty(sPath + "/BudgetHold", "");
                                        oModel.setProperty(sPath + "/BudgetHoldEmail", "");
                                        sap.ui.getCore().byId(id).setValueState(sap.ui.core.ValueState.Error);
                                        sap.ui.getCore().byId(id).setValueStateText("Cost Center not approved for the User");
                                    }
                                    else {
                                        oModel.setProperty("/Approvers", []);
                                        oModel.setProperty(sPath + "/CciowbsName", "");
                                        oModel.setProperty(sPath + "/BudgetHold", "");
                                        oModel.setProperty(sPath + "/BudgetHoldEmail", "");
                                        sap.ui.getCore().byId(id).setValueState(sap.ui.core.ValueState.Error);
                                    }
                                }.bind(this),
                                error: function (resp) {
                                    console.log(resp.responseText);
                                    oModel.setProperty("/Approvers", []);
                                    oModel.setProperty(sPath + "/CciowbsName", "");
                                    oModel.setProperty(sPath + "/BudgetHold", "");
                                    oModel.setProperty(sPath + "/BudgetHoldEmail", "");
                                    sap.ui.getCore().byId(id).setValueState(sap.ui.core.ValueState.Error);

                                }.bind(this)
                            });
                        }
                        else {
                            if (!patternMatched)
                                sap.ui.getCore().byId(id).setValueState(sap.ui.core.ValueState.Error);
                            oModel.setProperty(sPath + "/" + ccIoWbs, "");
                        }
                    }
                }

            },

            onGlChage: function (oEvent) {

                var oModel = this.getView().getModel("excelData");
                var oBind = oEvent.getSource().getBindingContext("excelData");
                var sPath = oBind.getPath();
                const id = oEvent.getSource().getId();
                var glCode = oEvent.getSource().getValue();
                if (glCode != "" || glCode != null) {
                    const glValidations = this.glCheck(glCode);
                    if (glValidations) {
                        oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                        this.getOwnerComponent().getModel().read(`/zrtgtgw_ci_glSet('${glCode}')`, {
                            success: function (oData) {
                                if (oData && oData.Txt50) {
                                    oModel.setProperty(sPath + "/GLDesc", oData.Txt50);
                                    sap.ui.getCore().byId(id).setValueState(sap.ui.core.ValueState.None);
                                }
                                else {
                                    oModel.setProperty(sPath + "/GLDesc", "");
                                    sap.ui.getCore().byId(id).setValueState(sap.ui.core.ValueState.Error);
                                }
                            }.bind(this),
                            error: function (resp) {
                                oModel.setProperty(sPath + "/GLDesc", "");
                                sap.ui.getCore().byId(id).setValueState(sap.ui.core.ValueState.Error);
                            }.bind(this)
                        });
                    }
                    else {
                        MessageBox.error("Only codes starting with 2,3,4 or 5 may be used for expenditures");
                        oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                    }
                }
            },

            onVATChage: function (oEvent) {
                var oModel = this.getView().getModel("excelData");
                var oBind = oEvent.getSource().getBindingContext("excelData");
                var sPath = oBind.getPath();
                const id = oEvent.getSource().getId();
                var vat = oEvent.getSource().getValue().toUpperCase();
                var itemValue = oModel.getProperty(sPath + "/ItemVal");
                if ((vat != "" || vat != null) && itemValue) {
                    this.getOwnerComponent().getModel().read(`/zrtgtgw_ci_vatSet(Mwskz='${vat}',ItemValue='${itemValue}')`, {
                        success: function (oData) {
                            if (oData && oData.TaxAmount) {
                                oModel.setProperty(sPath + "/VATCode", vat);
                                oModel.setProperty(sPath + "/VATAmount", oData.TaxAmount);
                                sap.ui.getCore().byId(id).setValueState(sap.ui.core.ValueState.None);
                            }
                            else {
                                oModel.setProperty(sPath + "/VATAmount", "");
                                sap.ui.getCore().byId(id).setValueState(sap.ui.core.ValueState.Error);
                            }
                        }.bind(this),
                        error: function (resp) {
                            oModel.setProperty(sPath + "/VATAmount", "");
                            sap.ui.getCore().byId(id).setValueState(sap.ui.core.ValueState.Error);
                        }.bind(this)
                    });
                }
            },

            onItemValChange: function (oEvent) {
                var oModel = this.getView().getModel("excelData");
                var oBind = oEvent.getSource().getBindingContext("excelData");
                var sPath = oBind.getPath();
                const id = oEvent.getSource().getId();
                var itemValue = oEvent.getSource().getValue().toUpperCase();
                var vat = oModel.getProperty(sPath + "/VATCode");
                this.findBgtMngr(oModel, itemValue, sPath);
                if ((itemValue != "" || itemValue != null) && vat) {
                    this.getOwnerComponent().getModel().read(`/zrtgtgw_ci_vatSet(Mwskz='${vat}',ItemValue='${itemValue}')`, {
                        success: function (oData) {
                            if (oData && oData.TaxAmount) {
                                oModel.setProperty(sPath + "/VATAmount", oData.TaxAmount);
                                sap.ui.getCore().byId(id).setValueState(sap.ui.core.ValueState.None);
                            }
                            else {
                                oModel.setProperty(sPath + "/VATAmount", "");
                                sap.ui.getCore().byId(id).setValueState(sap.ui.core.ValueState.Error);
                            }
                        }.bind(this),
                        error: function (resp) {
                            oModel.setProperty(sPath + "/VATAmount", "");
                            sap.ui.getCore().byId(id).setValueState(sap.ui.core.ValueState.Error);
                        }.bind(this)
                    });
                }
            },

            onItemDescChange: function (oEvent) {
                var value = oEvent.getSource().getValue()
                if (value) {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                    const checkValidations = this.specialCharacterCheck(value)
                    if (!checkValidations) {
                        oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                        MessageBox.error("Special characters, line feeds or carriage returns are not permitted in this description.");
                    }
                    else oEvent.getSource().setValueState(sap.ui.core.ValueState.None);

                }
                else
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
            },

            findBgtMngr: function (oModel, itemVal, sPath) {
                var approvers = oModel.getProperty("/Approvers");
                if (itemVal && approvers.length > 0) {
                    if (approvers[0] && +itemVal <= +approvers[0].Amount) {
                        oModel.setProperty(sPath + "/CciowbsName", approvers[0].Description);
                        oModel.setProperty(sPath + "/BudgetHold", approvers[0].budgetManager);
                        oModel.setProperty(sPath + "/BudgetHoldEmail", approvers[0].budgetManagerEmail);
                    }
                    else if (approvers[1] && +itemVal <= +approvers[1].Amount) {
                        oModel.setProperty(sPath + "/CciowbsName", approvers[1].Description);
                        oModel.setProperty(sPath + "/BudgetHold", approvers[1].budgetManager);
                        oModel.setProperty(sPath + "/BudgetHoldEmail", approvers[1].budgetManagerEmail);
                    }
                    else {
                        oModel.setProperty(sPath + "/CciowbsName", approvers[2].Description);
                        oModel.setProperty(sPath + "/BudgetHold", approvers[2].budgetManager);
                        oModel.setProperty(sPath + "/BudgetHoldEmail", approvers[2].budgetManagerEmail);
                    }
                }
            },

            _onSaveFrag: function () {

                var aControls = this.getView().getControlsByFieldGroupId("fragmentReq");
                var flag = false;
                aControls.forEach(function (oControl) {
                    if (oControl.getId != undefined && (oControl.getId().includes("input") || oControl.getId().includes("Input") || oControl.getId().includes("picker") || oControl.getId().includes("Picker"))) {
                        if ((oControl.getValue != undefined && oControl.getValue() == "" && oControl.getRequired != undefined && oControl.getRequired()) || (oControl.getValueState != undefined && oControl.getValueState() === sap.ui.core.ValueState.Error)) {
                            oControl.setValueState(sap.ui.core.ValueState.Error);
                            flag = true;
                        }
                        else if (oControl.getValue != undefined && oControl.getValue() != "") {
                            oControl.setValueState(sap.ui.core.ValueState.None);
                        }
                    }
                });

                if (flag) MessageBox.error(`Please fill the required fields.`);
                else {

                    var addedData = this.getView().getModel("excelData").getProperty("/addRow");
                    var mainData = this.getView().getModel("excelData").getProperty("/items");
                    mainData = mainData != undefined ? mainData : [];
                    var addItem = {
                        "Vendor": addedData.Vendor,
                        "VendorName": addedData.VendorName,
                        "InvoiceDate": addedData.InvoiceDate,
                        "Reference": addedData.Reference,
                        "Cciowbs": "",
                        "CciowbsName": "",
                        "CostCentre": "",
                        "IoNumber": "",
                        "Wbs": "",
                        "BudgetManager": "",
                        "BudgetManagerEmail": "",
                        "GlCode": "",
                        "GlName": "",
                        "ItemValue": "",
                        "Vat": "",
                        "VatAmount": "",
                        "ItemDesc": ""
                    }
                    mainData.push(addItem);
                    for (let i = 0; i < addedData.items.length; i++) {
                        var addItem = {
                            "Vendor": "",
                            "VendorName": "",
                            "InvoiceDate": "",
                            "Reference": "",
                            "Cciowbs": addedData.items[i].Cciowbs,
                            "CciowbsName": addedData.items[i].CciowbsName,
                            "CostCentre": addedData.items[i].CostCentre ? addedData.items[i].CostCentre : "",
                            "IoNumber": addedData.items[i].IoNumber ? addedData.items[i].IoNumber : "",
                            "Wbs": addedData.items[i].Wbs ? addedData.items[i].Wbs : "",
                            "BudgetManager": addedData.items[i].BudgetHold,
                            "BudgetManagerEmail": addedData.items[i].BudgetHoldEmail,
                            "GlCode": addedData.items[i].LedgerCode,
                            "GlName": addedData.items[i].GLDesc,
                            "ItemValue": Number(addedData.items[i].ItemVal),
                            "Vat": addedData.items[i].VATCode,
                            "VatAmount": addedData.items[i].VATAmount,
                            "ItemDesc": addedData.items[i].ItemDesc
                        };
                        mainData.push(addItem);
                    }
                    this.getView().getModel("excelData").setProperty("/items", mainData);
                    // this._addRow.close();
                    if (this._addRow) {
                        this._addRow.destroy(true);
                    }
                }
            },

            onReasonChange: function (oEvent) {
                if (oEvent.getSource().getSelectedItem() != null) {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                }
                else oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
            },

            onAttachChange: function (oEvent) {
                if (oEvent.getSource().getValue() != "") {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                }
                else oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
            },

            onAttach: async function () {
                this._attach = sap.ui.xmlfragment("zerotouch.fragment.Attachment", this);
                this.getView().addDependent(this._attach);
                // Code for Attachment Upload
                this.AttachingEvents();
                // Checking if any attachment still exist (for upload button)
                var oProperty = this.getView().getModel("excelData").getProperty("/AttachmentItems");
                if (oProperty != undefined && oProperty.length != 0) {
                    sap.ui.getCore().byId("UploadSet2").setUploadButtonInvisible(true);
                }
                this._attach.open();
            },

            onUploadStarted: function (oEvent) {
                var oList = sap.ui.getCore().byId("progressList"),
                    oItem = oEvent.getParameter("item");
                oList.destroyItems()
                oList.insertItem(new ListItem({
                    title: "Upload started: " + oItem.getFileName()
                }));
                sap.ui.getCore().byId("UploadSet2").setUploadButtonInvisible(true)
            },

            onUploadCompleted: function (oEvent) {
                var oList = sap.ui.getCore().byId("progressList"),
                    oItem = oEvent.getParameter("item");
                oList.insertItem(new ListItem({
                    title: "Upload completed: " + oItem.getFileName()
                }));

                var oModel = this.getView().getModel("excelData");
                var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
                var todaysDate = dateFormat.format(new Date());
                var reqGuid = guidId.split("-").join("")
                var data = [{
                    fileName: oItem.getFileName(),
                    mediaType: oItem.getMediaType(),
                    url: prefix + `/sap/opu/odata/sap/ZRTRGTGW_CONS_INV_SRV/zrtgtgw_ci_fileSet(FileName='${oItem.getFileName()}',Guid='${reqGuid}')/$value`,
                    thumbnailUrl: oItem._getIconByMimeType(),
                    uploadState: oItem.getUploadState(),
                    statuses: [{
                        title: "Uploaded On",
                        text: todaysDate,
                    },
                    {
                        title: "File Size",
                        text: ((oItem._fFileSize * 1000).toFixed(2)).toString() + "KB",
                    }
                    ]
                }]
                oModel.setProperty("/AttachmentItems", data);
                this.getView().byId("_IDGenLink1").setText(oItem.getFileName());
                var reqGuid = guidId.split("-").join("")
                this.getView().byId("_IDGenLink1").setHref(prefix + `/sap/opu/odata/sap/ZRTRGTGW_CONS_INV_SRV/zrtgtgw_ci_fileSet(FileName='${oItem.getFileName()}',Guid='${reqGuid}')/$value`);
                this.getView().byId("_IDGenLink1").setEnabled(true);
            },

            onUploadAborted: function (oEvent) {
                var oList = sap.ui.getCore().byId("progressList"),
                    oItem = oEvent.getParameter("item");
                oList.insertItem(new ListItem({
                    title: "Upload aborted: " + oItem.getFileName()
                }));
            },

            onFileTypeMismatch: function () {

            },

            onBeforeUploadStarts: function (oEvent) {
                var oHeaderItem = oEvent.getParameter("item"),
                    slugVal = oHeaderItem.getFileName();
                oHeaderItem.removeAllStatuses();
                var oDataModel = this.getOwnerComponent().getModel();
                oDataModel.setTokenHandlingEnabled(true);
                // Refreshing csrf token and fetching it
                oDataModel.refreshSecurityToken(function () {
                    var token = oDataModel.getSecurityToken();
                    if (token) {
                        // Adding file name in slug value
                        oHeaderItem.addHeaderField(new sap.ui.core.Item({
                            key: "slug",
                            text: slugVal
                        }));
                        // Adding Guid ID in the header field 
                        oHeaderItem.addHeaderField(new sap.ui.core.Item({
                            key: "guid",
                            text: guidId
                        }));
                        // Adding csrf token in header
                        oHeaderItem.addHeaderField(new sap.ui.core.Item({
                            key: "x-csrf-token",
                            text: token
                        }));
                        oHeaderItem.addHeaderField(new sap.ui.core.Item({
                            key: "isExcel",
                            text: false
                        }));
                    }
                });
                oEvent.getSource().setUploadUrl(prefix + "/sap/opu/odata/sap/ZRTRGTGW_CONS_INV_SRV/zrtgtgw_ci_fileSet");
            },

            onFileDelete: function (oEvent) {
                console.log("hi there")
                sap.ui.getCore().byId("UploadSet2").setUploadButtonInvisible(false);
                this.getView().getModel("excelData").setProperty("/AttachmentItems", []);
                this.getView().byId("_IDGenLink1").setText("No Attachment");
                this.getView().byId("_IDGenLink1").setEnabled(false);
                var reqGuid = guidId.split("-").join("").toUpperCase();
                this.getOwnerComponent().getModel().remove(encodeURI(prefix + `/zrtgtgw_ci_fileSet(FileName='${oEvent.getParameter("item").getFileName()}',Guid='${reqGuid}')/$value`), {
                    success: function () {
                    },
                    error: function (e) {
                        console.log(e);
                    }
                })
            },

            onFileTypeMismatch: function (oEvent) {
                MessageBox.error("Invalid filetype. Please load a valid file.")
            },

            onAttachClose: function () {
                if (this._attach) {
                    this._attach.destroy(true);
                }
            },

            _findManager: function (table) {
                // finding the greatest amount in the whole data
                if (table.length > 0) {
                    const max = table.reduce(function (prev, current) {
                        return (prev && Number(prev.getBindingContext("excelData").getObject().ItemValue) > Number(current.getBindingContext("excelData").getObject().ItemValue)) ? prev : current;
                    })
                    this.getView().byId("_IDGenInput2").setValue(max.getBindingContext("excelData").getObject().BudgetManager);
                    this.getView().byId("_BgtMngrEmail").setValue(max.getBindingContext("excelData").getObject().BudgetManagerEmail);
                }
            },

            _calculateAmount: function (table) {
                let totalValue = 0, totalTax = 0;
                table.forEach(function (item) {
                    if (item.getBindingContext("excelData").getObject().Vendor == "") {
                        totalValue += Number(item.getBindingContext("excelData").getObject().ItemValue);
                        totalTax += Number(item.getBindingContext("excelData").getObject().VatAmount);
                    }
                });
                this.getView().byId("_IDGenInput3").setValue(totalValue);
                this.getView().byId("_IDGenInput4").setValue(totalTax);
                this._onTotalChange(totalValue, totalTax);
            },

            _onTotalChange: function (total, tax) {
                this.getView().byId("_IDGenInput5").setValue(total + tax);
            },

            _payload: function (Items, purpose) {

                var payload =
                {
                    "Guid": guidId.split("-").join(""),
                    "BudgetHolder": this.getView().byId("_IDGenInput1").getValue(),
                    // "BudgetManager": "",
                    "Reason": "",
                    "InvoiceAttach": "",
                    // "SubmitDate": "",
                    // "ApproveDate": "",
                    // "TermsCheckbox": "",
                    // "TotalExVat": "",
                    // "Tax": "",
                    // "Total": "",
                    "Purpose": purpose,
                    "HeadToItemNav": [],
                    "HeadToMsgNav": []
                }

                return payload;
            },

            _sendingS4: async function (Items) {

                var RequestPayload = this._payload(Items, "C");

                this.getOwnerComponent().getModel().create("/zrtgtgw_ci_headSet", RequestPayload, {
                    success: function (oData) {
                        // checking for error messages from backend
                        if (oData.HeadToMsgNav.results.length > 0) {
                            this.getView().getModel("excelData").setProperty("/MessageLog", oData.HeadToMsgNav.results);
                        }
                        const errorFound = this.checkErrors(oData.HeadToItemNav.results);
                        if (!errorFound) {
                            var gettingItems = this.getView().getModel("excelData").getProperty("/items");
                            if (gettingItems) {
                                if (gettingItems.length != 0)
                                    var combined = gettingItems.concat(oData.HeadToItemNav.results);
                                else
                                    var combined = oData.HeadToItemNav.results;
                            }
                            else
                                var combined = oData.HeadToItemNav.results;
                            this.getView().getModel("excelData").setProperty("/items", combined);
                        }
                    }.bind(this),
                    error: function (resp) {
                        console.log(resp);
                    }.bind(this)
                });
            },

            _payloadForSubmit: function (Items, purpose) {
                var vendorItems = [];
                var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "dd.MM.yyyy" });
                for (let i = 0; i < Items.length; i++) {
                    var temp_payload = {
                        "Guid": guidId.split("-").join(""),
                        "Item": (i + 1).toString(),
                        "LineType": Items[i].Vendor ? "H" : "I",
                        "Vendor": Items[i].Vendor,
                        "VendorName": Items[i].VendorName,
                        "InvoiceDate": dateFormat.format(new Date(Items[i].InvoiceDate)),
                        "Reference": Items[i].Reference,
                        "Cciowbs": Items[i].Cciowbs,
                        "CciowbsName": Items[i].CciowbsName,
                        "CostCentre": Items[i].CostCentre ? Items[i].CostCentre : "",
                        "IoNumber": Items[i].IoNumber ? Items[i].IoNumber : "",
                        "Wbs": Items[i].Wbs ? Items[i].Wbs : "",
                        "BudgetManager": Items[i].BudgetManager,
                        "BudgetManagerEmail": Items[i].BudgetManagerEmail,
                        "GlCode": Items[i].GlCode,
                        "GlName": Items[i].GlName,
                        "ItemValue": (Items[i].ItemValue).toString(),
                        "Vat": Items[i].Vat,
                        "VatAmount": Items[i].VATAmount ? Items[i].VATAmount.toString() : "",
                        "ItemDesc": Items[i].ItemDesc
                    }
                    vendorItems.push(temp_payload)
                }

                var payload =
                {
                    "Guid": guidId.split("-").join(""),
                    "BudgetHolder": this.getView().byId("_IDGenInput1").getValue(),
                    "BudgetManager": this.getView().byId("_IDGenInput2").getValue(),
                    "Reason": this.getView().byId("_IDGenComboBox1").getSelectedItem() ? this.getView().byId("_IDGenComboBox1").getSelectedItem().getText() : this.getView().byId("_IDGenComboBox1").getValue(),
                    "InvoiceAttach": this.getView().byId("_IDGenLink1").getText(),
                    "SubmitDate": dateFormat.format(new Date()),
                    "ApproveDate": "",
                    "TermsCheckbox": "X",
                    "TotalExVat": this.getView().byId("_IDGenInput3").getValue(),
                    "Tax": this.getView().byId("_IDGenInput4").getValue(),
                    "Total": this.getView().byId("_IDGenInput5").getValue(),
                    "Purpose": purpose,
                    "HeadToItemNav": vendorItems
                }

                return payload;
            },

            onSubmit: function () {

                MessageBox.alert(`Do you want to Submit?`, {
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: function (sAction) {
                        if (sAction == MessageBox.Action.OK) {
                            sap.ui.core.BusyIndicator.show();
                            // Checking all the required fields
                            var aControls = this.getView().getControlsByFieldGroupId("checkingReq");
                            var flag = false;
                            aControls.forEach(function (oControl) {
                                if (oControl.getId != undefined && (oControl.getId().includes("Input") || oControl.getId().includes("DatePicker") || oControl.getId().includes("ComboBox"))) {
                                    if ((oControl.getValue != undefined && oControl.getValue() == "" && oControl.getRequired != undefined && oControl.getRequired()) || (oControl.getValueState != undefined && oControl.getValueState() === sap.ui.core.ValueState.Error)) {
                                        oControl.setValueState(sap.ui.core.ValueState.Error);
                                        flag = true;
                                    }
                                    else if (oControl.getValue != undefined && oControl.getValue() != "") {
                                        oControl.setValueState(sap.ui.core.ValueState.None);
                                    }
                                }
                            });
                            if (!flag) {
                                if (!this.getView().byId("_IDGenCheckBox1").getSelected()) {
                                    sap.ui.core.BusyIndicator.hide();
                                    MessageBox.error(`Please confirm that you understood the guidlines`);
                                }
                                else {

                                    // Have to fill submitted date in the input 
                                    var Items = this.getView().getModel("excelData").getProperty("/items");
                                    var RequestPayload = this._payloadForSubmit(Items, "S");

                                    // storing the data in the s4 table 
                                    this.getOwnerComponent().getModel().create("/zrtgtgw_ci_headSet", RequestPayload, {
                                        success: function (oData) {
                                            // preparing payload for workflow trigger
                                            var appUrl = window.location.origin + "/site" + window.location.search.split("&")[0] + window.location.hash.split("?")[0];
                                            var reqUrl = appUrl.includes("GCC_SemObj") ? appUrl + "&/?guidId=" : appUrl + "#?formId=";
                                            var wfpayload = {
                                                "definitionId": "eu10.gccdev.eforms.consolidatedInvoiceProcess",
                                                "context": {
                                                    "guid": guidId,
                                                    "approver": this.getView().byId("_BgtMngrEmail").getValue(),
                                                    "approver_name": this.getView().byId("_IDGenInput2").getValue(),
                                                    "approver_link": reqUrl + guidId.split("-").join("").toUpperCase() + "&mode=display",
                                                    "initiator": this.getView().getModel("excelData").getProperty("/BudgetHolder/email")
                                                }
                                            };
                                            // trigger workflow
                                            this.triggerWF(wfpayload);
                                        }.bind(this),
                                        error: function (resp) {
                                            console.log(resp);
                                            sap.ui.core.BusyIndicator.hide();
                                        }.bind(this)
                                    });

                                }
                            }
                            else {
                                sap.ui.core.BusyIndicator.hide();
                                MessageBox.error(`Fill all the required fields`)
                            }
                        }
                    }.bind(this)
                })
            },

            triggerWF: function (wfPayload) {

                var sURL = prefix + "/workflow/rest/v1/workflow-instances";

                $.support.cors = true;
                $.ajax(sURL, {
                    method: "POST",
                    data: JSON.stringify(wfPayload),
                    crossDomain: true,
                    contentType: "application/json"
                }).done(function (data, textStatus, jqXHR) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.success("Invoice has been sent", {
                        actions: [MessageBox.Action.OK],
                        emphasizedAction: MessageBox.Action.OK,
                        onClose: function (sAction) {
                            if (sAction) {
                                // var oHistory, sPreviousHash;
                                // oHistory = History.getInstance();
                                // sPreviousHash = oHistory.getPreviousHash();
                                // if (sPreviousHash == undefined) {
                                // }
                                window.history.go(-1);
                            }
                        }
                    })
                }.bind(this)).fail(function (XMLHttpRequest, textStatus) {
                    console.log("error");
                    MessageBox.error(`Some error occurred. Please try again`);
                    sap.ui.core.BusyIndicator.hide();
                });
            }
        });
    });
