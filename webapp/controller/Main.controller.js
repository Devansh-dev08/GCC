sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "../model/formatter"
],
    function (Controller, MessageBox, formatter) {
        let prefix = "";
        "use strict";

        return Controller.extend("com.gcc.eforms.ex02.controller.Main", {
            formatter: formatter,
            onInit: function () {
                prefix = sap.ui.require.toUrl(this.getOwnerComponent().getManifestEntry('/sap.app/id').replaceAll('.', '/'))
                this.getOwnerComponent().getRouter().getRoute("RouteMain").attachPatternMatched(this._onRouteMatched, this);
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
                            var useremail = "test00014577@noemail.gloucestershire.gov.uk";
                        }
                        else {
                            var useremail = oModel2.getData().email;
                        }
                        this.query = oEvent.getParameter('arguments')["?query"];
                        var oModel = new sap.ui.model.json.JSONModel();
                        this.getView().setModel(oModel, "Model1");
                        this._genHTMLText(oModel);
                        if (this.query != undefined) {
                            oModel.setProperty("/existCommVisibility", true);
                            // // Getting the initiator from the mail id
                            oModel.setProperty("/form", this.query);
                            this.formId = this.query.formId
                            this._getInitiator(oModel, useremail)
                                .then(initiator => {
                                    var initi = initiator;
                                    // Checking if the user has Multiple Organization
                                    this._checkMultiOrg(oModel, initi)
                                        .then(response => {
                                            this._S4Services(oModel);
                                            if (this.query.mode != "display") {
                                                this._prev6Months(oModel);
                                            }
                                            else {
                                            }
                                        })
                                })
                        }
                        else {

                            this.query = { formId: "", mode: "" }
                            oModel.setProperty("/form", this.query);
                            // // Adding Empty rows to all the tables...
                            this._addEmptyRowSecA(oModel);
                            // this._addEmptyRowSecB(oModel);
                            oModel.setProperty("/existCommVisibility", false);
                            // // Getting the initiator from the mail id
                            this._getInitiator(oModel, useremail)
                                .then(initiator => {
                                    var initi = initiator;
                                    console.log(`Form initiated by ${initi}`);
                                    // Checking if the user has Multiple Organization
                                    this._checkMultiOrg(oModel, initi)
                                        .then(response => {
                                            // // Calling all the SuccessFactors API's
                                            this._SFServices(oModel, initi, response)
                                                .then(() => {
                                                    // Generating log for initiated status
                                                    setTimeout(this._logCreation("I"), 3000);
                                                })

                                            // Generating Form ID
                                            this.getOwnerComponent().getModel("S4hService").read("/zsfgt_formid_genSet",
                                                {
                                                    success: function (oData) {
                                                        console.log(`Form ID generated: ${oData.results[0].Formid}`);
                                                        this.formId = oData.results[0].Formid;
                                                        oModel.setProperty("/FormID", oData.results[0].Formid);
                                                    }.bind(this),
                                                    error: function (oData) {
                                                        console.log("Error" + oData);
                                                    }
                                                });
                                        });
                                })
                                .catch(e => {
                                    MessageBox.error(`${JSON.parse(e.responseText).error.message.value}`, {
                                        title: "Error Message",
                                        actions: [sap.m.MessageBox.Action.OK],
                                        onClose: function (oAction) {
                                            if (oAction) {
                                                window.history.go(-1);
                                            }
                                        }
                                    });
                                });
                            this._prev6Months(oModel);
                        }
                    });
            },

            _genHTMLText: function (oModel) {
                var link = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("introLink")
                var text = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("IntroText1")
                oModel.setProperty("/introText", "<p>" + text + "<a title=" + link + " href=\"" + link + "\"</a> Click there.</p>")
            },

            _getInitiator: async function (oModel, useremail) {

                return new Promise(
                    async function (resolve, reject) {
                        var email;
                        await $.ajax({
                            url: prefix + "/odata/v2/PerEmail?$filter=emailAddress eq '" + useremail + "' &$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                                email = data;
                            }.bind(this),
                            error: function (e) {
                                console.log(`PerEmail entity failed for ${useremail}`);
                                reject(e);
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
                                    fullName: data.d.results[0].firstName + " " + data.d.results[0].lastName,
                                    salutation: data.d.results[0].salutation
                                }
                                this.initiatorCode = email.d.results[0].personIdExternal;
                                oModel.setProperty("/user", initDetails);
                                resolve(email.d.results[0].personIdExternal);
                            }.bind(this),
                            error: function (data) {
                                console.log(`PerPerson entity failed for ${email.d.results[0].personIdExternal}`);
                                reject(data);
                            }
                        });
                    });
            },

            _checkMultiOrg: async function (oModel, initiator) {

                return new Promise(
                    async function (resolve, reject) {
                        var username;
                        await $.ajax({
                            url: prefix + "/odata/v2/UserAccount?$format=json&$filter=personIdExternal eq '" + initiator + "'",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                                username = data.d.results[0].username;
                            },
                            error: function (e) {
                                console.log(`UserAccount entity failed for ${initiator}`);
                                reject(e);
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
                                    oModel.setProperty("/OrgNameP", "");
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
                                                resolve(true);
                                            },
                                            error: function (e) {
                                                console.log(`cust_PersonnelArea entity failed for ${item}`);
                                                reject(e);
                                            }
                                        });
                                    });
                                } else {
                                    resolve(false);
                                    oModel.setProperty("/multiOrgFound", false);
                                }
                            }.bind(this),
                            error: function (e) {
                                console.log(`cust_ZFLM_MULTI_USERS entity failed for ${username}`);
                                reject(e);
                            }
                        });
                    });
            },

            _SFServices: async function (oModel, initiator, multiOrgFlag) {

                return new Promise(
                    async function (resolve, reject) {
                        var userData = oModel.getProperty("/user");
                        // salutation label
                        $.ajax({
                            url: prefix + "/odata/v2/PicklistOption(" + userData.salutation + 'L' + ")/picklistLabels?$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                                var salutationLabel = data.d.results[0].label;
                                var initName = {
                                    salutationLabel: salutationLabel,
                                    fullName: userData.fullName
                                }
                                oModel.setProperty("/initNameP", initName);
                            }.bind(this),
                            error: function (e) {
                                console.log(`PicklistOption entity failed for ${salutationInit + 'L'}`);
                                reject(e);
                            }
                        });

                        // // orgName Initiator
                        $.ajax({
                            url: prefix + "/odata/v2/EmpEmployment(personIdExternal='" + initiator + "',userId='" + initiator + "')/jobInfoNav?$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                                // Organisation Name property
                                oModel.setProperty("/OrgNameP", data.d.results[0].customString3);
                                // Storing data for further usage
                                oModel.setProperty("/EmpJobData", data.d.results[0]);

                                // checking if line manager is present
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
                                                oModel.setProperty("/OrgNameP", temp);
                                                this._mileageDropdown(data.d.results[0].externalCode);
                                                this._ioData();
                                                oModel.setProperty("/selectedOrg", data.d.results[0].externalCode);
                                            }.bind(this),
                                            error: function () {
                                                console.log(`Error in Assigning Multiple Personnel Area`);
                                                reject(e)
                                            }
                                        });
                                    }
                                    else {
                                        oModel.setProperty("/OrgNameP", "");
                                    }
                                }
                            }.bind(this),
                            error: function (e) {
                                console.log(`EmpEmployment entity failed for ${initiator}`);
                                reject(e);
                            }
                        });

                        // populating date by system
                        oModel.setProperty("/FormStartDate", new Date());

                        // // Cost Center AJAX 
                        $.ajax({
                            url: prefix + "/odata/v2/EmpCostAssignmentItem?$filter= EmpCostAssignment_worker eq '" + initiator + "'&$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                                for (let i = 0; i < data.d.results.length; i++) {
                                    if (data.d.results[i].defaultAssignment == true) {
                                        oModel.setProperty("/CostCentreP", data.d.results[0]);
                                    }
                                }
                                resolve();
                            }.bind(this),
                            error: function (e) {
                                console.log(`EmpCostAssignmentItem entity failed for ${initiator}`);
                            }
                        });
                    }.bind(this));
            },

            _S4Services: function (oModel) {

                this.getOwnerComponent().getModel("S4hService").read("/zsf_ex02_hSet('" + this.formId + "')?$format=json",
                    {
                        urlParameters: {
                            "$expand": "hdr_to_mil_cl_nav,hdr_to_comm_nav,hdr_to_comm_row_nav"
                        },
                        success: function (oData) {
                            if (!oData.Formid)
                                MessageBox.error(`Form not found for ${this.formId}`);
                            else {
                                // Setting header details
                                oModel.setProperty("/FormID", this.formId)
                                oModel.setProperty("/initNameP", { salutationLabel: oData.Initiator.split(" ")[0], fullName: oData.Initiator.split(" ")[1] + " " + oData.Initiator.split(" ")[2] });
                                oModel.setProperty("/FormStartDate", new Date(oData.Zdate))
                                oModel.setProperty("/OrgNameP", oData.OrganizationName);
                                oModel.setProperty("/selectedOrg", oData.OrgCode)
                                oModel.setProperty("/CostCentreP", { costCenter: oData.CostCentre })
                                oModel.setProperty("/ClaimMonth", oData.ClaimMonth)
                                oModel.setProperty("/ClaimMonthKey", oData.ClaimMonthInt)
                                oModel.setProperty("/ClaimEndDate", new Date(oData.ClaimEndDate));
                                oModel.setProperty("/ClaimStartDate", new Date(oData.ClaimStartDate));
                                if (this.query.mode != "display") {
                                    firstDateofMonth = new Date(oData.ClaimStartDate).toLocaleDateString();
                                    var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
                                    var FirstDateISO = dateFormat.format(new Date(oData.ClaimStartDate));
                                    var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-dd-MM" });
                                    var LastDateISO = dateFormat.format(new Date(oData.ClaimEndDate));
                                    this._mileageDropdown(oData.OrgCode);
                                    this._getEmplData(oData.OrgCode, LastDateISO, FirstDateISO);
                                    this._ioData();
                                }
                                // Setting the Comment row data 
                                oModel.setProperty("/ShowBtnData", oData.hdr_to_comm_row_nav.results)
                            }

                            // Setting data for the mileage table
                            if (oData.hdr_to_mil_cl_nav.results.length == 0)
                                this._addEmptyRowSecA(oModel);
                            else {
                                let mileageData = oData.hdr_to_mil_cl_nav.results;
                                let secA = [];
                                for (let i = 0; i < mileageData.length; i++) {
                                    var rowData = {
                                        "counter": Number(mileageData[i].SeqNumber),
                                        "empName": mileageData[i].Employee,
                                        "PersonID": mileageData[i].Perid,
                                        "userId": mileageData[i].Userid,
                                        "jobTitle": mileageData[i].JobTitle,
                                        "email": mileageData[i].Email,
                                        "postingDate": mileageData[i].PostingDate,
                                        "VehicleType": mileageData[i].VehicleType,
                                        "VehicleTypeCode": mileageData[i].VehicleTypeCode,
                                        "enableVehicleType": mileageData[i].VehTypeEnab == "X" ? true : false,
                                        "VehicleClass": mileageData[i].VehicleClass,
                                        "VehicleClassCode": mileageData[i].VehClassCode,
                                        "enableVehicleClass": mileageData[i].VehClassEnab == "X" ? true : false,
                                        "enableMiles": mileageData[i].MilesEnab == "X" ? true : false,
                                        "NumberOfMiles": mileageData[i].NoOfMiles,
                                        "costCentre":  mileageData[i].CostCentre,
                                        "internalOrder": mileageData[i].InternalOrder,
                                        "assignedTo": mileageData[i].AssignTo,
                                        "Amount": "",
                                        "enableAmount": false,
                                        "CcEdit": mileageData[i].CostCentre ? true : false,
                                        "IoEdit": mileageData[i].InternalOrder ? true : false
                                    }
                                    secA.push(rowData);
                                }
                                oModel.setProperty("/SecAData", secA);
                            }

                            // Setting the comments section
                            if (oData.hdr_to_comm_nav.results.length > 0) {
                                var comm = "";
                                for (let i = 0; i < oData.hdr_to_comm_nav.results.length; i++) {
                                    comm += oData.hdr_to_comm_nav.results[i].comment + "\n";
                                }
                                oModel.setProperty("/existCommVisibility", true);
                                oModel.setProperty("/existComm", comm);
                            }
                        }.bind(this),
                        error: function (resp) {
                            console.log(JSON.parse(resp.responseText).error.message.value)
                        }.bind(this)
                    });
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
                        console.log(`cust_ZFLM_VEHICLE_TYPES entity failed for ${org}`);
                    }.bind(this)
                });
            },

            _ioData: function () {
                var oModel = this.getView().getModel("Model1");
                $.ajax({
                    url: prefix + "/odata/v2/EmpPayCompNonRecurring?$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        if (data && data.d.results.length > 0) {
                            oModel.setProperty("/ioData", data.d.results);
                        }
                    }.bind(this),
                    error: function (e) {
                        console.log(`EmpPayCompNonRecurring entity failed`);
                    }.bind(this)
                });
            },

            _logCreation: async function (status) {

                if (status == "S") {
                    var managerId = this.getView().getModel("Model1").getProperty("/EmpJobData/managerId");
                    var formOwner;
                    await $.ajax({
                        url: prefix + "/odata/v2/PerPerson(personIdExternal='" + managerId + "')/personalInfoNav?$format=json",
                        type: 'GET',
                        contentType: "application/json",
                        success: function (data) {       //first name, last name Etc.
                            formOwner = data.d.results[0].firstName + " " + data.d.results[0].lastName;
                        },
                        error: function (e) {
                            console.log(`PerPerson entity failed for ${managerId} while creating log`);
                        }
                    });
                }

                var initiator = this.getView().getModel("Model1").getProperty("/initNameP")
                var log_payload = {
                    "Formid": this.formId,
                    "StartedOn": new Date(this.getView().getModel("Model1").getProperty("/FormStartDate")).toLocaleDateString('en-GB'),
                    "Status": status,
                    "Type": "EX02",
                    "OrganizationName": this.getView().getModel("Model1").getProperty("/OrgNameP"),
                    "Initiator": initiator.fullName,
                    "InitCode": this.initiatorCode,
                    "Description": "Police Expense Form",
                    "FormOwner": formOwner,
                    "FormOwnerCode": managerId ? managerId : this.initiatorCode,
                    "AvailableFrom": new Date().toLocaleDateString('en-GB'),
                }
                this.getOwnerComponent().getModel("logService").create("/zsf_logSet", log_payload,
                    {
                        success: function (oData) {
                            console.log(`log created for status ${status}`);
                        }.bind(this),
                        error: function (oData) {
                            console.log(`Error in creating log for status ${status}`);
                        }
                    });
            },

            _addEmptyRowSecA: function (oModel) {

                var secARow = {
                    counter: oModel.getProperty("/SecAData") ? oModel.getProperty("/SecAData").length + 1 : 1,
                    empName: "",
                    PersonID: "",
                    jobTitle: "",
                    userId: "",
                    email: "",
                    postingDate: "",
                    CustomString1: "",
                    costCentre: "",
                    internalOrder: "",
                    VehicleType: "",
                    VehicleTypeCode: "",
                    VehicleClass: "",
                    VehicleClassCode: "",
                    NumberOfMiles: "",
                    Amount: "",
                    enableMiles: false,
                    enableVehicleType: false,
                    enableVehicleClass: false,
                    enableAmount: false,
                    CcEdit: true,
                    IoEdit: true
                };

                var secA = oModel.getProperty("/SecAData");
                if (secA) {
                    secA.push(secARow);
                }
                else {
                    secA = [];
                    secA.push(secARow);
                }
                oModel.setProperty("/SecAData", secA);
            },

            _addEmptyRowSecB: function (oModel) {
                var secBRow = {
                    counter: 1,
                    empName: "",
                    PersonID: "",
                    jobTitle: "",
                    userId: "",
                    email: "",
                    postingDate: "",
                    CustomString1: "",
                    costCentre: "",
                    internalOrder: "",
                    ExpenseType: "",
                    ExpenseTypeCode: "",
                    Amount: "",
                    enableExpense: false,
                    enableAmount: false
                };

                var secB = oModel.getProperty("/SecBData");
                if (secB) {
                    secB.push(secBRow);
                }
                else {
                    secB = [];
                    secB.push(secBRow);
                }
                oModel.setProperty("/SecBData", secB);
            },

            onMonth: async function (oEvent) {

                if (oEvent.getSource().getSelectedItem() != null) {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                    sap.ui.core.BusyIndicator.show();
                    var sMonthIndex = oEvent.getSource().getSelectedItem().getKey();
                    var sMonthYear = oEvent.getSource().getSelectedItem().getText();
                    this.getView().getModel("Model1").setProperty("/ClaimMonthKey", sMonthIndex);
                    this.getView().getModel("Model1").setProperty("/ClaimMonth", sMonthYear);
                    var sYear = sMonthYear.split(" ")[1];
                    var LastDate = new Date(sYear, sMonthIndex, 0);
                    var FirstDate = new Date(sYear, sMonthIndex - 1, 1);
                    this.getView().getModel("Model1").setProperty("/ClaimStartDate", FirstDate);
                    var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
                    var FirstDateISO = dateFormat.format(FirstDate);
                    var dateFormat1 = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-dd-MM" });
                    var LastDateISO = dateFormat1.format(LastDate);
                    var dateFormat1 = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "dd MMM yyyy" });
                    var LastDateDisp = dateFormat1.format(LastDate);
                    this.getView().getModel("Model1").setProperty("/ClaimEndDate", LastDate);
                    var orgCode = this.getView().getModel("Model1").getProperty("/selectedOrg");
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
                        console.log(`PickListValueV2 entity failed for employee-status while getting employee dropdown`);
                        console.log(`Error: ${JSON.parse(e.responseText)}`);
                    }
                });

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
                    if (employeeData.length > 180) {
                        for (let i = 0; i < employeeData.length / 180; i++) {
                            employeeDetails(employeeData.slice(i * 180, (i + 1) * 180), _self);
                        }
                    }
                    else {
                        employeeDetails(employeeData, _self);
                    }

                    function employeeDetails(emplData, _self) {
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
                                        } catch (e) {
                                            console.log("Inconsistent data found for " + emplData[i].userId);
                                        }
                                    }
                                    var existingData = _self.getView().getModel("Model1").getProperty("/dropdownEmp");
                                    existingData ? _self.getView().getModel("Model1").setProperty("/dropdownEmp", existingData.concat(EmpData)) : _self.getView().getModel("Model1").setProperty("/dropdownEmp", EmpData);
                                    sap.ui.core.BusyIndicator.hide();
                                }
                                else {
                                    console.log(`No Employee Found for ${empl.d.results[0].personIdExternal}`);
                                }
                                sap.ui.core.BusyIndicator.hide();
                            });
                        });
                    }
                }
                // for (let i = 0; i < employeeData.length; i++) {

                // $.ajax({
                //     url: prefix + "/odata/v2/EmpEmployment?$filter=userId in " + EmpData + "&$format=json",
                //     type: 'GET',
                //     contentType: "application/json",
                //     success: function (data) {
                //         var empl = data;
                //         $.ajax({
                //             url: prefix + "/odata/v2/PerPersonal?$filter=personIdExternal eq '" + empl.d.results[0].personIdExternal + "'&$format=json",
                //             type: 'GET',
                //             contentType: "application/json",
                //             success: function (data) {
                //                 if (data.d.results[0] != null) {
                //                     var postingDate = this.unixDateRegex(employeeData[i].endDate) > findPostDate ? findPostDate : this.unixDateRegex(employeeData[i].endDate);
                //                     var temp = {
                //                         firstName: data.d.results[0].firstName,
                //                         lastName: data.d.results[0].lastName,
                //                         userId: employeeData[i].userId,
                //                         jobTitle: employeeData[i].customString1,
                //                         personIdExternal: empl.d.results[0].personIdExternal,
                //                         postingDate: `/Date(${postingDate})/`
                //                     };
                //                     EmpData.push(temp);
                //                     EmpData.sort((a, b) => {
                //                         // Sort by Last name
                //                         if (a.lastName < b.lastName) return -1;
                //                         if (a.lastName > b.lastName) return 1;

                //                         // a.firstName.localeCompare(b.firstName)
                //                         if (a.firstName < b.firstName) return -1;
                //                         if (a.firstName > b.firstName) return 1;

                //                         //Sort by UserId
                //                         if (a.userId < b.userId) return -1;
                //                         if (a.userId > b.userId) return 1;
                //                     });
                //                     this.getView().getModel("Model1").setProperty("/dropdownEmp", EmpData);
                //                     sap.ui.core.BusyIndicator.hide();
                //                 }
                //                 else {
                //                     console.log(`No Employee Found for ${empl.d.results[0].personIdExternal}`);
                //                 }
                //                 sap.ui.core.BusyIndicator.hide();
                //             }.bind(this),
                //             error: function () {
                //                 console.log(`PerPersonal entity failed while getting employee dropdown`);
                //                 console.log(`No Employee Found for ${empl.d.results[0].personIdExternal}`);
                //                 sap.ui.core.BusyIndicator.hide();
                //             }
                //         });
                //     }.bind(this),
                //     error: function (e) {
                //         console.log(`EmpEmployment entity failed while getting employee dropdown`);
                //         console.log("error: " + JSON.parse(e));
                //         sap.ui.core.BusyIndicator.hide();
                //     }
                // });
                // }

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
                    }
                    else {
                        reqArr.push(emplData[i]);
                    }
                }
                return reqArr;
            },

            unixDateRegex: function (date1) {
                const regex = /\/Date\((.*?)\)\//;
                const match = regex.exec(date1);
                return Number(match[1]);
            },

            onEmplChange: function (oEvent) {
                var emp1 = oEvent.getSource().getSelectedItem();
                var oModel = this.getView().getModel("Model1");
                var oBind = oEvent.getSource().getBindingContext("Model1")
                if (!emp1) {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                    this._controlMileageRows(oModel, oBind, false, false, false);
                }
                else {
                    this.oBusyDialog = new sap.m.BusyDialog();
                    this.oBusyDialog.open();
                    this.oBusyDialog.setText("Checking Employee in Concur");

                    // if (!this._oBusyDialog) {
                    //     this.oBusyDialog = sap.ui.xmlfragment("com.gcc.eforms.ex01.ex01.fragment.BusyDialog", this);
                    //     this.getView().addDependent(this.oBusyDialog);
                    // }
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                    var allData = oModel.getProperty("/dropdownEmp");
                    var reqDetails = allData.filter((el) => el.userId == emp1.getKey());
                    oModel.setProperty(oBind.getPath() + "/jobTitle", reqDetails[0].jobTitle);
                    oModel.setProperty(oBind.getPath() + "/userId", reqDetails[0].userId);
                    oModel.setProperty(oBind.getPath() + "/PersonID", reqDetails[0].personIdExternal);
                    oModel.setProperty(oBind.getPath() + "/postingDate", reqDetails[0].postingDate);
                    this._checkConcur(reqDetails[0].personIdExternal, oModel, oBind, reqDetails[0].firstName + " " + reqDetails[0].lastName);
                }
            },

            onCcChange: function (oEvent) {
                var oInput = oEvent.getSource();
                var oBindingContext = oInput.getBindingContext("Model1");
                var path = oBindingContext.getPath();
                var oModel = this.getView().getModel("Model1")
                var costCenter = oInput.getValue();
                var regex = /[0-9]{14}/;
                if (costCenter != "") {
                    if (regex.test(costCenter)) {
                        $.ajax({
                            url: prefix + "/odata/v2/FOCostCenter?$filter=externalCode eq '" + (costCenter).trim() + "' and status eq 'A'&$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                                if (data && data.d.results.length == 0) {
                                    sap.m.MessageBox.error(`Cost Center ${costCenter} could not be found.
                            If you believe this to be an error, please contact Finance on  01452 328904.`, {
                                        title: "Error",
                                        actions: [sap.m.MessageBox.Action.OK]
                                    });
                                    oModel.setProperty(path + "/assignedTo", "");
                                    oInput.setValueState(sap.ui.core.ValueState.Error);
                                    return;
                                } else {
                                    var endDate = new Date(this.unixDateRegex(data.d.results[0].endDate));
                                    var currentDate = new Date();
                                    if (endDate < currentDate) {
                                        oInput.setValueState(sap.ui.core.ValueState.Error);
                                        sap.m.MessageBox.error(`Cost Center ${costCenter} ${data.d.results[0].name} could not be found.
                                    If you believe this to be an error, please contact Finance on  01452 328904.`, {
                                            title: "Error",
                                            actions: [sap.m.MessageBox.Action.OK]
                                        });
                                        return;
                                    } else {
                                        oInput.setValueState(sap.ui.core.ValueState.None);
                                        oModel.setProperty(path + "/assignedTo", data.d.results[0].name);
                                    }
                                }
                            }.bind(this),
                            error: function (e) {
                                oInput.setValueState(sap.ui.core.ValueState.Error);
                                console.log("error: " + e);
                            }
                        });
                    } else {
                        oInput.setValueState(sap.ui.core.ValueState.Error);
                        sap.m.MessageBox.error(`Cost Center must be numbers only up to 14 digits long`, {
                            title: "Error",
                            actions: [sap.m.MessageBox.Action.OK]
                        });
                        oModel.setProperty(path + "/assignedTo", "");
                        return;
                    }
                }
                else {
                    oInput.setValueState(sap.ui.core.ValueState.None);
                    oModel.setProperty(path + "/assignedTo", "");
                }
            },

            onIoChange: function (oEvent) {
                var oInput = oEvent.getSource();
                var oBindingContext = oInput.getBindingContext("Model1");
                var path = oBindingContext.getPath();
                var oModel = this.getView().getModel("Model1")
                var internalOrder = oInput.getValue();
                var regex = /^[A-Za-z]\d{8,9}$/;
                if (internalOrder) {
                    if (!regex.test(internalOrder)) {
                        oInput.setValueState(sap.ui.core.ValueState.Error);
                        sap.m.MessageBox.error(`Internal order is an invalid format. Must be a Letter followed by 8 or 9 Numbers.`);
                        oModel.setProperty(path + "/internalOrder", "");
                        return;
                    } else {
                        var assignTo = oModel.getProperty("/ioData").find(function (iO) { return internalOrder == iO.customString1 });
                        if (!assignTo) {
                            oInput.setValueState(sap.ui.core.ValueState.Error);
                            sap.m.MessageBox.error(`Internal Order ${internalOrder} could not be found. If you believe this to be an error, please contact Finance on  01452 328904.`);
                            oModel.setProperty(path + "/internalOrder", "");
                            return;
                        } else {
                            oInput.setValueState(sap.ui.core.ValueState.None);
                            oModel.setProperty(path + "/assignedTo", assignTo);
                        }
                    }
                }
            },

            onCcLiveChange: function (oEvent) {
                const val = oEvent.getSource().getValue();
                var oBindingContext = oEvent.getSource().getBindingContext("Model1");
                var path = oBindingContext.getPath();
                var oModel = this.getView().getModel("Model1")
                if (val != "") {
                    oModel.setProperty(path + "/IoEdit", false);
                }
                else {
                    oModel.setProperty(path + "/IoEdit", true);
                }
            },

            onIoLiveChange: function (oEvent) {
                const val = oEvent.getSource().getValue();
                var oBindingContext = oEvent.getSource().getBindingContext("Model1");
                var path = oBindingContext.getPath();
                var oModel = this.getView().getModel("Model1")
                if (val != "") {
                    oModel.setProperty(path + "/CcEdit", false);
                }
                else {
                    oModel.setProperty(path + "/CcEdit", true);
                }
            },

            onVehTypeChange: function (oEvent) {
                var vehicleType = oEvent.getSource().getSelectedItem();
                var oModel = this.getView().getModel("Model1");
                var oBind = oEvent.getSource().getBindingContext("Model1")
                if (!vehicleType) {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
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

            onVehClassChange: function (oEvent) {
                var vehicleClass = oEvent.getSource().getSelectedItem();
                var oModel = this.getView().getModel("Model1");
                var oBind = oEvent.getSource().getBindingContext("Model1")
                if (!vehicleClass) {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                    this._controlMileageRows(oModel, oBind, true, true, false);
                }
                else {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                    oModel.setProperty(oBind.getPath() + "/VehicleClassCode", vehicleClass.getKey());
                    this._controlMileageRows(oModel, oBind, true, true, true);
                }
            },

            onShowPress: function (oEvent) {
                if (!this._oShowDialog) {
                    this._oShowDialog = sap.ui.xmlfragment("com.gcc.eforms.ex02.fragment.Showbut", this);
                    this.getView().addDependent(this._oShowDialog);
                }
                var sPath = oEvent.getSource().getBindingContext("Model1").getPath();
                this.rowId = (Number(sPath.split("Data/")[1]) + 1).toString();
                var commData = this.getView().getModel("Model1").getProperty("/ShowBtnData");
                if (commData == undefined || commData == []) {
                    this.getView().getModel("Model1").setProperty("/ShowBtnData", []);
                }
                else {
                    var commentExist = commData.filter((el) => el.SeqNumber == this.rowId);
                    if (commentExist.length != 0) {
                        this.getView().getModel("Model1").setProperty("/rowComment", commentExist[0].comment);
                    }
                }
                this._oShowDialog.open();
            },

            onShowDialogClose: function () {
                var com = this.getView().getModel("Model1").getProperty("/rowComment");
                var commData = this.getView().getModel("Model1").getProperty("/ShowBtnData");
                var commentExist = commData.filter((el) => el.SeqNumber == this.rowId);
                if (commentExist.length != 0) {
                    for (let i = 0; i < commData.length; i++) {
                        if (commData[i].SeqNumber == commentExist.rowId) {
                            commData.splice(i, 1);
                        }
                    }
                }
                if (com != "") {
                    var temp = {
                        Formid: this.getView().getModel("Model1").getProperty("/FormID"),
                        SeqNumber: this.rowId,
                        comment: com ? com : ""
                    };
                    commData.push(temp);
                    this.getView().getModel("Model1").setProperty("/ShowBtnData", commData);
                    this.getView().getModel("Model1").setProperty("/rowComment", "");
                }
                this._oShowDialog.close();
            },

            onAddRow: function () {
                var oModel = this.getView().getModel("Model1");
                var oProperty = oModel.getProperty("/SecAData");
                var len = oProperty.length;
                if (oProperty[len - 1].NumberOfMiles == "") {
                    MessageBox.error("Kindly enter the complete data first");
                }
                else {
                    this._addEmptyRowSecA(oModel);
                };
            },

            onDelRow: function () {
                var oTable = this.getView().byId("_IDGenTable1");
                var oProperty = this.getView().getModel("Model1").getProperty("/SecAData");
                var aSelectedItems = oTable.getSelectedItems();
                if (oProperty.length == aSelectedItems.length) {
                    this._addEmptyRowSecA(this.getView().getModel("Model1"));
                }
                else {
                    for (var i = aSelectedItems.length - 1; i >= 0; i--) {
                        var oItem = aSelectedItems[i];
                        var iIndex = oTable.indexOfItem(oItem);
                        oProperty.splice(iIndex, 1);
                    }
                    this.getView().getModel("Model1").setProperty("/SecAData", oProperty);
                }
                oTable.removeSelections();
            },

            onAddComment: function () {
                var oComm = this.getView().getModel("Model1").getProperty("/userComm");
                var CommExist = this.getView().getModel("Model1").getProperty("/existComm");
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
                    if (!CommExist) {
                        var oAuthComm = "Comments added by " + name.fullName + " on " + tday[nday] + ", " + ndate + " " + tmonth[nmonth] + " " + nyear + " " + nhour + ":" + nmin + ":" + nsec + " GMT at Status Initial - \n" + oComm;
                    }
                    else {
                        oAuthComm = "Comments added by " + name.fullName + " on " + tday[nday] + ", " + ndate + " " + tmonth[nmonth] + " " + nyear + " " + nhour + ":" + nmin + ":" + nsec + " GMT at Status Initial - \n" + oComm + "\n\n" + CommExist;
                    }
                    this.getView().getModel("Model1").setProperty("/existCommVisibility", true);
                    this.getView().getModel("Model1").setProperty("/existComm", oAuthComm);
                    this.getView().getModel("Model1").setProperty("/userComm", "");
                }
            },

            _updateRefreshToken: function (payload, refresh_token) {
                if (refresh_token && payload.RefreshToken != refresh_token) {
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

            _checkConcur: async function (initiator, oModel, oBind, emplname) {

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
                            var emplEmail = "";
                            await $.ajax({
                                url: prefix + "/odata/v2/UserAccount?$filter=personIdExternal eq '" + initiator + "' &$format=json",
                                type: 'GET',
                                contentType: "application/json",
                                success: function (data) {
                                    if (data.d.results.length == 0) {
                                        MessageBox.error("Email is not maintained for this Employee");
                                        errorFound = true;
                                        this.oBusyDialog.close();
                                        this._controlMileageRows(oModel, oBind, false, false, false);
                                    }
                                    else if (data.d.results[0].email == "") {
                                        MessageBox.error("Email is not maintained for this Employee");
                                        errorFound = true;
                                        this.oBusyDialog.close();
                                        this._controlMileageRows(oModel, oBind, false, false, false);
                                    }
                                    else {
                                        emplEmail = data.d.results[0].email;
                                    }
                                }.bind(this),
                                error: function (e) {
                                    errorFound = true;
                                    this.oBusyDialog.close();
                                    this._controlMileageRows(oModel, oBind, false, false, false);
                                }.bind(this)
                            });

                            if (emplEmail != "") {
                                var url1 = prefix + "/profile/identity/v4/Users?filter=userName eq \"" + emplEmail + concurDetails.UsernameSuffix + "\"";
                                var settings = {
                                    "url": url1,
                                    // "method": "GET",
                                    // "timeout": 0,
                                    "headers": {
                                        "Authorization": "Bearer " + response.access_token,
                                    },
                                };
                                // $.support.cors = true; // comment for testing in preview
                                // await $.ajax(settings).done(function (response) {
                                //     if (response.Resources.length == 0) {
                                //         errorFound = true;
                                //         MessageBox.error(`The employee ${emplname} does not have an account and hence a claim cannot be created for them. Please contact ContactUs on 01452 425888 for this employee before entering expenses for them.`);
                                //         this._controlMileageRows(oModel, oBind, false, false, false);
                                //     }
                                //     else { // till here
                                        errorFound = false;
                                        oModel.setProperty(oBind.getPath() + "/email", emplEmail + concurDetails.UsernameSuffix);
                                        this._controlMileageRows(oModel, oBind, true, false, false);
                                    // } // comment this for testing in preview
                                    this.oBusyDialog.close();
                                // }.bind(this)).fail(function (error) { // comment for testing in preview
                                //     errorFound = true;
                                //     this.oBusyDialog.close();
                                //     this._controlMileageRows(oModel, oBind, false, false, false);
                                // }.bind(this)); // comment till here
                            }
                        }.bind(this)).fail(function (XMLHttpRequest, textStatus) {
                            errorFound = true;
                            MessageBox.error(`Some error occurred. Please try again`);
                            this.oBusyDialog.close();
                            this._controlMileageRows(oModel, oBind, false, false, false);
                        }.bind(this));
                    }.bind(this),
                    error: function (resp) {
                        errorFound = true;
                        this.oBusyDialog.close();
                        this._controlMileageRows(oModel, oBind, false, false, false);
                    }.bind(this)
                });
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

            onCancel: function () {
                MessageBox.warning(`This will discard all the changes done.
            Do you wish to proceed?`, {
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    emphasizedAction: MessageBox.Action.YES,
                    onClose: function (sAction) {
                        if (sAction == MessageBox.Action.YES) {
                            window.history.go(-1);
                        }
                    }
                });

            },

            onSave: function () {
                sap.ui.core.BusyIndicator.show();
                var Request_Payload = this._payload("I", "", false);
                this.getOwnerComponent().getModel("S4hService").create("/zsf_ex02_hSet", Request_Payload,
                    {
                        success: function (oData) {
                            sap.ui.core.BusyIndicator.hide()
                            MessageBox.success(`Form: ${this.formId} is saved successfully!`);
                            var initiator = this.getView().getModel("Model1").getProperty("/initNameP")
                            this._logCreation("E");
                            sap.ui.core.BusyIndicator.hide();
                        }.bind(this),
                        error: function (resp) {
                            console.log("Error S4h")
                            sap.ui.core.BusyIndicator.hide()
                            MessageBox.error(`Form could not be submitted because ${JSON.parse(resp.responseText).error.message.value}`);
                        }
                    });
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
                                this._oMessage = sap.ui.xmlfragment("com.gcc.eforms.ex02.fragment.logMessage", this);
                                this.getView().addDependent(this._oMessage);
                                this._oMessage.open();
                                sap.ui.core.BusyIndicator.hide();
                            }
                            else {
                                this.getOwnerComponent().getModel("S4hService").create("/zsf_ex02_hSet", Request_Payload,
                                    {
                                        success: function (oData) {
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
                });
            },

            onPrint: function () {

                sap.ui.core.BusyIndicator.show();
                var Request_Payload = this._payload("P", "", false);
                this.getOwnerComponent().getModel("S4hService").create("/zsf_ex02_hSet", Request_Payload,
                    {
                        success: function (oData) {
                            sap.ui.core.BusyIndicator.hide();
                            var s4url = this.getOwnerComponent().getModel("S4hService").sServiceUrl;    // Give your service name
                            var sSource = s4url + "/zsf_ex02_printSet(Formid='" + this.formId + "')/$value";
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

            onDelete: function () {
                MessageBox.warning(`Delete the data in this form and any saved draft version of this form`, {
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    emphasizedAction: MessageBox.Action.YES,
                    onClose: function (sAction) {
                        if (sAction == MessageBox.Action.YES) {
                            sap.ui.core.BusyIndicator.show();
                            this.getOwnerComponent().getModel("S4hService").remove("/zsf_ex02_hSet('" + this.formId + "')",
                                {
                                    success: function (oData) {
                                        sap.ui.core.BusyIndicator.hide()
                                        this._logCreation("D");
                                        MessageBox.success(`Form: ${this.formId} deleted Successfully!`, {
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
                                        console.log(JSON.parse(resp.responseText));
                                        sap.ui.core.BusyIndicator.hide();
                                        MessageBox.error(`Form could not be deleted because ${JSON.parse(resp.responseText).error.message.value}`);
                                    }
                                });
                        }
                    }.bind(this)
                });
            },

            _payload: function (purpose, delInd, isSubmit) {

                var checkAtleastOneAllowance = false;
                var oModel = this.getView().getModel("Model1");
                oModel.setProperty("/MessageLog", []);

                // checking all the required fields in the form if it is submitted
                if (isSubmit) {
                    var errorFlag = false;
                    if (oModel.getProperty("/SecAData").length == 1 && oModel.getProperty("/SecAData")[0].empName == "") {
                        errorFlag = true;
                        this._messLog("A claim form must have at least one claim item");
                    }
                    else {
                        var aControls = this.getView().getControlsByFieldGroupId("checkReqFields");
                        aControls.forEach(function (oControl) {
                            if (oControl.getId != undefined && (oControl.getId().includes("input") || oControl.getId().includes("datepicker") || oControl.getId().includes("box"))) {
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
                }
                if (errorFlag) {
                    return "";
                }
                else {
                    var SecAData = oModel.getProperty("/SecAData");
                    var secA = [];
                    for (let i = 0; i < SecAData.length; i++) {
                        checkAtleastOneAllowance = true;
                        var temp = {
                            "Formid": this.formId,
                            "SeqNumber": (SecAData[i].counter).toString(),
                            "Employee": SecAData[i].empName,
                            "Perid": SecAData[i].PersonID != "" ? SecAData[i].PersonID : "",
                            "Userid": SecAData[i].userId,
                            "JobTitle": SecAData[i].jobTitle,
                            "Email": SecAData[i].email,
                            "PositionCode": SecAData[i].jobTitle,
                            "VehicleType": SecAData[i].VehicleType,
                            "VehicleTypeCode": SecAData[i].VehicleTypeCode != "" ? SecAData[i].VehicleTypeCode : "",
                            "VehTypeEnab": SecAData[i].enableVehicleType ? "X" : "",
                            "VehicleClass": SecAData[i].VehicleClass,
                            "VehClassCode": SecAData[i].VehicleClassCode != "" ? SecAData[i].VehicleClassCode : "",
                            "VehClassEnab": SecAData[i].enableVehicleClass ? "X" : "",
                            "CostCentre": SecAData[i].costCentre ? SecAData[i].costCentre : "",
                            "InternalOrder": SecAData[i].internalOrder ? SecAData[i].internalOrder : "",
                            "AssignTo": SecAData[i].assignedTo ? SecAData[i].assignedTo : "",
                            "MilesEnab": SecAData[i].enableMiles ? "X" : "",
                            "NoOfMiles": SecAData[i].NumberOfMiles != "" ? SecAData[i].NumberOfMiles : "",
                            // "Amount": SecAData[i].Amount != "" ? SecAData[i].Amount : this._messLog("A", "Amount"),
                            // "AmountEnab": SecAData[i].enableAmount ? "X" : ""
                        }
                        secA.push(temp);
                    }

                    var commentData = oModel.getProperty("/ShowBtnData");

                    var Request_Payload = {
                        "Formid": this.formId,
                        "Initiator": oModel.getProperty("/initNameP/salutationLabel") + " " + oModel.getProperty("/initNameP/fullName"),
                        "Zdate": this._dateForS4(oModel.getProperty("/FormStartDate")),
                        "DateInt": this._dateToReq(oModel.getProperty("/FormStartDate")),
                        "OrganizationName": oModel.getProperty("/OrgNameP"),
                        "OrgCode": oModel.getProperty("/selectedOrg"),
                        "CostCentre": oModel.getProperty("/CostCentreP/costCenter"),
                        "CostCentreCode": oModel.getProperty("/CostCentreP/costCenter"),
                        "ClaimMonth": oModel.getProperty("/ClaimMonth"),
                        "ClaimMonthInt": oModel.getProperty("/ClaimMonthKey"),
                        "ClaimEndDate": this._dateForS4(oModel.getProperty("/ClaimEndDate")),
                        "ClaimEndDateInt": this._dateToReq(oModel.getProperty("/ClaimEndDate")),
                        "ClaimStartDate": this._dateForS4(oModel.getProperty("/ClaimStartDate")),
                        "ClaimStartDateInt": this._dateToReq(oModel.getProperty("/ClaimStartDate")),
                        "DelIndicator": delInd,
                        "Purpose": purpose,
                        "hdr_to_mil_cl_nav": secA,
                        "hdr_to_comm_nav": [{
                            "Formid": this.formId,
                            "comment": oModel.getProperty("/existComm") ? oModel.getProperty("/existComm") : "",
                        }],
                        "hdr_to_comm_row_nav": commentData != undefined ? commentData : []
                    }
                }

                return Request_Payload;
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

            _dateToReq: function (date) {
                var date1 = new Date(date);
                var dd = (date1.getDate()).toString();
                var mm = (date1.getMonth() + 1).toString();
                var yy = (date1.getFullYear()).toString();
                if (dd.length == 1) { dd = "0" + dd };
                if (mm.length == 1) { mm = "0" + mm };

                return yy + "-" + mm + "-" + dd;
            },

            _triggerWorkflow: function () {
                var user = this.getView().getModel("Model1").getProperty("/user");
                var appUrl = window.location.origin + "/site" + window.location.search.split("&")[0] + window.location.hash.split("?")[0];
                var reqUrl = appUrl.includes("GCC_SemObj") ? appUrl + "&/?formId=" : appUrl + "#?formId=";
                var payload = {
                    "definitionId": "eu10.gccdev.eforms.EX02N",
                    "context": {
                        "FormID": this.formId,
                        "initiator": user.email
                    }
                }
                var sURL = prefix + "/workflow/rest/v1/workflow-instances";
                $.support.cors = true;
                $.ajax(sURL, {
                    method: "POST",
                    data: JSON.stringify(payload),
                    crossDomain: true,
                    contentType: "application/json"
                }).done(function (data, textStatus, jqXHR) {
                    $.support.cors = true;
                    if (data) {
                        console.log("Workflow has been triggered and Form has been Submitted");
                        sap.ui.core.BusyIndicator.hide()
                        this._logCreation("S");
                        MessageBox.success(`Form: ${this.formId} is submitted successfully
                            
                            Please call ContactUs on 01452 425888 should you have any queries regarding this e-Form.`, {
                            actions: [MessageBox.Action.OK],
                            emphasizedAction: MessageBox.Action.OK,
                            onClose: function (sAction) {
                                if (sAction == MessageBox.Action.OK) {
                                    window.history.go(-1);
                                }
                            }
                        });
                    }
                }.bind(this)).fail(function (e, textStatus) {
                    MessageBox.error(`Workflow was not triggered because ${e.responseText}`);
                    sap.ui.core.BusyIndicator.hide();
                });
            },

            onMessageClose: function () {
                this._oMessage.close();
            },

            onTabChange: function (oEvent) {
                if (oEvent.getParameter("key") == "History") {
                    var oModel = this.getView().getModel("Model1");
                    var oFilter = new sap.ui.model.Filter('Formid', sap.ui.model.FilterOperator.EQ, this.formId);
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
            }
        });
    });
