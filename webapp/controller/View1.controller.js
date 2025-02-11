sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "../model/formatter"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, MessageBox, formatter) {
        "use strict";
        var personid = "", managerId = "", initiatorCode = "";
        var serviceUrl = ""

        return Controller.extend("com.gcc.claimsqa.cf01qa.controller.View1", {
            formatter: formatter,
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
                this.getView().getModel("oneModel1").setProperty("/dropdownEmp", []);
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

                // Removing employee sub group 05, 21
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

                // Getting all the employees from the personnel area
                let employeeData = [];
                await $.ajax({
                    url: serviceUrl + `/odata/v2/EmpJob?$filter=customString3 eq '${orgCode}' and emplStatus ne '${discarded}' and emplStatus ne '${terminated}' and emplStatus ne '${retired}' and emplStatus ne '${suspended}' and emplStatus ne '${reportedNoShow}' and employmentType ne '${sub05}' and employmentType ne '${sub21}' and endDate gt datetime'${FirstDateISO}T00:00:00'&toDate=${LastDateISO}&$format=json`,
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        employeeData = data.d.results;
                    }.bind(this),
                    error: function (e) {
                        sap.ui.core.BusyIndicator.hide();
                    }
                });

                employeeData = this.filterEmplData(employeeData);
                let a = new sap.ui.model.odata.ODataModel(serviceUrl + "/odata/v2", true);
                a.bTokenHandling = false;
                var _self = this;
                if (employeeData.length > 180) {
                    for (let i = 0; i < employeeData.length / 180; i++) {
                        employeeDetails(employeeData.slice(i * 180, (i + 1) * 180), _self, LastDateISO);
                    }
                }
                else {
                    employeeDetails(employeeData, _self, LastDateISO);
                }

                function employeeDetails(emplData, _self, LastDateISO) {
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
                                var findPostDate = Number((new Date(LastDateISO.split("-")[0], LastDateISO.split("-")[2], 0).getTime()));
                                for (let i = 0; i < data.__batchResponses.length; i++) {
                                    try {
                                        var postingDate = _self.unixDateRegex(employeeData[i].endDate) > findPostDate ? findPostDate : _self.unixDateRegex(employeeData[i].endDate);
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
                                var existingData = _self.getView().getModel("oneModel1").getProperty("/dropdownEmp");
                                var finalData = existingData ? existingData.concat(EmpData) : EmpData;
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
                                _self.getView().getModel("oneModel1").setProperty("/dropdownEmp", finalData);
                                sap.ui.core.BusyIndicator.hide();
                            }
                            else {
                                console.log(`No Employee Found for ${empl.d.results[0].personIdExternal}`);
                            }
                            sap.ui.core.BusyIndicator.hide();
                        }.bind(this));
                    }.bind(this));
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
                        this.query = oEvent.getParameter('arguments')["?query"];
                        // var oComponent = this.getOwnerComponent();
                        // var oRouter = oComponent.getRouter();
                        // var oArgs = oRouter.getHashChanger().getHash().split("/");
                        // var sMode = oArgs[1];
                        var that = this;
                        if (this.query != undefined) {

                            if (this.query.mode) {
                                this.getView().byId("_IDGenButton1").setVisible(false);
                                this.getView().byId("IdSave").setVisible(false);
                                this.getView().byId("IdDraft").setText("Save");
                            }
                            this.getView().getModel("oneModel1").setProperty("/form", this.query);
                            var formid = this.query.formId;
                            this.S4Services(that, formid, useremail, this.query.mode);

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
                                enableWage: false,
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
                                enableWage: false,
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
                    url: serviceUrl + "/odata/v2/cust_ZFLM_MULTI_USER_NEW?$filter=externalName eq '" + userId1 + "' and cust_Role eq 'I'&$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: async function (data) {
                        if (data.d.results.length != 0) {
                            var values = data.d.results.map((value, index) => { return { key: (index), text: (value.cust_Organization) }; });
                            var val = [];
                            values.forEach(async function (item) {
                                $.ajax({
                                    url: serviceUrl + "/odata/v2/cust_PersonnelArea?$filter= externalCode eq '" + item.text + "'&$format=json",
                                    type: 'GET',
                                    contentType: "application/json",
                                    success: function (data) {
                                        var req = {
                                            key: item.text,
                                            value: data.d.results[0].externalName + " (" + item.text + ")"
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
                            if (values.length == 1) {
                                that.getView().byId("idOrgName").setEditable(false);
                                $.ajax({
                                    url: serviceUrl + "/odata/v2/cust_PersonnelArea?$filter= externalCode eq '" + values[0].text + "'&$format=json",
                                    type: 'GET',
                                    contentType: "application/json",
                                    success: function (data) {
                                        var req = {
                                            key: values[0].text,
                                            value: data.d.results[0].externalName + " (" + values[0].text + ")"
                                        };
                                        val.push(req);
                                        that.getView().getModel("oneModel1").setProperty("/OrgValues", val);
                                        that.getView().byId("idOrgName").setSelectedKey(values[0].text);
                                        var initiator = that.getView().getModel("oneModel1").getProperty("/personalInfo");
                                        that.findApprover(values[0].text)
                                            .then(() => {
                                                that._logCreation("I", initiator.d.results[0].firstName + " " + initiator.d.results[0].lastName);
                                            })
                                            .catch((e) => MessageBox.error(e));
                                        that.checkingG4School(values[0].text, that, false);
                                    },
                                    error: function () {
                                        console.log("Error in Assigning Multiple Personnel Area");
                                    }
                                });
                            }
                        } else {
                            MessageBox.error("You have not been set-up with the authorisation to launch this form. Please call ContactUs on 01452 425888 if you believe this is in error.", {
                                title: "Error Message",
                                actions: [MessageBox.Action.OK],
                                onClose: function (oAction) {
                                    if (oAction) {
                                        if (that.query) window.parent.close();
                                        else window.history.go(-1);
                                    }
                                }.bind(this)
                            });
                            // await $.ajax({
                            //     url: serviceUrl + "/odata/v2/EmpEmployment(personIdExternal='" + userId1 + "',userId='" + userId1 + "')/jobInfoNav?$format=json",
                            //     type: 'GET',
                            //     contentType: "application/json", //job Info
                            //     success: function (data) {
                            //         var temp = data.d.results[0].customString3;
                            //         if (data.d.results[0].managerId == "NO_MANAGER") {
                            //             MessageBox.error("Line Manager is missing, Form cannot be Initiated", {
                            //                 title: "Error Message",
                            //                 actions: [sap.m.MessageBox.Action.OK],
                            //                 onClose: function (oAction) {
                            //                     if (oAction) {
                            //                         window.history.go(-1);
                            //                     }
                            //                 }
                            //             });
                            //         }
                            //         managerId = data.d.results[0].managerId;
                            //         $.ajax({
                            //             url: serviceUrl + "/odata/v2/cust_PersonnelArea?$filter= externalCode eq '" + data.d.results[0].customString3 + "'&$format=json",
                            //             type: 'GET',
                            //             contentType: "application/json",
                            //             success: function (data) {
                            //                 that.getView().byId("idOrgName").setSelectedKey(temp);
                            //                 var req = {
                            //                     d: {
                            //                         results: [{
                            //                             customString3: data.d.results[0].externalName + " (" + temp + ")"
                            //                         }]
                            //                     }
                            //                 };
                            //                 that.getView().getModel("oneModel1").setProperty("/jobInfo", req);
                            //                 var initiator = that.getView().getModel("oneModel1").getProperty("/personalInfo");
                            //                 that._logCreation("I", initiator.d.results[0].firstName + " " + initiator.d.results[0].lastName);
                            //             },
                            //             error: function () {
                            //                 console.log("Error in Assigning Multiple Personnel Area");
                            //             }
                            //         });
                            //     }
                            // });
                        }

                    }.bind(this),
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
                                this.CcCode = data.d.results[0].costCenter;
                                $.ajax({
                                    url: serviceUrl + `/odata/v2${data.d.results[0].costCenterNav.__deferred.uri.split("/odata/v2")[1]}?$format=json`,
                                    type: 'GET',
                                    contentType: "application/json",
                                    success: function (data) {
                                        if (data && data.d.results[0] && data.d.results[0].costcenterExternalObjectID) {
                                            this.getView().byId("idCostCentre").setValue(+data.d.results[0].costcenterExternalObjectID ? (+data.d.results[0].costcenterExternalObjectID).toString() : data.d.results[0].costcenterExternalObjectID);
                                        }
                                        else {
                                            MessageBox.error("Cost Center could not be found");
                                        }
                                    }.bind(this),
                                    error: function (e) {
                                        console.log(`FOCostCenter entity failed for ${initiator}`);
                                    }
                                });
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

            S4Services: async function (that, formid, useremail, mode) {

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
                                            "firstName": personal[1],
                                            "lastName": personal[2]
                                        }
                                    ]
                                }
                            }
                            that.getView().getModel("oneModel1").setProperty("/personalInfo", person);
                            that.getView().getModel("oneModel1").setProperty("/salutation", { d: { results: [{ label: personal[0] }] } });
                            var job = {
                                "d": {
                                    "results": [
                                        {
                                            "customString3": oData.OrganisationName
                                        }
                                    ]
                                }
                            }
                            this.getView().byId("idOrgName").setSelectedKey(oData.OrganisationName.match(/\((.*?)\)/)[1]);
                            this.getView().getModel("oneModel1").setProperty("/lastSelectedOrg", oData.OrganisationName.match(/\((.*?)\)/)[1]);
                            //finding approver
                            this.findApprover(oData.OrganisationName.match(/\((.*?)\)/)[1])
                                .catch((e) => MessageBox.error(e));
                            that.checkingG4School(oData.OrganisationName, that, true);
                            that.CcCode = oData.CostCenter;
                            var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
                            var FirstDateISO = dateFormat.format(new Date(Number(oData.ClaimMonth.split(" ")[1]), that.monthToNumber(oData.ClaimMonth.split(" ")[0]), 1));
                            var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-dd-MM" });
                            var LastDateISO = dateFormat.format(new Date(Number(oData.ClaimMonth.split(" ")[1]), that.monthToNumber(oData.ClaimMonth.split(" ")[0]) + 1, 0));
                            that._getEmplData(oData.OrganisationName.split("(")[1].split(")")[0], LastDateISO, FirstDateISO);
                            that.getView().getModel("oneModel1").setProperty("/jobInfo", job);
                            that.getView().byId("idCostCentre").setValue(oData.CostCenterDis);
                            that.getView().byId("_IDGenComboBox1").setValue(oData.ClaimMonth);
                            that.getView().byId("_IDGenComboBox1").setSelectedKey(that.getView().getModel("oneModel1").getProperty("/Months").filter((el) => el.months == oData.ClaimMonth));
                            var monthKey = that.getView().getModel("oneModel1").getProperty("/Months").filter((el) => el.months == oData.ClaimMonth);
                            if (monthKey.length > 0)
                                that.getView().byId("_IDGenComboBox1").setSelectedKey(monthKey[0].key);
                            that.getView().byId("idFormId").setValue(oData.Formid);
                            that.getView().byId("IDDate").setDateValue(new Date(this.convertS4Date(oData.Ardate)));
                            var dateFormat1 = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "dd MMM yyyy" });
                            var claimMonthEnd = dateFormat1.format(new Date(this.convertS4Date(oData.ClaimEndDate)));
                            that.getView().byId("DP12").setValue(claimMonthEnd);
                            that.getView().byId("checkbox1").setSelected(oData.Notify == "X" ? true : false);
                        }.bind(this),
                        error: function (oData) {
                            console.log("error in Object");
                        }
                    });

                this.getOwnerComponent().getModel("ZSFGTGW_CF01_SRV").read("/zsf_cf01_hSet('" + formid + "')",
                    {
                        urlParameters: {
                            "$expand": "hdr_to_sec_a_nav,hdr_to_comm_row_nav"
                        },
                        success: function (oData) {
                            var secAData = [];
                            if (oData.hdr_to_sec_a_nav.results.length > 0) {
                                for (let i = 0; i < oData.hdr_to_sec_a_nav.results.length; i++) {
                                    var secA = {
                                        empName: oData.hdr_to_sec_a_nav.results[i].EmployeeName,
                                        PersonID: oData.hdr_to_sec_a_nav.results[i].Perid,
                                        PayComponentCode: oData.hdr_to_sec_a_nav.results[i].WageTypeCode + " - " + oData.hdr_to_sec_a_nav.results[i].WageTypeTxt,
                                        Value: oData.hdr_to_sec_a_nav.results[i].Amount,
                                        NumberOfUnits: oData.hdr_to_sec_a_nav.results[i].Unit,
                                        enableWage: oData.hdr_to_sec_a_nav.results[i].WageTypeCode ? true : false,
                                        enableRate: oData.hdr_to_sec_a_nav.results[i].EnableAmount ? true : false,
                                        enableUnit: oData.hdr_to_sec_a_nav.results[i].EnableUnit ? true : false,
                                        showButEnab: mode == "display" ? oData.hdr_to_comm_row_nav.results.filter((el) => el.Section == 'A' && el.SeqNumber == (i + 1).toString())[0] ? true : false : true
                                    }
                                    secAData.push(secA);
                                }
                            } else {
                                var secA = {
                                    empName: "",
                                    PersonID: "",
                                    PayComponentCode: "",
                                    Value: "",
                                    NumberOfUnits: "",
                                    enableWage: false,
                                    enableRate: false,
                                    enableUnit: false,
                                    showButEnab: true
                                }
                                secAData.push(secA);
                            }
                            if (mode == "initiator" || !mode) {
                                this.batchSF("/EmpJob", "userId", "Perid", oData.hdr_to_sec_a_nav.results)
                                    .then((resp) => {
                                        if (resp) {
                                            resp.forEach(function (oItem, index) {
                                                var personnelArea = oItem.data.results[0].customString3;
                                                var perSubArea = oItem.data.results[0].customString4;
                                                var subGroupCode = oItem.data.results[0].employmentType
                                                var subGroup = this.getView().getModel("oneModel1").getProperty("/EmpSubGrp").filter((el) => el.optionId == subGroupCode)[0].externalCode;
                                                this.getWages(oItem.data.results[0].userId, personnelArea, perSubArea, subGroup, "A", index)
                                                    .then((wages, index) => {
                                                        this.getView().getModel("oneModel1").setProperty("/finalData/" + wages.index + "/dropdownWage", wages.wageData)
                                                    })
                                            }.bind(this));
                                        }
                                    })
                                    .catch((e) => { console.log(e); })
                            }
                            this.getView().getModel("oneModel1").setProperty("/finalData", secAData)
                        }.bind(this),
                        error: function () {

                        }
                    });

                this.getOwnerComponent().getModel("ZSFGTGW_CF01_SRV").read("/zsf_cf01_hSet('" + formid + "')",
                    {
                        urlParameters: {
                            "$expand": "hdr_to_sec_b_nav,hdr_to_comm_row_nav"
                        },
                        success: function (oData) {
                            var secBData = [];
                            if (oData.hdr_to_sec_b_nav.results.length > 0) {
                                for (let i = 0; i < oData.hdr_to_sec_b_nav.results.length; i++) {
                                    var secB = {
                                        empName: oData.hdr_to_sec_b_nav.results[i].EmployeeName,
                                        PersonID: oData.hdr_to_sec_b_nav.results[i].Perid,
                                        PayComponentCode: oData.hdr_to_sec_b_nav.results[i].WageTypeCode + " - " + oData.hdr_to_sec_b_nav.results[i].WageTypeTxt,
                                        Value: oData.hdr_to_sec_b_nav.results[i].Amount,
                                        NumberOfUnits: oData.hdr_to_sec_b_nav.results[i].Unit,
                                        enableWage: oData.hdr_to_sec_b_nav.results[i].WageTypeCode ? true : false,
                                        enableRate: oData.hdr_to_sec_b_nav.results[i].EnableAmount ? true : false,
                                        enableUnit: oData.hdr_to_sec_b_nav.results[i].EnableUnit ? true : false,
                                        showButEnab: mode == "display" ? oData.hdr_to_comm_row_nav.results.filter((el) => el.Section == 'B' && el.SeqNumber == (i + 1).toString())[0] ? true : false : true
                                    }
                                    secBData.push(secB);
                                }
                            } else {
                                var secB = {
                                    empName: "",
                                    PersonID: "",
                                    PayComponentCode: "",
                                    Value: "",
                                    NumberOfUnits: "",
                                    enableWage: false,
                                    enableRate: false,
                                    enableUnit: false,
                                    showButEnab: true
                                }
                                secBData.push(secB);
                            }
                            this.getView().getModel("oneModel1").setProperty("/finalDataSecB", secBData)
                            if (mode == "initiator" || !mode) {
                                this.batchSF("/EmpJob", "userId", "Perid", oData.hdr_to_sec_b_nav.results)
                                    .then((resp) => {
                                        if (resp) {
                                            resp.forEach(function (oItem, index) {
                                                var personnelArea = oItem.data.results[0].customString3;
                                                var perSubArea = oItem.data.results[0].customString4;
                                                var subGroupCode = oItem.data.results[0].employmentType
                                                var subGroup = this.getView().getModel("oneModel1").getProperty("/EmpSubGrp").filter((el) => el.optionId == subGroupCode)[0].externalCode;
                                                this.getWages(oItem.data.results[0].userId, personnelArea, perSubArea, subGroup, "B", index)
                                                    .then((wages, index) => {
                                                        this.getView().getModel("oneModel1").setProperty("/finalDataSecB/" + wages.index + "/dropdownWage", wages.wageData)
                                                    })
                                            }.bind(this));
                                        }
                                    })
                                    .catch((e) => { console.log(e); })
                            }
                        }.bind(this),
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

                this.getOwnerComponent().getModel("ZSFGTGW_CF01_SRV").read("/zsf_cf01_hSet('" + formid + "')/hdr_to_comm_row_nav?$format=json", {
                    success: function (oData) {
                        if (oData.results.length > 0) {
                            this.getView().getModel("oneModel1").setProperty("/ShowBtnData", oData.results);
                        }
                    }.bind(this),
                    error: function (oData) {
                        console.log("Error S4h")
                    }
                });
            },

            convertS4Date: function (date1) {
                if (date1) {
                    return date1.split("/").reverse().join("-");
                }
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

            findApprover: function (orgCode) {
                return new Promise(
                    function (resolve, reject) {
                        $.ajax({
                            url: serviceUrl + "/odata/v2/cust_ZFLM_MULTI_USER_NEW?$filter=cust_Organization eq '" + orgCode + "' and cust_Role eq 'A'&$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                                if (data.d.results.length != 0) {
                                    managerId = data.d.results[0].externalName;
                                    resolve(data.d.results[0].externalName);
                                } else reject("No approver is maintained for selected organisation.");
                            }.bind(this),
                            error: function (e) {
                                console.log("error: " + e);
                                reject(e.responseText);
                            }
                        });
                    }.bind(this))
            },

            onOrgChange: function (oEvent) {
                var oModel = this.getView().getModel("oneModel1");
                if (oEvent.getSource().getSelectedItem() != null) {
                    if (oModel.getProperty("/lastSelectedOrg") && oModel.getProperty("/lastSelectedOrg") != oEvent.getSource().getSelectedItem().getKey()) {
                        MessageBox.warning(`Changing the organization will erase all form data.
                            Do you want to proceed?`, {
                            actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                            emphasizedAction: sap.m.MessageBox.Action.NO,
                            onClose: function (oAction) {
                                oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                                if (oAction === sap.m.MessageBox.Action.YES) {
                                    var orgCode = oEvent.getSource().getSelectedItem().getKey();
                                    // finding if the selected org has any approver
                                    this.findApprover(orgCode)
                                        .then(() => {
                                            // Setting this so that if user selects No, I can replace the org
                                            oModel.setProperty("/lastSelectedOrg", orgCode);

                                            // preparing the data for employee dropdown
                                            this.checkingG4School(orgCode, this, false);
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
                                                this._getEmplData(orgCode, LastDateISO, FirstDateISO);
                                            }

                                            // clearing out the Data
                                            var secAData = [{
                                                counter: 1,
                                                empName: "",
                                                PersonID: "",
                                                jobTitle: "",
                                                CustomString1: "",
                                                PayComponentCode: "",
                                                NumberOfUnits: "",
                                                Value: "",
                                                enableWage: false,
                                                enableRate: false,
                                                enableUnit: false
                                            }];
                                            oModel.setProperty("/finalData", secAData);

                                            var secBData = [{
                                                counter: 1,
                                                empName: "",
                                                PersonID: "",
                                                jobTitle: "",
                                                CustomString1: "",
                                                PayComponentCode: "",
                                                NumberOfUnits: "",
                                                Value: "",
                                                enableWage: false,
                                                enableRate: false,
                                                enableUnit: false
                                            }];
                                            oModel.setProperty("/finalDataSecB", secBData);
                                        })
                                        .catch((e) => { MessageBox.error(e); oEvent.getSource().setValueState(sap.ui.core.ValueState.Error); });
                                }
                                else {
                                    this.getView().byId("idOrgName").setSelectedKey(oModel.getProperty("/lastSelectedOrg"));
                                }
                            }.bind(this)
                        });
                    }
                    else {
                        oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                        var orgCode = oEvent.getSource().getSelectedItem().getKey();
                        this.findApprover(orgCode)
                            .then(() => {
                                oModel.setProperty("/lastSelectedOrg", orgCode);
                                var sMonthIndex = this.getView().byId("_IDGenComboBox1").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox1").getSelectedItem().getKey() : this.getView().byId("_IDGenComboBox1").getSelectedKey();
                                // Repeating the code as I'm not able to use brain RN
                                this.checkingG4School(orgCode, this, false);
                                if (sMonthIndex != "") {
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
                            })
                            .catch((e) => { MessageBox.error(e); oEvent.getSource().setValueState(sap.ui.core.ValueState.Error); });
                    }
                }
                else {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                    MessageBox.error("Please select a valid Organization");
                }
            },

            checkingG4School: function (org, _self, s4Field) {
                if (org) {
                    if (s4Field)
                        org = org.split("(")[1].split(")")[0]
                    $.ajax({
                        url: serviceUrl + "/odata/v2/cust_PersonnelArea?$filter= externalCode eq '" + org + "'&$format=json",
                        type: 'GET',
                        contentType: "application/json",
                        success: function (data) {
                            if (data.d.results.length > 0 && data.d.results[0].cust_PayrollArea == "G4")
                                _self.getView().byId("_IDGenPanel5").setVisible(true);
                            else
                                _self.getView().byId("_IDGenPanel5").setVisible(false);
                        }.bind(this),
                        error: function (e) {
                            console.log(e);
                        }
                    });
                }
            },

            onEmplChange: function (oEvent) {
                var oModel = this.getView().getModel("oneModel1");
                var oBind = oEvent.getSource().getBindingContext("oneModel1")
                if (oEvent.getSource().getValue()) {
                    var emp1 = oEvent.getSource().getSelectedItem();
                    if (emp1) {
                        sap.ui.core.BusyIndicator.show();
                        oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                        this.controlFields(oModel, oBind.getPath(), true, true, true, false, false, false);
                        var emp = emp1.getKey();
                        oModel.setProperty(oBind.getPath() + "/PersonID", emp);
                        $.ajax({
                            url: serviceUrl + "/odata/v2/EmpJob?$filter=userId eq '" + emp + "'&$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                                var personnelArea = data.d.results[0].customString3;
                                var perSubArea = data.d.results[0].customString4;
                                var subGroupCode = data.d.results[0].employmentType
                                var subGroup = oModel.getProperty("/EmpSubGrp").filter((el) => el.optionId == subGroupCode)[0].externalCode;
                                this.getWages(emp, personnelArea, perSubArea, subGroup, "A")
                                    .then((wages) => {
                                        oModel.setProperty(oBind.getPath() + "/dropdownWage", wages.wageData)
                                        this.controlFields(oModel, oBind.getPath(), false, true, true, true, false, false);
                                        sap.ui.core.BusyIndicator.hide();
                                    })
                                    .catch((e) => { MessageBox.error(e); sap.ui.core.BusyIndicator.hide(); })
                            }.bind(this),
                            error: function () {
                                sap.ui.core.BusyIndicator.hide();
                            }
                        });
                    } else {
                        oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                        this.controlFields(oModel, oBind.getPath(), true, true, true, false, false, false);
                        oModel.setProperty(oBind.getPath() + "/PersonID", "");
                    }
                } else {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                    this.controlFields(oModel, oBind.getPath(), true, true, true, false, false, false);
                    oModel.setProperty(oBind.getPath() + "/PersonID", "");
                }
            },

            controlFields: function (oModel, sPath, bClearWage, bClearAmount, bClearUnit, bEnableWage, bEnableAmount, bEnableUnit) {
                bClearWage ? oModel.setProperty(sPath + "/PayComponentCode", "") : "";
                bClearAmount ? oModel.setProperty(sPath + "/Value", "") : "";
                bClearUnit ? oModel.setProperty(sPath + "/NumberOfUnits", "") : "";
                oModel.setProperty(sPath + "/enableWage", bEnableWage);
                oModel.setProperty(sPath + "/enableRate", bEnableAmount);
                oModel.setProperty(sPath + "/enableUnit", bEnableUnit);
            },

            getWages: function (userId, perArea, perSubArea, empSubGrp, section, index) {
                return new Promise(
                    function (resolve, reject) {
                        var url = serviceUrl + "/odata/v2/cust_ZFLM_WAGTYPES_SC?$filter=externalName eq '" + perArea + "' and cust_PersSubarea eq '" + perSubArea + "' and cust_ESG eq '" + empSubGrp + "' and cust_FSection eq '" + section + "' &$format=json";
                        $.ajax({
                            url: url,
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                                if (data.d.results.length == 0) {
                                    reject("No wage types are assigned for this employee. Please call ContactUs on 01452 425888 if you believe this to be in error");
                                    return;
                                }
                                else {
                                    // checking the continuous start date of the employee
                                    this.forWageCheck(data.d.results, userId)
                                        .then((resp) => {
                                            this.batchSF("/FOPayComponent", "externalCode", "cust_WageType", resp)
                                                .then((resp) => {
                                                    if (resp) {
                                                        var wageData = [];
                                                        resp.forEach(function (oItem) {
                                                            wageData.push(oItem.data.results[0]);
                                                        });
                                                        wageData.sort((a, b) => {
                                                            // sort by code
                                                            if (a.externalCode < b.externalCode) return -1;
                                                            if (a.externalCode > b.externalCode) return 1;
                                                        })
                                                        resolve({ wageData: wageData, index: index });
                                                        return;
                                                    }
                                                })
                                        });
                                }
                            }.bind(this),
                            error: function (e) {
                                reject(e);
                            }
                        });
                    }.bind(this));
            },

            forWageCheck: function (wages, userId) {
                return new Promise(
                    function (resolve, reject) {
                        $.ajax({
                            url: serviceUrl + "/odata/v2/EmpEmployment?$filter=userId eq '" + userId + "'&$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                                if (data.d.results[0].originalStartDate) {
                                    const contStartDate = new Date(this.unixDateRegex(data.d.results[0].originalStartDate));
                                    const todayDate = new Date();
                                    const timeDifference = (todayDate.getTime() - contStartDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
                                    var over5YearFlag = timeDifference > 5 ? true : false;
                                    this.batchSF("cust_ZFLM_WAGCHECK", "cust_WageType", "cust_WageType", wages)
                                        .then((resp) => {
                                            if (resp) {
                                                var wageData = [];
                                                resp.forEach(function (oItem) {
                                                    if (oItem.data.results.length > 0) {
                                                        if (oItem.data.results[0].cust_IndicatorMinYears && over5YearFlag)
                                                            wageData.push({ cust_WageType: oItem.data.results[0].cust_WageType });
                                                        if (oItem.data.results[0].cust_InsicatorMaxYears && !over5YearFlag)
                                                            wageData.push({ cust_WageType: oItem.data.results[0].cust_WageType });
                                                        if (!(oItem.data.results[0].cust_InsicatorMaxYears || oItem.data.results[0].cust_IndicatorMinYears)) {
                                                            wageData.push({ cust_WageType: oItem.data.results[0].cust_WageType });
                                                        }
                                                    }
                                                });
                                                resolve(wageData);
                                                return;
                                            }
                                        });
                                } else resolve(wages);
                            }.bind(this),
                            error: function () {
                                sap.ui.core.BusyIndicator.hide();
                            }
                        });
                    }.bind(this))
            },

            batchSF: function (entitySet, filter, element, batchArr) {
                return new Promise(
                    function (resolve) {
                        let a = new sap.ui.model.odata.ODataModel(serviceUrl + "/odata/v2", true);
                        a.bTokenHandling = false;
                        let batchData = [];
                        a.clearBatch();
                        batchArr.forEach(function (oItem) {
                            batchData.push(a.createBatchOperation(
                                `${entitySet}?$filter=${filter} eq '${oItem[element]}'`,
                                "GET"
                            ));
                        });
                        a.addBatchReadOperations(batchData);
                        a.setUseBatch(true);
                        a.submitBatch(function (data) {
                            resolve(data.__batchResponses);
                        });
                    }.bind(this));
            },

            floatValidation: function (oEvent) {
                var value = oEvent.getParameter("newValue");
                var regex = /^\d*\.?\d*$/g;
                if (!regex.test(value)) {
                    oEvent.getSource().setValue(value.slice(0, value.length - 1));
                }
            },

            _logCreation: async function (status, formOwner) {

                if (!this.managerName) {
                    var empName, salutation;
                    await $.ajax({
                        url: serviceUrl + "/odata/v2/PerPerson(personIdExternal='" + managerId + "')/personalInfoNav?$format=json",
                        type: 'GET',
                        contentType: "application/json",
                        success: function (data) {       //first name, last name Etc.
                            console.log("success PerPerson for Manager");
                            empName = data.d.results[0].firstName + " " + data.d.results[0].lastName;
                            salutation = data.d.results[0].salutation;
                        }.bind(this),
                        error: function (e) {
                            console.log("error: " + e);
                        }
                    });

                    await $.ajax({
                        url: serviceUrl + "/odata/v2/PicklistOption(" + salutation + "L)/picklistLabels?$format=json",
                        type: 'GET',
                        contentType: "application/json",
                        success: function (data) {       //first name, last name Etc.
                            this.managerName = data.d.results[0].label + " " + empName;
                        }.bind(this),
                        error: function (e) {
                            console.log("error: " + e);
                        }
                    });
                }
                var log_payload = {
                    "Formid": this.getView().byId("idFormId").getValue(),
                    "StartedOn": new Date(this.getView().byId("IDDate").getValue()).toLocaleDateString('en-GB'),
                    "Status": status,
                    "Type": "CF01",
                    "OrganizationName": this.getView().getModel("oneModel1").getProperty("/jobInfo").d.results[0].customString3,
                    "OrgCode": this.getView().getModel("oneModel1").getProperty("/jobInfo").d.results[0].customString3.match(/\((.*?)\)/)[1],
                    "Initiator": this.getView().byId("idInitator").getValue(),
                    "InitCode": initiatorCode,
                    "Description": "Schools Claims Form",
                    "FormOwner": status == "S" ? this.managerName : this.getView().byId("idInitator").getValue(),
                    "FormOwnerCode": status == "S" ? managerId : initiatorCode,
                    "ApproverName": this.managerName,
                    "ApproverCode": managerId,
                    "AvailableFrom": new Date().toLocaleDateString('en-GB'),
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
                var oModel = this.getView().getModel("oneModel1");
                var oBind = oEvent.getSource().getBindingContext("oneModel1");
                var sPath = oBind.getPath();
                if (oEvent.getSource().getValue()) {
                    sap.ui.core.BusyIndicator.show();
                    var userId = (oEvent.getParameter("newValue")).padStart(8, '0');
                    oEvent.getSource().setValue(userId);
                    this.controlFields(oModel, sPath, true, true, true, false, false, false);
                    $.ajax({
                        url: serviceUrl + "/odata/v2/EmpJob?$filter=userId eq '" + userId + "' and (employmentType eq '1041' or employmentType eq '1018') &$format=json",
                        type: 'GET',
                        contentType: "application/json",
                        success: function (data) {
                            if (data.d.results.length == 0) {
                                oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                                oModel.setProperty(sPath + "/empName", "Not Found");
                                this.controlFields(oModel, sPath, true, true, true, false, false, false);
                                sap.ui.core.BusyIndicator.hide();
                            }
                            else if (data.d.results[0].payGroup != 'G4') {
                                oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                                oModel.setProperty(sPath + "/empName", "Not Found");
                                this.controlFields(oModel, sPath, true, true, true, false, false, false);
                                sap.ui.core.BusyIndicator.hide();
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
                                                var subGroup = this.getView().getModel("oneModel1").getProperty("/EmpSubGrp").filter((el) => el.optionId == subGroupCode)[0].externalCode;
                                                this.getWages(userId, personnelArea, perSubArea, subGroup, "B")
                                                    .then((wages) => {
                                                        oModel.setProperty(sPath + "/dropdownWage", wages.wageData)
                                                        this.controlFields(oModel, sPath, false, true, true, true, false, false);
                                                        sap.ui.core.BusyIndicator.hide();
                                                    })
                                                    .catch((e) => { MessageBox.error(e); sap.ui.core.BusyIndicator.hide(); })
                                            }.bind(this),
                                            error: function (data) {
                                                console.log("error");
                                                this.controlFields(oModel, sPath, true, true, true, false, false, false);
                                                sap.ui.core.BusyIndicator.hide();
                                            }
                                        });
                                    }.bind(this),
                                    error: function (data) {
                                        console.log("error");
                                        oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                                        oModel.setProperty(sPath + "/empName", "Not Found");
                                        this.controlFields(oModel, sPath, true, true, true, false, false, false);
                                        sap.ui.core.BusyIndicator.hide();
                                    }.bind(this)
                                });
                            }
                            else {
                                oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                                oModel.setProperty(sPath + "/empName", "Not Found");
                                this.controlFields(oModel, sPath, true, true, true, false, false, false);
                                sap.ui.core.BusyIndicator.hide();
                            }
                        }.bind(this),
                        error: function () {
                            console.log("Error");
                            this.controlFields(oModel, sPath, true, true, true, false, false, false);
                            sap.ui.core.BusyIndicator.hide();
                        }
                    });
                } else {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                    oModel.setProperty(sPath + "/empName", "");
                    this.controlFields(oModel, sPath, true, true, true, false, false, false);
                }
            },

            onWageChange: function (oEvent) {
                if (oEvent.getSource().getValue()) {
                    if (oEvent.getSource().getSelectedItem()) {
                        oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                        var oBind = oEvent.getSource().getBindingContext("oneModel1");
                        var wage = oEvent.getSource().getSelectedKey();
                        var sPath = oBind.getPath();
                        var oModel = this.getView().getModel("oneModel1");
                        this.controlFields(oModel, sPath, false, true, true, true, false, false);
                        $.ajax({
                            url: serviceUrl + "/odata/v2/cust_ZFLM_WAGCHECK?$filter=cust_WageType eq '" + wage + "' &$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                                var wagechk = data.d.results[0];
                                if (wagechk.cust_IndicatorRate == "X" && wagechk.cust_IndicatorUnits == "X") {
                                    this.controlFields(oModel, sPath, false, true, true, true, true, true);
                                }
                                else if (wagechk.cust_IndicatorRate == "X") {
                                    this.controlFields(oModel, sPath, false, true, true, true, true, false);
                                }
                                else if (wagechk.cust_IndicatorUnits == "X") {
                                    this.controlFields(oModel, sPath, false, true, true, true, false, true);
                                };
                            }.bind(this),
                            error: function () {

                            }
                        });
                    }
                    else oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                } else oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
            },

            onAmtUnitChange: function (oEvent) {
                if (oEvent.getSource().getValue()) {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                    var nAmount = Number(oEvent.getSource().getValue());
                    var oBind = oEvent.getSource().getBindingContext("oneModel1");
                    var wage = oBind.getProperty("PayComponentCode").split(" - ")[0];
                    $.ajax({
                        url: serviceUrl + "/odata/v2/cust_ZFLM_WAGCHECK?$filter=cust_WageType eq '" + wage + "' &$format=json",
                        type: 'GET',
                        contentType: "application/json",
                        success: function (data) {
                            var wagechk = data.d.results[0];
                            if (oEvent.getSource().getTooltip().includes("amount")) {
                                if (nAmount != 0 && nAmount > +wagechk.cust_MaxRate) {
                                    oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                                    oEvent.getSource().setValueStateText(`Amount cannot exceed ${+wagechk.cust_MaxRate}`);
                                }
                                else {
                                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None)
                                    oEvent.getSource().setValue(nAmount.toString().includes(".") ? nAmount.toFixed(2) : nAmount);
                                    oEvent.getSource().setValueStateText(`Amount is a required field`);
                                }
                            }
                            else {
                                if (nAmount != 0 && nAmount > +wagechk.cust_Number) {
                                    oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                                    oEvent.getSource().setValueStateText(`Units/Hours cannot exceed ${+wagechk.cust_Number}`);
                                }
                                else {
                                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None)
                                    oEvent.getSource().setValue(nAmount.toString().includes(".") ? nAmount.toFixed(2) : nAmount);
                                    oEvent.getSource().setValueStateText(`Units/Hours is a required field`);
                                }
                            };
                        },
                        error: function () {

                        }
                    });
                } else {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                    if (oEvent.getSource().getTooltip().includes("amount"))
                        oEvent.getSource().setValueStateText(`Amount is a required field`);
                    else oEvent.getSource().setValueStateText(`Units/Hours is a required field`);
                }
            },

            SecAaddRow: function () {
                var oModel = this.getView().getModel("oneModel1").getProperty("/finalData");
                var len = oModel.length;
                var secAData = {
                    counter: oModel[len - 1].counter + 1,
                    empName: "",
                    PersonID: "",
                    jobTitle: "",
                    CustomString1: "",
                    PayComponentCode: "",
                    NumberOfUnits: "",
                    Value: "",
                    enableWage: false,
                    enableRate: false,
                    enableUnit: false,
                    showButEnab: true
                };
                oModel.push(secAData);
                this.getView().getModel("oneModel1").setProperty("/finalData", oModel);
            },

            SecAdelRow: function () {
                var oTable = this.getView().byId("_IDGenTable1");
                var oProperty = this.getView().getModel("oneModel1").getProperty("/finalData");
                var aSelectedItems = oTable.getSelectedItems();
                for (var i = aSelectedItems.length - 1; i >= 0; i--) {
                    var aCells = aSelectedItems[i].getCells();
                    aCells.forEach(function (oCell) {
                        if (oCell.isA("sap.m.Input") || oCell.isA("sap.m.ComboBox")) {
                            oCell.setValueState(sap.ui.core.ValueState.None);
                        }
                    })
                    var oItem = aSelectedItems[i];
                    var iIndex = oTable.indexOfItem(oItem);
                    oProperty.splice(iIndex, 1);
                }
                oTable.removeSelections();
                if (oProperty.length == 0) {
                    var oProperty = [{
                        counter: 1,
                        empName: "",
                        PersonID: "",
                        jobTitle: "",
                        CustomString1: "",
                        PayComponentCode: "",
                        NumberOfUnits: "",
                        Value: "",
                        enableWage: false,
                        enableRate: false,
                        enableUnit: false,
                        showButEnab: true
                    }];
                    this.getView().byId("_IDGenInput1").setValueState(sap.ui.core.ValueState.None);
                }
                this.getView().getModel("oneModel1").setProperty("/finalData", oProperty);
            },

            SecBaddRow: function () {
                var oModel = this.getView().getModel("oneModel1").getProperty("/finalDataSecB");
                var len = oModel.length;
                var secBData = {
                    counter: oModel[len - 1].counter + 1,
                    empName: "",
                    PersonID: "",
                    jobTitle: "",
                    CustomString1: "",
                    PayComponentCode: "",
                    NumberOfUnits: "",
                    Value: "",
                    enableWage: false,
                    enableRate: false,
                    enableUnit: false,
                    showButEnab: true
                };
                oModel.push(secBData);
                this.getView().getModel("oneModel1").setProperty("/finalDataSecB", oModel);
            },

            SecBdelRow: function () {
                var oTable = this.getView().byId("_IDGenTable2");
                var oProperty = this.getView().getModel("oneModel1").getProperty("/finalDataSecB");
                var aSelectedItems = oTable.getSelectedItems();
                for (var i = aSelectedItems.length - 1; i >= 0; i--) {
                    var aCells = aSelectedItems[i].getCells();
                    aCells.forEach(function (oCell) {
                        if (oCell.isA("sap.m.Input")) {
                            oCell.setValueState(sap.ui.core.ValueState.None);
                        }
                    })
                    var oItem = aSelectedItems[i];
                    var iIndex = oTable.indexOfItem(oItem);
                    oProperty.splice(iIndex, 1);
                }
                oTable.removeSelections();
                if (oProperty.length == 0) {
                    var oProperty = [{
                        counter: 1,
                        empName: "",
                        PersonID: "",
                        jobTitle: "",
                        CustomString1: "",
                        PayComponentCode: "",
                        NumberOfUnits: "",
                        Value: "",
                        enableWage: false,
                        enableRate: false,
                        enableUnit: false,
                        showButEnab: true
                    }];
                    this.getView().byId("_IDGenInput6").setValueState(sap.ui.core.ValueState.None);
                }
                this.getView().getModel("oneModel1").setProperty("/finalDataSecB", oProperty);
            },

            onShowBut: function (oEvent) {
                if (!this._oShowDialog) {
                    this._oShowDialog = sap.ui.xmlfragment("com.gcc.claimsqa.cf01qa.fragment.Showbut", this);
                    this.getView().addDependent(this._oShowDialog);
                }
                var sPath = oEvent.getSource().getBindingContext("oneModel1").getPath();
                this.rowId = (Number(sPath.split("/")[2]) + 1).toString();
                this.Section = sPath.includes("SecB") ? "B" : "A";
                var commData = this.getView().getModel("oneModel1").getProperty("/ShowBtnData");
                if (commData == undefined || commData == []) {
                    this.getView().getModel("oneModel1").setProperty("/ShowBtnData", []);
                }
                else {
                    var commentExist = commData.filter((el) => el.SeqNumber == this.rowId && el.Section == this.Section);
                    if (commentExist.length != 0) {
                        this.getView().getModel("oneModel1").setProperty("/rowComment", commentExist[0].comment);
                    }
                }
                this._oShowDialog.open();
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

                    // var status = this.getView().getModel("oneModel1").getProperty("/historyTable")[this.getView().getModel("oneModel1").getProperty("/historyTable").length - 1].StatusCode;
                    // var statusText;
                    // switch (status) {
                    //     case "I":
                    //         statusText = "Initial";
                    //         break;
                    //     case "E":
                    //         statusText = "Draft";
                    //         break;
                    //     case "S":
                    //         statusText = "Submitted";
                    //         break;
                    //     case "R":
                    //         statusText = "Rejected";
                    //         break;
                    //     case "B":
                    //         statusText = "BSC Team";
                    //         break;
                    //     default:
                    //         break;
                    // }
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
                var commentExist = commData.filter((el) => el.SeqNumber == this.rowId && el.Section == this.Section);
                if (commentExist.length != 0) {
                    for (let i = 0; i < commData.length; i++) {
                        if (commData[i].SeqNumber == this.rowId && commData[i].Section == this.Section) {
                            commData.splice(i, 1);
                        }
                    }
                }
                // if (com != "") {
                var temp = {
                    Formid: this.getView().byId("idFormId").getValue(),
                    SeqNumber: this.rowId,
                    Section: this.Section,
                    comment: com ? com : ""
                };
                commData.push(temp);
                this.getView().getModel("oneModel1").setProperty("/ShowBtnData", commData);
                this.getView().getModel("oneModel1").setProperty("/rowComment", "");
                // }
                this._oShowDialog.close();
            },

            payload: function (purpose, delInd, isSubmit) {
                var oModel = this.getView().getModel("oneModel1");
                oModel.setProperty("/MessageLog", []);

                // checking required conditions on submit
                if (isSubmit) {
                    var errorFlag = false;
                    if (!this.getView().byId("_IDGenComboBox1").getSelectedKey()) {
                        errorFlag = true;
                        this._messLog("Enter a valid Claim Month");
                    }
                    if (oModel.getProperty("/finalData").length == 1 && oModel.getProperty("/finalData")[0].PersonID == "" && oModel.getProperty("/finalDataSecB").length == 1 && oModel.getProperty("/finalDataSecB")[0].PersonID == "") {
                        errorFlag = true;
                        this._messLog("A claim form must have at least one claim item");
                    }
                    // else {
                    var aControls = this.getView().getControlsByFieldGroupId("checkSecA");
                    aControls.forEach(function (oControl) {
                        if (oControl.getId != undefined && oControl.getId().includes("Input")) {
                            if ((oControl.getValue != undefined && oControl.getValue() == "" && oControl.getRequired != undefined && oControl.getRequired()) || (oControl.getValueState != undefined && oControl.getValueState() === sap.ui.core.ValueState.Error)) {
                                // additional check for amount/unit
                                if (oControl.getEditable != undefined && oControl.getEditable() == true) {
                                    oControl.setValueState(sap.ui.core.ValueState.Error);
                                    errorFlag = true;
                                    this._messLog(oControl.getValueStateText());
                                } else oControl.setValueState(sap.ui.core.ValueState.None);
                            }
                            else if (oControl.getValue != undefined && oControl.getValue() != "") {
                                oControl.setValueState(sap.ui.core.ValueState.None);
                            }
                        }
                    }.bind(this));

                    if (this.getView().byId("_IDGenPanel5").getVisible()) {
                        var aControls = this.getView().getControlsByFieldGroupId("checkSecB");
                        aControls.forEach(function (oControl) {
                            if (oControl.getId != undefined && oControl.getId().includes("Input")) {
                                if ((oControl.getValue != undefined && oControl.getValue() == "" && oControl.getRequired != undefined && oControl.getRequired()) || (oControl.getValueState != undefined && oControl.getValueState() === sap.ui.core.ValueState.Error)) {
                                    // additional check for amount/unit
                                    if (oControl.getEditable != undefined && oControl.getEditable() == true) {
                                        oControl.setValueState(sap.ui.core.ValueState.Error);
                                        errorFlag = true;
                                        this._messLog(oControl.getValueStateText());
                                    }
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
                    var data = oModel.getProperty("/finalData");
                    var manager = this.managerId(managerId);
                    var finalData = [];
                    if (data.length == 1 && data[0].empName == undefined) {
                    }
                    else {
                        let seqNumber = 0;
                        for (let i = 0; i < data.length; i++) {
                            if (data[i].PersonID) {
                                seqNumber++;
                                var perId = data[i].PersonID;
                                var wage = data[i].PayComponentCode.split(" - ");
                                var secA = {
                                    "SeqNumber": seqNumber.toString(),
                                    "Formid": this.getView().byId("idFormId").getValue() != null ? this.getView().byId("idFormId").getValue() : "",
                                    "Perid": perId != null ? perId : "",
                                    "EmployeeName": data[i].empName != null ? data[i].empName : "",
                                    "WageType": wage[0] && wage[1] ? wage[0] + " - " + wage[1] : "",
                                    "WageTypeCode": wage[0] ? wage[0] : "",
                                    "WageTypeTxt": wage[1] ? wage[1] : "",
                                    "Amount": data[i].Value != null ? data[i].Value : "",
                                    "Unit": data[i].NumberOfUnits != null ? data[i].NumberOfUnits : "",
                                    "EnableAmount": data[i].enableRate ? "X" : "",
                                    "EnableUnit": data[i].enableUnit ? "X" : ""
                                }
                                finalData.push(secA);
                            }
                        }
                    }
                    var data1 = oModel.getProperty("/finalDataSecB");
                    var finalDataSecB = [];
                    if (this.getView().byId("_IDGenPanel5").getVisible()) {
                        if (data1.length == 1 && data1[0].empName == undefined) {
                        }
                        else {
                            let seqNumber = 0;
                            for (let i = 0; i < data1.length; i++) {
                                if (data1[i].PersonID) {
                                    seqNumber++;
                                    var wage = data1[i].PayComponentCode.split(" - ");
                                    var secB = {
                                        "SeqNumber": seqNumber.toString(),
                                        "Formid": this.getView().byId("idFormId").getValue() != null ? this.getView().byId("idFormId").getValue() : "",
                                        "Perid": data1[i].PersonID != null ? data1[i].PersonID : "",
                                        "EmployeeName": data1[i].empName != null ? data1[i].empName : "",
                                        "WageType": wage[0] + wage[1] ? wage[0] + " - " + wage[1] : "",
                                        "WageTypeCode": wage[0] ? wage[0] : "",
                                        "WageTypeTxt": wage[1] ? wage[1] : "",
                                        "Amount": data1[i].Value != null ? data1[i].Value : "",
                                        "Unit": data1[i].NumberOfUnits != null ? data1[i].NumberOfUnits : "",
                                        "EnableAmount": data1[i].enableRate ? "X" : "",
                                        "EnableUnit": data1[i].enableUnit ? "X" : ""
                                    }
                                    finalDataSecB.push(secB);
                                }
                            }
                        }
                    }
                    var jsonData = {
                        //Header Section
                        "Formid": this.getView().byId("idFormId").getValue() != null ? this.getView().byId("idFormId").getValue() : "",
                        "Initiator": this.getView().byId("idInitator").getValue() != null ? this.getView().byId("idInitator").getValue() : "",
                        "Ardate": this.getView().byId("IDDate").getValue() != null ? new Date(this.getView().byId("IDDate").getValue()).toLocaleDateString('en-GB') : "",
                        "OrganisationName": this.getView().byId("idOrgName").getValue() != null ? this.getView().byId("idOrgName").getValue() : "",
                        "CostCenter": this.CcCode,
                        "CostCenterDis": this.getView().byId("idCostCentre").getValue() != null ? this.getView().byId("idCostCentre").getValue() : "",
                        "ClaimMonth": this.getView().byId("_IDGenComboBox1").getValue() != null ? this.getView().byId("_IDGenComboBox1").getValue() : "",
                        "ClaimEndDate": this.getView().byId("DP12").getValue() != null ? new Date(this.getView().byId("DP12").getValue()).toLocaleDateString('en-GB') : "",
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
                        ],
                        "hdr_to_comm_row_nav": this.getView().getModel("oneModel1").getProperty("/ShowBtnData")
                    };
                }
                return jsonData

            },

            onPrint: function () {
                var jsonData = this.payload("P", "", false);
                this.getOwnerComponent().getModel("ZSFGTGW_CF01_SRV").create("/zsf_cf01_hSet", jsonData, {
                    success: function (oData) {
                        var s4url = this.getOwnerComponent().getModel("ZSFGTGW_CF01_SRV").sServiceUrl;    // Give your service name
                        var FormID = this.getView().byId("idFormId").getValue();      // Give your FormID
                        var sSource = s4url + "/zsf_cf01_printSet(Formid='" + FormID + "')/$value";
                        window.open(sSource, "_blank");
                    }.bind(this),
                    error: function (e) {
                        //MessageBox.error("Error");
                        MessageBox.error(JSON.parse(e.responseText).error.message.value);
                    }
                });
            },

            _messLog: function (message) {
                var obj = {
                    "Icon": "sap-icon://status-error",
                    "Message": message,
                }
                let logMessage = this.getView().getModel("oneModel1").getProperty("/MessageLog");
                logMessage.push(obj);
                this.getView().getModel("oneModel1").setProperty("/MessageLog", logMessage);
            },

            onMonthChange: function (oEvent) {
                if (oEvent.getSource().getSelectedItem() != null) {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                    sap.ui.core.BusyIndicator.show();
                    var sMonthIndex = oEvent.getSource().getSelectedItem().getKey();
                    var sMonthYear = oEvent.getSource().getSelectedItem().getText();
                    var sYear = sMonthYear.split(" ")[1];
                    var LastDate = new Date(sYear, sMonthIndex, 0);
                    // // setting last date 30 min before to solve FT-905
                    // LastDate.setTime(LastDate.getTime() + 1);
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
                            this.getOwnerComponent().getModel("ZSFGTGW_CF01_SRV").remove(`/zsf_cf01_hSet('${this.getView().byId("idFormId").getValue()}')`, {
                                success: function (oData) {
                                    var initiator = this.getView().getModel("oneModel1").getProperty("/personalInfo").d.results[0]
                                    this._logCreation("D", initiator.firstName + " " + initiator.lastName);
                                    MessageBox.success("Form Deleted Successfully", {
                                        actions: [MessageBox.Action.OK],
                                        emphasizedAction: MessageBox.Action.OK,
                                        onClose: function (sAction) {
                                            if (sAction == MessageBox.Action.OK) {
                                                if (this.query)
                                                    window.parent.close();
                                                else
                                                    window.history.go(-1);
                                            }
                                        }.bind(this)
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
                            var jsonData = this.payload("I", "", true);
                            var messArr = this.getView().getModel("oneModel1").getProperty("/MessageLog");
                            if (messArr.length != 0) {
                                sap.ui.core.BusyIndicator.hide();
                                this.oMessage = sap.ui.xmlfragment("com.gcc.claimsqa.cf01qa.fragment.logMessage", this);
                                this.getView().addDependent(this.oMessage);
                                this.oMessage.open();
                            }
                            else {
                                this.getOwnerComponent().getModel("ZSFGTGW_CF01_SRV").create("/zsf_cf01_hSet", jsonData, {
                                    success: function (oData) {
                                        var user = this.getView().getModel("oneModel1").getProperty("/user");
                                        var appUrl = window.location.origin + "/site?siteId=" + window.location.search.split("siteId=")[1].split("&")[0] + window.location.hash.split("Display")[0] + "Display";
                                        var reqUrl = appUrl.includes("GCC_SemObj") ? appUrl + "&/?formId=" : appUrl + "#?formId=";
                                        var payload = {
                                            "definitionId": "eu10.gccdev.eforms.CF01",
                                            "context": {
                                                "FormID": this.getView().byId("idFormId").getValue(),
                                                "formlinkapprover": reqUrl + this.getView().byId("idFormId").getValue() + "&mode=display",
                                                "formlinkinitiator": reqUrl + this.getView().byId("idFormId").getValue() + "&mode=initiator",
                                                "initiator": user.email
                                            }
                                        };
                                        this.onPressTiggerWF(payload);
                                    }.bind(this),
                                    error: function (e) {
                                        MessageBox.error(JSON.parse(e.responseText).error.message.value);
                                        sap.ui.core.BusyIndicator.hide();
                                    }
                                });
                            }
                        }
                    }.bind(this)
                });
            },

            onSave: function (oEvent) {

                var jsonData = this.payload("I", "", false);

                this.getOwnerComponent().getModel("ZSFGTGW_CF01_SRV").create("/zsf_cf01_hSet",
                    jsonData, {

                    success: function (oData) {
                        var initiator = this.getView().getModel("oneModel1").getProperty("/personalInfo").d.results[0]
                        this._logCreation("E", initiator.firstName + " " + initiator.lastName);
                        MessageBox.success(`Form: ${this.getView().byId("idFormId").getValue()} saved successfully!`, {
                            onClose: function (oAction) {
                                if (this.query) window.parent.close();
                            }.bind(this)
                        });
                    }.bind(this),
                    error: function (e) {
                        //MessageBox.error("Error");
                        MessageBox.error(JSON.parse(e.responseText).error.message.value);
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
                    if (data) {
                        console.log("Workflow has been triggered and Form has been Submitted");
                        var initiator = this.getView().getModel("oneModel1").getProperty("/personalInfo").d.results[0]
                        this._logCreation("S", initiator.firstName + " " + initiator.lastName);
                        sap.ui.core.BusyIndicator.hide();
                        MessageBox.success(`Form: ${this.getView().byId("idFormId").getValue()} is submitted successfully!
                        
                        Please call ContactUs on 01452 425888 should you have any queries regarding this e-Form.`, {
                            title: "Success Message",
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
                            if (this.query) window.parent.close();
                            else window.history.go(-1);
                        }
                    }.bind(this)
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
                                "StatusCode": oData.results[i].StatusCode
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