sap.ui.define([
    'sap/ui/core/mvc/Controller',
    'sap/ui/model/json/JSONModel',
    'sap/m/p13n/Engine',
    'sap/m/p13n/SelectionController',
    'sap/m/p13n/SortController',
    'sap/m/p13n/MetadataHelper',
    'sap/ui/model/Sorter',
    'sap/m/ColumnListItem',
    'sap/m/Text',
    'sap/ui/core/library',
    'sap/m/table/ColumnWidthController',
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    'sap/ui/core/Fragment'
], function (Controller, JSONModel, Engine, SelectionController, SortController, MetadataHelper, Sorter, ColumnListItem, Text, coreLibrary, ColumnWidthController, Filter, FilterOperator, Fragment) {
    "use strict";
    // var ajaxUrl = "";
    var ajaxUrl = ""

    let initiator = "";

    return Controller.extend("pd01historyreport.controller.View1", {

        onInit: function () {
            ajaxUrl = sap.ui.require.toUrl(this.getOwnerComponent().getManifestEntry('/sap.app/id').replaceAll('.', '/'));
            this.getOwnerComponent().getRouter().getRoute("RouteView1").attachPatternMatched(this._onRouteMatched, this);
        },

        getBaseURL: function () {
            var appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
            var appPath = appId.replaceAll(".", "/");
            var appModulePath = jQuery.sap.getModulePath(appPath);
            return appModulePath;
        },

        _onRouteMatched: function () {
            const url = this.getBaseURL() + "/user-api/currentUser";
            var oModel = new JSONModel();
            var mock = {
                firstname: "Dummy",
                lastname: "User",
                email: "thoratomkar.santosh@hcl.com",
                name: "",
                displayName: "Dummy User (dummy.user@com)"
            };
            this.getView().setModel(oModel, "AllData");
            oModel.loadData(url);
            oModel.dataLoaded()
                .then(() => {
                    if (!oModel.getData().email) {
                        oModel.setData(mock);
                        var useremail = "devansh.agarwal@hcl.com";
                    }
                    else {
                        var useremail = oModel.getData().email;
                    }
                    this.forInitiator(useremail);// this.forinit(useremail);
                    this._formId = this.byId("formId_ID");
                    this._startedOn_ID = this.byId("startedon_ID");
                    this._fStatus_ID = this.byId("formStatus_ID");
                    this._fEmp_ID = this.byId("empId_ID");
                    this._fEmpName_ID = this.byId("empName_ID");
                    this._fOrg = this.byId("org_ID");
                    this._registerForP13n();
                })
        },

        forInitiator: async function (useremail) {
            try {
                await $.ajax({
                    url: ajaxUrl + "/odata/v2/PerEmail?$filter=emailAddress eq '" + useremail + "'&$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        console.log("success" + data);
                        initiator = data.d.results[0].personIdExternal;
                    }.bind(this),
                    error: function (e) {
                        console.log("error: " + e);
                    }
                });
                let cust_Value, values, cust_UserName;
                await $.ajax({
                    url: ajaxUrl + "/odata/v2/UserAccount?$format=json&$filter=personIdExternal eq '" + initiator + "'",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        console.log("success" + data);
                        cust_UserName = data.d.results[0].username;
                    }.bind(this),
                    error: function (e) {
                        console.log("error: " + e);
                    }
                });
                await $.ajax({
                    url: ajaxUrl + "/odata/v2/cust_ZFLM_MULTI_USERS?$filter=cust_UserName eq '" + cust_UserName + "'&$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        console.log("success" + data);
                        if (data.d.results.length != 0) {
                            cust_Value = data.d.results[0].cust_Value.split(",");
                            values = cust_Value.map((value, index) => {
                                return { key: (index), text: (value) };
                            });
                            if (values.length == 1) {
                                this.getView().byId("org_ID").setEditable(false);
                            }
                        } else {
                            this.getView().byId("org_ID").setEditable(false);
                        }
                    }.bind(this),
                    error: function (e) {
                        console.log("error: " + e);
                    }
                });
                var oComboBox = this.getView().byId("org_ID");
                if (values == undefined) {
                    var userId;
                    await $.ajax({
                        url: ajaxUrl + "/odata/v2/PerPerson('" + initiator + "')/employmentNav?$format=json",
                        type: 'GET',
                        contentType: "application/json",
                        success: function (data) {
                            console.log("success" + data);
                            userId = data.d.results[0].userId;
                        }.bind(this),
                        error: function (e) {
                            console.log("error: " + e);
                        }
                    });
                    await $.ajax({
                        url: ajaxUrl + "/odata/v2/EmpEmployment(personIdExternal='" + initiator + "',userId='" + userId + "')/jobInfoNav?$format=json",
                        type: 'GET',
                        contentType: "application/json",
                        success: function (data) {
                            console.log("success" + data);
                            var org = data.d.results[0].customString3.split(",");
                            values = org.map((value, index) => {
                                return { key: (index), text: (value) };
                            });
                            values.forEach(function (oItemData) {
                                $.ajax({
                                    url: ajaxUrl + "/odata/v2/cust_PersonnelArea?$filter=externalCode eq '" + oItemData.text + "'&$format=json",
                                    type: 'GET',
                                    contentType: "application/json",
                                    success: function (data) {
                                        console.log("success" + data);
                                        oComboBox.addItem(new sap.ui.core.Item({
                                            key: data.d.results[0].externalCode,
                                            text: `${data.d.results[0].externalName} (${data.d.results[0].externalCode})`
                                        }));
                                        oComboBox.setSelectedKey(data.d.results[0].externalCode);
                                    },
                                    error: function (e) {
                                        console.log("error: " + e);
                                    }
                                });
                            })
                        }.bind(this),
                        error: function (e) {
                            console.log("error: " + e);
                        }
                    });
                } else {
                    // values.push({ key: values.length, text: data.d.results[0].customString3 });
                    values.forEach(function (oItemData) {
                        // Second Property - job Info
                        $.ajax({
                            url: ajaxUrl + "/odata/v2/cust_PersonnelArea?$filter= externalCode eq '" + oItemData.text + "'&$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                                console.log("success" + data);
                                oComboBox.addItem(new sap.ui.core.Item({
                                    key: data.d.results[0].externalCode,
                                    text: `${data.d.results[0].externalName} (${data.d.results[0].externalCode})`
                                }));
                                sap.ui.core.BusyIndicator.hide();
                            }.bind(this),
                            error: function (e) {
                                console.log("error: " + e);
                            }
                        });
                    }.bind(this));
                }
            } catch (error) {
                console.log(error);
            }
        },

        //code to open the PD01 app
        onOpenForm: function (oEvent) {
            let oProperty = this.getView().getModel("AllData").getProperty("/tableData");
            let sPath = oEvent.getSource().oPropagatedProperties.oBindingContexts.AllData.sPath.split("/");
            let i = sPath[sPath.length - 1];
            var formId = oProperty[i].Form_ID;
            // const portLink = `https://gccdev.launchpad.cfapps.eu10.hana.ondemand.com/`;
            // const flpLink = `${portLink}site?siteId=3bc09cc1-3a07-4d8c-a160-f20d7c222341#GCC_SemObj`;
            // var queryParameters;
            if (oProperty[i].Status == 'Initiated' || oProperty[i].Status == 'Save As Draft') {
                // queryParameters = `?formId=${formId}`;
                var mode = "";
            } else {
                var mode = "display";
                // queryParameters = `?formId=${formId}&mode=display`;
            }
            sap.ui.require(["sap/ushell/Container"], async (Container) => {
                const oNavigationService = await Container.getServiceAsync("Navigation");
                var sHref = await (oNavigationService && oNavigationService.getHref({
                    target: { semanticObject: "GCC_SemObj_pd01", action: "Display" },
                    params: { formId: formId, mode: mode }
                }))
                sHref = sHref.split("?")[0] + "&/?" + sHref.split("?")[1];
                var url = window.location.href.split('#')[0] + sHref;
                sap.m.URLHelper.redirect(url, true);
            });
            // var appUrl = window.location.href;
            // var reqUrl = appUrl.includes("GCC_SemObj") ? `https://gccdev.launchpad.cfapps.eu10.hana.ondemand.com/site?siteId=1c5358bf-4495-47e5-96c0-a07e5b706991#GCC_SemObj_pd01-Display?sap-ui-app-id-hint=d5a7b483-66f5-4c43-847d-93903415bc61&/${queryParameters}` : `${portLink}bc211adf-f1bc-4fc8-8396-fdc2344cf2f8.pd01qa.pd01qa-0.0.1/index.html#${queryParameters}`;
            // window.open(reqUrl, "_blank");
        },

        //code to clear the filter data
        onClearFilter: function () {
            this._formId.setValue("");
            this._fStatus_ID.setValue("");
            this._startedOn_ID.setValue("");
            this._fEmp_ID.setValue("");
            this._fEmpName_ID.setValue("");
        },

        onHideFilter: function () {
            this.getView().byId("_IDGenButton4").setVisible(false);
            this.getView().byId("_IDGenHBox1").setVisible(false);
            this.getView().byId("_IDGenButton6").setVisible(true);
        },

        onShowFilter: function () {
            this.getView().byId("_IDGenButton4").setVisible(true);
            this.getView().byId("_IDGenHBox1").setVisible(true);
            this.getView().byId("_IDGenButton6").setVisible(false);
        },

        handleReset: function (oEvent) {
            oEvent.getSource().mAggregations.filterItems.forEach(function (filterValue) {
                if (filterValue._control.mProperties.value) {
                    filterValue._control.mProperties.value = ""
                }
            });
            this.getView().getModel("AllData").setProperty("/filterValues", []);
        },

        onGo: function () {
            var ifOrg = this._fOrg.getSelectedItem(),
                iformId = this._formId.getValue(),
                ifStatus_ID = this._fStatus_ID.getSelectedItems(),
                istartedOn_ID = this._startedOn_ID.getValue(),
                iemp_id = this._fEmp_ID.getValue(),
                iemp_name = this._fEmpName_ID.getValue();

            function convertDateFormat(reqDate) {
                const parsedDate = new Date(reqDate);

                const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
                const date = parsedDate.getDate().toString().padStart(2, '0');
                const year = parsedDate.getFullYear().toString();

                const formattedDate = `${date}.${month}.${year}`;
                return formattedDate;
            }
            var oFilterLog = [], oFilterPD01 = [];

            // oFilterLog.push(new Filter("Initiator", FilterOperator.EQ, this.getView().byId("_IDGenInput12").getValue()));
            oFilterLog.push(new Filter("Type", FilterOperator.EQ, 'PD01'));
            oFilterLog.push(new Filter("CurrRecord", FilterOperator.EQ, 'X'));
            oFilterLog.push(new Filter("InitCode", FilterOperator.EQ, initiator));

            if (iemp_id) {
                oFilterPD01.push(new Filter("SelEmpCode", FilterOperator.EQ, iemp_id));
            }

            if (iemp_name) {
                oFilterPD01.push(new Filter("EmpName", FilterOperator.EQ, iemp_name));
            }

            if (iformId) {
                oFilterLog.push(new Filter("Formid", FilterOperator.EQ, iformId));
            }

            if (ifOrg) {
                oFilterLog.push(new Filter("OrganizationName", FilterOperator.EQ, ifOrg.getText()));
            }

            if (ifStatus_ID.length !== 0) {
                ifStatus_ID.forEach(function (selStatus) {
                    oFilterLog.push(new Filter("Status", FilterOperator.EQ, selStatus.getKey()));
                })
            } else {
                oFilterLog.push(new Filter("Status", FilterOperator.NE, 'I'));
                oFilterLog.push(new Filter("Status", FilterOperator.NE,'D'));
            }

            if (istartedOn_ID) {
                oFilterLog.push(new Filter("StartedOn", FilterOperator.EQ, convertDateFormat(istartedOn_ID)));
            }

            this.getOwnerComponent().getModel("ZSFGTGW_LOG_SRV").read("/zsf_logSet", {
                filters: [oFilterLog],
                success: function (oData) {
                    this.fetchAdditinonalDataForItems(oData.results, oFilterPD01);
                }.bind(this),
                error: function (error) {
                    console.log(error);
                }
            })
        },

        handleConfirm: function (oEvent) {
            var oModel = this.getView().getModel("AllData");
            var oFilterLog1 = [], filterValues = [];
            oEvent.getSource().getFilterItems().forEach(function (oValue) {
                var filterKey = Number(oValue.mProperties.key);
                var filterValue = oValue.getCustomControl().mProperties.value;
                filterValues.push({ key: filterKey, value: filterValue });
                if (filterValue) {
                    if (filterKey == 0) {
                        oFilterLog1.push(new Filter("Form_ID", FilterOperator.EQ, filterValue));
                    } else if (filterKey == 1) {
                        oFilterLog1.push(new Filter("Status", FilterOperator.EQ, filterValue));
                    } else if (filterKey == 2) {
                        oFilterLog1.push(new Filter("Date Created", FilterOperator.EQ, filterValue));
                    } else if (filterKey == 3) {
                        oFilterLog1.push(new Filter("Initiator", FilterOperator.EQ, filterValue));
                    } else if (filterKey == 4) {
                        oFilterLog1.push(new Filter("Approver", FilterOperator.EQ, filterValue));
                    } else if (filterKey == 5) {
                        oFilterLog1.push(new Filter("Employee ID", FilterOperator.EQ, filterValue));
                    } else {
                        oFilterLog1.push(new Filter("Employee Name", FilterOperator.EQ, filterValue));
                    }
                }
            })
            oModel.setProperty("/filterValues", filterValues);
            this.byId("persoTable").getBinding("items").filter(oFilterLog1);
            // this.onGo(oFilterLog1, oFilterLog2, oFilterApprover)
        },

        onFragOpen: function (oEvent) {
            var oProperty = this.getView().getModel("AllData").getProperty("/filterValues")
            if (oProperty !== undefined) {
                for (let i = 0; i < oProperty.length; i++) {
                    oEvent.getSource().getFilterItems()[i].getCustomControl().mProperties.value = oProperty[i].value;
                }
            }
        },

        fetchAdditinonalDataForItems: function (aItems, filter) {
            var oModel = this.getView().getModel("AllData");
            var sServiceUrl = this.getOwnerComponent().getModel("ZSFGTGT_PD01_SRV").sServiceUrl;
            var tableData = [];

            aItems.forEach(function (oItem) {
                var FormId = oItem.Formid,
                    Status = oItem.Status,
                    StartedOn = oItem.StartedOn,
                    Initiator = oItem.Initiator;

                this.getOwnerComponent().getModel("ZSFGTGT_PD01_SRV").read("/zsf_pd01_hSet(Formid='" + FormId + "')", {
                    filters: [filter],
                    success: function (oData) {
                        var dataHead = oData
                        var approver = oData.Approver
                        this.getOwnerComponent().getModel("ZSFGTGT_PD01_SRV").read("/zsf_pd01_hSet(Formid='" + FormId + "')/hdr_to_sec_b_nav", {
                            success: function (oData) {
                                var dataSecB = oData
                                this.getOwnerComponent().getModel("ZSFGTGT_PD01_SRV").read("/zsf_pd01_hSet(Formid='" + FormId + "')/hdr_to_sec_d_nav", {
                                    filters: [filter],
                                    success: function (oData) {
                                        // FormId = FormId.toString().replace(/^0+/,'');
                                        var empName = oData.results[0].Titlecur + " " + oData.results[0].Namecur + " " + oData.results[0].Surnamecur
                                        var temp = {
                                            "Form_ID": FormId,
                                            "Status": Status,
                                            "Date Created": StartedOn,
                                            "Initiator": Initiator,
                                            "Approver": approver,
                                            "Employee ID": dataHead.SelEmpCode,
                                            "Employee Name": empName,
                                            "Change of Address": dataHead.ChgOfAdd,
                                            "Change of Bank Details": dataHead.ChgOfBank,
                                            "Change of Name": dataHead.ChgOfNameStat,
                                            "Permanent Address Change": dataSecB.results[0].ParmAddress,
                                            "First Emergency Address Change": dataSecB.results[0].FirstEmgAdd,
                                            "Second Emergency Address Change": dataSecB.results[0].SecondEmgAdd
                                        }
                                        tableData.push(temp);
                                        oModel.setProperty("/tableData", tableData)
                                        // this.byId("persoTable").addColumn(new sap.m.Column);
                                    }.bind(this),
                                    error: function (error) {
                                        console.log(error);
                                    }
                                })
                            }.bind(this),
                            error: function (error) {
                                console.log(error);
                            }
                        })
                    }.bind(this),
                    error: function (error) {
                        console.log(error);
                    }
                })
            }.bind(this))
        },

        _registerForP13n: function () {
            var oTable = this.byId("persoTable");

            this.oMetadataHelper = new MetadataHelper([
                { key: "Form_ID", label: "Form ID", path: "AllData>Form_ID" },
                { key: "Status", label: "Status", path: "AllData>Status" },
                { key: "DateCreated", label: "Date Created", path: "AllData>DateCreated" },
                { key: "Initiator", label: "Initiator", path: "AllData>Initiator" },
                { key: "Approver", label: "Approver", path: "AllData>Approver" },
                { key: "EmployeeID", label: "Employee ID", path: "AllData>EmployeeID" },
                { key: "EmployeeName", label: "Employee Name", path: "AllData>EmployeeName" },
                { key: "ChangeofAddress", label: "Change of Address", path: "AllData>ChangeofAddress" },
                { key: "ChangeofBankDetails", label: "Change of Bank Details", path: "AllData>ChangeofBankDetails" },
                { key: "ChangeofName", label: "Change of Name", path: "AllData>ChangeofName" },
                { key: "PermanentAddressChange", label: "Permanent Address Change", path: "AllData>PermanentAddressChange" },
                { key: "FirstEmergencyAddressChange", label: "First Emergency Address Change", path: "AllData>FirstEmergencyAddressChange" },
                { key: "SecondaryEmergencyAddressChange", label: "Secondary Emergency Address Change", path: "AllData>SecondaryEmergencyAddressChange" },
            ]);

            Engine.getInstance().register(oTable, {
                helper: this.oMetadataHelper,
                controller: {
                    Columns: new SelectionController({
                        targetAggregation: "columns",
                        control: oTable
                    }),
                    Sorter: new SortController({
                        control: oTable
                    }),
                    ColumnWidth: new ColumnWidthController({
                        control: oTable
                    })
                }
            });

            Engine.getInstance().attachStateChange(this.handleStateChange.bind(this));
        },

        openPersoDialog: function (oEvt) {
            var oTable = this.byId("persoTable");

            Engine.getInstance().show(oTable, ["Columns"], {
                contentHeight: "35rem",
                contentWidth: "32rem",
                source: oEvt.getSource()
            });
        },

        _getKey: function (oControl) {
            return this.getView().getLocalId(oControl.getId());
        },

        handleStateChange: function (oEvt) {
            var oTable = this.byId("persoTable");
            var oState = oEvt.getParameter("state");

            if (!oState) {
                return;
            }

            var aSorter = [];

            oState.Sorter.forEach(function (oSorter) {
                var oExistingSorter = aSorter.find(function (oSort) {
                    return oSort.sPath === this.oMetadataHelper.getProperty(oSorter.key).path;
                }.bind(this));

                if (oExistingSorter) {
                    oExistingSorter.bDescending = !!oSorter.descending;
                } else {
                    aSorter.push(new Sorter(this.oMetadataHelper.getProperty(oSorter.key).path, oSorter.descending));
                }
            }.bind(this));

            oTable.getColumns().forEach(function (oColumn, iIndex) {
                oColumn.setVisible(false);
                oColumn.setWidth(oState.ColumnWidth[this._getKey(oColumn)]);
                oColumn.setSortIndicator(coreLibrary.SortOrder.None);
            }.bind(this));

            oState.Sorter.forEach(function (oSorter) {
                var oCol = this.byId(oSorter.key);
                if (oSorter.sorted !== false) {
                    oCol.setSortIndicator(oSorter.descending ? coreLibrary.SortOrder.Descending : coreLibrary.SortOrder.Ascending);
                }
            }.bind(this));

            oState.Columns.forEach(function (oProp, iIndex) {
                var oCol = this.byId(oProp.key);
                oCol.setVisible(true);

                oTable.removeColumn(oCol);
                oTable.insertColumn(oCol, iIndex);
            }.bind(this));

            var aCells = oState.Columns.map(function (oColumnState) {
                if (oColumnState.key == "buttons_col") {
                    return new sap.m.Button({
                        icon: "sap-icon://form",
                        tooltip: "Open Form",
                        press: "onOpenForm"
                    })
                } else {
                    return new Text({
                        text: "{" + this.oMetadataHelper.getProperty(oColumnState.key).path + "}"
                    });
                }
            }.bind(this));

            oTable.bindItems({
                templateShareable: false,
                path: 'AllData>/tableData',
                sorter: aSorter,
                template: new ColumnListItem({
                    cells: aCells
                })
            });

        },

        beforeOpenColumnMenu: function (oEvt) {
            var oMenu = this.byId("menu");
            var oColumn = oEvt.getParameter("openBy");
            var oSortItem = oMenu.getQuickActions()[0].getItems()[0];

            oSortItem.setKey(this._getKey(oColumn));
            oSortItem.setLabel(oColumn.getHeader().getText());
            oSortItem.setSortOrder(oColumn.getSortIndicator());
        },

        onColumnHeaderItemPress: function (oEvt) {
            var oTable = this.byId("persoTable");

            var oColumnHeaderItem = oEvt.getSource();
            var sPanel;
            if (oColumnHeaderItem.getIcon().indexOf("sort") >= 0) {
                sPanel = "Sorter";
                Engine.getInstance().show(oTable, [sPanel], {
                    contentHeight: "35rem",
                    contentWidth: "32rem",
                    source: oTable
                });
            } else if (oColumnHeaderItem.getIcon().indexOf("filter") >= 0) {
                sPanel = "Filter";
                this._mDialogs = {};
                this._openDialog("filter");
            } else {
                sPanel = "Columns";
                Engine.getInstance().show(oTable, [sPanel], {
                    contentHeight: "35rem",
                    contentWidth: "32rem",
                    source: oTable
                });
            }
        },

        // Filter Setting Dialog opener
        _openDialog: function (sName, sPage, fInit) {
            var oView = this.getView();

            // creates requested dialog if not yet created
            if (!this._mDialogs[sName]) {
                this._mDialogs[sName] = Fragment.load({
                    id: oView.getId(),
                    name: "pd01historyreport.view." + sName,
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }
            this._mDialogs[sName].then(function (oDialog) {
                // opens the requested dialog
                oDialog.open(sPage);
            });
        },

        onSort: function (oEvt) {
            var oSortItem = oEvt.getParameter("item");
            var oTable = this.byId("persoTable");
            var sAffectedProperty = oSortItem.getKey();
            var sSortOrder = oSortItem.getSortOrder();

            //Apply the state programatically on sorting through the column menu
            //1) Retrieve the current personalization state
            Engine.getInstance().retrieveState(oTable).then(function (oState) {

                //2) Modify the existing personalization state --> clear all sorters before
                oState.Sorter.forEach(function (oSorter) {
                    oSorter.sorted = false;
                });

                if (sSortOrder !== coreLibrary.SortOrder.None) {
                    oState.Sorter.push({
                        key: sAffectedProperty,
                        descending: sSortOrder === coreLibrary.SortOrder.Descending
                    });
                }

                //3) Apply the modified personalization state to persist it in the VariantManagement
                Engine.getInstance().applyState(oTable, oState);
            });
        },

        onColumnMove: function (oEvt) {
            var oDraggedColumn = oEvt.getParameter("draggedControl");
            var oDroppedColumn = oEvt.getParameter("droppedControl");

            if (oDraggedColumn === oDroppedColumn) {
                return;
            }

            var oTable = this.byId("persoTable");
            var sDropPosition = oEvt.getParameter("dropPosition");
            var iDraggedIndex = oTable.indexOfColumn(oDraggedColumn);
            var iDroppedIndex = oTable.indexOfColumn(oDroppedColumn);
            var iNewPos = iDroppedIndex + (sDropPosition == "Before" ? 0 : 1) + (iDraggedIndex < iDroppedIndex ? -1 : 0);
            var sKey = this._getKey(oDraggedColumn);

            Engine.getInstance().retrieveState(oTable).then(function (oState) {

                var oCol = oState.Columns.find(function (oColumn) {
                    return oColumn.key === sKey;
                }) || { key: sKey };
                oCol.position = iNewPos;

                Engine.getInstance().applyState(oTable, { Columns: [oCol] });
            });
        },

        onColumnResize: function (oEvt) {
            var oColumn = oEvt.getParameter("column");
            var sWidth = oEvt.getParameter("width");
            var oTable = this.byId("persoTable");

            var oColumnState = {};
            oColumnState[this._getKey(oColumn)] = sWidth;

            Engine.getInstance().applyState(oTable, {
                ColumnWidth: oColumnState
            });
        }
    });
});