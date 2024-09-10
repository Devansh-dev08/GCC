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
        let prefix = "", pathForComment, concurAccess = "", concurProfile = "", firstDateofMonth = "", initiatorCode = "";

        return Controller.extend("com.gcc.eforms.ex01.ex01.controller.View1", {
            onInit: function () {
                var link = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("introLink")
                var text = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("IntroText1")
                this.getView().byId("_IDGenFormattedText1").setHtmlText("<p>" + text + "<a title=" + link + " href=\"" + link + "\"</a> Click there.</p>")
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
                            var useremail = "devansh.agarwal@hcl.com";
                        }
                        else {
                            var useremail = oModel2.getData().email;
                        }
                        var query = oEvent.getParameter('arguments')["?query"];
                        var that = this;
                        var oModel = new sap.ui.model.json.JSONModel();
                        this.getView().setModel(oModel, "Model1");
                        if (query != undefined) {
                            // // Getting the initiator from the mail id
                            oModel.setProperty("/form", query);
                            this._getInitiator(oModel, useremail)
                                .then(initiator => {
                                    var initi = initiator;
                                    // Checking if the user has Multiple Organization
                                    this._checkMultiOrg(oModel, initi)
                                        .then(response => {
                                            var formid = query.formId;
                                            this._S4Services(formid, oModel);
                                            if (query.mode == "display") {
                                                this.getView().byId("_IDGenButton9").setVisible(false);
                                                this.getView().byId("_IDGenButton7").setVisible(false);
                                            }
                                            else {
                                                this._prev6Months(oModel);
                                                if (query.mode == "initiator") {
                                                }
                                            }
                                        })
                                })
                        }
                        else {

                            query = { formId: "", mode: "" }
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
                                            // // Generating Form ID
                                            this.getOwnerComponent().getModel("S4hService").read("/zsfgt_formid_genSet",
                                                {
                                                    success: function (oData) {
                                                        console.log(oData.results[0].Formid);
                                                        this.getView().byId("_IDGenInput2").setValue(oData.results[0].Formid);
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

            _expensesDropdown: function (org) {
                var oModel = this.getView().getModel("Model1");
                $.ajax({
                    url: prefix + "/odata/v2/cust_ZFLM_EXPENSE_TYPES?$format=json &$filter=cust_PersArea eq '" + org + "'",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        data.d.results.sort((a, b) => {
                            if (a.cust_ExpenseID < b.cust_ExpenseID) return -1;
                            if (a.cust_ExpenseID > b.cust_ExpenseID) return 1;
                        });
                        oModel.setProperty("/dropdownExpType", data.d.results);
                    }.bind(this),
                    error: function (e) {
                        console.log(JSON.parse(e.responseText).error);
                    }.bind(this)
                });
            },

            _mileageDropdown: function (org) {
                var oModel = this.getView().getModel("Model1");
                $.ajax({
                    url: prefix + "/odata/v2/cust_ZFLM_VEHICLE_TYPES?$format=json &$filter=cust_Organisation eq '" + org + "'",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        var drop = [];
                        var var1;
                        for (let i = 0; i < data.d.results.length; i++) {
                            if (data.d.results[i].cust_VehicleType == var1) {
                                data.d.results.slice(i, 1);
                            }
                            else {
                                var1 = data.d.results[i].cust_VehicleType
                                var temp = {
                                    key: i,
                                    cust_VehicleType: data.d.results[i].cust_VehicleType
                                }
                                drop.push(temp);
                            }
                        }
                        data.d.results.sort((a, b) => {
                            if (a.cust_VehicleType < b.cust_VehicleType) return -1;
                            if (a.cust_VehicleType > b.cust_VehicleType) return 1;

                            if (a.cust_VehicleClass < b.cust_VehicleClass) return -1;
                            if (a.cust_VehicleClass > b.cust_VehicleClass) return 1;
                        });
                        oModel.setProperty("/VehClassList", data.d.results);
                        oModel.setProperty("/dropdownVehType", drop);
                    }.bind(this),
                    error: function (e) {
                        console.log(JSON.parse(e.responseText).error);
                    }.bind(this)
                });
            },

            _S4Services: function (formid, oModel) {

                this.getOwnerComponent().getModel("S4hService").read("/zsf_ex01_hSet('" + formid + "')?$format=json",
                    {
                        success: function (oData) {
                            this.getView().byId("_IDGenInput2").setValue(oData.Formid);
                            this.getView().byId("_IDGenInput1").setValue(oData.Initiator);
                            oModel.setProperty("/initNameP", { salutationLabel: oData.Initiator.split(" ")[0], firstNameInit: oData.Initiator.split(" ")[1], lastNameInit: oData.Initiator.split(" ")[2] });
                            this.getView().byId("DatePicker01").setDateValue(new Date(oData.Zdate));
                            this.getView().byId("_IdGenInput6").setSelectedKey(oData.OrgCode);
                            this._mileageDropdown(oData.OrgCode);
                            this._expensesDropdown(oData.OrgCode);
                            oModel.setProperty("/OrgNameP", { customString3: oData.OrganizationName });
                            oModel.setProperty("/CostCentreP", { costCenter: oData.CostCentre })
                            this.getView().byId("_IDGenComboBox1").setValue(oData.ClaimMonth);
                            this.getView().byId("_IDGenComboBox1").setSelectedKey(oData.ClaimMonthInt);
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


                this.getOwnerComponent().getModel("S4hService").read("/zsf_ex01_hSet('" + formid + "')/hdr_to_sec_a_nav?$format=json",
                    {
                        success: function (oData) {
                            var secA = [];
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
                                        "VehicleClass": oData.results[i].VehicleClass,
                                        "VehicleClassCode": oData.results[i].VehClassCode,
                                        "enableVehicleClass": oData.results[i].VehClassEnab == "X" ? true : false,
                                        "enableMiles": oData.results[i].MilesEnab == "X" ? true : false,
                                        "NumberOfMiles": oData.results[i].NoOfMiles,
                                        "Amount": "",
                                        "enableAmount": false
                                    }
                                    secA.push(rowData);
                                }
                            }
                            oModel.setProperty("/SecAData", secA);
                        }.bind(this),
                        error: function (resp) {
                            console.log(JSON.parse(resp.responseText).error.message.value)
                        }.bind(this)
                    });

                this.getOwnerComponent().getModel("S4hService").read("/zsf_ex01_hSet('" + formid + "')/hdr_to_sec_b_nav?$format=json",
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
                                }
                            }
                            oModel.setProperty("/SecBData", secB);
                        }.bind(this),
                        error: function (resp) {
                            console.log(JSON.parse(resp.responseText).error.message.value)
                        }.bind(this)
                    });



                this.getOwnerComponent().getModel("S4hService").read("/zsf_ex01_hSet('" + formid + "')/hdr_to_sec_c_nav?$format=json",
                    {
                        success: function (oData) {
                            var secC = [];
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
                                        "VehicleClass": oData.results[i].VehicleClass,
                                        "VehicleClassCode": oData.results[i].VehClassCode,
                                        "enableVehicleClass": oData.results[i].VehClassEnab == "X" ? true : false,
                                        "enableMiles": oData.results[i].MilesEnab == "X" ? true : false,
                                        "NumberOfMiles": oData.results[i].NoOfMiles,
                                        "Amount": "",
                                        "enableAmount": false
                                    }
                                    secC.push(rowData);
                                }
                            }
                            oModel.setProperty("/SecCData", secC);

                        }.bind(this),
                        error: function (resp) {
                            console.log(JSON.parse(resp.responseText).error.message.value)
                        }.bind(this)
                    });



                this.getOwnerComponent().getModel("S4hService").read("/zsf_ex01_hSet('" + formid + "')/hdr_to_sec_d_nav?$format=json",
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
                                }
                            }
                            oModel.setProperty("/SecDData", secD);

                        }.bind(this),
                        error: function (resp) {
                            console.log(JSON.parse(resp.responseText).error.message.value)
                        }.bind(this)
                    });



                this.getOwnerComponent().getModel("S4hService").read("/zsf_ex01_hSet('" + formid + "')/hdr_to_comm_nav?$format=json",
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


                this.getOwnerComponent().getModel("S4hService").read("/zsf_ex01_hSet('" + formid + "')/hdr_to_comm_row_nav?$format=json",
                    {
                        success: function (oData) {
                            oModel.setProperty("/ShowBtnData", oData.results);
                        }.bind(this),
                        error: function (resp) {
                            console.log(JSON.parse(resp.responseText).error.message.value)
                        }.bind(this)
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
                        console.log("success" + data);
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
                        console.log("success" + data);
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
                        console.log("success" + data);
                        var salutationInit = data.d.results[0].salutation;
                        var firstNameInit = data.d.results[0].firstName;
                        var lastNameInit = data.d.results[0].lastName;
                        // salutation label
                        $.ajax({
                            url: prefix + "/odata/v2/PicklistOption(" + salutationInit + 'L' + ")/picklistLabels?$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                                console.log("success" + data);
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
                    url: prefix + "/odata/v2/EmpEmployment(personIdExternal='" + initiator + "',userId='" + initiator + "')/jobInfoNav?$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        console.log("success" + data);
                        // Organisation Name property
                        oModel.setProperty("/OrgNameP", data.d.results[0]);
                        if (data.d.results[0].managerId == "NO_MANAGER") {
                            MessageBox.error("Line Manager is missing, Form cannot be Initiated", {
                                title: "Error Message",
                                actions: [sap.m.MessageBox.Action.OK],
                                onClose: function (oAction) {
                                    if (oAction) {
                                        // var oHistory, sPreviousHash;
                                        // oHistory = History.getInstance();
                                        // sPreviousHash = oHistory.getPreviousHash();
                                        // if (sPreviousHash == undefined) {
                                        // }
                                        window.history.go(-1);
                                    }
                                }
                            });
                        }
                        else {
                            if (!multiOrgFlag) {
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
                                        this._mileageDropdown(data.d.results[0].externalCode);
                                        this._expensesDropdown(data.d.results[0].externalCode);
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
                        console.log("success" + data);
                        for (let i = 0; i < data.d.results.length; i++) {
                            if (data.d.results[i].defaultAssignment == true) {
                                oModel.setProperty("/CostCentreP", data.d.results[0]);
                                this.getView().setModel(oModel, "Model1");
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
                    var sMonthIndex = this.getView().byId("_IDGenComboBox1").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox1").getSelectedItem().getKey() : this.getView().byId("_IDGenComboBox1").getSelectedKey();
                    this._logCreation("I", this.getView().byId("_IDGenInput1").getValue(), this.getView().byId("_IdGenInput6").getValue(), "");
                    if (sMonthIndex != "") {
                        var sMonthYear = this.getView().byId("_IDGenComboBox1").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox1").getSelectedItem().getText() : this.getView().byId("_IDGenComboBox1").getValue();
                        var sYear = sMonthYear.split(" ")[1];
                        var LastDate = new Date(sYear, sMonthIndex, 0);
                        var FirstDate = new Date(sYear, sMonthIndex - 1, 1);
                        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
                        var FirstDateISO = dateFormat.format(FirstDate);
                        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-dd-MM" });
                        var LastDateISO = dateFormat.format(LastDate);
                        var orgCode = oEvent.getSource().getSelectedItem().getKey();
                        this._getEmplData(orgCode, LastDateISO, FirstDateISO);
                        this._mileageDropdown(orgCode);
                        this._expensesDropdown(orgCode);
                    }
                }
                else {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                }
            },

            _getEmplData: async function (orgCode, LastDateISO, FirstDateISO) {

                var terminated, retired, suspended, discarded, reportedNoShow;
                await $.ajax({
                    url: prefix + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'employee-status' and status eq 'A'&$format=json",
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
                        console.log(`Error: ${JSON.parse(e.responseText)}`);
                    }
                });

                // Getting all the employees from the personnel area
                let employeeData = [];
                await $.ajax({
                    url: prefix + `/odata/v2/EmpJob?$filter=customString3 eq '${orgCode}' and emplStatus ne '${discarded}' and emplStatus ne '${terminated}' and emplStatus ne '${retired}' and emplStatus ne '${suspended}' and emplStatus ne '${reportedNoShow}' and endDate gt datetime'${FirstDateISO}T00:00:00'&toDate=${LastDateISO}&$format=json`,
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        console.log("success" + data);
                        employeeData = data.d.results;
                    }.bind(this),
                    error: function (e) {
                        sap.ui.core.BusyIndicator.hide();
                        console.log("error: " + e);
                    }
                });

                employeeData = this.filterEmplData(employeeData);
                var findPostDate = Number((new Date(LastDateISO.split("-")[0], LastDateISO.split("-")[2], 0).getTime()));
                var EmpData = [];
                for (let i = 0; i < employeeData.length; i++) {

                    $.ajax({
                        url: prefix + "/odata/v2/EmpEmployment?$filter=userId eq '" + employeeData[i].userId + "' &$format=json",
                        type: 'GET',
                        contentType: "application/json",
                        success: function (data) {
                            var empl = data;
                            $.ajax({
                                url: prefix + "/odata/v2/PerPersonal?$filter=personIdExternal eq '" + empl.d.results[0].personIdExternal + "'&$format=json",
                                type: 'GET',
                                contentType: "application/json",
                                success: function (data) {
                                    if (data.d.results[0] != null) {
                                        var postingDate = this.unixDateRegex(employeeData[i].endDate) > findPostDate ? findPostDate : this.unixDateRegex(employeeData[i].endDate);
                                        var temp = {
                                            firstName: data.d.results[0].firstName,
                                            lastName: data.d.results[0].lastName,
                                            userId: employeeData[i].userId,
                                            jobTitle: employeeData[i].customString1,
                                            personIdExternal: empl.d.results[0].personIdExternal,
                                            postingDate: `/Date(${postingDate})/`
                                        };
                                        EmpData.push(temp);
                                        EmpData.sort((a, b) => {
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
                                        this.getView().getModel("Model1").setProperty("/dropdownEmp", EmpData);
                                        sap.ui.core.BusyIndicator.hide();
                                    }
                                    else {
                                        console.log(`No Employee Found for ${empl.d.results[0].personIdExternal}`);
                                    }
                                    sap.ui.core.BusyIndicator.hide();
                                }.bind(this),
                                error: function () {
                                    console.log(`No Employee Found for ${empl.d.results[0].personIdExternal}`);
                                    sap.ui.core.BusyIndicator.hide();
                                }
                            });
                        }.bind(this),
                        error: function (e) {
                            console.log("error: " + e);
                            sap.ui.core.BusyIndicator.hide();
                        }
                    });
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

            _checkConcur: async function (initiator, oModel, oBind, allType, emplname) {

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
                            console.log("hoi");
                            console.log(response);

                            this._updateRefreshToken(concurDetails, response.refresh_token);
                            var emplEmail = "";
                            await $.ajax({
                                url: prefix + "/odata/v2/UserAccount?$filter=personIdExternal eq '" + initiator + "' &$format=json",
                                type: 'GET',
                                contentType: "application/json",
                                success: function (data) {
                                    console.log("success" + data);
                                    if (data.d.results.length == 0) {
                                        MessageBox.error("Email is not maintained for this Employee");
                                        errorFound = true;
                                        this.oBusyDialog.close();
                                        allType == "M" ? this._controlMileageRows(oModel, oBind, false, false, false) : this._controlExpensesRows(oModel, oBind, false, false);
                                    }
                                    else if (data.d.results[0].email == "") {
                                        MessageBox.error("Email is not maintained for this Employee");
                                        errorFound = true;
                                        this.oBusyDialog.close();
                                        allType == "M" ? this._controlMileageRows(oModel, oBind, false, false, false) : this._controlExpensesRows(oModel, oBind, false, false);
                                    }
                                    else {
                                        emplEmail = data.d.results[0].email;
                                    }
                                }.bind(this),
                                error: function (e) {
                                    console.log("error: " + e);
                                    emplEmail = "devansh.agarwal@hcl.com";
                                    errorFound = true;
                                    this.oBusyDialog.close();
                                    allType == "M" ? this._controlMileageRows(oModel, oBind, false, false, false) : this._controlExpensesRows(oModel, oBind, false, false);
                                }.bind(this)
                            });

                            if (emplEmail != "") {
                                var url1 = prefix + "/concur//profile/identity/v4/Users?filter=userName eq \"" + emplEmail + concurDetails.UsernameSuffix + "\"";
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
                                        allType == "M" ? this._controlMileageRows(oModel, oBind, false, false, false) : this._controlExpensesRows(oModel, oBind, false, false);
                                    }
                                    else {
                                        errorFound = false;
                                        oModel.setProperty(oBind.getPath() + "/email", emplEmail + concurDetails.UsernameSuffix);
                                        allType == "M" ? this._controlMileageRows(oModel, oBind, true, false, false) : this._controlExpensesRows(oModel, oBind, true, false);
                                    }
                                    this.oBusyDialog.close();
                                }.bind(this)).fail(function (error) {
                                    console.log("error", error)
                                    errorFound = true;
                                    this.oBusyDialog.close();
                                    allType == "M" ? this._controlMileageRows(oModel, oBind, false, false, false) : this._controlExpensesRows(oModel, oBind, false, false);
                                }.bind(this));
                            }
                        }.bind(this)).fail(function (XMLHttpRequest, textStatus) {
                            console.log("error");
                            errorFound = true;
                            MessageBox.error(`Some error occurred. Please try again`);
                            this.oBusyDialog.close();
                            allType == "M" ? this._controlMileageRows(oModel, oBind, false, false, false) : this._controlExpensesRows(oModel, oBind, false, false);
                        }.bind(this));
                    }.bind(this),
                    error: function (resp) {
                        errorFound = true;
                        this.oBusyDialog.close();
                        allType == "M" ? this._controlMileageRows(oModel, oBind, false, false, false) : this._controlExpensesRows(oModel, oBind, false, false);
                    }.bind(this)
                });
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

            _controlMileageRows: function (oModel, oBind, Vtype, Vclass, Miles) {
                if (!Vtype) {
                    oModel.setProperty(oBind.getPath() + "/VehicleType", "");
                }
                if (!Vclass) {
                    oModel.setProperty(oBind.getPath() + "/VehicleClass", "");
                }
                if (!Miles) {
                    oModel.setProperty(oBind.getPath() + "/NumberOfMiles", "");
                }
                oModel.setProperty(oBind.getPath() + "/enableVehicleType", Vtype);
                oModel.setProperty(oBind.getPath() + "/enableVehicleClass", Vclass);
                oModel.setProperty(oBind.getPath() + "/enableMiles", Miles);

            },

            _controlExpensesRows: function (oModel, oBind, EType, EAmount) {
                if (!EType) {
                    oModel.setProperty(oBind.getPath() + "/ExpenseType", "");
                }
                if (!EAmount) {
                    oModel.setProperty(oBind.getPath() + "/Amount", "");
                }
                oModel.setProperty(oBind.getPath() + "/enableExpense", EType);
                oModel.setProperty(oBind.getPath() + "/enableAmount", EAmount);
            },

            onEmplChangeSecA: async function (oEvent) {

                var emp1 = oEvent.getSource().getSelectedItem();
                var oModel = this.getView().getModel("Model1");
                var oBind = oEvent.getSource().getBindingContext("Model1")
                if (emp1 == null) {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                    oEvent.oSource.setValueStateText("Employee Name is required.");
                    this._controlMileageRows(oModel, oBind, false, false, false);
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
                    oModel.setProperty(oBind.getPath() + "/jobTitle", reqDetails[0].jobTitle);
                    oModel.setProperty(oBind.getPath() + "/userId", reqDetails[0].userId);
                    oModel.setProperty(oBind.getPath() + "/PersonID", reqDetails[0].personIdExternal);
                    oModel.setProperty(oBind.getPath() + "/postingDate", reqDetails[0].postingDate);
                    this._checkConcur(reqDetails[0].personIdExternal, oModel, oBind, "M", reqDetails[0].firstName + " " + reqDetails[0].lastName);
                    // var veh = this.localJSON();
                    // oModel.setProperty("/dropdownVehType", veh.VehicleType);
                }

            },

            onVehTypeChangeSecA: function (oEvent) {

                var vehicleType = oEvent.getSource().getSelectedItem();
                var oModel = this.getView().getModel("Model1");
                var oBind = oEvent.getSource().getBindingContext("Model1")
                if (vehicleType == null) {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                    oEvent.oSource.setValueStateText("Vehicle Type is required.");
                    this._controlMileageRows(oModel, oBind, true, false, false);
                }
                else {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                    oModel.setProperty(oBind.getPath() + "/VehicleTypeCode", vehicleType.getKey());
                    var vehClass = oModel.getProperty("/VehClassList");
                    vehClass = vehClass.filter((el) => el.cust_VehicleType.includes(vehicleType.getText()));
                    vehClass[0].cust_VehicleClass != null ? this._controlMileageRows(oModel, oBind, true, true, false) : this._controlMileageRows(oModel, oBind, true, false, true);
                    oModel.setProperty("/dropdownVehClass", vehClass);
                }

            },

            onVehClassChangeSecA: function (oEvent) {

                var vehicleClass = oEvent.getSource().getSelectedItem();
                var oModel = this.getView().getModel("Model1");
                var oBind = oEvent.getSource().getBindingContext("Model1")
                if (vehicleClass == null) {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                    oEvent.oSource.setValueStateText("Vehicle Class is required.");
                    this._controlMileageRows(oModel, oBind, true, true, false);
                }
                else {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                    oModel.setProperty(oBind.getPath() + "/VehicleClassCode", vehicleClass.getKey());
                    this._controlMileageRows(oModel, oBind, true, true, true);
                }

            },

            onEmplChangeSecB: function (oEvent) {

                var emp1 = oEvent.getSource().getSelectedItem();
                var oModel = this.getView().getModel("Model1");
                var oBind = oEvent.getSource().getBindingContext("Model1")
                if (emp1 == null) {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                    oEvent.oSource.setValueStateText("Employee Name is required.");
                    this._controlExpensesRows(oModel, oBind, false, false);
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
                    oModel.setProperty(oBind.getPath() + "/jobTitle", reqDetails[0].jobTitle);
                    oModel.setProperty(oBind.getPath() + "/userId", reqDetails[0].userId);
                    oModel.setProperty(oBind.getPath() + "/PersonID", reqDetails[0].personIdExternal);
                    oModel.setProperty(oBind.getPath() + "/postingDate", reqDetails[0].postingDate);
                    this._checkConcur(reqDetails[0].personIdExternal, oModel, oBind, "E", reqDetails[0].firstName + " " + reqDetails[0].lastName);
                    // var exp = this.localJSON();
                    // oModel.setProperty("/dropdownExpType", exp.ExpensesType);
                }
            },

            onExpenseChangeSecB: function (oEvent) {

                var expense = oEvent.getSource().getSelectedItem();
                var oModel = this.getView().getModel("Model1");
                var oBind = oEvent.getSource().getBindingContext("Model1")
                if (expense == null) {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                    oEvent.oSource.setValueStateText("Expense is required.");
                    this._controlExpensesRows(oModel, oBind, true, false);
                }
                else {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                    oModel.setProperty(oBind.getPath() + "/ExpenseTypeCode", expense.getKey());
                    this._controlExpensesRows(oModel, oBind, true, true);
                }

            },

            _getNamePerid: function (PersonId, oModel, sPath) {
                $.ajax({
                    url: prefix + "/odata/v2/PerPerson('" + PersonId + "')/personalInfoNav?$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        oModel.setProperty(sPath + "/empName", data.d.results[0].firstName + " " + data.d.results[0].lastName);
                        return data.d.results[0].firstName + " " + data.d.results[0].lastName;
                    }.bind(this),
                    error: function (e) {

                    }.bind(this)
                });
            },

            onIDChange: function (oEvent) {
                var oModel = this.getView().getModel("Model1");
                var perId = oEvent.getSource().getValue();
                var oBind = oEvent.getSource().getBindingContext("Model1");
                var sPath = oBind.getPath();
                $.ajax({
                    url: prefix + "/odata/v2/EmpEmployment(personIdExternal='" + perId + "', userId='" + perId + "')/jobInfoNav?$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        console.log("success" + data);
                        if (data.d.results.length == 0) {
                            this._controlMileageRows(oModel, oBind, false, false, false);
                            oModel.setProperty(sPath + "/empName", "");
                            oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                            MessageBox.error(`Could not find Job Info for ${perId}`);
                        }
                        else if (data.d.results[0].payGroup != 'G4') {
                            this._controlMileageRows(oModel, oBind, false, false, false);
                            oModel.setProperty(sPath + "/empName", "");
                            oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                            MessageBox.error(`${perId} does not belong to G4 Pay Group`);
                        }
                        else {
                            if (!this._oBusyDialog) {
                                this.oBusyDialog = sap.ui.xmlfragment("com.gcc.eforms.ex01.ex01.fragment.BusyDialog", this);
                                this.getView().addDependent(this.oBusyDialog);
                                this.oBusyDialog.open();
                            }
                            var empName = this._getNamePerid(perId, oModel, sPath);
                            oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                            oModel.setProperty(sPath + "/userId", perId);
                            this._checkConcur(perId, oModel, oBind, "M", empName);
                            // var veh = this.localJSON();
                            // oModel.setProperty("/dropdownVehType", veh.VehicleType);
                        }
                    }.bind(this),
                    error: function (e) {
                        console.log("error: " + e);
                        oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                        this._controlMileageRows(oModel, oBind, false, false, false);
                        oModel.setProperty(sPath + "/empName", "");
                        MessageBox.error(JSON.parse(e.responseText).error.message.value);
                    }.bind(this)
                })
            },

            onIDChangeSecD: function (oEvent) {
                var oModel = this.getView().getModel("Model1");
                var perId = oEvent.getSource().getValue();
                var oBind = oEvent.getSource().getBindingContext("Model1");
                var sPath = oBind.getPath();
                $.ajax({
                    url: prefix + "/odata/v2/EmpEmployment(personIdExternal='" + perId + "', userId='" + perId + "')/jobInfoNav?$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        console.log("success" + data);
                        if (data.d.results.length == 0) {
                            this._controlExpensesRows(oModel, oBind, false, false);
                            oModel.setProperty(sPath + "/empName", "");
                            oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                            MessageBox.error(`Could not find Job Info for ${perId}`);
                        }
                        else if (data.d.results[0].payGroup != 'G4') {
                            this._controlExpensesRows(oModel, oBind, false, false);
                            oModel.setProperty(sPath + "/empName", "");
                            oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                            MessageBox.error(`${perId} does not belong to G4 Pay Group`);
                        }
                        else {
                            if (!this._oBusyDialog) {
                                this.oBusyDialog = sap.ui.xmlfragment("com.gcc.eforms.ex01.ex01.fragment.BusyDialog", this);
                                this.getView().addDependent(this.oBusyDialog);
                                this.oBusyDialog.open();
                            }
                            var empName = this._getNamePerid(perId, oModel, sPath);
                            oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                            oModel.setProperty(oBind.getPath() + "/userId", perId);
                            this._checkConcur(perId, oModel, oBind, "E", empName);
                            // var exp = this.localJSON();
                            // oModel.setProperty("/dropdownExpType", exp.ExpensesType);
                        }
                    }.bind(this),
                    error: function (e) {
                        console.log("error: " + e);
                        oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                        this._controlExpensesRows(oModel, oBind, false, false);
                        oModel.setProperty(sPath + "/empName", "");
                        MessageBox.error(JSON.parse(e.responseText).error.message.value);
                    }.bind(this)
                })
            },

            onAddRowTab1: function () {
                var oModel = this.getView().getModel("Model1").getProperty("/SecAData");
                var len = oModel.length;
                if (oModel[len - 1].NumberOfMiles == "") {
                    MessageBox.error("Kindly enter the complete data first");
                }
                else {
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
                }
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
                if (oModel[len - 1].Amount == "") {
                    MessageBox.error("Kindly enter the complete data first");
                }
                else {
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
                }
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
                if (oModel[len - 1].NumberOfMiles == "") {
                    MessageBox.error("Kindly enter the complete data first");
                }
                else {
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
                }
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
                if (oModel[len - 1].Amount == "") {
                    MessageBox.error("Kindly enter the complete data first");
                }
                else {
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
                }
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
                if (!this._oDialogModel) {
                    this._oDialogModel = sap.ui.xmlfragment("com.gcc.eforms.ex01.ex01.fragment.Showbut", this);
                    this.getView().addDependent(this._oDialogModel);
                }
                var sPath = oEvent.getSource().getBindingContext("Model1").getPath();
                var Section = sPath.includes("SecAData") ? "A" : sPath.includes("SecBData") ? "B" : sPath.includes("SecCData") ? "C" : "D";
                pathForComment = {
                    rowId: (Number(sPath.split("Data/")[1]) + 1).toString(),
                    Section: Section
                };
                var commData = this.getView().getModel("Model1").getProperty("/ShowBtnData");
                if (commData == undefined || commData == []) {
                    this.getView().getModel("Model1").setProperty("/ShowBtnData", []);
                }
                else {
                    var commentExist = commData.filter((el) => el.SeqNumber == (Number(sPath.split("Data/")[1]) + 1).toString() && el.Section == Section);
                    if (commentExist.length != 0) {
                        this.getView().getModel("Model1").setProperty("/rowComment", commentExist[0].comment);
                    }
                }
                this._oDialogModel.open();
                this.value = "MO";
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
                var com = this.getView().getModel("Model1").getProperty("/rowComment");
                var commData = this.getView().getModel("Model1").getProperty("/ShowBtnData");
                var commentExist = commData.filter((el) => el.SeqNumber == pathForComment.rowId && el.Section == pathForComment.Section);
                if (commentExist.length != 0) {
                    for (let i = 0; i < commData.length; i++) {
                        if (commData[i].SeqNumber == commentExist.rowId && commData[i].Section == commentExist.Section) {
                            commData.splice(i, 1);
                        }
                    }
                }
                if (com != "") {
                    var temp = {
                        Formid: this.getView().byId("_IDGenInput2").getValue(),
                        SeqNumber: pathForComment.rowId,
                        Section: pathForComment.Section,
                        comment: com
                    };
                    commData.push(temp);
                    this.getView().getModel("Model1").setProperty("/ShowBtnData", commData);
                    this.getView().getModel("Model1").setProperty("/rowComment", "");
                }
                else {
                }
                this._oDialogModel.close();
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

            _messLog: function (section, message) {
                if (section == "Header") {
                    var obj = {
                        "Icon": "sap-icon://status-error",
                        "Message": `${message} is Mandatory Field in ${section} Section`,
                    }
                }
                else {
                    var obj = {
                        "Icon": "sap-icon://status-error",
                        "Message": `${message} is Mandatory Field in Section ${section}`,
                    }
                }
                let logMessage = this.getView().getModel("Model1").getProperty("/MessageLog");
                logMessage.push(obj);
                this.getView().getModel("Model1").setProperty("/MessageLog", logMessage);
            },

            _payload: function (purpose, delInd, isSubmit) {

                var checkAtleastOneAllowance = false;
                var oModel = this.getView().getModel("Model1");
                oModel.setProperty("/MessageLog", []);
                var SecAData = oModel.getProperty("/SecAData");
                var secA = [];
                if (SecAData.length == 1 && SecAData[0].PersonID == "") {
                }
                else {
                    for (let i = 0; i < SecAData.length; i++) {
                        checkAtleastOneAllowance = true;
                        var temp = {
                            "Formid": this.getView().byId("_IDGenInput2").getValue(),
                            "SeqNumber": (SecAData[i].counter).toString(),
                            "Employee": SecAData[i].empName,
                            "Perid": SecAData[i].PersonID != "" ? SecAData[i].PersonID : this._messLog("A", "Employee Name"),
                            "Userid": SecAData[i].userId,
                            "JobTitle": SecAData[i].jobTitle,
                            "Email": SecAData[i].email,
                            "PositionCode": SecAData[i].jobTitle,
                            "VehicleType": SecAData[i].VehicleType,
                            "VehicleTypeCode": SecAData[i].VehicleTypeCode != "" ? SecAData[i].VehicleTypeCode : this._messLog("A", "Vehicle Type"),
                            "VehTypeEnab": SecAData[i].enableVehicleType ? "X" : "",
                            "VehicleClass": SecAData[i].VehicleClass,
                            "VehClassCode": SecAData[i].VehicleClassCode != "" ? SecAData[i].VehicleClassCode : SecAData[i].enableVehicleClass ? this._messLog("A", "Vehicle Class") : "",
                            "VehClassEnab": SecAData[i].enableVehicleClass ? "X" : "",
                            "MilesEnab": SecAData[i].enableMiles ? "X" : "",
                            "NoOfMiles": SecAData[i].NumberOfMiles != "" ? SecAData[i].NumberOfMiles : this._messLog("A", "Number of Miles"),
                            // "Amount": SecAData[i].Amount != "" ? SecAData[i].Amount : this._messLog("A", "Amount"),
                            // "AmountEnab": SecAData[i].enableAmount ? "X" : ""
                        }
                        secA.push(temp);
                    }
                }
                var SecBData = oModel.getProperty("/SecBData");
                var secB = [];
                if (SecBData.length == 1 && SecBData[0].PersonID == "") {
                }
                else {
                    for (let i = 0; i < SecBData.length; i++) {
                        checkAtleastOneAllowance = true;
                        var temp = {
                            "Formid": this.getView().byId("_IDGenInput2").getValue(),
                            "SeqNumber": (SecBData[i].counter).toString(),
                            "Employee": SecBData[i].empName != "" ? SecBData[i].empName : this._messLog("B", "Employee Name"),
                            "Perid": SecBData[i].PersonID,
                            "Userid": SecBData[i].userId,
                            "JobTitle": SecBData[i].jobTitle,
                            "Email": SecBData[i].email,
                            "PositionCode": SecBData[i].jobTitle,
                            "ExpenseType": SecBData[i].ExpenseType,
                            "ExpenseTypeCode": SecBData[i].ExpenseTypeCode != "" ? SecBData[i].ExpenseTypeCode : this._messLog("B", "Expense Type"),
                            "ExpTypeEnab": SecBData[i].enableExpense ? "X" : "",
                            "AmountEnab": SecBData[i].enableAmount ? "X" : "",
                            "Amount": SecBData[i].Amount != "" ? SecBData[i].Amount : this._messLog("B", "Amount")
                        }
                        secB.push(temp);
                    }
                }
                var SecCData = oModel.getProperty("/SecCData");
                var secC = [];
                if (SecCData.length == 1 && SecCData[0].empName == "") {
                }
                else {
                    for (let i = 0; i < SecCData.length; i++) {
                        checkAtleastOneAllowance = true;
                        var temp = {
                            "Formid": this.getView().byId("_IDGenInput2").getValue(),
                            "SeqNumber": (SecCData[i].counter).toString(),
                            "Employee": SecCData[i].empName != "" ? SecCData[i].empName : this._messLog("C", "Employee Name"),
                            "Perid": SecCData[i].PersonID,
                            "Userid": SecCData[i].userId,
                            "JobTitle": SecCData[i].jobTitle,
                            "Email": SecCData[i].email,
                            "VehicleType": SecCData[i].VehicleType,
                            "VehicleTypeCode": SecCData[i].VehicleTypeCode != "" ? SecCData[i].VehicleTypeCode : this._messLog("C", "Vehicle Type"),
                            "VehTypeEnab": SecCData[i].enableVehicleType ? "X" : "",
                            "VehicleClass": SecCData[i].VehicleClass,
                            "VehClassCode": SecCData[i].VehicleClassCode != "" ? SecCData[i].VehicleClassCode : SecCData[i].enableVehicleClass ? this._messLog("C", "Vehicle Class") : "",
                            "VehClassEnab": SecCData[i].enableVehicleClass ? "X" : "",
                            "MilesEnab": SecCData[i].enableMiles ? "X" : "",
                            "NoOfMiles": SecCData[i].NumberOfMiles != "" ? SecCData[i].NumberOfMiles : this._messLog("C", "Number of Miles"),
                            // "Amount": SecCData[i].Amount != "" ? SecCData[i].Amount : this._messLog("C", "Amount"),
                            // "AmountEnab": SecCData[i].enableAmount ? "X" : ""
                        }
                        secC.push(temp);
                    }
                }
                var SecDData = oModel.getProperty("/SecDData");
                var secD = [];
                if (SecDData.length == 1 && SecDData[0].empName == "") {
                }
                else {
                    for (let i = 0; i < SecDData.length; i++) {
                        checkAtleastOneAllowance = true;
                        var temp = {
                            "Formid": this.getView().byId("_IDGenInput2").getValue(),
                            "SeqNumber": (SecDData[i].counter).toString(),
                            "Employee": SecDData[i].empName != "" ? SecDData[i].empName : this._messLog("D", "Employee Name"),
                            "Perid": SecDData[i].PersonID,
                            "Userid": SecDData[i].userId,
                            "JobTitle": SecDData[i].jobTitle,
                            "Email": SecDData[i].email,
                            "ExpenseType": SecDData[i].ExpenseType,
                            "ExpenseTypeCode": SecDData[i].ExpenseTypeCode != "" ? SecDData[i].ExpenseTypeCode : this._messLog("D", "Expense Type"),
                            "ExpTypeEnab": SecDData[i].enableExpense ? "X" : "",
                            "AmountEnab": SecDData[i].enableAmount ? "X" : "",
                            "Amount": SecDData[i].Amount != "" ? SecDData[i].Amount : this._messLog("D", "Amount")
                        }
                        secD.push(temp);
                    }
                }

                var commentData = oModel.getProperty("/ShowBtnData");

                var Request_Payload = {
                    "Formid": this.getView().byId("_IDGenInput2").getValue() != "" ? this.getView().byId("_IDGenInput2").getValue() : this._messLog("Header", "Form ID"),
                    "Initiator": this.getView().byId("_IDGenInput1").getValue() != "" ? this.getView().byId("_IDGenInput1").getValue() : this._messLog("Header", "Initiator"),
                    "Zdate": this.getView().byId("DatePicker01").getValue() != "" ? this._dateForS4(this.getView().byId("DatePicker01").getValue()) : this._messLog("Header", "Start Date"),
                    "DateInt": this._dateToReq(this.getView().byId("DatePicker01").getValue()),
                    "OrganizationName": this.getView().byId("_IdGenInput6").getSelectedItem() != null ? this.getView().byId("_IdGenInput6").getSelectedItem().getText() : this.getView().byId("_IdGenInput6").getValue() != "" ? this.getView().byId("_IdGenInput6").getValue() : this._messLog("Header", "Organisation Name"),
                    "OrgCode": this.getView().byId("_IdGenInput6").getSelectedItem() != null ? this.getView().byId("_IdGenInput6").getSelectedItem().getKey() : this.getView().byId("_IdGenInput6").getSelectedKey(),
                    "CostCentre": this.getView().byId("_IdGenInput5").getValue() != "" ? this.getView().byId("_IdGenInput5").getValue() : this._messLog("Header", "Cost Centre"),
                    "CostCentreCode": this.getView().byId("_IdGenInput5").getValue(),
                    "ClaimMonth": this.getView().byId("_IDGenComboBox1").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox1").getSelectedItem().getText() : this.getView().byId("_IDGenComboBox1").getValue() != "" ? this.getView().byId("_IDGenComboBox1").getValue() : this._messLog("Header", "Claim Month"),
                    "ClaimMonthInt": this.getView().byId("_IDGenComboBox1").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox1").getSelectedItem().getKey() : this.getView().byId("_IDGenComboBox1").getSelectedKey(),
                    "ClaimEndDate": this.getView().byId("_IDGenDatePicker1").getValue() != "" ? this._dateForS4(this.getView().byId("_IDGenDatePicker1").getValue()) : "",
                    "ClaimEndDateInt": this.getView().byId("_IDGenDatePicker1").getValue() != "" ? this._dateToReq(this.getView().byId("_IDGenDatePicker1").getValue()) : "",
                    "ClaimStartDate": firstDateofMonth != "" ? this._dateForS4(firstDateofMonth) : "",
                    "ClaimStartDateInt": firstDateofMonth != "" ? this._dateToReq(firstDateofMonth) : "",
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

                if (!checkAtleastOneAllowance) {
                    var obj = {
                        "Icon": "sap-icon://status-error",
                        "Message": `A claim form must have at least one claim item`,
                    }
                    var message = oModel.getProperty("/MessageLog")
                    message.push(obj)
                    oModel.setProperty("/MessageLog", message)
                }

                return Request_Payload;
            },

            onSave: function () {
                sap.ui.core.BusyIndicator.show();
                var Request_Paylaod = this._payload("I", "", false);
                this.getOwnerComponent().getModel("S4hService").create("/zsf_ex01_hSet", Request_Paylaod,
                    {
                        success: function (oData) {
                            sap.ui.core.BusyIndicator.hide()
                            MessageBox.success(`Form: ${this.getView().byId("_IDGenInput2").getValue()} is saved successfully!`);
                            var initiator = this.getView().getModel("Model1").getProperty("/initNameP")
                            this._logCreation("E", initiator.salutationLabel + "" + initiator.firstNameInit + " " + initiator.lastNameInit, "", "");
                            console.log("Success S4h");
                            sap.ui.core.BusyIndicator.hide();
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
                            var Request_Paylaod = this._payload("", "X", false);
                            this.getOwnerComponent().getModel("S4hService").remove("/zsf_ex01_hSet('" + this.getView().byId("_IDGenInput2").getValue() + "')",
                                {
                                    success: function (oData) {
                                        sap.ui.core.BusyIndicator.hide()
                                        var initiator = this.getView().getModel("Model1").getProperty("/initNameP")
                                        this._logCreation("D", initiator.salutationLabel + "" + initiator.firstNameInit + " " + initiator.lastNameInit, "", "");
                                        MessageBox.success(`Form: ${this.getView().byId("_IDGenInput2").getValue()} deleted Successfully!`, {
                                            actions: [MessageBox.Action.OK],
                                            emphasizedAction: MessageBox.Action.OK,
                                            onClose: function (sAction) {
                                                if (sAction == MessageBox.Action.OK) {
                                                    // var oHistory, sPreviousHash;
                                                    // oHistory = History.getInstance();
                                                    // sPreviousHash = oHistory.getPreviousHash();
                                                    // if (sPreviousHash == undefined) {
                                                    // }
                                                    window.history.go(-1);
                                                }
                                            }
                                        });
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
                this.getOwnerComponent().getModel("S4hService").create("/zsf_ex01_hSet", Request_Paylaod,
                    {
                        success: function (oData) {
                            sap.ui.core.BusyIndicator.hide();
                            var initiator = this.getView().getModel("Model1").getProperty("/initNameP")
                            this._logCreation("E", initiator.salutationLabel + "" + initiator.firstNameInit + " " + initiator.lastNameInit, "", "");
                            console.log("Success S4h");
                            var s4url = this.getOwnerComponent().getModel("S4hService").sServiceUrl;    // Give your service name
                            var FormID = this.getView().byId("_IDGenInput2").getValue();      // Give your FormID
                            var sSource = s4url + "/zsf_ex01_printSet(Formid='" + FormID + "')/$value";
                            var newTab = window.open(sSource, "_blank");
                            // newTab.onload = function () {
                            //     newTab.document.title = "School Expenses Print Preview"
                            // }
                            // this._pdfViewer = new sap.m.PDFViewer();
                            // this.getView().addDependent(this._pdfViewer);
                            // this._pdfViewer.setSource(sSource);
                            // this._pdfViewer.setTitle("Expenses Report Form - Print");
                            // this._pdfViewer.setShowDownloadButton(false);
                            // this._pdfViewer.open();
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
                            // var oHistory, sPreviousHash;
                            // oHistory = History.getInstance();
                            // sPreviousHash = oHistory.getPreviousHash();
                            // if (sPreviousHash == undefined) {
                            // }
                            window.history.go(-1);
                        }
                    }
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
                            var Request_Paylaod = this._payload("I", "", true);
                            var MessageLog = this.getView().getModel("Model1").getProperty("/MessageLog");
                            if (this.getView().getModel("Model1").getProperty("/MessageLog").length != 0) {
                                this._oMessage = sap.ui.xmlfragment("com.gcc.eforms.ex01.ex01.fragment.logMessage", this);
                                this.getView().addDependent(this._oMessage);
                                this._oMessage.open();
                                sap.ui.core.BusyIndicator.hide();
                            }
                            else {
                                this.getOwnerComponent().getModel("S4hService").create("/zsf_ex01_hSet", Request_Paylaod,
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
                var appUrl = window.location.origin + "/site" + window.location.search.split("&")[0] + window.location.hash.split("?")[0];
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
                var sURL1 = prefix + "workflow/rest/v1/task-instances";

                $.support.cors = true;
                $.ajax(sURL, {
                    method: "POST",
                    data: JSON.stringify(payload),
                    crossDomain: true,
                    contentType: "application/json"
                }).done(function (data, textStatus, jqXHR) {
                    console.log("---workflow Data---");
                    $.support.cors = true;
                    if (data) {
                        var url = sURL1 + "?workflowInstanceId=" + data.id
                        $.ajax(url, {
                            method: "GET",
                            crossDomain: true,
                            contentType: "application/json"
                        }).done(function (taskdata, textStatus, jqXHR) {
                            console.log("---task Data---");
                            console.log(taskdata);
                            console.log("Workflow has been triggered and Form has been Submitted");
                            sap.ui.core.BusyIndicator.hide()
                            var initiator = this.getView().getModel("Model1").getProperty("/initNameP")
                            var formOwnerCode = this.getView().getModel("Model1").getProperty("/OrgNameP").managerId;
                            this._logCreation("S", initiator.salutationLabel + "" + initiator.firstNameInit + " " + initiator.lastNameInit, "", formOwnerCode);
                            MessageBox.success(`Form: ${this.getView().byId("_IDGenInput2").getValue()} is submitted successfully
                            
                            Please call ContactUs on 01452 425888 should you have any queries regarding this e-Form.`, {
                                actions: [MessageBox.Action.OK],
                                emphasizedAction: MessageBox.Action.OK,
                                onClose: function (sAction) {
                                    if (sAction == MessageBox.Action.OK) {
                                        // var oHistory, sPreviousHash;
                                        // oHistory = History.getInstance();
                                        // sPreviousHash = oHistory.getPreviousHash();
                                        // if (sPreviousHash == undefined) {
                                        // }
                                        window.history.go(-1);
                                    }
                                }
                            });
                        }.bind(this)).fail(function (XMLHttpRequest, textStatus) {
                            MessageBox.error("Some error occured. Please try again")
                            sap.ui.core.BusyIndicator.hide();
                        });
                    }

                }.bind(this)).fail(function (XMLHttpRequest, textStatus) {
                    // alert("error");
                    MessageBox.error("Some error occured. Please try again")
                    sap.ui.core.BusyIndicator.hide();
                });

            },

            _logCreation: async function (status, formOwner, perArea, formOwnerCode) {

                if (formOwnerCode != "") {
                    if (formOwnerCode != "NO_MANAGER") {
                        await $.ajax({
                            url: prefix + "/odata/v2/PerPerson(personIdExternal='" + formOwnerCode + "')/personalInfoNav?$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {       //first name, last name Etc.
                                console.log("success PerPerson for Manager");
                                formOwner = data.d.results[0].firstName + " " + data.d.results[0].lastName;
                            },
                            error: function (e) {
                                console.log("error: " + e);
                            }
                        });
                    }
                }

                var personnel = this.getView().getModel("Model1").getProperty("/OrgNameP/customString3") != undefined ? this.getView().getModel("Model1").getProperty("/OrgNameP/customString3") : perArea;
                var initiator = this.getView().getModel("Model1").getProperty("/initNameP")
                var log_payload = {
                    "Formid": this.getView().byId("_IDGenInput2").getValue(),
                    "StartedOn": this.getView().byId("DatePicker01").getValue(),
                    "Status": status,
                    "Type": "EX01",
                    "OrganizationName": personnel,
                    "Initiator": initiator.salutationLabel + " " + initiator.firstNameInit + " " + initiator.lastNameInit,
                    "InitCode": initiatorCode,
                    "Description": "Expense Report Form",
                    "FormOwner": formOwner,
                    "FormOwnerCode": formOwnerCode != "" ? formOwnerCode : initiatorCode,
                    "AvailableFrom": new Date(),
                }
                this.getOwnerComponent().getModel("logService").create("/zsf_logSet", log_payload,
                    {
                        success: function (oData) {
                            console.log(`${oData.Formid} log created`);
                            this.onTabChange();
                        }.bind(this),
                        error: function (oData) {
                            console.log("Error", oData);
                        }
                    });
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
