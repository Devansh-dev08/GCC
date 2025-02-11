sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/ui/core/routing/History"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, MessageBox, History) {
        "use strict";
        let prefix = "", adminAPI = "", pathForComment, concurAccess = "", concurProfile = "", firstDateofMonth = "", initiatorCode = "";

        return Controller.extend("com.gcc.eforms.ex01.ex01.controller.View1", {
            onInit: function () {
                var link = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("introLink")
                var text = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("IntroText1")
                var linkText = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("Linktext")
                this.getView().byId("_IDGenFormattedText1").setHtmlText("<p>" + text + "<a title=" + link + " href=\"" + link + "\"</a> " + linkText + "</p>")
                prefix = sap.ui.require.toUrl(this.getOwnerComponent().getManifestEntry('/sap.app/id').replaceAll('.', '/'))
                this.getOwnerComponent().getRouter().getRoute("RouteView1").attachPatternMatched(this._onRouteMatched, this);
            },
            getBaseURL: function () {
                var appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
                var appPath = appId.replaceAll(".", "/");
                var appModulePath = jQuery.sap.getModulePath(appPath);
                return appModulePath;
            },

            _onRouteMatched: function (oEvent) {

                const url = this.getBaseURL() + "/user-api/currentUser";
                var oModel2 = new sap.ui.model.json.JSONModel();

                var that = this;
                var mock = {
                    firstname: "Dummy",
                    lastname: "User",
                    email: "",
                    name: "",
                    displayName: "Dummy User (dummy.user@com)"
                };

                oModel2.loadData(url);
                oModel2.dataLoaded()
                    .then(() => {
                        if (!oModel2.getData().email) {
                            oModel2.setData(mock);
                            var useremail = "test00157472@noemail.gloucestershire.gov.uk";
                        }
                        else {
                            var useremail = oModel2.getData().email;
                            adminAPI = "/admin";
                        }
                        this.query = oEvent.getParameter('arguments')["?query"];
                        var that = this;
                        var oModel = new sap.ui.model.json.JSONModel();
                        this.getView().setModel(oModel, "Model1");
                        if (this.query != undefined) {
                            // // Getting the initiator from the mail id
                            oModel.setProperty("/form", this.query);
                            this._getInitiator(oModel, useremail)
                                .then(initiator => {
                                    var initi = initiator;
                                    // Checking if the user has Multiple Organization
                                    this._checkMultiOrg(oModel, initi)
                                        .then(response => {
                                            var formid = this.query.formId;
                                            this._S4Services(formid, oModel);
                                            if (this.query.mode) {
                                                this.getView().byId("_IDGenButton9").setVisible(false);
                                                this.getView().byId("_IDGenButton7").setVisible(false);
                                                this.getView().byId("_IDGenButton8").setText("Save");
                                            }
                                            this._prev6Months(oModel);
                                            // Loading picklist values
                                            this._picklist(oModel);
                                        })
                                })
                        }
                        else {

                            var query = { formId: "", mode: "" }
                            oModel.setProperty("/form", query);
                            // // Adding Empty rows to all the tables...
                            this._addEmptyRow(oModel)

                            // // Getting the initiator from the mail id
                            this._getInitiator(oModel, useremail)
                                .then(initiator => {
                                    var initi = initiator;
                                    // Checking if the user has Multiple Organization
                                    this._checkMultiOrg(oModel, initi)
                                        .then(response => {
                                            // // Calling all the SuccessFactors API's
                                            this._SFServices(oModel, initi, response);
                                            // Loading picklist values
                                            this._picklist(oModel);
                                            // // Generating Form ID
                                            this.getOwnerComponent().getModel("ZSFGTGW_EX01_SRV").read("/zsfgt_formid_genSet",
                                                {
                                                    success: function (oData) {
                                                        console.log(oData.results[0].Formid);
                                                        this.getView().byId("_IDGenInput2").setValue(oData.results[0].Formid);
                                                        this.getView().byId("_HIDGenFormId1").setValue(oData.results[0].Formid);
                                                    }.bind(this),
                                                    error: function (oData) {
                                                        console.log("Error" + oData);
                                                    }
                                                });
                                        })
                                })
                                .catch(error => {
                                    MessageBox.error(`We cannot process the form ahead because of the following message:
                                    
                                    ${error.Message}`);
                                });
                            this._prev6Months(oModel);
                        }
                    })
            },

            _prev6Months: function (oModel) {
                // Claim Month PREV 6 Months CALC
                var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                var today = new Date();
                var currentMonthIndex = today.getMonth();
                var PrevSixMonths = [];

                for (var i = 0; i < 7; i++) {
                    var PrevMonthIndex = currentMonthIndex - i;
                    var year = today.getFullYear();
                    if (PrevMonthIndex < 0) {
                        PrevMonthIndex += 12;
                        year--;
                    }
                    var PrevMonth = months[PrevMonthIndex];

                    // Create a string representing month and year
                    var monthAndYear = PrevMonth + ' ' + year;
                    var temp = {
                        months: monthAndYear,
                        key: PrevMonthIndex + 1
                    }
                    PrevSixMonths.push(temp);
                }
                oModel.setProperty("/PrevSixMonths", PrevSixMonths);
            },

            _picklist: function (oModel) {
                $.ajax({
                    url: prefix + adminAPI + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'ecEmailType' and externalCode eq 'B' and status eq 'A'&$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        if (data.d.results.length > 0) {
                            oModel.setProperty("/emailType", data.d.results[0].optionId);
                        }
                    },
                    error: function (e) {
                        console.log(`PickListValueV2 entity failed for email type`);
                        console.log(`Error: ${JSON.parse(e.responseText)}`);
                    }
                });
                $.ajax({
                    url: prefix + adminAPI + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'TravelPrivileges' and status eq 'A'&$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        if (data.d.results.length > 0) {
                            oModel.setProperty("/travelPrivilegesPicklist", data.d.results);
                        }
                    },
                    error: function (e) {
                        console.log(`PickListValueV2 entity failed for Travel Privileges`);
                        console.log(`Error: ${JSON.parse(e.responseText)}`);
                    }
                });
                $.ajax({
                    url: prefix + adminAPI + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'VEHICLETYPES' and status eq 'A'&$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        if (data.d.results.length > 0) {
                            oModel.setProperty("/vehTypePicklist", data.d.results);
                        }
                    },
                    error: function (e) {
                        console.log(`PickListValueV2 entity failed for Vehicle Type`);
                        console.log(`Error: ${JSON.parse(e.responseText)}`);
                    }
                });
            },

            _getExpenseTypes: async function (oModel, path, userId) {
                var travelPrivilege;
                await $.ajax({
                    url: prefix + "/odata/v2/EmpJob?$format=json &$filter=userId eq '" + userId + "'",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        if (data.d.results.length > 0 && data.d.results[0].customString12) {
                            travelPrivilege = data.d.results[0].customString12;
                        }
                        else {
                            MessageBox.error("Please assign a Travel Privilege to this employee")
                        }
                    }.bind(this),
                    error: function (e) {
                        console.log(JSON.parse(e.responseText).error);
                    }.bind(this)
                });

                var travelPrivilegeCode = oModel.getProperty("/travelPrivilegesPicklist").filter((el) => el.optionId == travelPrivilege)[0].externalCode

                await $.ajax({
                    url: prefix + "/odata/v2/cust_ZFLM_EXPENSE_TYPES?$format=json &$filter=cust_TravelPrivileges eq '" + travelPrivilegeCode + "'",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        data.d.results.sort((a, b) => {
                            if (a.cust_ExpenseID < b.cust_ExpenseID) return -1;
                            if (a.cust_ExpenseID > b.cust_ExpenseID) return 1;
                        });
                        oModel.setProperty(path + "/dropdownExpType", data.d.results);
                    }.bind(this),
                    error: function (e) {
                        console.log(JSON.parse(e.responseText).error);
                    }.bind(this)
                });
            },

            _mileageDropdown: function (oModel, sPath, travelPriv) {
                return new Promise(
                    function (resolve, reject) {
                        $.ajax({
                            url: prefix + "/odata/v2/cust_ZFLM_VEHICLE_TYPES?$format=json&$filter=cust_TravelPrivileges eq '" + travelPriv + "'",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                                if (data.d.results.length > 0) {
                                    var drop = [];
                                    let uniqueData = data.d.results.filter((e, i) => {
                                        return data.d.results.findIndex((x) => {
                                            return x.cust_VehicleType == e.cust_VehicleType;
                                        }) == i;
                                    });
                                    for (let i = 0; i < uniqueData.length; i++) {
                                        var temp = {
                                            key: i,
                                            cust_VehicleType: uniqueData[i].cust_VehicleType
                                        }
                                        drop.push(temp);
                                    }
                                    data.d.results.sort((a, b) => {
                                        if (a.cust_VehicleType < b.cust_VehicleType) return -1;
                                        if (a.cust_VehicleType > b.cust_VehicleType) return 1;

                                        if (a.cust_VehicleClass < b.cust_VehicleClass) return -1;
                                        if (a.cust_VehicleClass > b.cust_VehicleClass) return 1;
                                    });
                                    // oModel.setProperty(sPath + "/VehClassList", data.d.results);
                                    oModel.setProperty(sPath + "/dropdownVehType", drop);
                                    resolve(true);
                                } else
                                    reject(`There are no Vehicle Types defined for ${travelPriv}`);
                            }.bind(this),
                            error: function (e) {
                                reject(`cust_ZFLM_VEHICLE_TYPES entity failed for ${travelPriv}`);
                                console.log(`cust_ZFLM_VEHICLE_TYPES entity failed for ${travelPriv}`);
                            }.bind(this)
                        });
                    });
            },

            _S4Services: function (formid, oModel) {

                this.getOwnerComponent().getModel("ZSFGTGW_EX01_SRV").read("/zsf_ex01_hSet('" + formid + "')?$format=json",
                    {
                        success: function (oData) {
                            this.getView().byId("_IDGenInput2").setValue(oData.Formid);
                            this.getView().byId("_HIDGenFormId1").setValue(oData.Formid);
                            this.getView().byId("_IDGenInput1").setValue(oData.Initiator);
                            oModel.setProperty("/initNameP", { salutationLabel: oData.Initiator.split(" ")[0], firstNameInit: oData.Initiator.split(" ")[1], lastNameInit: oData.Initiator.split(" ")[2] });
                            this.getView().byId("DatePicker01").setDateValue(new Date(oData.Zdate));
                            this.getView().byId("_IdGenInput6").setSelectedKey(oData.OrgCode);
                            this.checkingG4School(oData.OrgCode);
                            oModel.setProperty("/OrgNameP", { customString3: oData.OrganizationName });
                            oModel.setProperty("/CostCentreP", { costCenter: oData.CostCentre })
                            initiatorCode = oData.CostCentreCode;
                            this.getView().byId("_IDGenComboBox1").setValue(oData.ClaimMonth);
                            this.getView().byId("_IDGenComboBox1").setSelectedKey(oData.ClaimMonthInt);
                            this.getView().byId("checkbox1").setSelected(oData.Notify ? true : false);
                            this.getView().byId("_IDGenDatePicker1").setDateValue(new Date(oData.ClaimEndDate));
                            firstDateofMonth = new Date(oData.ClaimStartDate).toLocaleDateString();
                            var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
                            var FirstDateISO = dateFormat.format(new Date(oData.ClaimStartDate));
                            var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-dd-MM" });
                            var LastDateISO = dateFormat.format(new Date(oData.ClaimEndDate));
                            this._getEmplData(oData.OrgCode, LastDateISO, FirstDateISO);
                        }.bind(this),
                        error: function (resp) {
                            console.log(JSON.parse(resp.responseText).error.message.value)
                        }.bind(this)
                    });


                this.getOwnerComponent().getModel("ZSFGTGW_EX01_SRV").read("/zsf_ex01_hSet('" + formid + "')/hdr_to_sec_a_nav?$format=json",
                    {
                        success: function (oData) {
                            var secA = [];
                            var defVehUrl = [];
                            if (oData.results.length == 0) {
                                var singleRow = {
                                    counter: 1,
                                    empName: "",
                                    PersonID: "",
                                    jobTitle: "",
                                    userId: "",
                                    postingDate: "",
                                    email: "",
                                    CustomString1: "",
                                    VehicleType: "",
                                    VehicleTypeCode: "",
                                    VehicleClass: "",
                                    VehicleClassCode: "",
                                    NumberOfMiles: "",
                                    Amount: "",
                                    enableMiles: false,
                                    enableVehicleType: false,
                                    enableVehicleClass: false,
                                    enableAmount: false
                                }
                                secA.push(singleRow);
                            }
                            else {
                                for (let i = 0; i < oData.results.length; i++) {
                                    var rowData = {
                                        "counter": Number(oData.results[i].SeqNumber),
                                        "empName": oData.results[i].Employee,
                                        "PersonID": oData.results[i].Perid,
                                        "userId": oData.results[i].Userid,
                                        "jobTitle": oData.results[i].JobTitle,
                                        "email": oData.results[i].Email,
                                        "postingDate": oData.results[i].PostingDate,
                                        "VehicleType": oData.results[i].VehicleType,
                                        "VehicleTypeCode": oData.results[i].VehicleTypeCode,
                                        "enableVehicleType": oData.results[i].VehTypeEnab == "X" ? true : false,
                                        // "VehicleClass": oData.results[i].VehicleClass,
                                        // "VehicleClassCode": oData.results[i].VehClassCode,
                                        // "enableVehicleClass": oData.results[i].VehClassEnab == "X" ? true : false,
                                        "enableMiles": oData.results[i].MilesEnab == "X" ? true : false,
                                        "NumberOfMiles": oData.results[i].NoOfMiles,
                                        "Amount": "",
                                        "enableAmount": false
                                    }
                                    secA.push(rowData);
                                    this.getVehicleTypeDropdown(oModel, `/SecAData/${i}`, oData.results[i].Userid, false);
                                }
                            }
                            oModel.setProperty("/SecAData", secA);
                        }.bind(this),
                        error: function (resp) {
                            console.log(JSON.parse(resp.responseText).error.message.value)
                        }.bind(this)
                    });

                this.getOwnerComponent().getModel("ZSFGTGW_EX01_SRV").read("/zsf_ex01_hSet('" + formid + "')/hdr_to_sec_b_nav?$format=json",
                    {
                        success: function (oData) {
                            var secB = [];
                            if (oData.results.length == 0) {
                                var singleRow = {
                                    counter: 1,
                                    empName: "",
                                    PersonID: "",
                                    jobTitle: "",
                                    userId: "",
                                    email: "",
                                    postingDate: "",
                                    CustomString1: "",
                                    ExpenseType: "",
                                    ExpenseTypeCode: "",
                                    Amount: "",
                                    enableExpense: false,
                                    enableAmount: false
                                }
                                secB.push(singleRow);
                            }
                            else {
                                for (let i = 0; i < oData.results.length; i++) {
                                    var rowData = {
                                        "counter": Number(oData.results[i].SeqNumber),
                                        "empName": oData.results[i].Employee,
                                        "PersonID": oData.results[i].Perid,
                                        "userId": oData.results[i].Userid,
                                        "jobTitle": oData.results[i].JobTitle,
                                        "email": oData.results[i].Email,
                                        "postingDate": oData.results[i].PostingDate,
                                        "ExpenseType": oData.results[i].ExpenseType,
                                        "ExpenseTypeCode": oData.results[i].ExpenseTypeCode,
                                        "enableExpense": oData.results[i].ExpTypeEnab == "X" ? true : false,
                                        "enableAmount": oData.results[i].AmountEnab == "X" ? true : false,
                                        "Amount": oData.results[i].Amount
                                    }
                                    secB.push(rowData);
                                    this._getExpenseTypes(oModel, `/SecBData/${i}`, oData.results[i].Userid)
                                }
                            }
                            oModel.setProperty("/SecBData", secB);
                        }.bind(this),
                        error: function (resp) {
                            console.log(JSON.parse(resp.responseText).error.message.value)
                        }.bind(this)
                    });



                this.getOwnerComponent().getModel("ZSFGTGW_EX01_SRV").read("/zsf_ex01_hSet('" + formid + "')/hdr_to_sec_c_nav?$format=json",
                    {
                        success: function (oData) {
                            var secC = [], defVehUrl = [];
                            if (oData.results.length == 0) {
                                var singleRow = {
                                    counter: 1,
                                    PersonID: "",
                                    empName: "",
                                    jobTitle: "",
                                    userId: "",
                                    email: "",
                                    postingDate: "",
                                    CustomString1: "",
                                    VehicleType: "",
                                    VehicleTypeCode: "",
                                    VehicleClass: "",
                                    VehicleClassCode: "",
                                    NumberOfMiles: "",
                                    Amount: "",
                                    enableMiles: false,
                                    enableVehicleType: false,
                                    enableVehicleClass: false,
                                    enableAmount: false
                                };
                                secC.push(singleRow);
                            }
                            else {
                                for (let i = 0; i < oData.results.length; i++) {
                                    var rowData = {
                                        "counter": Number(oData.results[i].SeqNumber),
                                        "empName": oData.results[i].Employee,
                                        "PersonID": oData.results[i].Perid,
                                        "userId": oData.results[i].Userid,
                                        "jobTitle": oData.results[i].JobTitle,
                                        "email": oData.results[i].Email,
                                        "postingDate": oData.results[i].PostingDate,
                                        "VehicleType": oData.results[i].VehicleType,
                                        "VehicleTypeCode": oData.results[i].VehicleTypeCode,
                                        "enableVehicleType": oData.results[i].VehTypeEnab == "X" ? true : false,
                                        // "VehicleClass": oData.results[i].VehicleClass,
                                        // "VehicleClassCode": oData.results[i].VehClassCode,
                                        // "enableVehicleClass": oData.results[i].VehClassEnab == "X" ? true : false,
                                        "enableMiles": oData.results[i].MilesEnab == "X" ? true : false,
                                        "NumberOfMiles": oData.results[i].NoOfMiles,
                                        "Amount": "",
                                        "enableAmount": false
                                    }
                                    secC.push(rowData);
                                    this.getVehicleTypeDropdown(oModel, `/SecCData/${i}`, oData.results[i].Userid, false);
                                }
                            }
                            oModel.setProperty("/SecCData", secC);
                        }.bind(this),
                        error: function (resp) {
                            console.log(JSON.parse(resp.responseText).error.message.value)
                        }.bind(this)
                    });



                this.getOwnerComponent().getModel("ZSFGTGW_EX01_SRV").read("/zsf_ex01_hSet('" + formid + "')/hdr_to_sec_d_nav?$format=json",
                    {
                        success: function (oData) {
                            var secD = [];
                            if (oData.results.length == 0) {
                                var singleRow = {
                                    counter: 1,
                                    empName: "",
                                    PersonID: "",
                                    jobTitle: "",
                                    userId: "",
                                    email: "",
                                    postingDate: "",
                                    CustomString1: "",
                                    ExpenseType: "",
                                    ExpenseTypeCode: "",
                                    Amount: "",
                                    enableExpense: false,
                                    enableAmount: false
                                }
                                secD.push(singleRow);
                            }
                            else {
                                for (let i = 0; i < oData.results.length; i++) {
                                    var rowData = {
                                        "counter": Number(oData.results[i].SeqNumber),
                                        "empName": oData.results[i].Employee,
                                        "PersonID": oData.results[i].Perid,
                                        "userId": oData.results[i].Userid,
                                        "jobTitle": oData.results[i].JobTitle,
                                        "email": oData.results[i].Email,
                                        "postingDate": oData.results[i].PostingDate,
                                        "ExpenseType": oData.results[i].ExpenseType,
                                        "ExpenseTypeCode": oData.results[i].ExpenseTypeCode,
                                        "enableExpense": oData.results[i].ExpTypeEnab == "X" ? true : false,
                                        "enableAmount": oData.results[i].AmountEnab == "X" ? true : false,
                                        "Amount": oData.results[i].Amount
                                    }
                                    secD.push(rowData);
                                    this._getExpenseTypes(oModel, `/SecDData/${i}`, oData.results[i].Userid)
                                }
                            }
                            oModel.setProperty("/SecDData", secD);
                        }.bind(this),
                        error: function (resp) {
                            console.log(JSON.parse(resp.responseText).error.message.value)
                        }.bind(this)
                    });



                this.getOwnerComponent().getModel("ZSFGTGW_EX01_SRV").read("/zsf_ex01_hSet('" + formid + "')/hdr_to_comm_nav?$format=json",
                    {
                        success: function (oData) {
                            if (oData.results.length > 0) {
                                var comm = "";
                                for (let i = 0; i < oData.results.length; i++) {
                                    comm += oData.results[i].comment + "\n";
                                }
                                this.getView().byId("_IDGenTextArea2").setValue(comm);
                                this.getView().byId("_IDGenTextArea2").setVisible(true);
                                this.getView().byId("_IDGenLabe20").setVisible(true);
                            }
                        }.bind(this),
                        error: function (resp) {
                            console.log(JSON.parse(resp.responseText).error.message.value)
                        }.bind(this)
                    });


                this.getOwnerComponent().getModel("ZSFGTGW_EX01_SRV").read("/zsf_ex01_hSet('" + formid + "')/hdr_to_comm_row_nav?$format=json",
                    {
                        success: function (oData) {
                            oModel.setProperty("/ShowBtnData", oData.results);
                        }.bind(this),
                        error: function (resp) {
                            console.log(JSON.parse(resp.responseText).error.message.value)
                        }.bind(this)
                    });
            },

            batchCall: function (aData) {
                return new Promise(
                    function (resolve, reject) {
                        try {
                            let a = new sap.ui.model.odata.ODataModel(prefix + "/odata/v2", true);
                            a.bTokenHandling = false;
                            let batchData = [];
                            a.clearBatch();
                            aData.forEach(function (oItem) {
                                batchData.push(a.createBatchOperation(
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
            },

            _addEmptyRow: function (oModel) {

                var secAData = [{
                    counter: 1,
                    empName: "",
                    PersonID: "",
                    jobTitle: "",
                    userId: "",
                    email: "",
                    postingDate: "",
                    CustomString1: "",
                    VehicleType: "",
                    VehicleTypeCode: "",
                    VehicleClass: "",
                    VehicleClassCode: "",
                    NumberOfMiles: "",
                    Amount: "",
                    enableMiles: false,
                    enableVehicleType: false,
                    enableVehicleClass: false,
                    enableAmount: false
                }];
                oModel.setProperty("/SecAData", secAData);

                var secBData = [{
                    counter: 1,
                    empName: "",
                    PersonID: "",
                    jobTitle: "",
                    userId: "",
                    email: "",
                    postingDate: "",
                    CustomString1: "",
                    ExpenseType: "",
                    ExpenseTypeCode: "",
                    Amount: "",
                    enableExpense: false,
                    enableAmount: false
                }];
                oModel.setProperty("/SecBData", secBData);

                var secCData = [{
                    counter: 1,
                    PersonID: "",
                    empName: "",
                    jobTitle: "",
                    userId: "",
                    email: "",
                    postingDate: "",
                    CustomString1: "",
                    VehicleType: "",
                    VehicleTypeCode: "",
                    VehicleClass: "",
                    VehicleClassCode: "",
                    NumberOfMiles: "",
                    Amount: "",
                    enableMiles: false,
                    enableVehicleType: false,
                    enableVehicleClass: false,
                    enableAmount: false
                }];
                oModel.setProperty("/SecCData", secCData);

                var secDData = [{
                    counter: 1,
                    PersonID: "",
                    empName: "",
                    userId: "",
                    email: "",
                    postingDate: "",
                    ExpenseType: "",
                    ExpenseTypeCode: "",
                    Amount: "",
                    enableExpense: false,
                    enableAmount: false
                }];
                oModel.setProperty("/SecDData", secDData);
            },

            _getInitiator: async function (oModel, useremail) {

                var email;
                await $.ajax({
                    url: prefix + "/odata/v2/PerEmail?$filter=emailAddress eq '" + useremail + "' &$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        email = data;
                    }.bind(this),
                    error: function (e) {
                        console.log("error: " + e);
                    }
                });
                await $.ajax({
                    url: prefix + "/odata/v2/PerPerson(personIdExternal='" + email.d.results[0].personIdExternal + "')/personalInfoNav?$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        var initDetails = {
                            email: email.d.results[0].emailAddress,
                            personIdExternal: email.d.results[0].personIdExternal,        //first name, last name Etc.
                            fullName: data.d.results[0].firstName + " " + data.d.results[0].lastName
                        }
                        initiatorCode = email.d.results[0].personIdExternal;
                        oModel.setProperty("/user", initDetails);
                    }.bind(this),
                    error: function (data) {
                        console.log("error" + data)
                    }
                });

                return new Promise(
                    function (resolve, reject) {
                        if (email.d.results[0].personIdExternal != "") {
                            resolve(email.d.results[0].personIdExternal);
                        }
                        else {
                            reject({ Message: "User cannot be found corresponding to the email id" })
                        }
                    });
            },

            _checkMultiOrg: async function (oModel, initiator) {

                var username;
                var multiOrgFound = false;
                await $.ajax({
                    url: prefix + "/odata/v2/UserAccount?$format=json&$filter=personIdExternal eq '" + initiator + "'",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {

                        username = data.d.results[0].username;
                    },
                    error: function (request) {
                        console.log("Error in fetching Username");
                        username = 'devansh.agarwal@hcl.com';
                    }
                });
                await $.ajax({
                    url: prefix + "/odata/v2/cust_ZFLM_MULTI_USERS?$filter=cust_UserName eq '" + username + "'&$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: async function (data) {

                        if (data.d.results.length != 0) {
                            var cust_Value = data.d.results[0].cust_Value.split(",");
                            multiOrgFound = true;
                            oModel.setProperty("/OrgNameP", { customString3: "" });
                            this.getView().setModel(oModel, "Model1");
                            var val = [];
                            cust_Value.forEach(async function (item) {
                                $.ajax({
                                    url: prefix + "/odata/v2/cust_PersonnelArea?$filter= externalCode eq '" + item + "'&$format=json",
                                    type: 'GET',
                                    contentType: "application/json",
                                    success: function (data) {
                                        var req = {
                                            key: item,
                                            value: data.d.results[0].externalName
                                        };
                                        val.push(req);
                                        oModel.setProperty("/OrgValues", val);
                                    },
                                    error: function () {
                                        console.log("Error in Assigning Multiple Personnel Area");
                                    }
                                });
                            });
                        } else {
                            this.getView().byId("_IdGenInput6").setEditable(false);
                        }
                    }.bind(this),
                    error: function () {
                        console.log("Error in fetching Multiple Organization");
                    }
                });
                return new Promise(
                    function (resolve, reject) {
                        resolve(multiOrgFound);
                        reject(multiOrgFound)
                    });
            },

            _SFServices: async function (oModel, initiator, multiOrgFlag) {

                $.ajax({
                    url: prefix + "/odata/v2/PerPerson('" + initiator + "')/personalInfoNav?$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {

                        var salutationInit = data.d.results[0].salutation;
                        var firstNameInit = data.d.results[0].firstName;
                        var lastNameInit = data.d.results[0].lastName;
                        // salutation label
                        $.ajax({
                            url: prefix + adminAPI + "/odata/v2/PicklistOption(" + salutationInit + 'L' + ")/picklistLabels?$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {

                                var salutationLabel = data.d.results[0].label;
                                var initName = {
                                    salutationLabel: salutationLabel,
                                    firstNameInit: firstNameInit,
                                    lastNameInit: lastNameInit
                                }
                                oModel.setProperty("/initNameP", initName);
                                this.getView().setModel(oModel, "Model1");
                            }.bind(this),
                            error: function (e) {
                                console.log("error: " + e);
                            }
                        });
                    }.bind(this),
                    error: function (e) {
                        console.log("error: " + e);
                    }
                });

                // // orgName Initiator
                $.ajax({
                    url: prefix + "/odata/v2/EmpJob?$format=json&$filter=userId eq '" + initiator + "'",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        // Organisation Name property
                        oModel.setProperty("/OrgNameP", data.d.results[0]);
                        if (data.d.results[0].managerId == "NO_MANAGER") {
                            MessageBox.error("Line Manager is missing, Form cannot be Initiated", {
                                title: "Error Message",
                                actions: [sap.m.MessageBox.Action.OK],
                                onClose: function (oAction) {
                                    if (oAction) {
                                        window.history.go(-1);
                                    }
                                }
                            });
                        }
                        else {
                            this.managerId = data.d.results[0].managerId;
                            if (!multiOrgFlag) {
                                this.checkingG4School(data.d.results[0].customString3);
                                $.ajax({
                                    url: prefix + "/odata/v2/cust_PersonnelArea?$filter= externalCode eq '" + data.d.results[0].customString3 + "'&$format=json",
                                    type: 'GET',
                                    contentType: "application/json",
                                    success: function (data) {
                                        var req = [{
                                            key: data.d.results[0].externalCode,
                                            value: data.d.results[0].externalName
                                        }];
                                        var temp = data.d.results[0].externalName + " (" + data.d.results[0].externalCode + ")";
                                        oModel.setProperty("/OrgValues", req);
                                        oModel.setProperty("/OrgNameP", { customString3: temp });
                                        this.getView().byId("_IdGenInput6").setSelectedKey(data.d.results[0].externalCode)
                                        this.getView().setModel(oModel, "Model1");
                                        setTimeout(this._logCreation("I", this.getView().byId("_IDGenInput1").getValue(), this.getView().byId("_IdGenInput6").getValue(), ""), 300);
                                    }.bind(this),
                                    error: function () {
                                        console.log("Error in Assigning Multiple Personnel Area");
                                    }
                                });
                            }
                            else {
                                oModel.setProperty("/OrgNameP", { customString3: "" });
                            }
                        }
                    }.bind(this),
                    error: function (e) {
                        console.log("error: " + e);
                    }
                });

                // populating date by system
                this.getView().byId("DatePicker01").setDateValue(new Date());

                // // Cost Center AJAX 
                $.ajax({
                    url: prefix + "/odata/v2/EmpCostAssignmentItem?$filter= EmpCostAssignment_worker eq '" + initiator + "'&$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        for (let i = 0; i < data.d.results.length; i++) {
                            if (data.d.results[i].defaultAssignment == true) {
                                oModel.setProperty("/costCenterCode", data.d.results[i].costCenter);
                                $.ajax({
                                    url: prefix + `/odata/v2${data.d.results[i].costCenterNav.__deferred.uri.split("/odata/v2")[1]}?$format=json`,
                                    type: 'GET',
                                    contentType: "application/json",
                                    success: function (data) {
                                        if (data && data.d.results[0] && data.d.results[0].costcenterExternalObjectID) {
                                            if (Number(data.d.results[0].costcenterExternalObjectID))
                                                oModel.setProperty("/CostCentreP", { costCenter: (+data.d.results[0].costcenterExternalObjectID).toString() });
                                            else
                                                oModel.setProperty("/CostCentreP", { costCenter: (data.d.results[0].costcenterExternalObjectID).toString() });
                                        }
                                        else {
                                            MessageBox.error("Cost Center could not be found");
                                        }
                                    },
                                    error: function (e) {
                                        console.log(`FOCostCenter entity failed for ${initiator}`);
                                    }
                                });
                                break;
                            }
                        }
                    }.bind(this),
                    error: function (e) {
                        console.log("error: " + e);
                    }
                });
            },

            onOrgChange: async function (oEvent) {

                if (oEvent.getSource().getSelectedItem() != null) {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                    var orgCode = oEvent.getSource().getSelectedItem().getKey();
                    var sMonthIndex = this.getView().byId("_IDGenComboBox1").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox1").getSelectedItem().getKey() : this.getView().byId("_IDGenComboBox1").getSelectedKey();
                    this._logCreation("I", this.getView().byId("_IDGenInput1").getValue(), this.getView().byId("_IdGenInput6").getValue(), "");
                    this.checkingG4School(orgCode);
                    if (sMonthIndex != "") {
                        sap.ui.core.BusyIndicator.show();
                        var sMonthYear = this.getView().byId("_IDGenComboBox1").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox1").getSelectedItem().getText() : this.getView().byId("_IDGenComboBox1").getValue();
                        var sYear = sMonthYear.split(" ")[1];
                        var LastDate = new Date(sYear, sMonthIndex, 0);
                        var FirstDate = new Date(sYear, sMonthIndex - 1, 1);
                        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
                        var FirstDateISO = dateFormat.format(FirstDate);
                        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-dd-MM" });
                        var LastDateISO = dateFormat.format(LastDate);
                        this._getEmplData(orgCode, LastDateISO, FirstDateISO);
                    }
                }
                else {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                }
            },

            _getEmplData: async function (orgCode, LastDateISO, FirstDateISO) {

                var terminated, retired, suspended, discarded, reportedNoShow;
                await $.ajax({
                    url: prefix + adminAPI + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'employee-status' and status eq 'A'&$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        for (let a = 0; a < data.d.results.length; a++) {
                            if (data.d.results[a].label_defaultValue == "Discarded") {
                                discarded = data.d.results[a].optionId;
                            }
                            if (data.d.results[a].label_defaultValue == "Terminated") {
                                terminated = data.d.results[a].optionId;
                            }
                            if (data.d.results[a].label_defaultValue == "Retired") {
                                retired = data.d.results[a].optionId;
                            }
                            if (data.d.results[a].label_defaultValue == "Suspended") {
                                suspended = data.d.results[a].optionId;
                            }
                            if (data.d.results[a].label_defaultValue == "Reported No Show") {
                                reportedNoShow = data.d.results[a].optionId;
                            }
                        }
                    },
                    error: function (e) {
                        console.log(`PickListValueV2 entity failed for employee-status while getting employee dropdown`);
                        console.log(`Error: ${JSON.parse(e.responseText)}`);
                    }
                });

                // hardcoding organisation code for Police forms
                let uri = `/odata/v2/EmpJob?$filter=customString3 eq '${orgCode}' and emplStatus ne '${discarded}' and emplStatus ne '${terminated}' and emplStatus ne '${retired}' and emplStatus ne '${suspended}' and emplStatus ne '${reportedNoShow}' and endDate gt datetime'${FirstDateISO}T00:00:00'&toDate=${LastDateISO}&$format=json`
                fetchingEmpData(uri, orgCode, LastDateISO, this);
                // Getting all the employees from the personnel area
                async function fetchingEmpData(uri, orgCode, LastDateISO, _self) {
                    let employeeData = [];
                    await $.ajax({
                        url: prefix + uri,
                        type: 'GET',
                        contentType: "application/json",
                        success: function (data) {
                            employeeData = data.d.results;
                            if (data.d.__next) {
                                sap.ui.core.BusyIndicator.show();
                                var uri = "/odata/v2" + data.d.__next.split("/odata/v2")[1];
                                fetchingEmpData(uri, orgCode, LastDateISO, _self);
                            }
                        },
                        error: function (e) {
                            sap.ui.core.BusyIndicator.hide();
                            console.log(`EmpJob entity failed for ${orgCode} while getting employee dropdown`);
                            console.log("error: " + JSON.parse(e.responseText));
                        }
                    });

                    employeeData = _self.filterEmplData(employeeData);
                    var findPostDate = Number((new Date(LastDateISO.split("-")[0], LastDateISO.split("-")[2], 0).getTime()));

                    let a = new sap.ui.model.odata.ODataModel(prefix + "/odata/v2", false);
                    a.bTokenHandling = false;
                    var lastIteration = false;
                    if (employeeData.length > 180) {
                        for (let i = 0; i < employeeData.length / 180; i++) {
                            lastIteration = i + 1 == Math.ceil(employeeData.length / 180) ? true : false;
                            employeeDetails(employeeData.slice(i * 180, (i + 1) * 180), _self, lastIteration);
                        }
                    }
                    else {
                        employeeDetails(employeeData, _self, true);
                    }

                    function employeeDetails(emplData, _self, lastIteration) {
                        let batchData = [];
                        a.clearBatch();
                        emplData.forEach(function (oItem) {
                            batchData.push(a.createBatchOperation(
                                "/EmpEmployment?$filter=userId eq '" + oItem.userId + "'",
                                "GET"
                            ));
                        });
                        a.addBatchReadOperations(batchData);
                        a.setUseBatch(true);
                        a.submitBatch(function (data) {
                            batchData = [];
                            a.clearBatch();
                            data.__batchResponses.forEach(function (oId) {
                                batchData.push(a.createBatchOperation(
                                    "/PerPersonal?$filter=personIdExternal eq '" + oId.data.results[0].personIdExternal + "'",
                                    "GET"
                                ));
                            })
                            a.addBatchReadOperations(batchData);
                            a.setUseBatch(true);
                            a.submitBatch(function (data) {
                                if (data.__batchResponses) {
                                    var EmpData = [];
                                    for (let i = 0; i < data.__batchResponses.length; i++) {
                                        try {
                                            var postingDate = _self.unixDateRegex(emplData[i].endDate) > findPostDate ? findPostDate : _self.unixDateRegex(emplData[i].endDate);
                                            var temp = {
                                                firstName: data.__batchResponses[i].data.results[0].firstName,
                                                lastName: data.__batchResponses[i].data.results[0].lastName,
                                                userId: emplData[i].userId,
                                                jobTitle: emplData[i].customString1,
                                                personIdExternal: data.__batchResponses[i].data.results[0].personIdExternal,
                                                postingDate: `/Date(${postingDate})/`
                                            };
                                            EmpData.push(temp);
                                        } catch (e) {
                                            console.log("Inconsistent data found for " + emplData[i].userId);
                                        }
                                    }
                                    var existingData = _self.getView().getModel("Model1").getProperty("/dropdownEmp");
                                    var finalData = existingData ? existingData.concat(EmpData) : EmpData;
                                    finalData = finalData.filter((el, index) => {
                                        return finalData.findIndex((e) => {
                                            return e.userId == el.userId
                                        }) == index;
                                    });
                                    finalData.sort((a, b) => {
                                        // Sort by Last name
                                        if (a.lastName < b.lastName) return -1;
                                        if (a.lastName > b.lastName) return 1;

                                        // a.firstName.localeCompare(b.firstName)
                                        if (a.firstName < b.firstName) return -1;
                                        if (a.firstName > b.firstName) return 1;

                                        //Sort by UserId
                                        if (a.userId < b.userId) return -1;
                                        if (a.userId > b.userId) return 1;
                                    });
                                    _self.getView().getModel("Model1").setProperty("/dropdownEmp", finalData);
                                    if (lastIteration)
                                        sap.ui.core.BusyIndicator.hide();
                                }
                                else {
                                    console.log(`No Employee Found for ${empl.d.results[0].personIdExternal}`);
                                    if (lastIteration)
                                        sap.ui.core.BusyIndicator.hide();
                                }
                            });
                        });
                    }
                }
            },

            unixDateRegex: function (date1) {
                const regex = /\/Date\((.*?)\)\//;
                const match = regex.exec(date1);
                return Number(match[1]);
            },

            onMonth: async function (oEvent) {

                if (oEvent.getSource().getSelectedItem() != null) {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                    sap.ui.core.BusyIndicator.show();
                    var sMonthIndex = oEvent.getSource().getSelectedItem().getKey();
                    var sMonthYear = oEvent.getSource().getSelectedItem().getText();
                    var sYear = sMonthYear.split(" ")[1];
                    var LastDate = new Date(sYear, sMonthIndex, 0);
                    firstDateofMonth = new Date(sYear, sMonthIndex - 1, 1);
                    var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
                    var FirstDateISO = dateFormat.format(firstDateofMonth);
                    var dateFormat1 = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-dd-MM" });
                    var LastDateISO = dateFormat1.format(LastDate);
                    var dateFormat1 = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "dd MMM yyyy" });
                    var LastDateDisp = dateFormat1.format(LastDate);
                    this.getView().byId("_IDGenDatePicker1").setValue(LastDateDisp);
                    var orgCode = this.getView().byId("_IdGenInput6").getSelectedItem() != null ? this.getView().byId("_IdGenInput6").getSelectedItem().getKey() : this.getView().byId("_IdGenInput6").getSelectedKey();
                    this._getEmplData(orgCode, LastDateISO, FirstDateISO);
                }
                else {
                    MessageBox.error("Please select values from the dropdown");
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                }

            },

            _dateForS4: function (date) {
                var temp = new Date(date);
                var temp1 = (temp.toDateString()).toString();
                return temp1.split(' ').slice(1).join(' ')
            },

            _updateRefreshToken: function (payload, refresh_token) {
                if (refresh_token) {
                    payload.RefreshToken = refresh_token;
                    this.getOwnerComponent().getModel("ConcurCreds").update("/ZSFGT_APP_LOGINSet(Application='C')", payload, {
                        success: function (resp) {
                            console.log("Refresh Token has been successfully updated");
                        }.bind(this),
                        error: function (error) {
                            console.log("Refresh Token updation failed");
                        }.bind(this)
                    })
                }
            },

            _checkConcur: async function (initiator, oModel, sPath, allType, emplname) {

                return new Promise(
                    async function (resolve, reject) {
                        var errorFound = true;
                        await this.getOwnerComponent().getModel("ConcurCreds").read("/ZSFGT_APP_LOGINSet(Application='C')?$format=json", {
                            success: async function (oData) {
                                console.log(`Concur has been succeeded ${oData}`)
                                var concurDetails = oData;
                                // concurAccess
                                var settings = {
                                    "url": prefix + "/oauth2/v0/token",
                                    "method": "POST",
                                    "timeout": 0,
                                    "headers": {
                                        "Content-Type": "application/x-www-form-urlencoded"
                                    },
                                    "data": {
                                        "client_id": concurDetails.ClientId,
                                        "client_secret": concurDetails.ClientSecret,
                                        "grant_type": "refresh_token",
                                        "refresh_token": concurDetails.RefreshToken
                                    }
                                };

                                await $.ajax(settings).done(async function (response) {
                                    this._updateRefreshToken(concurDetails, response.refresh_token);
                                    var emplEmail = "", extEmpl = false;
                                    const businessEmailType = oModel.getProperty("/emailType");
                                    // Checking the business email of the selected Employee
                                    await $.ajax({
                                        url: prefix + "/odata/v2/PerEmail?$filter=personIdExternal eq '" + initiator + "' and emailType eq '" + businessEmailType + "' &$format=json",
                                        type: 'GET',
                                        contentType: "application/json",
                                        success: function (data) {
                                            if (data.d.results.length == 0) {
                                                // MessageBox.error("Business Email is not maintained for this Employee");
                                                // errorFound = true;
                                                // this.oBusyDialog.close();
                                                // allType == "M" ? this._controlMileageRows(oModel, sPath, false, false, false) : this._controlExpensesRows(oModel, sPath, false, false);
                                                // reject();
                                                // return;
                                                emplEmail = initiator + "@" + concurDetails.CompanynameSuffix + concurDetails.UsernameSuffix;
                                            }
                                            else if (data.d.results[0].emailAddress == "") {
                                                // MessageBox.error("Business Email is not maintained for this Employee");
                                                // errorFound = true;
                                                // this.oBusyDialog.close();
                                                // allType == "M" ? this._controlMileageRows(oModel, sPath, false, false, false) : this._controlExpensesRows(oModel, sPath, false, false);
                                                // reject();
                                                // return;
                                                emplEmail = data.d.results[0].personIdExternal + "@" + concurDetails.CompanynameSuffix + concurDetails.UsernameSuffix;
                                            }
                                            else {
                                                // Checking if the employee is an external employee by comparing email
                                                if (data.d.results[0].emailAddress.includes("@gloucestershire.gov.uk") || data.d.results[0].emailAddress.includes("@glosfire.gov.uk") || data.d.results[0].emailAddress.includes("@gloucester.gov.uk"))
                                                    extEmpl = true;
                                                else
                                                    emplEmail = data.d.results[0].personIdExternal + "@" + concurDetails.CompanynameSuffix + concurDetails.UsernameSuffix;
                                            }
                                        }.bind(this),
                                        error: function (e) {
                                            console.log("error: " + e);
                                            errorFound = true;
                                            this.oBusyDialog.close();
                                            allType == "M" ? this._controlMileageRows(oModel, sPath, false, false, false) : this._controlExpensesRows(oModel, sPath, false, false);
                                            reject();
                                            return;
                                        }.bind(this)
                                    });
                                    // If external employee then attaching the concur suffix to its username
                                    if (extEmpl) {
                                        await $.ajax({
                                            url: prefix + "/odata/v2/UserAccount?$filter=personIdExternal eq '" + initiator + "' &$format=json",
                                            type: 'GET',
                                            contentType: "application/json",
                                            success: function (data) {
                                                if (data.d.results.length == 0) {
                                                    MessageBox.error("User Account is not maintained for this Employee");
                                                    errorFound = true;
                                                    this.oBusyDialog.close();
                                                    allType == "M" ? this._controlMileageRows(oModel, sPath, false, false, false) : this._controlExpensesRows(oModel, sPath, false, false);
                                                    reject();
                                                    return;
                                                }
                                                else if (data.d.results[0].username == "") {
                                                    MessageBox.error("Username is not maintained for this Employee");
                                                    errorFound = true;
                                                    this.oBusyDialog.close();
                                                    allType == "M" ? this._controlMileageRows(oModel, sPath, false, false, false) : this._controlExpensesRows(oModel, sPath, false, false);
                                                    reject();
                                                    return;
                                                }
                                                else {
                                                    emplEmail = data.d.results[0].username + "@" + concurDetails.CompanynameSuffix + concurDetails.UsernameSuffix;
                                                }
                                            }.bind(this),
                                            error: function (e) {
                                                console.log("error: " + e);
                                                errorFound = true;
                                                this.oBusyDialog.close();
                                                allType == "M" ? this._controlMileageRows(oModel, sPath, false, false, false) : this._controlExpensesRows(oModel, sPath, false, false);
                                                reject();
                                                return;
                                            }.bind(this)
                                        });
                                    }
                                    if (emplEmail != "") {
                                        var url1 = prefix + "/profile/identity/v4/Users?filter=userName eq \"" + emplEmail + "\"";
                                        var settings = {
                                            "url": url1,
                                            "method": "GET",
                                            "responseType": 'json',
                                            "resolveBodyOnly": true,
                                            "rejectUnauthorized": false,
                                            "headers": {
                                                "Authorization": "Bearer " + response.access_token,
                                            },
                                        };
                                        $.support.cors = true;
                                        await $.ajax(settings).done(function (response) {
                                            if (response.Resources.length == 0) {
                                                errorFound = true;
                                                MessageBox.error(`The employee ${emplname} does not have an account and hence a claim cannot be created for them. Please contact ContactUs on 01452 425888 for this employee before entering expenses for them.`);
                                                this.oBusyDialog.close();
                                                allType == "M" ? this._controlMileageRows(oModel, sPath, false, false, false) : this._controlExpensesRows(oModel, sPath, false, false);
                                                reject();
                                                return;
                                            }
                                            else {
                                                errorFound = false;
                                                oModel.setProperty(sPath + "/email", emplEmail);
                                                this.oBusyDialog.close();
                                                allType == "M" ? this._controlMileageRows(oModel, sPath, true, false, false) : this._controlExpensesRows(oModel, sPath, true, false);
                                                resolve();
                                            }
                                            this.oBusyDialog.close();
                                        }.bind(this)).fail(function (error) {
                                            console.log("error", error)
                                            errorFound = true;
                                            this.oBusyDialog.close();
                                            allType == "M" ? this._controlMileageRows(oModel, sPath, false, false, false) : this._controlExpensesRows(oModel, sPath, false, false);
                                            reject();
                                            return;
                                        }.bind(this));
                                    }
                                }.bind(this)).fail(function (XMLHttpRequest, textStatus) {
                                    console.log("error");
                                    errorFound = true;
                                    MessageBox.error(`Some error occurred. Please try again`);
                                    this.oBusyDialog.close();
                                    allType == "M" ? this._controlMileageRows(oModel, sPath, false, false, false) : this._controlExpensesRows(oModel, sPath, false, false);
                                    reject();
                                    return;
                                }.bind(this));
                            }.bind(this),
                            error: function (resp) {
                                errorFound = true;
                                this.oBusyDialog.close();
                                allType == "M" ? this._controlMileageRows(oModel, sPath, false, false, false) : this._controlExpensesRows(oModel, sPath, false, false);
                                reject();
                                return;
                            }.bind(this)
                        });
                    }.bind(this))
            },

            filterEmplData: function (emplData) {
                var reqArr = [];

                function dateToReq(date) {
                    return date.split("(")[1].split(")")[0];
                }

                emplData.sort((a, b) => {
                    if (a.userId < b.userId) return -1;
                    if (a.userId > b.userId) return 1;

                    if (dateToReq(a.endDate) < dateToReq(b.endDate)) return 1;
                    if (dateToReq(a.endDate) > dateToReq(b.endDate)) return -1;
                });

                for (let i = 0; i < emplData.length; i++) {
                    if (reqArr.find((el) => el.userId == emplData[i].userId && el.position == emplData[i].position)) {
                        console.log("Same Employee found")
                    }
                    else {
                        reqArr.push(emplData[i]);
                    }
                }

                return reqArr;
            },

            numberValidation: function (oEvent) {
                var value = oEvent.getParameter("newValue");
                var regex = /^\d+$/g;
                if (!regex.test(value)) {
                    oEvent.getSource().setValue(value.slice(0, value.length - 1));
                }
            },

            floatValidation: function (oEvent) {
                var value = oEvent.getParameter("newValue");
                var regex = /^\d*\.?\d*$/;
                if (!regex.test(value)) {
                    oEvent.getSource().setValue(value.slice(0, value.length - 1));
                }
            },

            _controlMileageRows: function (oModel, sPath, Vtype, Vclass, Miles) {
                if (!Vtype) {
                    oModel.setProperty(sPath + "/VehicleType", "");
                }
                if (!Vclass) {
                    oModel.setProperty(sPath + "/VehicleClass", "");
                }
                if (!Miles) {
                    oModel.setProperty(sPath + "/NumberOfMiles", "");
                }
                oModel.setProperty(sPath + "/enableVehicleType", Vtype);
                oModel.setProperty(sPath + "/enableVehicleClass", Vclass);
                oModel.setProperty(sPath + "/enableMiles", Miles);

            },

            _controlExpensesRows: function (oModel, sPath, EType, EAmount) {
                if (!EType) {
                    oModel.setProperty(sPath + "/ExpenseType", "");
                }
                if (!EAmount) {
                    oModel.setProperty(sPath + "/Amount", "");
                }
                oModel.setProperty(sPath + "/enableExpense", EType);
                oModel.setProperty(sPath + "/enableAmount", EAmount);
            },

            onEmplChangeSecA: async function (oEvent) {

                var emp1 = oEvent.getSource().getSelectedItem();
                var oModel = this.getView().getModel("Model1");
                var oBind = oEvent.getSource().getBindingContext("Model1")
                var sPath = oBind.getPath();
                if (oEvent.getSource().getValue()) {
                    if (emp1 == null) {
                        oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                        this._controlMileageRows(oModel, sPath, false, false, false);
                    }
                    else {
                        if (!this._oBusyDialog) {
                            this.oBusyDialog = sap.ui.xmlfragment("com.gcc.eforms.ex01.ex01.fragment.BusyDialog", this);
                            this.getView().addDependent(this.oBusyDialog);
                            this.oBusyDialog.open();
                        }
                        oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                        var allData = oModel.getProperty("/dropdownEmp");
                        var reqDetails = allData.filter((el) => el.userId == emp1.getKey());
                        oModel.setProperty(sPath + "/jobTitle", reqDetails[0].jobTitle);
                        oModel.setProperty(sPath + "/userId", reqDetails[0].userId);
                        oModel.setProperty(sPath + "/PersonID", reqDetails[0].personIdExternal);
                        oModel.setProperty(sPath + "/postingDate", reqDetails[0].postingDate);
                        this._checkConcur(reqDetails[0].personIdExternal, oModel, sPath, "M", reqDetails[0].firstName + " " + reqDetails[0].lastName)
                            .then(() => this.getVehicleTypeDropdown(oModel, sPath, emp1.getKey(), true))
                            .catch(() => console.log("some error"));
                    }
                }
                else {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                }

            },

            onVehTypeChangeSecA: function (oEvent) {

                var vehicleType = oEvent.getSource().getSelectedItem();
                var oModel = this.getView().getModel("Model1");
                var oBind = oEvent.getSource().getBindingContext("Model1")
                var sPath = oBind.getPath();
                if (vehicleType == null) {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                    this._controlMileageRows(oModel, sPath, true, false, false);
                }
                else {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                    oModel.setProperty(sPath + "/VehicleTypeCode", vehicleType.getKey());
                    this._controlMileageRows(oModel, sPath, true, false, true);
                    // var vehClass = oModel.getProperty(sPath + "/VehClassList");
                    // vehClass = vehClass.filter((el) => el.cust_VehicleType.includes(vehicleType.getText()));
                    // vehClass[0].cust_VehicleClass != null ? this._controlMileageRows(oModel, sPath, true, true, false) : this._controlMileageRows(oModel, sPath, true, false, true);
                    // oModel.setProperty(sPath + "/dropdownVehClass", vehClass);
                }
            },

            onVehClassChangeSecA: function (oEvent) {

                var vehicleClass = oEvent.getSource().getSelectedItem();
                var oModel = this.getView().getModel("Model1");
                var oBind = oEvent.getSource().getBindingContext("Model1")
                var sPath = oBind.getPath();
                if (vehicleClass == null) {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                    this._controlMileageRows(oModel, sPath, true, true, false);
                }
                else {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                    oModel.setProperty(sPath + "/VehicleClassCode", vehicleClass.getKey());
                    this._controlMileageRows(oModel, sPath, true, true, true);
                }

            },

            onEmplChangeSecB: function (oEvent) {

                var emp1 = oEvent.getSource().getSelectedItem();
                var oModel = this.getView().getModel("Model1");
                var oBind = oEvent.getSource().getBindingContext("Model1")
                var sPath = oBind.getPath();
                if (oEvent.getSource().getValue()) {
                    if (emp1 == null) {
                        oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                        this._controlExpensesRows(oModel, sPath, false, false);
                    }
                    else {
                        if (!this._oBusyDialog) {
                            this.oBusyDialog = sap.ui.xmlfragment("com.gcc.eforms.ex01.ex01.fragment.BusyDialog", this);
                            this.getView().addDependent(this.oBusyDialog);
                            this.oBusyDialog.open();
                        }
                        oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                        var allData = oModel.getProperty("/dropdownEmp");
                        var reqDetails = allData.filter((el) => el.userId == emp1.getKey());
                        oModel.setProperty(sPath + "/jobTitle", reqDetails[0].jobTitle);
                        oModel.setProperty(sPath + "/userId", reqDetails[0].userId);
                        oModel.setProperty(sPath + "/PersonID", reqDetails[0].personIdExternal);
                        oModel.setProperty(sPath + "/postingDate", reqDetails[0].postingDate);
                        this._checkConcur(reqDetails[0].personIdExternal, oModel, sPath, "E", reqDetails[0].firstName + " " + reqDetails[0].lastName)
                            .then(() => this._getExpenseTypes(oModel, sPath, reqDetails[0].userId))
                            .catch(() => console.log("some error"));
                    }
                } else {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                }
            },

            onExpenseChangeSecB: function (oEvent) {

                var expense = oEvent.getSource().getSelectedItem();
                var oModel = this.getView().getModel("Model1");
                var oBind = oEvent.getSource().getBindingContext("Model1")
                var sPath = oBind.getPath();
                if (expense == null) {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                    this._controlExpensesRows(oModel, sPath, true, false);
                }
                else {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                    oModel.setProperty(sPath + "/ExpenseTypeCode", expense.getKey());
                    this._controlExpensesRows(oModel, sPath, true, true);
                }

            },

            _getNamePerid: async function (userId, oModel, sPath) {
                return new Promise(
                    async function (resolve, reject) {
                        var personId;
                        await $.ajax({
                            url: prefix + `/odata/v2/EmpEmployment?$format=json&$filter=userId eq '${userId}'`,
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                                personId = data.d.results[0].personIdExternal;
                            }.bind(this),
                            error: function (e) {
                                console.log(e);
                                reject(e);
                                return;
                            }.bind(this)
                        });

                        await $.ajax({
                            url: prefix + "/odata/v2/PerPerson('" + personId + "')/personalInfoNav?$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                                oModel.setProperty(sPath + "/empName", data.d.results[0].firstName + " " + data.d.results[0].lastName);
                                resolve({ personIdExternal: personId, empName: data.d.results[0].firstName + " " + data.d.results[0].lastName });
                                return;
                            }.bind(this),
                            error: function (e) {
                                reject(e);
                                return;
                            }.bind(this)
                        });
                    })
            },

            onIDChange: function (oEvent) {
                var oModel = this.getView().getModel("Model1");
                var userId = oEvent.getSource().getValue();
                var oBind = oEvent.getSource().getBindingContext("Model1");
                var sPath = oBind.getPath();
                if (userId) {
                    $.ajax({
                        url: prefix + "/odata/v2/EmpJob?$format=json&$filter=userId eq '" + userId + "'",
                        type: 'GET',
                        contentType: "application/json",
                        success: function (data) {

                            if (data.d.results.length == 0) {
                                this._controlMileageRows(oModel, sPath, false, false, false);
                                oModel.setProperty(sPath + "/empName", "");
                                oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                                MessageBox.error(`Could not find Job Info for ${userId}`);
                            }
                            else if (data.d.results[0].payGroup != 'G4') {
                                this._controlMileageRows(oModel, sPath, false, false, false);
                                oModel.setProperty(sPath + "/empName", "");
                                oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                                MessageBox.error(`${userId} does not belong to G4 Pay Group`);
                            }
                            else {
                                if (!this._oBusyDialog) {
                                    this.oBusyDialog = sap.ui.xmlfragment("com.gcc.eforms.ex01.ex01.fragment.BusyDialog", this);
                                    this.getView().addDependent(this.oBusyDialog);
                                    this.oBusyDialog.open();
                                }
                                oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                                oModel.setProperty(sPath + "/userId", userId);
                                this._getNamePerid(userId, oModel, sPath)
                                    .then((resp) => {
                                        this._checkConcur(resp.personIdExternal, oModel, sPath, "M", resp.empName)
                                            .then(() => this.getVehicleTypeDropdown(oModel, sPath, userId, true))
                                    })
                                    .catch((e) => console.log(e));
                            }
                        }.bind(this),
                        error: function (e) {
                            console.log("error: " + e);
                            oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                            this._controlMileageRows(oModel, sPath, false, false, false);
                            oModel.setProperty(sPath + "/empName", "");
                            MessageBox.error(JSON.parse(e.responseText).error.message.value);
                        }.bind(this)
                    })
                } else {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                    oModel.setProperty(sPath + "/empName", "");
                    this._controlMileageRows(oModel, sPath, false, false, false);
                }
            },

            onIDChangeSecD: function (oEvent) {
                var oModel = this.getView().getModel("Model1");
                var userId = oEvent.getSource().getValue();
                var oBind = oEvent.getSource().getBindingContext("Model1");
                var sPath = oBind.getPath();
                if (userId) {
                    $.ajax({
                        url: prefix + "/odata/v2/EmpJob?$format=json&$filter=userId eq '" + userId + "'",
                        type: 'GET',
                        contentType: "application/json",
                        success: function (data) {

                            if (data.d.results.length == 0) {
                                this._controlExpensesRows(oModel, sPath, false, false);
                                oModel.setProperty(sPath + "/empName", "");
                                oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                                MessageBox.error(`Could not find Job Info for ${userId}`);
                            }
                            else if (data.d.results[0].payGroup != 'G4') {
                                this._controlExpensesRows(oModel, sPath, false, false);
                                oModel.setProperty(sPath + "/empName", "");
                                oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                                MessageBox.error(`${userId} does not belong to G4 Pay Group`);
                            }
                            else {
                                if (!this._oBusyDialog) {
                                    this.oBusyDialog = sap.ui.xmlfragment("com.gcc.eforms.ex01.ex01.fragment.BusyDialog", this);
                                    this.getView().addDependent(this.oBusyDialog);
                                    this.oBusyDialog.open();
                                }
                                oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                                oModel.setProperty(sPath + "/userId", userId);
                                this._getNamePerid(userId, oModel, sPath)
                                    .then((resp) => {
                                        this._checkConcur(resp.personIdExternal, oModel, sPath, "E", resp.empName)
                                            .then(() => this._getExpenseTypes(oModel, sPath, userId))
                                    })
                                    .catch((e) => console.log(e));
                            }
                        }.bind(this),
                        error: function (e) {
                            console.log("error: " + e);
                            oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                            this._controlExpensesRows(oModel, sPath, false, false);
                            oModel.setProperty(sPath + "/empName", "");
                            MessageBox.error(JSON.parse(e.responseText).error.message.value);
                        }.bind(this)
                    })
                } else {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                    oModel.setProperty(sPath + "/empName", "");
                    this._controlExpensesRows(oModel, sPath, false, false);
                }
            },

            onAmountChange: function (oEvent) {
                var value = +oEvent.getSource().getValue();
                var oModel = this.getView().getModel("Model1");
                var oBind = oEvent.getSource().getBindingContext("Model1");
                var sPath = oBind.getPath();
                oEvent.getSource().setValueState("None");
                oEvent.getSource().setValueStateText("Amount is a required field");
                if (value) {
                    var expType = oModel.getProperty(sPath + "/ExpenseTypeCode");
                    var maxValue = oBind.getProperty("dropdownExpType").filter((el) => el.cust_ExpenseType == expType)[0].cust_MaxValue;
                    if (+maxValue && value > +maxValue) {
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText(`Amount cannot exceed ${+maxValue}`);
                    }
                    else {
                        oEvent.getSource().setValue(value.toFixed(2));
                    }
                }
            },

            onInputChange: function (oEvent) {
                if (oEvent.getSource().getValue())
                    oEvent.getSource().setValueState("None")
            },

            checkingG4School: function (org) {
                if (org) {
                    $.ajax({
                        url: prefix + "/odata/v2/cust_PersonnelArea?$filter= externalCode eq '" + org + "'&$format=json",
                        type: 'GET',
                        contentType: "application/json",
                        success: function (data) {
                            if (data.d.results.length > 0 && data.d.results[0].cust_PayrollArea == "G4") {
                                this.payrollArea = data.d.results[0].cust_PayrollArea;
                                this.getView().byId("_IDGenPanel5").setVisible(true);
                                this.getView().byId("_IDGenPanel6").setVisible(true);
                            }
                            else {
                                this.getView().byId("_IDGenPanel5").setVisible(false);
                                this.getView().byId("_IDGenPanel6").setVisible(false);
                            }
                        }.bind(this),
                        error: function (e) {
                            console.log(e);
                        }
                    });
                }
            },

            getVehicleTypeDropdown: function (oModel, sPath, userId, fillVehFlag) {
                $.ajax({
                    url: prefix + "/odata/v2/EmpJob?$filter=userId eq '" + userId + "'&$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        if (data.d.results.length > 0 && data.d.results[0].customString12) {
                            var travelPrivilege = oModel.getProperty("/travelPrivilegesPicklist").filter((el) => el.optionId == data.d.results[0].customString12)[0].externalCode;
                            this._mileageDropdown(oModel, sPath, travelPrivilege)
                                .then((resp) => {
                                    if (resp)
                                        this.getDefaultVehicle(oModel, sPath, data.d.results[0], fillVehFlag);
                                })
                                .catch((e) => {
                                    MessageBox.error(e)
                                })
                        }
                        else {
                            MessageBox.error(`Please assign a Travel Privelege for ${userId}`);
                        }
                    }.bind(this),
                    error: function (e) {
                        console.log(e);
                    }
                });
            },

            getDefaultVehicle: function (oModel, sPath, data, fillVehFlag) {
                if (data && data.customString16) {
                    var vehTypText = oModel.getProperty("/vehTypePicklist").filter((el) => el.optionId == data.customString16)[0].label_en_GB
                    var defaultVehType = oModel.getProperty(sPath + "/dropdownVehType").filter((el) => el.cust_VehicleType == vehTypText)[0];
                    if (defaultVehType) {
                        oModel.setProperty(sPath + "/defVehType", defaultVehType.cust_VehicleType);
                        if (fillVehFlag) {
                            oModel.setProperty(sPath + "/VehicleType", defaultVehType.cust_VehicleType);
                            oModel.setProperty(sPath + "/VehicleTypeCode", defaultVehType.key)
                            this._controlMileageRows(oModel, sPath, true, false, true);
                        }
                        // var VehClass = oModel.getProperty(sPath + "/VehClassList").filter((el) => el.cust_VehicleType.includes(defaultVehType.cust_VehicleType));
                        // if (VehClass[0].cust_VehicleClass) {
                        //     this._controlMileageRows(oModel, sPath, true, true, false);
                        //     oModel.setProperty(sPath + "/dropdownVehClass", VehClass);
                        //     if (data.customString18) {
                        //         var defaultVehClass = VehClass.filter((el) => el.cust_VehicleClass == data.customString18)[0];
                        //         if (defaultVehClass) {
                        //             oModel.setProperty(sPath + "/defVehClass", defaultVehClass.cust_VehicleClass);
                        //             if (fillVehFlag) {
                        //                 oModel.setProperty(sPath + "/VehicleClass", defaultVehClass.cust_VehicleClass);
                        //                 oModel.setProperty(sPath + "/VehicleClassCode", defaultVehClass.cust_VehicleID);
                        //             }
                        //             this._controlMileageRows(oModel, sPath, true, true, true);
                        //         } else this._controlMileageRows(oModel, sPath, true, true, false);
                        //     }
                        // } else {
                        //     this._controlMileageRows(oModel, sPath, true, false, true);
                        // }
                    } else fillVehFlag ? oModel.setProperty(sPath + "/VehicleType", "") : "";
                }
            },

            onAddRowTab1: function () {
                var oModel = this.getView().getModel("Model1").getProperty("/SecAData");
                var len = oModel.length;
                var secAData = {
                    counter: oModel[len - 1].counter + 1,
                    empName: "",
                    PersonID: "",
                    jobTitle: "",
                    userId: "",
                    email: "",
                    CustomString1: "",
                    VehicleType: "",
                    VehicleClass: "",
                    NumberOfMiles: "",
                    Amount: "",
                    enableMiles: false,
                    enableVehicleType: false,
                    enableVehicleClass: false,
                    enableAmount: false
                };
                oModel.push(secAData);
                this.getView().getModel("Model1").setProperty("/SecAData", oModel);
            },

            onDelRowTab1: function () {
                var oTable = this.getView().byId("_IDGenTable1");
                var oProperty = this.getView().getModel("Model1").getProperty("/SecAData");
                var aSelectedItems = oTable.getSelectedItems();
                if (oProperty.length == aSelectedItems.length) {
                    var oProperty = [{
                        counter: 1,
                        empName: "",
                        PersonID: "",
                        jobTitle: "",
                        userId: "",
                        email: "",
                        CustomString1: "",
                        VehicleType: "",
                        VehicleClass: "",
                        NumberOfMiles: "",
                        Amount: "",
                        enableMiles: false,
                        enableVehicleType: false,
                        enableVehicleClass: false,
                        enableAmount: false
                    }];
                }
                else {
                    for (var i = aSelectedItems.length - 1; i >= 0; i--) {
                        var oItem = aSelectedItems[i];
                        var iIndex = oTable.indexOfItem(oItem);
                        oProperty.splice(iIndex, 1);
                    }
                }
                oTable.removeSelections();
                this.getView().getModel("Model1").setProperty("/SecAData", oProperty);
            },

            onAddRowTab2: function () {
                var oModel = this.getView().getModel("Model1").getProperty("/SecBData");
                var len = oModel.length;
                var secBData = {
                    counter: oModel[len - 1].counter + 1,
                    empName: "",
                    PersonID: "",
                    jobTitle: "",
                    userId: "",
                    email: "",
                    CustomString1: "",
                    ExpenseType: "",
                    ExpenseTypeCode: "",
                    Amount: "",
                    enableExpense: false,
                    enableAmount: false
                };
                oModel.push(secBData);
                this.getView().getModel("Model1").setProperty("/SecBData", oModel);
            },

            onDelRowTab2: function () {
                var oTable = this.getView().byId("_IDGenTable2");
                var oProperty = this.getView().getModel("Model1").getProperty("/SecBData");
                var aSelectedItems = oTable.getSelectedItems();
                if (oProperty.length == aSelectedItems.length) {
                    var oProperty = [{
                        counter: 1,
                        empName: "",
                        PersonID: "",
                        jobTitle: "",
                        userId: "",
                        email: "",
                        CustomString1: "",
                        ExpenseType: "",
                        ExpenseTypeCode: "",
                        Amount: "",
                        enableExpense: false,
                        enableAmount: false
                    }];
                }
                else {
                    for (var i = aSelectedItems.length - 1; i >= 0; i--) {
                        var oItem = aSelectedItems[i];
                        var iIndex = oTable.indexOfItem(oItem);
                        oProperty.splice(iIndex, 1);
                    }
                }
                oTable.removeSelections();
                this.getView().getModel("Model1").setProperty("/SecBData", oProperty);
            },

            onAddRowTab3: function () {
                var oModel = this.getView().getModel("Model1").getProperty("/SecCData");
                var len = oModel.length;
                var secCData = {
                    counter: oModel[len - 1].counter + 1,
                    PersonID: "",
                    empName: "",
                    jobTitle: "",
                    userId: "",
                    email: "",
                    CustomString1: "",
                    VehicleType: "",
                    VehicleTypeCode: "",
                    VehicleClass: "",
                    VehicleClassCode: "",
                    NumberOfMiles: "",
                    Amount: "",
                    enableMiles: false,
                    enableVehicleType: false,
                    enableVehicleClass: false,
                    enableAmount: false
                };
                oModel.push(secCData);
                this.getView().getModel("Model1").setProperty("/SecCData", oModel);
            },

            onDelRowTab3: function () {
                var oTable = this.getView().byId("_IDGenTable3");
                var oProperty = this.getView().getModel("Model1").getProperty("/SecCData");
                var aSelectedItems = oTable.getSelectedItems();
                if (oProperty.length == aSelectedItems.length) {
                    var oProperty = [{
                        counter: 1,
                        PersonID: "",
                        empName: "",
                        jobTitle: "",
                        userId: "",
                        email: "",
                        CustomString1: "",
                        VehicleType: "",
                        VehicleTypeCode: "",
                        VehicleClass: "",
                        VehicleClassCode: "",
                        NumberOfMiles: "",
                        Amount: "",
                        enableMiles: false,
                        enableVehicleType: false,
                        enableVehicleClass: false,
                        enableAmount: false
                    }];
                }
                else {
                    for (var i = aSelectedItems.length - 1; i >= 0; i--) {
                        var oItem = aSelectedItems[i];
                        var iIndex = oTable.indexOfItem(oItem);
                        oProperty.splice(iIndex, 1);
                    }
                }
                oTable.removeSelections();
                this.getView().getModel("Model1").setProperty("/SecCData", oProperty);
            },

            onAddRowTab4: function () {
                var oModel = this.getView().getModel("Model1").getProperty("/SecDData");
                var len = oModel.length;
                var secDData = {
                    counter: oModel[len - 1].counter + 1,
                    PersonID: "",
                    empName: "",
                    userId: "",
                    email: "",
                    ExpenseType: "",
                    ExpenseTypeCode: "",
                    Amount: "",
                    enableExpense: false,
                    enableAmount: false
                };
                oModel.push(secDData);
                this.getView().getModel("Model1").setProperty("/SecDData", oModel);
            },

            onDelRowTab4: function () {
                var oTable = this.getView().byId("_IDGenTable4");
                var oProperty = this.getView().getModel("Model1").getProperty("/SecDData");
                var aSelectedItems = oTable.getSelectedItems();
                if (oProperty.length == aSelectedItems.length) {
                    var oProperty = [{
                        counter: 1,
                        PersonID: "",
                        empName: "",
                        userId: "",
                        email: "",
                        ExpenseType: "",
                        ExpenseTypeCode: "",
                        Amount: "",
                        enableExpense: false,
                        enableAmount: false
                    }];
                }
                else {
                    for (var i = aSelectedItems.length - 1; i >= 0; i--) {
                        var oItem = aSelectedItems[i];
                        var iIndex = oTable.indexOfItem(oItem);
                        oProperty.splice(iIndex, 1);
                    }
                }
                oTable.removeSelections();
                this.getView().getModel("Model1").setProperty("/SecDData", oProperty);
            },

            onShowPress1: function (oEvent) {
                if (!this._oShowDialog) {
                    this._oShowDialog = sap.ui.xmlfragment("com.gcc.eforms.ex01.ex01.fragment.Showbut", this);
                    this.getView().addDependent(this._oShowDialog);
                }
                var sPath = oEvent.getSource().getBindingContext("Model1").getPath();
                this.rowId = (Number(sPath.split("Data/")[1]) + 1).toString();
                this.Section = sPath.includes("SecAData") ? "A" : sPath.includes("SecBData") ? "B" : sPath.includes("SecCData") ? "C" : "D";
                var commData = this.getView().getModel("Model1").getProperty("/ShowBtnData");
                if (commData == undefined || commData == []) {
                    this.getView().getModel("Model1").setProperty("/ShowBtnData", []);
                }
                else {
                    var commentExist = commData.filter((el) => el.SeqNumber == this.rowId && el.Section == this.Section);
                    if (commentExist.length != 0) {
                        this.getView().getModel("Model1").setProperty("/rowComment", commentExist[0].comment);
                    }
                }
                this._oShowDialog.open();
            },

            onAddComment: function () {
                var oComm = this.getView().byId("_IDGenTextArea3").getValue();
                var CommExist = this.getView().byId("_IDGenTextArea2").getValue();
                var name = this.getView().getModel("Model1").getProperty("/user");
                if (oComm == "") {
                    confirm("Add the Comment first");
                }
                else {
                    // var oUser = parent.sap.ushell.Container.getUser().getId();
                    var tday = new Array("Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday");
                    var tmonth = new Array("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December");
                    var d = new Date();
                    var nday = d.getDay(),
                        nmonth = d.getMonth(),
                        ndate = d.getDate(),
                        nyear = d.getFullYear(),
                        nhour = d.getHours(),
                        nmin = d.getMinutes(),
                        nsec = d.getSeconds();
                    if (CommExist == "") {
                        var oAuthComm = "Comments added by " + name.fullName + " on " + tday[nday] + ", " + ndate + " " + tmonth[nmonth] + " " + nyear + " " + nhour + ":" + nmin + ":" + nsec + " GMT at Status Initial - \n" + oComm;
                    }
                    else {
                        oAuthComm = "Comments added by " + name.fullName + " on " + tday[nday] + ", " + ndate + " " + tmonth[nmonth] + " " + nyear + " " + nhour + ":" + nmin + ":" + nsec + " GMT at Status Initial - \n" + oComm + "\n\n" + CommExist;
                    }
                    this.getView().byId("_IDGenTextArea2").setVisible(true);
                    this.getView().byId("_IDGenLabe20").setVisible(true);
                    this.getView().byId("_IDGenTextArea2").setValue(oAuthComm);
                    this.getView().byId("_IDGenTextArea3").setValue("");
                }
            },

            onDialClose1: function () {
                // var com = this.getView().getModel("Model1").getProperty("/rowComment");
                // var commData = this.getView().getModel("Model1").getProperty("/ShowBtnData");
                // var commentExist = commData.filter((el) => el.SeqNumber == pathForComment.rowId && el.Section == pathForComment.Section);
                // if (commentExist.length != 0) {
                //     for (let i = 0; i < commData.length; i++) {
                //         if (commData[i].SeqNumber == commentExist.rowId && commData[i].Section == commentExist.Section) {
                //             commData.splice(i, 1);
                //         }
                //     }
                // }
                // if (com != "") {
                //     var temp = {
                //         Formid: this.getView().byId("_IDGenInput2").getValue(),
                //         SeqNumber: pathForComment.rowId,
                //         Section: pathForComment.Section,
                //         comment: com
                //     };
                //     commData.push(temp);
                //     this.getView().getModel("Model1").setProperty("/ShowBtnData", commData);
                //     this.getView().getModel("Model1").setProperty("/rowComment", "");
                // }
                // else {
                // }
                // this._oDialogModel.close();
                var com = this.getView().getModel("Model1").getProperty("/rowComment");
                var commData = this.getView().getModel("Model1").getProperty("/ShowBtnData");
                var commentExist = commData.filter((el) => el.SeqNumber == this.rowId && el.Section == this.Section);
                if (commentExist.length != 0) {
                    for (let i = 0; i < commData.length; i++) {
                        if (commData[i].SeqNumber == commentExist[0].SeqNumber && commData[i].Section == commentExist[0].Section) {
                            commData.splice(i, 1);
                        }
                    }
                }
                // if (com != "") {
                var temp = {
                    Formid: this.getView().getModel("Model1").getProperty("/FormID"),
                    SeqNumber: this.rowId,
                    Section: this.Section,
                    comment: com ? com : ""
                };
                commData.push(temp);
                this.getView().getModel("Model1").setProperty("/ShowBtnData", commData);
                this.getView().getModel("Model1").setProperty("/rowComment", "");
                // }
                this._oShowDialog.close();
            },

            _dateToReq: function (date) {
                var date1 = new Date(date);
                var dd = (date1.getDate()).toString();
                var mm = (date1.getMonth() + 1).toString();
                var yy = (date1.getFullYear()).toString();
                if (dd.length == 1) { dd = "0" + dd };
                if (mm.length == 1) { mm = "0" + mm };

                return yy + "-" + mm + "-" + dd;
            },

            _messLog: function (message) {
                var obj = {
                    "Icon": "sap-icon://status-error",
                    "Message": message,
                }
                let logMessage = this.getView().getModel("Model1").getProperty("/MessageLog");
                logMessage.push(obj);
                this.getView().getModel("Model1").setProperty("/MessageLog", logMessage);
            },

            _payload: function (purpose, delInd, isSubmit) {

                var oModel = this.getView().getModel("Model1");
                oModel.setProperty("/MessageLog", []);
                var SecAData = oModel.getProperty("/SecAData");
                var SecBData = oModel.getProperty("/SecBData");
                var SecCData = oModel.getProperty("/SecCData");
                var SecDData = oModel.getProperty("/SecDData");
                // checking all the required fields in the form if it is submitted
                if (isSubmit) {
                    var errorFlag = false;
                    if (this.getView().byId("_IDGenComboBox1").getValue() == "" || !this.getView().byId("_IDGenComboBox1").getSelectedKey()) {
                        errorFlag = true;
                        this._messLog("Claim Month is a required field");
                    }
                    if (SecAData.length == 1 && SecAData[0].empName == "" && SecBData.length == 1 && SecBData[0].empName == "" && SecCData.length == 1 && SecCData[0].PersonID == "" && SecDData.length == 1 && SecDData[0].PersonID == "") {
                        errorFlag = true;
                        this._messLog("A claim form must have at least one claim item");
                    }
                    else {
                        var aControls = this.getView().getControlsByFieldGroupId("checkSecA");
                        aControls.forEach(function (oControl) {
                            if (oControl.getId != undefined && oControl.getId() != "") {
                                if ((oControl.getValue != undefined && oControl.getValue() == "" && oControl.getRequired != undefined && oControl.getRequired()) || (oControl.getValueState != undefined && oControl.getValueState() === sap.ui.core.ValueState.Error && oControl.getEditable != undefined && oControl.getEditable())) {
                                    oControl.setValueState(sap.ui.core.ValueState.Error);
                                    errorFlag = true;
                                    this._messLog(oControl.getValueStateText());
                                }
                                else if (oControl.getValue != undefined && oControl.getValue() != "") {
                                    oControl.setValueState(sap.ui.core.ValueState.None);
                                }
                            }
                        }.bind(this));

                        var aControls = this.getView().getControlsByFieldGroupId("checkSecB");
                        aControls.forEach(function (oControl) {
                            if (oControl.getId != undefined && oControl.getId() != "") {
                                if ((oControl.getValue != undefined && oControl.getValue() == "" && oControl.getRequired != undefined && oControl.getRequired()) || (oControl.getValueState != undefined && oControl.getValueState() === sap.ui.core.ValueState.Error && oControl.getEditable != undefined && oControl.getEditable())) {
                                    oControl.setValueState(sap.ui.core.ValueState.Error);
                                    errorFlag = true;
                                    this._messLog(oControl.getValueStateText());
                                }
                                else if (oControl.getValue != undefined && oControl.getValue() != "") {
                                    oControl.setValueState(sap.ui.core.ValueState.None);
                                }
                            }
                        }.bind(this));

                        var aControls = this.getView().getControlsByFieldGroupId("checkSecC");
                        aControls.forEach(function (oControl) {
                            if (oControl.getId != undefined && oControl.getId() != "") {
                                if ((oControl.getValue != undefined && oControl.getValue() == "" && oControl.getRequired != undefined && oControl.getRequired()) || (oControl.getValueState != undefined && oControl.getValueState() === sap.ui.core.ValueState.Error && oControl.getEditable != undefined && oControl.getEditable())) {
                                    oControl.setValueState(sap.ui.core.ValueState.Error);
                                    errorFlag = true;
                                    this._messLog(oControl.getValueStateText());
                                }
                                else if (oControl.getValue != undefined && oControl.getValue() != "") {
                                    oControl.setValueState(sap.ui.core.ValueState.None);
                                }
                            }
                        }.bind(this));

                        var aControls = this.getView().getControlsByFieldGroupId("checkSecD");
                        aControls.forEach(function (oControl) {
                            if (oControl.getId != undefined && oControl.getId() != "") {
                                if ((oControl.getValue != undefined && oControl.getValue() == "" && oControl.getRequired != undefined && oControl.getRequired()) || (oControl.getValueState != undefined && oControl.getValueState() === sap.ui.core.ValueState.Error && oControl.getEditable != undefined && oControl.getEditable())) {
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
                }
                if (errorFlag) {
                    return "";
                }
                else {
                    var secA = [];
                    if (SecAData.length == 1 && SecAData[0].PersonID == "") {
                    }
                    else {
                        let seqNumber = 0;
                        for (let i = 0; i < SecAData.length; i++) {
                            if (SecAData[i].email) {
                                seqNumber++;
                                var defVehType = false;
                                // if (SecAData[i].VehicleType == SecAData[i].defVehType && !SecAData[i].enableVehicleClass) {
                                //     defVehType = true;
                                // } else if (SecAData[i].enableVehicleClass) {
                                //     if (SecAData[i].VehicleClass == SecAData[i].defVehClass) {
                                //         defVehType = true;
                                //     }
                                // }
                                if (SecAData[i].VehicleType == SecAData[i].defVehType) {
                                    defVehType = true;
                                }
                                var temp = {
                                    "Formid": (this.getView().byId("_IDGenInput2").getValue()).toString(),
                                    "SeqNumber": seqNumber.toString(),
                                    "Employee": SecAData[i].empName ? (SecAData[i].empName).toString() : "",
                                    "Perid": SecAData[i].PersonID ? (SecAData[i].PersonID).toString() : "",
                                    "Userid": SecAData[i].userId ? (SecAData[i].userId).toString() : "",
                                    "JobTitle": SecAData[i].jobTitle ? (SecAData[i].jobTitle).toString() : "",
                                    "Email": SecAData[i].email ? (SecAData[i].email).toString() : "",
                                    "PositionCode": SecAData[i].jobTitle ? (SecAData[i].jobTitle).toString() : "",
                                    "VehicleType": SecAData[i].VehicleType ? (SecAData[i].VehicleType).toString() : "",
                                    "VehicleTypeCode": SecAData[i].VehicleTypeCode ? (SecAData[i].VehicleTypeCode).toString() : "",
                                    "VehTypeEnab": SecAData[i].enableVehicleType ? "X" : "",
                                    // "VehicleClass": SecAData[i].VehicleClass ? (SecAData[i].VehicleClass).toString() : "",
                                    // "VehClassCode": SecAData[i].VehicleClassCode ? (SecAData[i].VehicleClassCode).toString() : "",
                                    // "VehClassEnab": SecAData[i].enableVehicleClass ? "X" : "",
                                    "MilesEnab": SecAData[i].enableMiles ? "X" : "",
                                    "NoOfMiles": SecAData[i].NumberOfMiles ? (SecAData[i].NumberOfMiles).toString() : "",
                                    "DefaultVehType": defVehType
                                    // "Amount": SecAData[i].Amount != "" ? SecAData[i].Amount : "",
                                    // "AmountEnab": SecAData[i].enableAmount ? "X" : ""
                                }
                                secA.push(temp);
                            }
                        }
                    }
                    var secB = [];
                    if (SecBData.length == 1 && SecBData[0].PersonID == "") {
                    }
                    else {
                        let seqNumber = 0;
                        for (let i = 0; i < SecBData.length; i++) {
                            if (SecBData[i].email) {
                                seqNumber++;
                                var temp = {
                                    "Formid": this.getView().byId("_IDGenInput2").getValue(),
                                    "SeqNumber": seqNumber.toString(),
                                    "Employee": SecBData[i].empName ? SecBData[i].empName : "",
                                    "Perid": SecBData[i].PersonID ? SecBData[i].PersonID : "",
                                    "Userid": SecBData[i].userId ? SecBData[i].userId : "",
                                    "JobTitle": SecBData[i].jobTitle ? SecBData[i].jobTitle : "",
                                    "Email": SecBData[i].email ? SecBData[i].email : "",
                                    "PositionCode": SecBData[i].jobTitle ? SecBData[i].jobTitle : "",
                                    "ExpenseType": SecBData[i].ExpenseType ? SecBData[i].ExpenseType : "",
                                    "ExpenseTypeCode": SecBData[i].ExpenseTypeCode ? SecBData[i].ExpenseTypeCode : "",
                                    "ExpTypeEnab": SecBData[i].enableExpense ? "X" : "",
                                    "AmountEnab": SecBData[i].enableAmount ? "X" : "",
                                    "Amount": SecBData[i].Amount ? SecBData[i].Amount : ""
                                }
                                secB.push(temp);
                            }
                        }
                    }
                    var secC = [];
                    if (SecCData.length == 1 && SecCData[0].empName == "") {
                    }
                    else {
                        let seqNumber = 0;
                        for (let i = 0; i < SecCData.length; i++) {
                            if (SecCData[i].email) {
                                seqNumber++;
                                var defVehType = false;
                                // if (SecCData[i].VehicleType == SecCData[i].defVehType && !SecCData[i].enableVehicleClass) {
                                //     defVehType = true;
                                // } else if (SecCData[i].enableVehicleClass) {
                                //     if (SecCData[i].VehicleClass == SecCData[i].defVehClass) {
                                //         defVehType = true;
                                //     }
                                // }
                                if (SecCData[i].VehicleType == SecCData[i].defVehType) {
                                    defVehType = true;
                                }
                                var temp = {
                                    "Formid": this.getView().byId("_IDGenInput2").getValue(),
                                    "SeqNumber": seqNumber.toString(),
                                    "Employee": SecCData[i].empName ? SecCData[i].empName : "",
                                    "Perid": SecCData[i].PersonID ? SecCData[i].PersonID : "",
                                    "Userid": SecCData[i].userId ? SecCData[i].userId : "",
                                    "JobTitle": SecCData[i].jobTitle ? SecCData[i].jobTitle : "",
                                    "Email": SecCData[i].email ? SecCData[i].email : "",
                                    "VehicleType": SecCData[i].VehicleType ? SecCData[i].VehicleType : "",
                                    "VehicleTypeCode": SecCData[i].VehicleTypeCode ? (SecCData[i].VehicleTypeCode).toString() : "",
                                    "VehTypeEnab": SecCData[i].enableVehicleType ? "X" : "",
                                    // "VehicleClass": SecCData[i].VehicleClass ? SecCData[i].VehicleClass : "",
                                    // "VehClassCode": SecCData[i].VehicleClassCode ? SecCData[i].VehicleClassCode : "",
                                    // "VehClassEnab": SecCData[i].enableVehicleClass ? "X" : "",
                                    "MilesEnab": SecCData[i].enableMiles ? "X" : "",
                                    "NoOfMiles": SecCData[i].NumberOfMiles ? SecCData[i].NumberOfMiles : "",
                                    "DefaultVehType": defVehType
                                    // "Amount": SecCData[i].Amount != "" ? SecCData[i].Amount : "",
                                    // "AmountEnab": SecCData[i].enableAmount ? "X" : ""
                                }
                                secC.push(temp);
                            }
                        }
                    }
                    var secD = [];
                    if (SecDData.length == 1 && SecDData[0].empName == "") {
                    }
                    else {
                        let seqNumber = 0;
                        for (let i = 0; i < SecDData.length; i++) {
                            if (SecDData[i].email) {
                                seqNumber++;
                                var temp = {
                                    "Formid": this.getView().byId("_IDGenInput2").getValue(),
                                    "SeqNumber": seqNumber.toString(),
                                    "Employee": SecDData[i].empName ? SecDData[i].empName : "",
                                    "Perid": SecDData[i].PersonID ? SecDData[i].PersonID : "",
                                    "Userid": SecDData[i].userId ? SecDData[i].userId : "",
                                    "JobTitle": SecDData[i].jobTitle ? SecDData[i].jobTitle : "",
                                    "Email": SecDData[i].email ? SecDData[i].email : "",
                                    "ExpenseType": SecDData[i].ExpenseType ? SecDData[i].ExpenseType : "",
                                    "ExpenseTypeCode": SecDData[i].ExpenseTypeCode ? SecDData[i].ExpenseTypeCode : "",
                                    "ExpTypeEnab": SecDData[i].enableExpense ? "X" : "",
                                    "AmountEnab": SecDData[i].enableAmount ? "X" : "",
                                    "Amount": SecDData[i].Amount ? SecDData[i].Amount : ""
                                }
                                secD.push(temp);
                            }
                        }
                    }

                    var commentData = oModel.getProperty("/ShowBtnData");

                    var Request_Payload = {
                        "Formid": this.getView().byId("_IDGenInput2").getValue() != "" ? this.getView().byId("_IDGenInput2").getValue() : "",
                        "Initiator": this.getView().byId("_IDGenInput1").getValue() != "" ? this.getView().byId("_IDGenInput1").getValue() : "",
                        "Zdate": this.getView().byId("DatePicker01").getValue() != "" ? this._dateForS4(this.getView().byId("DatePicker01").getValue()) : "",
                        "DateInt": this._dateToReq(this.getView().byId("DatePicker01").getValue()),
                        "OrganizationName": this.getView().byId("_IdGenInput6").getSelectedItem() != null ? this.getView().byId("_IdGenInput6").getSelectedItem().getText() : this.getView().byId("_IdGenInput6").getValue(),
                        "OrgCode": this.getView().byId("_IdGenInput6").getSelectedItem() != null ? this.getView().byId("_IdGenInput6").getSelectedItem().getKey() : this.getView().byId("_IdGenInput6").getSelectedKey(),
                        "CostCentre": this.getView().byId("_IdGenInput5").getValue() != "" ? this.getView().byId("_IdGenInput5").getValue() : "",
                        "CostCentreCode": initiatorCode,
                        "ClaimMonth": this.getView().byId("_IDGenComboBox1").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox1").getSelectedItem().getText() : this.getView().byId("_IDGenComboBox1").getValue(),
                        "ClaimMonthInt": this.getView().byId("_IDGenComboBox1").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox1").getSelectedItem().getKey() : this.getView().byId("_IDGenComboBox1").getSelectedKey(),
                        "ClaimEndDate": this.getView().byId("_IDGenDatePicker1").getValue() != "" ? this._dateForS4(this.getView().byId("_IDGenDatePicker1").getValue()) : "",
                        "ClaimEndDateInt": this.getView().byId("_IDGenDatePicker1").getValue() != "" ? this._dateToReq(this.getView().byId("_IDGenDatePicker1").getValue()) : "",
                        "ClaimStartDate": firstDateofMonth != "" ? this._dateForS4(firstDateofMonth) : "",
                        "ClaimStartDateInt": firstDateofMonth != "" ? this._dateToReq(firstDateofMonth) : "",
                        "PayrollArea": this.payrollArea,
                        "DelIndicator": delInd,
                        "Purpose": purpose,
                        "Notify": this.getView().byId("checkbox1").getSelected() == true ? "X" : "",
                        "hdr_to_sec_a_nav": secA,
                        "hdr_to_sec_b_nav": secB,
                        "hdr_to_sec_c_nav": secC,
                        "hdr_to_sec_d_nav": secD,
                        "hdr_to_comm_nav": [{
                            "Formid": this.getView().byId("_IDGenInput2").getValue(),
                            "comment": this.getView().byId("_IDGenTextArea2").getValue()
                        }],
                        "hdr_to_comm_row_nav": commentData != undefined ? commentData : []
                    }
                }
                return Request_Payload;
            },

            onSave: function () {
                sap.ui.core.BusyIndicator.show();
                if (this.query && this.query.mode == "initiator") {
                    var Request_Payload = this._payload("I", "", true);
                    var MessageLog = this.getView().getModel("Model1").getProperty("/MessageLog");
                    if (MessageLog.length != 0) {
                        this._oMessage = sap.ui.xmlfragment("com.gcc.eforms.ex01.ex01.fragment.logMessage", this);
                        this.getView().addDependent(this._oMessage);
                        this._oMessage.open();
                        sap.ui.core.BusyIndicator.hide();
                        return;
                    }
                }
                var Request_Payload = this._payload("I", "", false);
                this.getOwnerComponent().getModel("ZSFGTGW_EX01_SRV").create("/zsf_ex01_hSet", Request_Payload,
                    {
                        success: function (oData) {
                            var initiator = this.getView().getModel("Model1").getProperty("/initNameP")
                            this._logCreation("E", initiator.salutationLabel + "" + initiator.firstNameInit + " " + initiator.lastNameInit, "", "")
                                .then((resp) => {
                                    if (resp) {
                                        sap.ui.core.BusyIndicator.hide()
                                        MessageBox.success(`Form: ${this.getView().byId("_IDGenInput2").getValue()} is saved successfully!`, {
                                            onClose: function (oAction) {
                                                if (this.query) window.parent.close();
                                            }.bind(this)
                                        });
                                    }
                                })
                        }.bind(this),
                        error: function (resp) {
                            console.log("Error S4h")
                            sap.ui.core.BusyIndicator.hide()
                            MessageBox.error(`Form could not be submitted because ${JSON.parse(resp.responseText).error.message.value}`);
                        }
                    });
            },

            onDelete: function () {
                MessageBox.warning(`Delete the data in this form and any saved draft version of this form`, {
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    emphasizedAction: MessageBox.Action.YES,
                    onClose: function (sAction) {
                        if (sAction == MessageBox.Action.YES) {
                            sap.ui.core.BusyIndicator.show();
                            this.getOwnerComponent().getModel("ZSFGTGW_EX01_SRV").remove("/zsf_ex01_hSet('" + this.getView().byId("_IDGenInput2").getValue() + "')",
                                {
                                    success: function (oData) {
                                        var initiator = this.getView().getModel("Model1").getProperty("/initNameP")
                                        this._logCreation("D", initiator.salutationLabel + "" + initiator.firstNameInit + " " + initiator.lastNameInit, "", "")
                                            .then((resp) => {
                                                if (resp) {
                                                    sap.ui.core.BusyIndicator.hide()
                                                    MessageBox.success(`Form: ${this.getView().byId("_IDGenInput2").getValue()} deleted Successfully!`, {
                                                        actions: [MessageBox.Action.OK],
                                                        emphasizedAction: MessageBox.Action.OK,
                                                        onClose: function (sAction) {
                                                            if (sAction == MessageBox.Action.OK) {
                                                                if (this.query) window.parent.close();
                                                                else window.history.go(-1);
                                                            }
                                                        }.bind(this)
                                                    });
                                                }
                                            })
                                    }.bind(this),
                                    error: function (resp) {
                                        console.log("Error S4h")
                                        sap.ui.core.BusyIndicator.hide()
                                        MessageBox.error(`Form could not be submitted because ${JSON.parse(resp.responseText).error.message.value}`);
                                    }
                                });
                        }
                    }.bind(this)
                });
            },

            onPrint: function () {

                sap.ui.core.BusyIndicator.show();
                var Request_Paylaod = this._payload("P", "", false);
                this.getOwnerComponent().getModel("ZSFGTGW_EX01_SRV").create("/zsf_ex01_hSet", Request_Paylaod,
                    {
                        success: function (oData) {
                            sap.ui.core.BusyIndicator.hide();
                            var initiator = this.getView().getModel("Model1").getProperty("/initNameP")
                            console.log("Success S4h");
                            var s4url = this.getOwnerComponent().getModel("ZSFGTGW_EX01_SRV").sServiceUrl;    // Give your service name
                            var FormID = this.getView().byId("_IDGenInput2").getValue();      // Give your FormID
                            var sSource = s4url + "/zsf_ex01_printSet(Formid='" + FormID + "')/$value";
                            window.open(sSource, "_blank");
                        }.bind(this),
                        error: function (resp) {
                            console.log("Error S4h")
                            sap.ui.core.BusyIndicator.hide()
                            MessageBox.error(`Form could not be submitted because ${resp.responseText}`);
                        }
                    });
            },

            onCancel: function () {
                MessageBox.warning(`This will discard all the changes done.
            Do you wish to proceed?`, {
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    emphasizedAction: MessageBox.Action.YES,
                    onClose: function (sAction) {
                        if (sAction == MessageBox.Action.YES) {
                            if (this.query) window.parent.close();
                            else window.history.go(-1);
                        }
                    }.bind(this)
                });

            },

            onMessageClose: function () {
                this._oMessage.close();
            },

            onSubmit: function () {

                MessageBox.alert("Do you want to Submit?", {
                    title: "Submit Form",
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    emphasizedAction: MessageBox.Action.YES,
                    onClose: function (sAction) {
                        if (sAction == MessageBox.Action.YES) {
                            sap.ui.core.BusyIndicator.show();
                            var Request_Payload = this._payload("I", "", true);
                            var MessageLog = this.getView().getModel("Model1").getProperty("/MessageLog");
                            if (MessageLog.length != 0) {
                                this._oMessage = sap.ui.xmlfragment("com.gcc.eforms.ex01.ex01.fragment.logMessage", this);
                                this.getView().addDependent(this._oMessage);
                                this._oMessage.open();
                                sap.ui.core.BusyIndicator.hide();
                            }
                            else {
                                this.getOwnerComponent().getModel("ZSFGTGW_EX01_SRV").create("/zsf_ex01_hSet", Request_Payload,
                                    {
                                        success: function (oData) {
                                            sap.ui.core.BusyIndicator.hide();
                                            console.log("Success S4h");
                                            this._triggerWorkflow();
                                        }.bind(this),
                                        error: function (resp) {
                                            console.log("Error S4h")
                                            sap.ui.core.BusyIndicator.hide()
                                            MessageBox.error(`Form could not be submitted because ${JSON.parse(resp.responseText).error.message.value}`);
                                        }
                                    });
                            }
                        }
                    }.bind(this)
                })
            },

            _triggerWorkflow: function () {
                var user = this.getView().getModel("Model1").getProperty("/user");
                var appUrl = window.location.origin + "/site?siteId=" + window.location.search.split("siteId=")[1].split("&")[0] + window.location.hash.split("Display")[0] + "Display";
                var reqUrl = appUrl.includes("GCC_SemObj") ? appUrl + "&/?formId=" : appUrl + "#?formId=";
                var payload = {
                    "definitionId": "eu10.gccdev.eforms.eX01",
                    "context": {
                        "FormID": this.getView().byId("_IDGenInput2").getValue(),
                        "formlinkapprover": reqUrl + this.getView().byId("_IDGenInput2").getValue() + "&mode=display",
                        "formlinkinitiator": reqUrl + this.getView().byId("_IDGenInput2").getValue() + "&mode=initiator",
                        "initiator": user.email
                    }
                }

                var prefix = sap.ui.require.toUrl(this.getOwnerComponent().getManifestEntry('/sap.app/id').replaceAll('.', '/')) + "/";
                var sURL = prefix + "workflow/rest/v1/workflow-instances";
                $.support.cors = true;
                $.ajax(sURL, {
                    method: "POST",
                    data: JSON.stringify(payload),
                    crossDomain: true,
                    contentType: "application/json"
                }).done(function (data, textStatus, jqXHR) {
                    if (data) {
                        console.log("Workflow has been triggered and Form has been Submitted");
                        var initiator = this.getView().getModel("Model1").getProperty("/initNameP")
                        var formOwnerCode = this.getView().getModel("Model1").getProperty("/OrgNameP").managerId;
                        this._logCreation("S", initiator.salutationLabel + "" + initiator.firstNameInit + " " + initiator.lastNameInit, "", formOwnerCode)
                            .then((resp) => {
                                if (resp) {
                                    sap.ui.core.BusyIndicator.hide()
                                    MessageBox.success(`Form: ${this.getView().byId("_IDGenInput2").getValue()} is submitted successfully
                                
                                Please call ContactUs on 01452 425888 should you have any queries regarding this e-Form.`, {
                                        actions: [MessageBox.Action.OK],
                                        emphasizedAction: MessageBox.Action.OK,
                                        onClose: function (sAction) {
                                            if (sAction == MessageBox.Action.OK) {
                                                if (this.query) window.parent.close();
                                                else window.history.go(-1);
                                            }
                                        }.bind(this)
                                    });
                                }
                            })
                    }

                }.bind(this)).fail(function (XMLHttpRequest, textStatus) {
                    // alert("error");
                    MessageBox.error("Some error occured. Please try again")
                    sap.ui.core.BusyIndicator.hide();
                });

            },

            _logCreation: async function (status, perArea) {
                return new Promise(
                    async function (resolve, reject) {
                        try {
                            if (!this.managerName) {
                                var managerName, salutation;
                                if (!this.managerId) {
                                    await $.ajax({
                                        url: prefix + "/odata/v2/EmpJob?$format=json&$filter=userId eq '" + initiatorCode + "'",
                                        type: 'GET',
                                        contentType: "application/json",
                                        success: function (data) {
                                            this.managerId = data.d.results[0].managerId;
                                        }.bind(this),
                                        error: function (e) {
                                            console.log("error: " + e);
                                        }
                                    });
                                }
                                await $.ajax({
                                    url: prefix + "/odata/v2/PerPerson(personIdExternal='" + this.managerId + "')/personalInfoNav?$format=json",
                                    type: 'GET',
                                    contentType: "application/json",
                                    success: function (data) {
                                        managerName = data.d.results[0].firstName + " " + data.d.results[0].lastName;
                                        salutation = data.d.results[0].salutation;
                                    },
                                    error: function (e) {
                                        console.log("error: " + e);
                                    }
                                });
                                await $.ajax({
                                    url: prefix + adminAPI + "/odata/v2/PicklistOption(" + salutation + 'L' + ")/picklistLabels?$format=json",
                                    type: 'GET',
                                    contentType: "application/json",
                                    success: function (data) {
                                        this.managerName = data.d.results[0].label + " " + managerName;
                                    }.bind(this),
                                    error: function (e) {
                                        console.log("error: " + e);
                                    }
                                });
                            }

                            var personnel = this.getView().getModel("Model1").getProperty("/OrgNameP/customString3") != undefined ? this.getView().getModel("Model1").getProperty("/OrgNameP/customString3") : perArea;
                            var initiator = this.getView().getModel("Model1").getProperty("/initNameP")
                            var log_payload = {
                                "Formid": this.getView().byId("_IDGenInput2").getValue(),
                                "StartedOn": this.getView().byId("DatePicker01").getValue(),
                                "Status": status,
                                "Type": "EX01",
                                "OrgCode": personnel.match(/\((.*?)\)/)[1],
                                "OrganizationName": personnel,
                                "Initiator": initiator.salutationLabel + " " + initiator.firstNameInit + " " + initiator.lastNameInit,
                                "InitCode": initiatorCode,
                                "Description": "Expenses Form",
                                "FormOwner": status == "S" ? this.managerName : initiator.salutationLabel + " " + initiator.firstNameInit + " " + initiator.lastNameInit,
                                "FormOwnerCode": status == "S" ? this.managerId : initiatorCode,
                                "ApproverName": this.managerName,
                                "ApproverCode": this.managerId,
                                "AvailableFrom": new Date(),
                            }
                            this.getOwnerComponent().getModel("logService").create("/zsf_logSet", log_payload,
                                {
                                    success: function (oData) {
                                        console.log(`${oData.Formid} log created`);
                                        resolve(true);
                                        this.onTabChange();
                                    }.bind(this),
                                    error: function (oData) {
                                        console.log("Error", oData);
                                    }
                                });
                        } catch (error) {
                            reject(error);
                        }
                    }.bind(this))
            },

            onTabChange: function (oEvent) {
                var oModel = this.getView().getModel("Model1");
                var oFilter = new sap.ui.model.Filter('Formid', sap.ui.model.FilterOperator.EQ, this.getView().byId("_IDGenInput2").getValue());
                this.getOwnerComponent().getModel("logService").read("/zsf_logSet", {
                    filters: [oFilter],
                    success: function (oData) {
                        var historyTable = [];
                        for (let i = 0; i < oData.results.length; i++) {
                            var history = {
                                "SeqNumber": oData.results[i].SeqNumber,
                                "StartedOn": oData.results[i].StartedOn,
                                "Status": oData.results[i].Status,
                                "OrganizationName": oData.results[i].OrganizationName,
                                "Initiator": oData.results[i].Initiator,
                                "Description": oData.results[i].Description,
                                "FormOwner": oData.results[i].FormOwner,
                                "AvailableFrom": oData.results[i].AvailableFrom,
                            }
                            historyTable.push(history);
                        }
                        oModel.setProperty("/historyTable", historyTable);
                    }.bind(this),

                    error: function (oData) {
                        console.log("Error", oData);
                    }
                });
            }
        });
    });
