sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/core/routing/History"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, MessageBox, History) {
        "use strict";
        var personid = "", managerId = "", initiatorCode = "";
        var serviceUrl = ""

        return Controller.extend("com.gcc.claimsqa.cf01qa.controller.View1", {
            onInit: function () {
                var link = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("SchoolsnetLink")
                var text = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("IntroText1")
                this.getView().byId("_IDGenFormattedText1").setHtmlText("<p>" + text + "<a title=" + link + " href=\"" + link + "\"</a> e-Forms Pages.</p>")
                serviceUrl = sap.ui.require.toUrl(this.getOwnerComponent().getManifestEntry('/sap.app/id').replaceAll('.', '/'));
                this.getOwnerComponent().getRouter().getRoute("RouteView1").attachPatternMatched(this._onRouteMatched, this);
            },
            getBaseURL: function () {
                var appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
                var appPath = appId.replaceAll(".", "/");
                var appModulePath = jQuery.sap.getModulePath(appPath);
                return appModulePath;
            },

            _getEmplData: async function (orgCode, LastDateISO, FirstDateISO) {

                var terminated, retired, suspended, discarded, reportedNoShow;
                await $.ajax({
                    url: serviceUrl + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'employee-status' and status eq 'A'&$format=json",
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
                    url: serviceUrl + `/odata/v2/EmpJob?$filter=customString3 eq '${orgCode}' and emplStatus ne '${discarded}' and emplStatus ne '${terminated}' and emplStatus ne '${retired}' and emplStatus ne '${suspended}' and emplStatus ne '${reportedNoShow}' and endDate gt datetime'${FirstDateISO}T00:00:00'&toDate=${LastDateISO}&$format=json`,
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
                        url: serviceUrl + "/odata/v2/EmpEmployment?$filter=userId eq '" + employeeData[i].userId + "' &$format=json",
                        type: 'GET',
                        contentType: "application/json",
                        success: function (data) {
                            var empl = data;
                            $.ajax({
                                url: serviceUrl + "/odata/v2/PerPersonal?$filter=personIdExternal eq '" + empl.d.results[0].personIdExternal + "'&$format=json",
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
                                        this.getView().getModel("oneModel1").setProperty("/dropdownEmp", EmpData);
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

            unixDateRegex: function (date1) {
                const regex = /\/Date\((.*?)\)\//;
                const match = regex.exec(date1);
                return Number(match[1]);
            },

            emplData: async function (orgName) {

                var terminated, retired, suspended, discarded;
                await $.ajax({
                    url: serviceUrl + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'employee-status' and status eq 'A'&$format=json",
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
                        }
                    },
                    error: function (e) {
                        console.log(`Error: ${JSON.parse(e.responseText)}`);
                    }
                });

                var sub05, sub21;
                await $.ajax({
                    url: serviceUrl + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'employee-type' and status eq 'A'&$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        for (let a = 0; a < data.d.results.length; a++) {
                            if (data.d.results[a].externalCode == "05") {
                                sub05 = data.d.results[a].optionId;
                            }
                            if (data.d.results[a].externalCode == "21") {
                                sub21 = data.d.results[a].optionId;
                            }
                        }
                    },
                    error: function (e) {
                        console.log(`Error: ${JSON.parse(e.responseText)}`);
                    }
                });

                $.ajax({
                    url: serviceUrl + `/odata/v2/EmpJob?$filter=customString3 eq '${orgName}' and emplStatus ne '${discarded}' and emplStatus ne '${terminated}' and emplStatus ne '${retired}' and emplStatus ne '${suspended}' and employmentType ne '${sub05}' and employmentType ne '${sub21}'&$format=json`,
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        var temp1 = data;
                        var claimEnd = this.getView().byId("DP12").getValue();
                        claimEnd = claimEnd == "" ? new Date().toISOString().split('T')[0] : claimEnd.split('-')[2] + "-" + claimEnd.split('-')[1] + "-" + claimEnd.split('-')[0];
                        var EmpData = [];
                        for (let i = 0; i < temp1.d.results.length; i++) {
                            $.ajax({
                                url: serviceUrl + "/odata/v2/EmpEmployment?$filter=userId eq '" + temp1.d.results[i].userId + "' &$format=json",
                                type: 'GET',
                                contentType: "application/json",
                                success: function (data) {
                                    var empl = data;
                                    $.ajax({
                                        url: serviceUrl + "/odata/v2/PerPersonal?$filter=personIdExternal eq '" + empl.d.results[0].personIdExternal + "' and startDate le datetime'" + claimEnd + "T00:00:00'&$format=json",
                                        type: 'GET',
                                        contentType: "application/json",
                                        success: function (data) {
                                            if (data.d.results.length > 0) {
                                                var temp = {
                                                    firstName: data.d.results[0].firstName,
                                                    lastName: data.d.results[0].lastName,
                                                    userId: temp1.d.results[i].userId,
                                                    personIdExternal: empl.d.results[0].personIdExternal,
                                                    jobTitle: temp1.d.results[i].jobTitle
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
                                                this.getView().getModel("oneModel1").setProperty("/dropdownEmp", EmpData);
                                            }
                                        }.bind(this),
                                        error: function () {

                                        }
                                    });
                                }.bind(this),
                                error: function (e) {
                                    console.log("error: " + e);
                                    sap.ui.core.BusyIndicator.hide();
                                }
                            });
                        }
                    }.bind(this),
                    error: function () {

                    }
                });
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

                        var data = [];
                        var oneModel = new JSONModel(data);
                        this.getView().setModel(oneModel, "oneModel1");

                        // getting months dropdown
                        var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                        var today = new Date();
                        var currentMonthIndex = today.getMonth();
                        var reqMonths = [];
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
                            reqMonths.push(temp);
                        }
                        this.loadingPicklists();
                        this.getView().getModel("oneModel1").setProperty("/Months", reqMonths);
                        var query = oEvent.getParameter('arguments')["?query"];
                        // var oComponent = this.getOwnerComponent();
                        // var oRouter = oComponent.getRouter();
                        // var oArgs = oRouter.getHashChanger().getHash().split("/");
                        // var sMode = oArgs[1];
                        var that = this;
                        if (query != undefined) {

                            if (query.mode == "display") {
                                this.getView().byId("_IDGenButton1").setVisible(false);
                                this.getView().byId("IdSave").setVisible(false);
                            }
                            this.getView().getModel("oneModel1").setProperty("/form", query);
                            var formid = query.formId;
                            this.S4Services(that, formid, useremail, personid);

                        }
                        else {
                            var oModel = this.getView().getModel("oneModel1");
                            var temp = {
                                formId: "",
                                mode: ""
                            }
                            oModel.setProperty("/form", temp);

                            this.SFServices(that, useremail, personid);

                            var secAData = [{
                                counter: 1,
                                empName: "",
                                PersonID: "",
                                jobTitle: "",
                                CustomString1: "",
                                PayComponentCode: "",
                                NumberOfUnits: "",
                                Value: "",
                                enableRate: false,
                                enableUnit: false
                            }];
                            this.getView().getModel("oneModel1").setProperty("/finalData", secAData);

                            var secBData = [{
                                counter: 1,
                                empName: "",
                                PersonID: "",
                                jobTitle: "",
                                CustomString1: "",
                                PayComponentCode: "",
                                NumberOfUnits: "",
                                Value: "",
                                enableRate: false,
                                enableUnit: false
                            }];
                            this.getView().getModel("oneModel1").setProperty("/finalDataSecB", secBData);
                        }
                    });
            },

            loadingPicklists: function () {
                $.ajax({
                    url: serviceUrl + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'employee-type' and status eq 'A'&$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        this.getView().getModel("oneModel1").setProperty("/EmpSubGrp", data.d.results);
                    }.bind(this),
                    error: function (e) {
                        console.log("error: " + e);
                    }
                });
            },

            SFServices: async function (that, useremail, personid) {

                await this.getOwnerComponent().getModel("ZSFGTGW_CF01_SRV").read("/zsf_cf01_formidSet",
                    {
                        success: function (oData) {
                            // MessageBox.success("Saved successfully");
                            that.getView().byId("idFormId").setValue(oData.results[0].Formid)

                        }.bind(this),
                        error: function (oData) {
                            MessageBox.error("Some error occured. Please try again");
                        }
                    });
                var email;
                await $.ajax({
                    url: serviceUrl + "/odata/v2/PerEmail?$filter=emailAddress eq '" + useremail + "' &$format=json",
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
                    url: serviceUrl + "/odata/v2/PerPerson(personIdExternal='" + email.d.results[0].personIdExternal + "')/personalInfoNav?$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        var initDetails = {
                            email: email.d.results[0].emailAddress,
                            personIdExternal: email.d.results[0].personIdExternal,        //first name, last name Etc.
                            fullName: data.d.results[0].firstName + " " + data.d.results[0].lastName
                        }
                        personid = email.d.results[0].personIdExternal;
                        initiatorCode = email.d.results[0].personIdExternal;
                        this.getView().getModel("oneModel1").setProperty("/user", initDetails);
                    }.bind(this),
                    error: function (data) {
                        console.log("error" + data)
                    }
                });

                this.getView().byId("IDDate").setDateValue(new Date());
                this.getOwnerComponent().getModel("ZSFGTGW_CF01_SRV").read("/zsf_cf01_comment_rowSet?$filter=Formid eq '" + that.getView().byId("idFormId").getValue() + "' &$format=json",
                    {
                        success: function (oData) {
                            this.getView().getModel("oneModel1").setProperty("/ShowBtn", oData)
                        }.bind(this)
                    });
                var userId1 = this.getView().getModel("oneModel1").getProperty("/user").personIdExternal;
                var modelDate, actualDate;
                await $.ajax({
                    url: serviceUrl + "/odata/v2/PerPerson(personIdExternal='" + userId1 + "')/personalInfoNav?$format=json",
                    type: 'GET',
                    contentType: "application/json", //first name, last name Etc.
                    success: function (data) {
                        that.getView().getModel("oneModel1").setProperty("/personalInfo", data);
                        modelDate = data.d.results[0].startDate;
                        actualDate = that.dateToAjax(modelDate);
                    }
                });
                await $.ajax({
                    url: serviceUrl + "/odata/v2/PerPersonal(personIdExternal='" + userId1 + "',startDate=datetime'" + actualDate + "')/salutationNav/picklistLabels?$format=json",
                    type: 'GET',
                    contentType: "application/json", // salutation
                    success: function (data) {
                        that.getView().getModel("oneModel1").setProperty("/salutation", data);
                    }
                });

                $.ajax({
                    url: serviceUrl + "/odata/v2/UserAccount?$format=json&$filter=personIdExternal eq '" + userId1 + "'",
                    type: 'GET',
                    contentType: "application/json", //job Info
                    success: function (data) {
                        console.log("success user account");
                        $.ajax({
                            url: serviceUrl + "/odata/v2/cust_ZFLM_MULTI_USERS?$filter=cust_UserName eq '" + data.d.results[0].username + "'&$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: async function (data) {
                                console.log("success" + data);
                                if (data.d.results.length != 0) {
                                    var cust_Value = data.d.results[0].cust_Value.split(",");
                                    var val = [];
                                    cust_Value.forEach(async function (item) {
                                        $.ajax({
                                            url: serviceUrl + "/odata/v2/cust_PersonnelArea?$filter= externalCode eq '" + item + "'&$format=json",
                                            type: 'GET',
                                            contentType: "application/json",
                                            success: function (data) {
                                                var req = {
                                                    key: item,
                                                    value: data.d.results[0].externalName + " (" + item + ")"
                                                };
                                                val.push(req);
                                                var req1 = {
                                                    d: {
                                                        results: [{
                                                            customString3: ""
                                                        }]
                                                    }
                                                };
                                                that.getView().getModel("oneModel1").setProperty("/jobInfo", req1);
                                                that.getView().getModel("oneModel1").setProperty("/OrgValues", val);
                                            },
                                            error: function () {
                                                console.log("Error in Assigning Multiple Personnel Area");
                                            }
                                        });
                                    });
                                } else {
                                    that.getView().byId("idOrgName").setEditable(false);
                                    await $.ajax({
                                        url: serviceUrl + "/odata/v2/EmpEmployment(personIdExternal='" + userId1 + "',userId='" + userId1 + "')/jobInfoNav?$format=json",
                                        type: 'GET',
                                        contentType: "application/json", //job Info
                                        success: function (data) {
                                            var temp = data.d.results[0].customString3;
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
                                            managerId = data.d.results[0].managerId;
                                            // that.emplData(data.d.results[0].customString3);
                                            $.ajax({
                                                url: serviceUrl + "/odata/v2/cust_PersonnelArea?$filter= externalCode eq '" + data.d.results[0].customString3 + "'&$format=json",
                                                type: 'GET',
                                                contentType: "application/json",
                                                success: function (data) {
                                                    that.getView().byId("idOrgName").setSelectedKey(temp);
                                                    var req = {
                                                        d: {
                                                            results: [{
                                                                customString3: data.d.results[0].externalName + " (" + temp + ")"
                                                            }]
                                                        }
                                                    };
                                                    that.getView().getModel("oneModel1").setProperty("/jobInfo", req);
                                                    var initiator = that.getView().getModel("oneModel1").getProperty("/personalInfo");
                                                    that._logCreation("I", initiator.d.results[0].firstName + " " + initiator.d.results[0].lastName, "");
                                                },
                                                error: function () {
                                                    console.log("Error in Assigning Multiple Personnel Area");
                                                }
                                            });
                                        }
                                    });
                                }

                            }.bind(this),
                            error: function () {
                                console.log("Error in fetching Multiple Organization");
                            }
                        });
                    },
                    error: function () {
                        console.log("Error in fetching Multiple Organization");
                    }
                });




                $.ajax({
                    url: serviceUrl + "/odata/v2/User('" + userId1 + "')/workerOfEmpCostAssignmentNav?$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        var effectiveStartDate = data.d.results[0].effectiveStartDate;
                        effectiveStartDate = this.dateToAjax(effectiveStartDate);

                        var url = serviceUrl + "/odata/v2/EmpCostAssignment(effectiveStartDate=datetime'" + effectiveStartDate + "',worker='" + userId1 + "')/items?$format=json"
                        $.ajax({
                            url: url,
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                                this.getView().byId("idCostCentre").setValue(data.d.results[0].costCenter);
                            }.bind(this),
                            error: function (data) {
                                console.error("Error" + data);
                            }
                        });
                    }.bind(this),
                    error: function (data) {
                        console.log("Error" + data);
                    }
                });
            },

            S4Services: async function (that, formid, useremail, oModel, personid) {

                var email;
                await $.ajax({
                    url: serviceUrl + "/odata/v2/PerEmail?$filter=emailAddress eq '" + useremail + "' &$format=json",
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
                    url: serviceUrl + "/odata/v2/PerPerson(personIdExternal='" + email.d.results[0].personIdExternal + "')/personalInfoNav?$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        var initDetails = {
                            email: email.d.results[0].emailAddress,
                            personIdExternal: email.d.results[0].personIdExternal,        //first name, last name Etc.
                            fullName: data.d.results[0].firstName + " " + data.d.results[0].lastName
                        }
                        personid = email.d.results[0].personIdExternal;
                        initiatorCode = email.d.results[0].personIdExternal;
                        that.getView().getModel("oneModel1").setProperty("/user", initDetails)
                    }.bind(this),
                    error: function (data) {
                        console.log("error" + data)
                    }
                });

                this.getOwnerComponent().getModel("ZSFGTGW_CF01_SRV").read("/zsf_cf01_hSet('" + formid + "')",
                    {
                        success: function (oData) {
                            var personal = oData.Initiator.split(" ");
                            var person = {
                                "d": {
                                    "results": [
                                        {
                                            "salutation": personal[0],
                                            "firstName": personal[1],
                                            "lastName": personal[2]
                                        }
                                    ]
                                }
                            }
                            that.getView().getModel("oneModel1").setProperty("/personalInfo", person);
                            var job = {
                                "d": {
                                    "results": [
                                        {
                                            "customString3": oData.OrganisationName
                                        }
                                    ]
                                }
                            }
                            var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
                            var FirstDateISO = dateFormat.format(new Date(Number(oData.ClaimMonth.split(" ")[1]), that.monthToNumber(oData.ClaimMonth.split(" ")[0]), 1));
                            var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-dd-MM" });
                            var LastDateISO = dateFormat.format(new Date(Number(oData.ClaimMonth.split(" ")[1]), that.monthToNumber(oData.ClaimMonth.split(" ")[0]) + 1, 0));
                            that._getEmplData(oData.OrganisationName.split("(")[1].split(")")[0], LastDateISO, FirstDateISO);
                            that.getView().getModel("oneModel1").setProperty("/jobInfo", job);
                            that.getView().byId("idCostCentre").setValue(oData.CostCenter);
                            that.getView().byId("_IDGenComboBox1").setValue(oData.ClaimMonth);
                            that.getView().byId("idFormId").setValue(oData.Formid);
                            that.getView().byId("IDDate").setValue(oData.Ardate);
                            that.getView().byId("DP12").setValue(oData.ClaimEndDate);
                            that.getView().byId("checkbox1").setSelected(oData.Notify == "X" ? true : false);
                        }.bind(this),
                        error: function (oData) {
                            console.log("error in Object");
                        }
                    });
                this.getOwnerComponent().getModel("ZSFGTGW_CF01_SRV").read("/zsf_cf01_comment_rowSet?$filter=Formid eq '" + formid + "' &$format=json",
                    {
                        success: function (oData) {
                            this.getView().getModel("oneModel1").setProperty("/ShowBtn", oData)
                        }.bind(this)
                    });
                this.getOwnerComponent().getModel("ZSFGTGW_CF01_SRV").read("/zsf_cf01_hSet('" + formid + "')/hdr_to_sec_a_nav",
                    {
                        success: function (oData) {
                            var secAData = [];
                            for (let i = 0; i < oData.results.length; i++) {
                                var secA = {
                                    empName: oData.results[i].EmployeeName,
                                    PersonID: oData.results[i].Perid,
                                    PayComponentCode: oData.results[i].WageTypeCode + " - " + oData.results[i].WageTypeTxt,
                                    Value: oData.results[i].Amount,
                                    NumberOfUnits: oData.results[i].Unit,
                                    enable: true
                                }
                                secAData.push(secA);
                            }
                            that.getView().getModel("oneModel1").setProperty("/finalData", secAData)
                        },
                        error: function () {

                        }
                    });

                this.getOwnerComponent().getModel("ZSFGTGW_CF01_SRV").read("/zsf_cf01_hSet('" + formid + "')/hdr_to_sec_b_nav",
                    {
                        success: function (oData) {
                            var secBData = [];
                            for (let i = 0; i < oData.results.length; i++) {
                                var secB = {
                                    empName: oData.results[i].EmployeeName,
                                    PersonID: oData.results[i].Perid,
                                    PayComponentCode: oData.results[i].WageTypeCode + " - " + oData.results[i].WageTypeTxt,
                                    Value: oData.results[i].Amount,
                                    NumberOfUnits: oData.results[i].Unit
                                }
                                secBData.push(secB);
                            }
                            that.getView().getModel("oneModel1").setProperty("/finalDataSecB", secBData)
                        },
                        error: function () {

                        }
                    });

                this.getOwnerComponent().getModel("ZSFGTGW_CF01_SRV").read("/zsf_cf01_hSet('" + formid + "')/hdr_to_comm_nav?$format=json", {
                    success: function (oData) {
                        if (oData.results.length > 0) {
                            var comm = "";
                            for (let i = 0; i < oData.results.length; i++) {
                                comm += oData.results[i].comment + "\n";
                            }
                            this.getView().byId("_IDGenTextArea2").setValue(comm);
                            this.getView().byId("_IDGenTextArea2").setVisible(true);
                            this.getView().byId("_IDGenLabel8").setVisible(true);
                        }
                    }.bind(this),
                    error: function (oData) {
                        console.log("Error S4h")
                    }
                });
            },

            dateToAjax: function (date2) {

                // getting the epoch date from model date
                const regex = /\/Date\((.*?)\)\//;
                const match = regex.exec(date2);
                var epochDate = match[1];

                //converting str to int
                var newDate = parseInt(epochDate, 10);

                //converting epoch to human readable
                const date = new Date(newDate);

                var year = date.getUTCFullYear();
                var month = date.getUTCMonth() + 1;
                var day = date.getUTCDate();
                var hours = date.getUTCHours();
                var minutes = date.getUTCMinutes();
                var seconds = date.getUTCSeconds();


                if (month < 10) {
                    month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
                }
                if (day < 10) {
                    day = date.getUTCDate().toString().padStart(2, '0');
                }
                if (hours < 10) {
                    hours = date.getUTCHours().toString().padStart(2, '0');
                }
                if (minutes < 10) {
                    minutes = date.getUTCMinutes().toString().padStart(2, '0');
                }
                if (seconds < 10) {
                    seconds = date.getUTCSeconds().toString().padStart(2, '0');
                }
                const actualDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
                return actualDate;
            },

            onOrgChange: function (oEvent) {
                // var that = this;
                // if (oEvent.getSource().getSelectedItem() == null) {
                //     MessageBox.error("Please select a valid Organization");
                //     oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                // }
                // else {
                //     oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                //     var orgName = oEvent.getSource().getSelectedItem().getKey();
                //     this.emplData(orgName);
                // }

                if (oEvent.getSource().getSelectedItem() != null) {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                    var sMonthIndex = this.getView().byId("_IDGenComboBox1").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox1").getSelectedItem().getKey() : this.getView().byId("_IDGenComboBox1").getSelectedKey();
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
                    }
                }
                else {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                }
            },

            onEmplChange: function (oEvent) {
                var emp1 = oEvent.getSource().getSelectedItem();
                if (emp1 == null) {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                    oEvent.getSource().setValueStateText("Employee Name is required.");
                }
                else {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                    var oBind = oEvent.getSource().getBindingContext("oneModel1")
                    this.getView().getModel("oneModel1").setProperty(oBind.getPath() + "/PayComponentCode", "");
                    this.getView().getModel("oneModel1").setProperty(oBind.getPath() + "/Value", "");
                    this.getView().getModel("oneModel1").setProperty(oBind.getPath() + "/NumberOfUnits", "");
                    this.getView().getModel("oneModel1").setProperty(oBind.getPath() + "/enableUnit", false);
                    this.getView().getModel("oneModel1").setProperty(oBind.getPath() + "/enableRate", false);
                    var emp = emp1.getKey();
                    this.getView().getModel("oneModel1").setProperty(oBind.getPath() + "/PersonID", emp);
                    $.ajax({
                        url: serviceUrl + "/odata/v2/EmpJob?$filter=userId eq '" + emp + "'&$format=json",
                        type: 'GET',
                        contentType: "application/json",
                        success: function (data) {
                            var personnelArea = data.d.results[0].customString3;
                            var perSubArea = data.d.results[0].customString4;
                            var subGroupCode = data.d.results[0].employmentType
                            var subGroup = that.getView().getModel("oneModel1").getProperty("/EmpSubGrp").filter((el) => el.optionId == subGroupCode)[0].externalCode;
                            var url = serviceUrl + "/odata/v2/cust_ZFLM_WAGTYPES_SC?$filter=externalName eq '" + personnelArea + "' and cust_PersSubarea eq '" + perSubArea + "' and cust_ESG eq '" + subGroup + "' and cust_FSection eq 'A' &$format=json";
                            $.ajax({
                                url: url,
                                type: 'GET',
                                contentType: "application/json",
                                success: function (data) {
                                    var wageDrop = [];
                                    if (data.d.results.length == 0) {
                                        this.getView().getModel("oneModel1").setProperty("/dropdownWage", wageDrop);
                                    }
                                    else {
                                        var wage = data;
                                        this.wageCheck(wage, date1);
                                        for (let i = 0; i < data.d.results.length; i++) {
                                            $.ajax({
                                                url: serviceUrl + "/odata/v2/FOPayComponent?$filter=externalCode eq '" + data.d.results[i].cust_WageType + "' &$format=json",
                                                type: 'GET',
                                                contentType: "application/json",
                                                success: function (data) {
                                                    wageDrop.push(data.d.results[0]);
                                                    wageDrop.sort((a, b) => {
                                                        // sort by code
                                                        if (a.externalCode < b.externalCode) return -1;
                                                        if (a.externalCode > b.externalCode) return 1;
                                                    })
                                                    this.getView().getModel("oneModel1").setProperty("/dropdownWage", wageDrop);
                                                }.bind(this),
                                                error: function (data) {
                                                    console.log("error");
                                                }
                                            });
                                        }
                                    }
                                }.bind(this),
                                error: function () {
                                    console.log("error")
                                }
                            });
                        }.bind(this),
                        error: function () {

                        }
                    });
                }
                // $.ajax({
                //     url: "/odata/v2/EmpEmployment(personIdExternal='" + emp + "',userId='" + emp + "')?$format=json",
                //     type: 'GET',
                //     contentType: "application/json",
                //     success: function (data) {
            },

            wageCheck: function (wage, date) {
                for (let i = 0; i < wage.d.results.length; i++) {
                    if (wage.d.results[i].cust_MinYears == "X") {

                    }
                }
            },

            _logCreation: async function (status, formOwner, formOwnerCode) {

                if (formOwnerCode != "") {
                    if (formOwnerCode != "NO_MANAGER") {
                        await $.ajax({
                            url: serviceUrl + "/odata/v2/PerPerson(personIdExternal='" + formOwnerCode + "')/personalInfoNav?$format=json",
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

                var initiator = this.getView().getModel("oneModel1").getProperty("/personalInfo").d.results[0]
                var log_payload = {
                    "Formid": this.getView().byId("idFormId").getValue(),
                    "StartedOn": this.getView().byId("IDDate").getValue(),
                    "Status": status,
                    "Type": "CF01",
                    "OrganizationName": this.getView().getModel("oneModel1").getProperty("/jobInfo").d.results[0].customString3,
                    "Initiator": initiator.firstName + " " + initiator.lastName,
                    "InitCode": initiatorCode,
                    "Description": "Schools Claims Form",
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

            onPerChange: function (oEvent) {
                var oBind = oEvent.getSource().getBindingContext("oneModel1");
                var userId = oBind.getProperty("PersonID");
                var sPath = oBind.getPath();
                var oModel = this.getView().getModel("oneModel1");
                oModel.setProperty(sPath + "/PayComponentCode", "");
                oModel.setProperty(sPath + "/Value", "");
                oModel.setProperty(sPath + "/NumberOfUnits", "");
                oModel.setProperty(sPath + "/enableRate", false);
                oModel.setProperty(sPath + "/enableUnit", false);
                var that = this;
                $.ajax({
                    url: serviceUrl + "/odata/v2/EmpJob?$filter=userId eq '" + userId + "' and (employmentType eq '1041' or employmentType eq '1018') &$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        if (data.d.results.length == 0) {
                            oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                            oModel.setProperty(sPath + "/empName", "Not Found");
                        }
                        else if (data.d.results[0].payGroup != 'G4') {
                            oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                            oModel.setProperty(sPath + "/empName", "Not Found");
                        }
                        else if (data.d.results[0].payGroup == 'G4') {
                            oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                            var personnelArea = data.d.results[0].customString3;
                            var perSubArea = data.d.results[0].customString4;
                            var subGroupCode = data.d.results[0].employmentType
                            $.ajax({
                                url: serviceUrl + "/odata/v2/EmpEmployment?$filter=userId eq '" + userId + "' &$format=json",
                                type: 'GET',
                                contentType: "application/json",
                                success: function (data) {
                                    var perId = data.d.results[0].personIdExternal;
                                    $.ajax({
                                        url: serviceUrl + "/odata/v2/PerPerson('" + perId + "')/personalInfoNav?$format=json",
                                        type: 'GET',
                                        contentType: "application/json",
                                        success: function (data) {
                                            oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                                            oModel.setProperty(sPath + "/empName", data.d.results[0].firstName + " " + data.d.results[0].lastName);
                                            var subGroup = that.getView().getModel("oneModel1").getProperty("/EmpSubGrp").filter((el) => el.optionId == subGroupCode)[0].externalCode;
                                            var url = serviceUrl + "/odata/v2/cust_ZFLM_WAGTYPES_SC?$filter=externalName eq '" + personnelArea + "' and cust_PersSubarea eq '" + perSubArea + "' and cust_ESG eq '" + subGroup + "' and cust_FSection eq 'B' &$format=json";
                                            $.ajax({
                                                url: url,
                                                type: 'GET',
                                                contentType: "application/json",
                                                success: function (data) {
                                                    var wageDrop = [];
                                                    if (data.d.results.length == 0) {
                                                        this.getView().getModel("oneModel1").setProperty("/dropdownWageB", wageDrop);
                                                        MessageBox.error(`No wages are assigned for ${userId}`);
                                                    }
                                                    else {
                                                        for (let i = 0; i < data.d.results.length; i++) {
                                                            $.ajax({
                                                                url: serviceUrl + "/odata/v2/FOPayComponent?$filter=externalCode eq '" + data.d.results[i].cust_WageType + "' &$format=json",
                                                                type: 'GET',
                                                                contentType: "application/json",
                                                                success: function (data) {
                                                                    wageDrop.push(data.d.results[0]);
                                                                    wageDrop.sort((a, b) => {
                                                                        // sort by code
                                                                        if (a.externalCode < b.externalCode) return -1;
                                                                        if (a.externalCode > b.externalCode) return 1;
                                                                    })
                                                                    that.getView().getModel("oneModel1").setProperty("/dropdownWageB", wageDrop);
                                                                }.bind(this),
                                                                error: function (data) {
                                                                    console.log("error");
                                                                }
                                                            });
                                                        }
                                                    }
                                                }.bind(this),
                                                error: function (data) {
                                                    console.log("error" + data)
                                                }
                                            });
                                            //     }.bind(this),
                                            //     error: function (data) {
                                            //         console.log("error" + data)
                                            //     }
                                            // });
                                            //     }.bind(this),
                                            //     error: function () {

                                            //     }
                                            // });
                                        }.bind(this),
                                        error: function (data) {
                                            console.log("error");
                                        }
                                    });
                                }.bind(this),
                                error: function (data) {
                                    console.log("error");
                                    oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                                    oModel.setProperty(sPath + "/empName", "Not Found");
                                }
                            });
                        }
                        else {
                            oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                            oModel.setProperty(sPath + "/empName", "Not Found");
                        }
                    }.bind(this),
                    error: function () {
                        console.log("Error");
                    }
                });
            },

            onWageChange: function (oEvent) {
                if (oEvent.getSource().getSelectedItem()) {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);

                    var oBind = oEvent.getSource().getBindingContext("oneModel1");
                    var wage = oBind.getProperty("PayComponentCode").split(" - ")[0];
                    var sPath = oBind.getPath();
                    var oModel = this.getView().getModel("oneModel1");
                    oModel.setProperty(sPath + "/Value", "")
                    oModel.setProperty(sPath + "/NumberOfUnits", "")
                    $.ajax({
                        url: serviceUrl + "/odata/v2/cust_ZFLM_WAGCHECK?$filter=cust_WageType eq '" + wage + "' &$format=json",
                        type: 'GET',
                        contentType: "application/json",
                        success: function (data) {
                            var wagechk = data.d.results[0];
                            oModel.setProperty("/WageChk", wagechk)
                            if (wagechk.cust_IndicatorRate == "X") {
                                oModel.setProperty(sPath + "/enableRate", true);
                                oModel.setProperty(sPath + "/enableUnit", false);
                            }
                            else if (wagechk.cust_IndicatorUnits == "X") {
                                oModel.setProperty(sPath + "/enableUnit", true);
                                oModel.setProperty(sPath + "/enableRate", false);
                            };
                        },
                        error: function () {

                        }
                    });
                }
                else oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
            },

            onAmountChange: function (oEvent) {
                var sAmount = Number(oEvent.getSource().getValue());
                var wageChk = this.getView().getModel("oneModel1").getProperty("/WageChk");
                var maxRate = wageChk.cust_MaxRate.replace(",", "");
                if (sAmount > parseInt(maxRate)) {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.Error)
                    oEvent.oSource.setValueStateText("Amount is greater than alloted Amount")
                } else {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.None)
                }
            },

            onUnitChange: function (oEvent) {
                var sUnit = Number(oEvent.getSource().getValue());
                var wageChk = this.getView().getModel("oneModel1").getProperty("/WageChk");
                var maxUnit = wageChk.cust_Number.replace(",", "");
                if (sUnit > parseInt(maxUnit)) {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.Error)
                    oEvent.oSource.setValueStateText("Unit is greater than alloted Unit")
                } else {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.None)
                }
            },

            SecAaddRow: function () {
                var oModel = this.getView().getModel("oneModel1").getProperty("/finalData");
                var len = oModel.length;
                if (oModel[len - 1].empName == "") {
                    MessageBox.error("Kindly enter the Employee Name first");
                }
                else {
                    var secAData = {
                        counter: oModel[len - 1].counter + 1,
                        empName: "",
                        PersonID: "",
                        jobTitle: "",
                        CustomString1: "",
                        PayComponentCode: "",
                        NumberOfUnits: "",
                        Value: "",
                        enableRate: false,
                        enableUnit: false
                    };
                    oModel.push(secAData);
                    this.getView().getModel("oneModel1").setProperty("/finalData", oModel);
                }
            },

            SecAdelRow: function () {
                var oTable = this.getView().byId("_IDGenTable1");
                var oProperty = this.getView().getModel("oneModel1").getProperty("/finalData");
                var aSelectedItems = oTable.getSelectedItems();
                if (oProperty.length == aSelectedItems.length) {
                    var oProperty = [{
                        counter: 1,
                        empName: "",
                        PersonID: "",
                        jobTitle: "",
                        CustomString1: "",
                        PayComponentCode: "",
                        NumberOfUnits: "",
                        Value: "",
                        enableRate: false,
                        enableUnit: false
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
                this.getView().getModel("oneModel1").setProperty("/finalData", oProperty);
            },

            SecBaddRow: function () {
                var oModel = this.getView().getModel("oneModel1").getProperty("/finalDataSecB");
                var len = oModel.length;
                if (oModel[len - 1].PersonID == "") {
                    MessageBox.error("Kindly enter the Employee Name first");
                }
                else {
                    var secBData = {
                        counter: oModel[len - 1].counter + 1,
                        empName: "",
                        PersonID: "",
                        jobTitle: "",
                        CustomString1: "",
                        PayComponentCode: "",
                        NumberOfUnits: "",
                        Value: "",
                        enableRate: false,
                        enableUnit: false
                    };
                    oModel.push(secBData);
                    this.getView().getModel("oneModel1").setProperty("/finalDataSecB", oModel);
                }
            },
            SecBdelRow: function () {
                var oTable = this.getView().byId("_IDGenTable2");
                var oProperty = this.getView().getModel("oneModel1").getProperty("/finalDataSecB");
                var aSelectedItems = oTable.getSelectedItems();
                if (oProperty.length == aSelectedItems.length) {
                    var oProperty = [{
                        counter: 1,
                        empName: "",
                        PersonID: "",
                        jobTitle: "",
                        CustomString1: "",
                        PayComponentCode: "",
                        NumberOfUnits: "",
                        Value: "",
                        enableRate: false,
                        enableUnit: false
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
                this.getView().getModel("oneModel1").setProperty("/finalDataSecB", oProperty);
            },

            onToggleInfoToolbar2: function () {
                var oItem = new sap.m.ColumnListItem({
                    cells: [new sap.m.Input(), new sap.m.Input(), new sap.m.Input(), new sap.m.Input()]
                });
                var oTable = this.getView().byId("_IDGenTable3");
                oTable.addItem(oItem);
            },

            onToggleInfoToolbar5: function () {
                var oTable = this.getView().byId("_IDGenTable3");
                var aSelectedItem = oTable.getSelectedItems();
                for (var i = 0; i < aSelectedItem.length; i++) {
                    oTable.removeItem(aSelectedItem[i])
                }
            },
            handleChange: function (oEvent) {
                var monthArray = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November",
                    "December"
                ];
                // var month = monthArray[oEvent.getSource().getDateValue().getMonth()];
                // this.getView().byId("idClaimMnth").setValue(month);
            },

            _getDialog: function () {
                // associate controller with the fragment
                this.oCommentDialog = sap.ui.xmlfragment("com.gcc.claimsqa.cf01qa.fragment.Showbut", this);
                this.getView().addDependent(this.oCommentDialog);

                // toggle compact style
                jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this.oCommentDialog);

                //this.oCommentDialog.open;
                return this.oCommentDialog;
            },

            onShowBut: function (oEvent) {
                if (!this._oDialogModel) {
                    this._oDialogModel = sap.ui.xmlfragment("com.gcc.claimsqa.cf01qa.fragment.Showbut", this);
                    this.getView().addDependent(this._oDialogModel);
                }
                var sPath = oEvent.getSource().getBindingContext("oneModel1").getPath();
                var Section = sPath.includes("SecB") ? "B" : "A";
                var RowId = (Number(sPath.split("/")[2]) + 1).toString()
                this.pathForComment = {
                    rowId: RowId,
                    Section: Section
                };
                var commData = this.getView().getModel("oneModel1").getProperty("/ShowBtnData");
                if (commData == undefined || commData == []) {
                    this.getView().getModel("oneModel1").setProperty("/ShowBtnData", []);
                }
                else {
                    var commentExist = commData.filter((el) => el.SeqNumber == RowId && el.Section == Section);
                    if (commentExist.length != 0) {
                        this.getView().getModel("oneModel1").setProperty("/rowComment", commentExist[0].comment);
                    }
                }
                this._oDialogModel.open();
            },

            onPress8: function () {
                var text = sap.ui.getCore().byId("_IDGenTextArea1").getValue();
                var comment = this.getView().getModel("oneModel1").getProperty("/ShowBtn")
                var showField = this.getView().getModel("oneModel1").getProperty("/ShowId")
                if (comment != undefined) {
                    var comm = {
                        Formid: this.getView().byId("idFormId").getValue() != null ? this.getView().byId("idFormId").getValue() : "",
                        SeqNumber: showField.rowId,
                        Section: showField.path.includes("finalDataSecB") ? "B" : "A",
                        comment: text
                    }
                    for (let i = 0; i < comment.length - 1; i++) {
                        if (comment[i].SeqNumber === showField.rowId) {
                            comment.splice(parseInt(showField.rowId), 1);
                            comment.push(comm)
                        }
                        else {
                            comment.push(comm)
                        }
                    };
                    this.getView().getModel("oneModel1").setProperty("/ShowBtn", comm)
                }
                else {
                    var comm = {
                        Formid: this.getView().byId("idFormId").getValue() != null ? this.getView().byId("idFormId").getValue() : "",
                        SeqNumber: showField.rowId,
                        Section: showField.path.includes("finalDataSecB") ? "B" : "A",
                        comment: text
                    }
                    this.getView().getModel("oneModel1").setProperty("/ShowBtn", comm);
                }
                var oCommentDialog = this._getDialog();
                oCommentDialog.close()
            },

            onAddComment: function () {
                var oComm = this.getView().byId("_IDGenTextArea3").getValue();
                var CommExist = this.getView().byId("_IDGenTextArea2").getValue();
                var name = this.getView().getModel("oneModel1").getProperty("/user");

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
                    this.getView().byId("_IDGenLabel8").setVisible(true);
                    this.getView().byId("_IDGenTextArea2").setValue(oAuthComm);
                    this.getView().byId("_IDGenTextArea3").setValue("");
                }
            },
            onDialClose1: function () {
                var com = this.getView().getModel("oneModel1").getProperty("/rowComment");
                var commData = this.getView().getModel("oneModel1").getProperty("/ShowBtnData");
                var commentExist = commData.filter((el) => el.SeqNumber == this.pathForComment.rowId && el.Section == this.pathForComment.Section);
                if (commentExist.length != 0) {
                    for (let i = 0; i < commData.length; i++) {
                        if (commData[i].SeqNumber == commentExist.rowId && commData[i].Section == commentExist.Section) {
                            commData.splice(i, 1);
                        }
                    }
                }
                if (com != "") {
                    var temp = {
                        Formid: this.getView().byId("idFormId").getValue(),
                        SeqNumber: this.pathForComment.rowId,
                        Section: this.pathForComment.Section,
                        comment: com
                    };
                    commData.push(temp);
                    this.getView().getModel("oneModel1").setProperty("/ShowBtnData", commData);
                    this.getView().getModel("oneModel1").setProperty("/rowComment", "");
                }
                else {
                }
                this._oDialogModel.close();
            },

            addMessage: function (section, message, messArr) {

                if (section == "H") {
                    var obj = {
                        "Icon": "sap-icon://status-error",
                        "Message": `${message} is Mandatory Field in Header Section`,
                    }
                }
                else {
                    var obj = {
                        "Icon": "sap-icon://status-error",
                        "Message": `${message} is Mandatory Field in Section ${section}`,
                    }
                }
                messArr.push(obj);

                this.getView().getModel("oneModel1").setProperty("/MessageLog", messArr);
                return "";

            },

            payloadforSubmit: function () {
                var messArr = [];
                var jsonData = {};
                var oModel = this.getView().getModel("oneModel1");
                var data = oModel.getProperty("/finalData");
                var manager = this.managerId(managerId);
                var data1 = oModel.getProperty("/finalDataSecB");
                var finalData = [];
                if (data[0].PersonID == "" && data1[0].PersonID == "") {
                    messArr.push({
                        "Icon": "sap-icon://status-error",
                        "Message": "A claim form must have at least one claim item"
                    })
                    this.getView().getModel("oneModel1").setProperty("/MessageLog", messArr);
                }
                else {
                    if (data.length == 1 && data[0].empName == "") {
                    }
                    else {
                        for (let i = 0; i < data.length; i++) {
                            if (data[i].PayComponentCode != "") {
                                if (data[i].enableRate == true) {
                                    data[i].Value != "" ? data[i].Value : this.addMessage("A", "Amount", messArr)
                                }
                                else {
                                    data[i].NumberOfUnits != "" ? data[i].NumberOfUnits : this.addMessage("A", "Units/Hours", messArr)
                                }
                            }
                            var perId = data[i].PersonID;
                            var wage = data[i].PayComponentCode.split(" - ");
                            var secA = {
                                "SeqNumber": (i + 1).toString(),
                                "Formid": this.getView().byId("idFormId").getValue() != "" ? this.getView().byId("idFormId").getValue() : "",
                                "Perid": perId != "" ? perId : "",
                                "EmployeeName": data[i].empName != "" ? data[i].empName : this.addMessage("A", "Employee Name", messArr),
                                "WageType": data[i].PayComponentCode != "" ? wage[0] : this.addMessage("A", "Wage Type", messArr),
                                "WageTypeCode": wage[0],
                                "WageTypeTxt": wage[1],
                                "Amount": data[i].Value != "" ? data[i].Value : "",
                                "Unit": data[i].NumberOfUnits != "" ? data[i].NumberOfUnits : ""
                            }
                            finalData.push(secA);
                        }
                    }
                    var finalDataSecB = [];

                    if (data1.length == 1 && data1[0].empName == "") {
                    }
                    else {
                        for (let i = 0; i < data1.length; i++) {
                            var wage = data1[i].PayComponentCode.split(" - ");
                            if (data1[i].PayComponentCode) {
                                if (data1[i].enableRate == true) {
                                    data1[i].Value != "" ? data1[i].Value : this.addMessage("B", "Amount", messArr)
                                }
                                else {
                                    data1[i].NumberOfUnits != "" ? data1[i].NumberOfUnits : this.addMessage("B", "Units/Hours", messArr)
                                }
                            }
                            var secB = {
                                "SeqNumber": (i + 1).toString(),
                                "Formid": this.getView().byId("idFormId").getValue() != "" ? this.getView().byId("idFormId").getValue() : "",
                                "Perid": data1[i].PersonID != "" ? data1[i].PersonID : "",
                                "EmployeeName": data1[i].empName != "" ? data1[i].empName : this.addMessage("B", "Employee Name", messArr),
                                "WageType": data1[i].PayComponentCode != "" ? wage[0] : this.addMessage("B", "Wage Type", messArr),
                                "WageTypeCode": wage[0],
                                "WageTypeTxt": wage[1],
                                "Amount": data1[i].Value != "" ? data1[i].Value : "",
                                "Unit": data1[i].NumberOfUnits != "" ? data1[i].NumberOfUnits : ""
                            }
                            finalDataSecB.push(secB);
                        }
                    }

                    jsonData = {
                        //Header Section
                        "Formid": this.getView().byId("idFormId").getValue() != "" ? this.getView().byId("idFormId").getValue() : "",
                        "Initiator": this.getView().byId("idInitator").getValue() != "" ? this.getView().byId("idInitator").getValue() : "",
                        "Ardate": this.getView().byId("IDDate").getValue() != "" ? this.getView().byId("IDDate").getValue() : "",
                        "OrganisationName": this.getView().byId("idOrgName").getValue() != "" ? this.getView().byId("idOrgName").getValue() : "",
                        "CostCenter": this.getView().byId("idCostCentre").getValue() != "" ? this.getView().byId("idCostCentre").getValue() : "",
                        "ClaimMonth": this.getView().byId("_IDGenComboBox1").getValue() != "" ? this.getView().byId("_IDGenComboBox1").getValue() : this.addMessage("H", "Claim Month", messArr),
                        "ClaimEndDate": this.getView().byId("DP12").getValue() != "" ? this.getView().byId("DP12").getValue() : "",
                        "ApproverInSec": manager.managerId != undefined ? "X" : "",
                        "ApproverWageType": manager.wage != "" ? manager.wage : "",
                        "GovernId": manager.managerId != "" ? this.getGovernId() : "",
                        "DeletionIndicator": "",
                        "Purpose": "I",
                        "Notify": this.getView().byId("checkbox1").getSelected() == true ? "X" : "",
                        "hdr_to_sec_a_nav": finalData,
                        "hdr_to_sec_b_nav": finalDataSecB,
                        "hdr_to_comm_nav": [
                            {
                                "Formid": this.getView().byId("idFormId").getValue() != null ? this.getView().byId("idFormId").getValue() : "",
                                "comment": this.getView().byId("_IDGenTextArea2").getValue() != null ? this.getView().byId("_IDGenTextArea2").getValue() : ""
                            }
                        ]
                    };
                }
                return { jsonData: jsonData, messArr: messArr };
            },

            payload: function (purpose, delInd) {
                var oModel = this.getView().getModel("oneModel1");
                var data = oModel.getProperty("/finalData");
                var manager = this.managerId(managerId);
                var finalData = [];
                if (data.length == 1 && data[0].empName == undefined) {
                }
                else {
                    for (let i = 0; i < data.length; i++) {
                        var perId = data[i].PersonID;
                        var wage = data[i].PayComponentCode.split(" - ");
                        var secA = {
                            "SeqNumber": (i + 1).toString(),
                            "Formid": this.getView().byId("idFormId").getValue() != null ? this.getView().byId("idFormId").getValue() : "",
                            "Perid": perId != null ? perId : "",
                            "EmployeeName": data[i].empName != null ? data[i].empName : "",
                            "WageType": wage[0] + wage[1],
                            "WageTypeCode": wage[0],
                            "WageTypeTxt": wage[1],
                            "Amount": data[i].Value != null ? data[i].Value : "",
                            "Unit": data[i].NumberOfUnits != null ? data[i].NumberOfUnits : ""
                        }
                        finalData.push(secA);
                    }
                }
                var data1 = oModel.getProperty("/finalDataSecB");
                var finalDataSecB = [];

                if (data1.length == 1 && data1[0].empName == undefined) {
                }
                else {
                    for (let i = 0; i < data1.length; i++) {
                        var wage = data1[i].PayComponentCode.split(" - ");
                        var secB = {
                            "SeqNumber": (i + 1).toString(),
                            "Formid": this.getView().byId("idFormId").getValue() != null ? this.getView().byId("idFormId").getValue() : "",
                            "Perid": data1[i].PersonID != null ? data1[i].PersonID : "",
                            "EmployeeName": data1[i].empName != null ? data1[i].empName : "",
                            "WageType": wage[0] + wage[1],
                            "WageTypeCode": wage[0],
                            "WageTypeTxt": wage[1],
                            "Amount": data1[i].Value != null ? data1[i].Value : "",
                            "Unit": data1[i].NumberOfUnits != null ? data1[i].NumberOfUnits : ""
                        }
                        finalDataSecB.push(secB);
                    }
                }

                var jsonData = {
                    //Header Section
                    "Formid": this.getView().byId("idFormId").getValue() != null ? this.getView().byId("idFormId").getValue() : "",
                    "Initiator": this.getView().byId("idInitator").getValue() != null ? this.getView().byId("idInitator").getValue() : "",
                    "Ardate": this.getView().byId("IDDate").getValue() != null ? this.getView().byId("IDDate").getValue() : "",
                    "OrganisationName": this.getView().byId("idOrgName").getValue() != null ? this.getView().byId("idOrgName").getValue() : "",
                    "CostCenter": this.getView().byId("idCostCentre").getValue() != null ? this.getView().byId("idCostCentre").getValue() : "",
                    "ClaimMonth": this.getView().byId("_IDGenComboBox1").getValue() != null ? this.getView().byId("_IDGenComboBox1").getValue() : "",
                    "ClaimEndDate": this.getView().byId("DP12").getValue() != null ? this.getView().byId("DP12").getValue() : "",
                    "ApproverInSec": manager.managerId != null ? "X" : "",
                    "ApproverWageType": manager.wage != null ? manager.wage : "",
                    "GovernId": manager.managerId != null ? this.getGovernId() : "",
                    "DeletionIndicator": delInd,
                    "Purpose": purpose,
                    "Notify": this.getView().byId("checkbox1").getSelected() == true ? "X" : "",
                    "hdr_to_sec_a_nav": finalData,
                    "hdr_to_sec_b_nav": finalDataSecB,
                    "hdr_to_comm_nav": [
                        {
                            "Formid": this.getView().byId("idFormId").getValue() != null ? this.getView().byId("idFormId").getValue() : "",
                            "comment": this.getView().byId("_IDGenTextArea2").getValue() != null ? this.getView().byId("_IDGenTextArea2").getValue() : ""
                        }
                    ]
                };
                return jsonData

            },

            onPrint: function () {
                // window.print();

                var jsonData = this.payload("P", "");
                this.getOwnerComponent().getModel("ZSFGTGW_CF01_SRV").create("/zsf_cf01_hSet",
                    jsonData, {

                    success: function (oData) {
                        var initiator = this.getView().getModel("oneModel1").getProperty("/personalInfo").d.results[0]
                        var s4url = this.getOwnerComponent().getModel("ZSFGTGW_CF01_SRV").sServiceUrl;    // Give your service name
                        var FormID = this.getView().byId("idFormId").getValue();      // Give your FormID
                        var sSource = s4url + "/zsf_cf01_printSet(Formid='" + FormID + "')/$value";
                        var newTab = window.open(sSource, "_blank");
                        newTab.onload = function () {
                            // newTab.print();
                        }
                        // this._pdfViewer = new sap.m.PDFViewer();
                        // this.getView().addDependent(this._pdfViewer);
                        // this._pdfViewer.setSource(sSource);
                        // this._pdfViewer.setTitle("Schools Claims Form - Print");
                        // this._pdfViewer.setShowDownloadButton(false);
                        // this._pdfViewer.open();

                    }.bind(this),
                    error: function (oData) {
                        //MessageBox.error("Error");
                        MessageBox.error("Some error occured. Please try again");
                    }
                });
            },
            onMonthChange: function (oEvent) {
                // var org = this.getView().byId("idOrgName").getSelectedItem() != null ? this.getView().byId("idOrgName").getSelectedItem().getKey() : this.getView().byId("idOrgName").getSelectedKey();
                // this.emplData(org);
                // var temp = oEvent.getSource().getSelectedKey();
                // var temp2 = new Date();
                // var temp1 = parseInt(temp2.getMonth()) - parseInt(temp) + 1;
                // temp1 = parseInt(temp1);
                // if (temp1 <= 0) {
                //     var cYear = temp2.getFullYear() - 1;
                // }
                // else {
                //     var cYear = temp2.getFullYear();
                // }
                // var monthNum = this.monthToNumber(oEvent.getSource().getSelectedItem().getText());
                // var rtnDtFrmt = sap.ui.core.format.DateFormat.getDateTimeInstance({
                //     pattern: "dd-MM-yyyy"
                // });
                // this.getView().byId("DP12").setValue(rtnDtFrmt.format(new Date(cYear, monthNum + 1, 0)));

                if (oEvent.getSource().getSelectedItem() != null) {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                    sap.ui.core.BusyIndicator.show();
                    var sMonthIndex = oEvent.getSource().getSelectedItem().getKey();
                    var sMonthYear = oEvent.getSource().getSelectedItem().getText();
                    var sYear = sMonthYear.split(" ")[1];
                    var LastDate = new Date(sYear, sMonthIndex, 0);
                    var FirstDate = new Date(sYear, sMonthIndex - 1, 1);
                    var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
                    var FirstDateISO = dateFormat.format(FirstDate);
                    var dateFormat1 = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-dd-MM" });
                    var LastDateISO = dateFormat1.format(LastDate);
                    var dateFormat1 = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "dd MMM yyyy" });
                    var LastDateDisp = dateFormat1.format(LastDate);
                    this.getView().byId("DP12").setValue(LastDateDisp);
                    var orgCode = this.getView().byId("idOrgName").getSelectedItem() != null ? this.getView().byId("idOrgName").getSelectedItem().getKey() : this.getView().byId("idOrgName").getSelectedKey();
                    this._getEmplData(orgCode, LastDateISO, FirstDateISO);
                }
                else {
                    MessageBox.error("Please select values from the dropdown");
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                }
            },

            monthToNumber: function (month) {
                const monthMap = {
                    'January': 0,
                    'February': 1,
                    'March': 2,
                    'April': 3,
                    'May': 4,
                    'June': 5,
                    'July': 6,
                    'August': 7,
                    'September': 8,
                    'October': 9,
                    'November': 10,
                    'December': 11
                };
                const numericMonth = monthMap[month];
                return numericMonth;

            },
            onDelete: function () {
                MessageBox.information("Delete the data in this form and any saved draft version of this form", {
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: function (sAction) {
                        if (sAction == MessageBox.Action.OK) {
                            var jsonData = this.payload("", "X");
                            this.getOwnerComponent().getModel("ZSFGTGW_CF01_SRV").create("/zsf_cf01_hSet",
                                jsonData, {
                                success: function (oData) {
                                    var initiator = this.getView().getModel("oneModel1").getProperty("/personalInfo").d.results[0]
                                    this._logCreation("D", initiator.firstName + " " + initiator.lastName, "");
                                    MessageBox.success("Form Deleted Successfully", {
                                        actions: [MessageBox.Action.OK],
                                        emphasizedAction: MessageBox.Action.OK,
                                        onClose: function (sAction) {
                                            if (sAction == MessageBox.Action.OK) {
                                                // var oHistory, sPreviousHash;
                                                // oHistory = History.getInstance();
                                                // sPreviousHash = oHistory.getPreviousHash();
                                                // if (sPreviousHash == undefined) {
                                                //     window.history.go(-1);
                                                // }
                                                window.history.back();
                                            }
                                        }
                                    });
                                }.bind(this),
                                error: function (oData) {
                                    MessageBox.error("Some error occured. Please try again");
                                }
                            });
                        }
                    }.bind(this)
                });
            },

            managerId: function (managerId) {
                var data = this.getView().getModel("oneModel1").getProperty("/finalData");
                var manager = managerId;
                var wage = "";
                for (let i = 0; i < data.length; i++) {
                    var perId = data[i].PersonID;
                    if (perId == manager) {
                        var manId = manager;
                        if (wage == "") {
                            wage = data[i].PayComponentCode;
                        }
                        else {
                            wage = wage + "," + data[i].PayComponentCode;
                        }
                    }
                }
                var wageTyp = {
                    managerId: manId,
                    wage: wage
                }
                return wageTyp;
            },

            getGovernId: function () {
                var org = this.getView().byId("idOrgName").getValue();
                var job = this.getView().getModel("oneModel1").getProperty("/jobInfo");
                $.ajax({
                    url: serviceUrl + "/odata/v2/cust_ZFLM_CF01_EMAIL?$filter=cust_PersArea eq '" + org + "' and cust_OrgUnit eq '" + job.d.results[0].position + "' &$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        if (data.d.results.length == 0) {
                            $.ajax({
                                url: serviceUrl + "/odata/v2/cust_ZFLM_CF01_EMAIL?$filter=cust_PersArea eq '" + org + "' &$format=json",
                                type: 'GET',
                                contentType: "application/json",
                                success: function (data) {
                                    return data.d.results[0].cust_EmailID;
                                },
                                error: function (data) {
                                    console.log("Error" + data);
                                }
                            });
                        }
                        else {
                            return data.d.results[0].cust_EmailID;
                        }
                    },
                    error: function (data) {
                        console.log("Error" + data);
                    }
                });

            },

            onSubmit: function (oEvent) {

                MessageBox.alert("Are you sure you want to Submit the form?", {
                    title: "Submit Form",
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: function (sAction) {
                        if (sAction == MessageBox.Action.OK) {
                            sap.ui.core.BusyIndicator.show();
                            this.checkFields();
                            var { jsonData, messArr } = this.payloadforSubmit();
                            if (messArr.length != 0) {
                                sap.ui.core.BusyIndicator.hide();
                                this.oMessage = sap.ui.xmlfragment("com.gcc.claimsqa.cf01qa.fragment.logMessage", this);
                                this.getView().addDependent(this.oMessage);
                                this.oMessage.open();
                            }
                            else {

                                this.getOwnerComponent().getModel("ZSFGTGW_CF01_SRV").create("/zsf_cf01_hSet",
                                    jsonData, {

                                    success: function (oData) {

                                        var user = this.getView().getModel("oneModel1").getProperty("/user");
                                        var appUrl = window.location.origin + "/site" + window.location.search.split("&")[0] + window.location.hash.split("?")[0];
                                        var reqUrl = appUrl.includes("GCC_SemObj") ? appUrl + "&/?formId=" : appUrl + "#?formId=";
                                        var payload = {
                                            "definitionId": "eu10.gccdev.eforms.CF01",
                                            "context": {
                                                "FormID": this.getView().byId("idFormId").getValue(),
                                                "formlinkapprover": reqUrl + this.getView().byId("idFormId").getValue() + "&mode=display",
                                                "formlinkinitiator": reqUrl + this.getView().byId("idFormId").getValue(),
                                                "initiator": user.email
                                            }
                                        };
                                        this.onPressTiggerWF(payload);
                                    }.bind(this),
                                    error: function (oData) {
                                        //MessageBox.error("Error");
                                        MessageBox.error("Some error occured. Please try again");
                                        sap.ui.core.BusyIndicator.hide();
                                    }
                                });
                            }
                        }
                    }.bind(this)
                });

            },

            checkFields: function () {

                var errorFlag = false;
                var aControls = this.getView().getControlsByFieldGroupId("checkSecA");
                aControls.forEach(function (oControl) {
                    if (oControl.getId != undefined && (oControl.getId().includes("Input"))) {
                        if ((oControl.getValue != undefined && oControl.getValue() == "" && oControl.getRequired != undefined && oControl.getRequired()) || (oControl.getValueState != undefined && oControl.getValueState() === sap.ui.core.ValueState.Error)) {
                            oControl.setValueState(sap.ui.core.ValueState.Error);
                            errorFlag = true;
                        }
                        else if (oControl.getValue != undefined && oControl.getValue() != "") {
                            oControl.setValueState(sap.ui.core.ValueState.None);
                        }
                    }
                });

                var aControls = this.getView().getControlsByFieldGroupId("checkSecB");
                aControls.forEach(function (oControl) {
                    if (oControl.getId != undefined && (oControl.getId().includes("Input"))) {
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

            onSave: function (oEvent) {

                var jsonData = this.payload("I", "");

                this.getOwnerComponent().getModel("ZSFGTGW_CF01_SRV").create("/zsf_cf01_hSet",
                    jsonData, {

                    success: function (oData) {
                        var initiator = this.getView().getModel("oneModel1").getProperty("/personalInfo").d.results[0]
                        this._logCreation("E", initiator.firstName + " " + initiator.lastName, "");
                        MessageBox.success(`Form: ${this.getView().byId("idFormId").getValue()} saved successfully!`);
                    }.bind(this),
                    error: function (oData) {
                        //MessageBox.error("Error");
                        MessageBox.error("Some error occured. Please try again");
                    }
                });
            },
            onPressTiggerWF: function (payload) {
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
                            var initiator = this.getView().getModel("oneModel1").getProperty("/personalInfo").d.results[0]
                            this._logCreation("S", initiator.firstName + " " + initiator.lastName, managerId);
                            sap.ui.core.BusyIndicator.hide();
                            MessageBox.success(`Form: ${this.getView().byId("idFormId").getValue()} is submitted successfully!
                            
                            Please call ContactUs on 01452 425888 should you have any queries regarding this e-Form.`, {
                                title: "Success Message",
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
                        }.bind(this)).fail(function (oData) {
                            MessageBox.error("Some error occured. Please try again");
                            sap.ui.core.BusyIndicator.hide();
                        });
                    }

                }.bind(this)).fail(function (oData) {
                    MessageBox.error("Some error occured. Please try again");
                    sap.ui.core.BusyIndicator.hide();
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
                this.oMessage.close();
            },

            onTabChange: function (oEvent) {
                var oModel = this.getView().getModel("oneModel1");
                var oFilter = new sap.ui.model.Filter('Formid', sap.ui.model.FilterOperator.EQ, this.getView().byId("idFormId").getValue());
                this.getOwnerComponent().getModel("logService").read("/zsf_logSet", {
                    filters: [oFilter],
                    success: function (oData) {
                        this.getView().byId("_HIDGenFormId1").setValue(this.getView().byId("idFormId").getValue());
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