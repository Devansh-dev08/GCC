sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/core/routing/History",
    "../model/formatter"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, MessageBox, History, formatter) {
        "use strict";
        var serviceUrl = "";

        let managerId = "", initiatorCode = "", warningFlag = false;
        return Controller.extend("com.gcc.absenceqa.ar02qa.controller.View1", {
            formatter: formatter,
            onInit: function () {
                var link = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("SchoolsnetLink")
                var text = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("IntroText1")
                this.getView().byId("text09").setHtmlText("<p>" + text + "<a title=" + link + " href=\"" + link + "\"</a> Schoolsnet pages.</p>")
                serviceUrl = sap.ui.require.toUrl(this.getOwnerComponent().getManifestEntry('/sap.app/id').replaceAll('.', '/'));
                window.onbeforeunload = function (e) {
                    e = e || window;
                    if (warningFlag) {
                        if (confirm("Data will be lost") == false) {
                            //avoid closing
                            e.preventDefault()
                            e.stopPropagation()
                        }
                    }
                };
                this.getOwnerComponent().getRouter().getRoute("RouteView1").attachPatternMatched(this._onRouteMatched, this);
            },

            getBaseURL: function () {
                var appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
                var appPath = appId.replaceAll(".", "/");
                var appModulePath = jQuery.sap.getModulePath(appPath);
                return appModulePath;
            },

            _onRouteMatched: function (oEvent) {

                var oModel1 = new sap.ui.model.json.JSONModel();
                const url = this.getBaseURL() + "/user-api/currentUser";

                var mock = {
                    firstname: "Dummy",
                    lastname: "User",
                    email: "Devansh.agarwal@hcl.com",
                    name: "",
                    displayName: "Dummy User (dummy.user@com)"
                };

                oModel1.loadData(url);
                oModel1.dataLoaded(oModel1)
                    .then(() => {
                        if (!oModel1.getData().email) {
                            oModel1.setData(mock);
                            var useremail = "test00014577@noemail.gloucestershire.gov.uk";
                        }
                        else {
                            var useremail = oModel1.getData().email;
                        }
                        var that = this;
                        var oModel = new sap.ui.model.json.JSONModel();
                        this.getView().setModel(oModel, "AbsData");
                        this.dropdownSF(oModel);
                        var query = oEvent.getParameter('arguments')["?query"];
                        console.log("Hello");
                        if (query != undefined) {
                            var formid = query.formId;
                            oModel.setProperty("/Param", query);
                            if (query.mode == 'display') {
                                this.getView().byId("Delete").setVisible(false);
                                this.getView().byId("Submit").setVisible(false);
                            }
                            else if (query.mode == "initiator") {
                                this.getView().byId("Delete").setVisible(false);
                                this.getView().byId("Submit").setVisible(false);
                            }
                            this.S4Data(oModel, formid, useremail);
                        }

                        else {
                            var query = {
                                formId: "",
                                mode: ""
                            };
                            oModel.setProperty("/Param", query);
                            this.getView().byId("DatePicker01").setDateValue(new Date());
                            //Fetching New Form ID
                            this.getOwnerComponent().getModel("S4hService").read("/ZSFGT_FORMID_GENSet",
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

                            this.SFData(oModel, useremail);

                            var today = new Date();
                            var StartminDate = new Date();
                            StartminDate.setMonth(StartminDate.getMonth() - 2);
                            StartminDate.setDate(1);
                            var Create = [{
                                empName: "",
                                personIdExternal: "",
                                userId: "",
                                timeType: "",
                                timeTypeCode: "",
                                startDate: "",
                                endDate: "",
                                startMinDate: StartminDate,
                                startMaxDate: today,
                                endMinDate: new Date(),
                                description: "",
                                descriptionCode: "",
                                quantityInDays: "",
                                quantityInHours: "",
                                enabledAbs: false,
                                enabledDate: false,
                                enabledDesc: false,
                                enabledLostDays: false,
                                enabledLostHrs: false,
                                valueStateStartDate: "None",
                                valueStateEndDate: "None"
                            }];

                            oModel.setProperty("/CreateNew", Create);
                            that.getView().setModel(oModel, "AbsData");
                        }

                    });
            },

            removeDuplicates: function (array) {
                let unique = [];
                array.forEach(element => {
                    if (!unique.includes(element)) {
                        unique.push(element);
                    }
                });
                return unique;

            },

            dropdownSF: function (oModel) {
                $.ajax({
                    url: serviceUrl + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'SickReason' and status eq 'A' &$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        console.log("success" + data);
                        data.d.results.sort((a, b) => a.label_defaultValue.localeCompare(b.label_defaultValue))
                        // data.d.results = this.removeDuplicates(data.d.results);
                        oModel.setProperty("/dropdownSick", data.d.results);
                    }.bind(this),
                    error: function (e) {
                        console.log("error: " + e);
                    }
                });

                $.ajax({
                    url: serviceUrl + "/odata/v2/AvailableTimeType?$filter=TimeTypeProfile_externalCode eq 'GCC_MAIN' &$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        var code = data.d.results;
                        let a = new sap.ui.model.odata.ODataModel(serviceUrl + "/odata/v2", true);
                        a.bTokenHandling = false;
                        let batchData = [];
                        a.clearBatch();
                        data.d.results.forEach(function (oItem) {
                            batchData.push(a.createBatchOperation(
                                "/TimeType?$filter=externalCode eq '" + oItem.externalCode + "'&$format=json",
                                "GET"
                            ));
                        });
                        a.addBatchReadOperations(batchData);
                        a.setUseBatch(true);
                        a.submitBatch(function (data) {
                            var absTypDropdown = [];
                            for (let i = 0; i < data.__batchResponses.length; i++) {
                                var temp1 = {
                                    externalName_defaultValue: data.__batchResponses[i].data.results[0].externalName_defaultValue,
                                    timeTypeCode: code[i].timeType,
                                    loaStartEventReason: data.__batchResponses[i].data.results[0].loaStartEventReason ? data.__batchResponses[i].data.results[0].loaStartEventReason : ""
                                };
                                absTypDropdown.push(temp1);
                                // dropDown.sort(function (a, b) {
                                //     return b.externalName_defaultValue - a.externalName_defaultValue;
                                // });
                                absTypDropdown.sort((a, b) => a.externalName_defaultValue.localeCompare(b.externalName_defaultValue))
                                oModel.setProperty("/dropdownAbs", absTypDropdown);
                            }
                        });
                    }.bind(this),
                    error: function (e) {
                        console.log("error: " + e);
                    }
                });

                // Salutation dropdown
                $.ajax({
                    url: serviceUrl + "/odata/v2/Picklist('salutation')/picklistOptions?$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        let a = new sap.ui.model.odata.ODataModel(serviceUrl + "/odata/v2", true);
                        a.bTokenHandling = false;
                        let batchData = [];
                        a.clearBatch();
                        data.d.results.forEach(function (oItem) {
                            batchData.push(a.createBatchOperation(
                                "/PicklistOption(" + oItem.id + "L)/picklistLabels?$format=json",
                                "GET"
                            ));
                        });
                        a.addBatchReadOperations(batchData);
                        a.setUseBatch(true);
                        a.submitBatch(function (data) {
                            var salut = [];
                            for (let i = 0; i < data.__batchResponses.length; i++) {
                                var temp = {
                                    id: data.__batchResponses[i].data.results[0].optionId,
                                    text: data.__batchResponses[i].data.results[0].label
                                }
                                salut.push(temp);
                                oModel.setProperty("/salutations", salut);
                            }
                        }.bind(this));
                    }.bind(this),
                    error: function (e) {
                        console.log("error: " + e);
                    }
                });

            },

            S4Data: async function (oModel, formid, useremail) {

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
                        initiatorCode = email.d.results[0].personIdExternal;
                        oModel.setProperty("/user", initDetails);
                    }.bind(this),
                    error: function (data) {
                        console.log("error" + data)
                    }
                });
                var username;
                await $.ajax({
                    url: serviceUrl + "/odata/v2/UserAccount?$format=json&$filter=personIdExternal eq '" + email.d.results[0].personIdExternal + "'",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        console.log("success" + data);
                        username = data.d.results[0].username;
                    },
                    error: function (request) {
                        console.log("Error in fetching Username");
                    }
                });
                await $.ajax({
                    url: serviceUrl + "/odata/v2/cust_ZFLM_MULTI_USERS?$filter=cust_UserName eq '" + username + "'&$format=json",
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
                            this.getView().byId("select08").setEditable(false);
                        }
                    }.bind(this),
                    error: function () {
                        console.log("Error in fetching Multiple Organization");
                    }
                });
                this.getOwnerComponent().getModel("S4hService").read("/ZSFGT_HEADER_AR02Set('" + formid + "')", {
                    success: function (oData) {
                        var name = oData.Initiator.split(" ")
                        var jsonData = [{
                            label: name[0],
                            firstName: name[1],
                            lastName: name[2],
                            customString3: oData.OrganisationName
                        }]
                        oModel.setProperty("/FinalData", jsonData);
                        oModel.setProperty("/PersonDet", { d: { results: [{ firstName: name[1], lastName: name[2], personIdExternal: initiatorCode }] } })
                        this.getView().byId("select08").setSelectedKey(oData.OrganisationCode);
                        this.getView().byId("_IDGenInput2").setValue(oData.Formid);
                        this.getView().byId("_HIDGenFormId1").setValue(oData.Formid);
                        this.getView().byId("DatePicker01").setDateValue(new Date(oData.Ardate));
                        this.getView().byId("checkbox1").setSelected(oData.NotifyApprover == "X" ? true : false);
                        if (oModel.getProperty("/Param").mode != "display")
                            this.dropdownEmp(oData.OrganisationCode, oModel)
                        // $.ajax({
                        //     url: serviceUrl + "/odata/v2/EmpJob?$filter=customString3 eq '" + oData.OrganisationCode + "'&$format=json",
                        //     type: 'GET',
                        //     contentType: "application/json",
                        //     success: function (data) {
                        //         if (data.d.results.length > 0) {
                        //             console.log("success" + data);
                        //         }
                        //     }.bind(this),
                        //     error: function (e) {
                        //         console.log("error: " + e);
                        //     }
                        // });
                    }.bind(this),
                    error: function (oData) {
                        console.log("Error S4h");
                    }
                });

                this.getOwnerComponent().getModel("S4hService").read("/ZSFGT_HEADER_AR02Set('" + formid + "')/HeaderToSectionA_Nav?$format=json", {
                    success: function (oData) {
                        var secA = [];
                        for (var i = 0; i < oData.results.length; i++) {
                            var name = oData.results[i].EmployeeName.split(" ");
                            var jobtitle = "";
                            for (let j = 3; j < name.length; j++) {
                                if (j == 3) jobtitle = name[j];
                                else jobtitle = jobtitle + " " + name[j];
                            }
                            var startDate = this.dateConverter(oData.results[i].AbsenceStartdateInt);
                            var endDate = this.dateConverter(oData.results[i].AbsenceEnddateInt);
                            var Industrial = (!oData.results[i].AbsenceTypeDes.includes("Unpaid Leave") && !oData.results[i].AbsenceTypeDes.includes("Industrial Action"));
                            var Sick = oData.results[i].AbsenceTypeDes.includes("Sickness");
                            var jsonData = {
                                personIdExternal: oData.results[i].Perid,
                                userId: oData.results[i].Userid,
                                label: name[0],
                                firstName: name[1],
                                lastName: name[2].slice(0, -1),
                                jobTitle: jobtitle,
                                externalCode: oData.results[i].ExternalCode,
                                timeType: oData.results[i].AbsenceTypeDes,
                                timeTypeCode: oData.results[i].AbsenceType,
                                startDate: startDate,
                                endDate: endDate,
                                cust_SickReason: oData.results[i].DescIllnessDes,
                                descriptionCode: oData.results[i].DescIllness,
                                quantityInDays: oData.results[i].LostWorkingdays,
                                quantityInHours: oData.results[i].LostWorkinghours,
                                changed: oData.results[i].Changedby == "X" ? true : false,
                                Sick: Industrial,
                                enabledDesc: Sick,
                                enabledLostDays: false,
                                enabledLostHrs: false,
                                valueStateStartDate: "None",
                                valueStateEndDate: "None"
                            };
                            secA.push(jsonData);
                        }
                        this.getView().getModel("AbsData").setProperty("/FinalEmpData", secA);
                    }.bind(this),
                    error: function (oData) {
                        console.log("Error S4h")
                    }
                });

                this.getOwnerComponent().getModel("S4hService").read("/ZSFGT_HEADER_AR02Set('" + formid + "')/HeaderToSectionB_Nav?$format=json", {
                    success: function (oData) {
                        var secB = [];
                        for (var i = 0; i < oData.results.length; i++) {
                            var startDate = this.dateConverter(oData.results[i].AbsenceStartdateInt);
                            var endDate = this.dateConverter(oData.results[i].AbsenceEnddateInt);
                            var Industrial = (!oData.results[i].AbsenceTypeDes.includes("Unpaid Leave") && !oData.results[i].AbsenceTypeDes.includes("Industrial Action"));
                            var Sick = oData.results[i].AbsenceTypeDes.includes("Sickness");
                            var name = oData.results[i].EmployeeName.split(" ")
                            var jobtitle = "";
                            for (let j = 3; j < name.length; j++) {
                                if (j == 3) jobtitle = name[j];
                                else jobtitle = jobtitle + " " + name[j];
                            }
                            var jsonData = {
                                personIdExternal: oData.results[i].Perid,
                                userId: oData.results[i].Userid,
                                label: name[0],
                                firstName: name[1],
                                lastName: name[2].slice(0, -1),
                                jobTitle: jobtitle,
                                externalCode: oData.results[i].ExternalCode,
                                timeType: oData.results[i].AbsenceTypeDes,
                                timeTypeCode: oData.results[i].AbsenceType,
                                startDate: startDate,
                                endDate: endDate,
                                cust_SickReason: oData.results[i].DescIllnessDes,
                                descriptionCode: oData.results[i].DescIllness,
                                quantityInDays: oData.results[i].LostWorkingdays,
                                quantityInHours: oData.results[i].LostWorkinghours,
                                changed: oData.results[i].Changedby == "X" ? true : false,
                                Sick: Industrial,
                                enabledDesc: Sick,
                                enabledLostDays: false,
                                enabledLostHrs: false,
                                valueStateStartDate: "None",
                                valueStateEndDate: "None"
                            };
                            secB.push(jsonData);
                        }
                        this.getView().getModel("AbsData").setProperty("/FinalEmpDataCurr", secB);
                    }.bind(this),
                    error: function (oData) {
                        console.log("Error S4h")
                    }
                });

                this.getOwnerComponent().getModel("S4hService").read("/ZSFGT_HEADER_AR02Set('" + formid + "')/HeaderToSectionC_Nav?$format=json", {
                    success: function (oData) {
                        if (oData.results.length == 0) {
                            var today = new Date();
                            var StartminDate = new Date();
                            StartminDate.setMonth(StartminDate.getMonth() - 2);
                            StartminDate.setDate(1);
                            var Create = [{
                                empName: "",
                                personIdExternal: "",
                                userId: "",
                                timeType: "",
                                timeTypeCode: "",
                                startDate: "",
                                endDate: "",
                                startMinDate: StartminDate,
                                startMaxDate: today,
                                endMinDate: new Date(),
                                description: "",
                                descriptionCode: "",
                                quantityInDays: "",
                                quantityInHours: "",
                                enabledAbs: false,
                                enabledDate: false,
                                enabledDesc: false,
                                enabledLostDays: false,
                                enabledLostHrs: false,
                                valueStateStartDate: "None",
                                valueStateEndDate: "None"
                            }];

                            this.getView().getModel("AbsData").setProperty("/CreateNew", Create);
                        }
                        else {
                            var secC = [];
                            for (var i = 0; i < oData.results.length; i++) {
                                if (oData.results[0].EmployeeName == "") {

                                }
                                else {
                                    var startDate = this.dateConverter(oData.results[i].AbsenceStartdateInt);
                                    var endDate = this.dateConverter(oData.results[i].AbsenceEnddateInt);
                                    var Industrial = (!oData.results[i].AbsenceTypeDes.includes("Unpaid Leave") && !oData.results[i].AbsenceTypeDes.includes("Industrial Action"));
                                    var Sick = oData.results[i].AbsenceTypeDes.includes("Sickness");
                                    var jsonData = {
                                        personIdExternal: oData.results[i].Perid,
                                        userId: oData.results[i].Userid,
                                        empName: oData.results[i].EmployeeName,
                                        timeType: oData.results[i].AbsenceTypeDes,
                                        timeTypeCode: oData.results[i].AbsenceType,
                                        startDate: startDate,
                                        endDate: endDate,
                                        description: oData.results[i].DescIllnessDes,
                                        descriptionCode: oData.results[i].DescIllness,
                                        quantityInDays: oData.results[i].LostWorkingdays,
                                        quantityInHours: oData.results[i].LostWorkinghours,
                                        Sick: Industrial,
                                        enabledDesc: Sick,
                                        enabledLostDays: false,
                                        enabledLostHrs: false,
                                        valueStateStartDate: "None",
                                        valueStateEndDate: "None"
                                    };
                                    secC.push(jsonData);
                                }
                            }
                            this.getView().getModel("AbsData").setProperty("/CreateNew", secC);
                        }
                    }.bind(this),
                    error: function (oData) {
                        console.log("Error S4h")
                    }
                });

                this.getOwnerComponent().getModel("S4hService").read("/ZSFGT_HEADER_AR02Set('" + formid + "')/HeaderToComment_Nav?$format=json", {
                    success: function (oData) {
                        if (oData.results.length > 0) {
                            var comm = "";
                            for (let i = 0; i < oData.results.length; i++) {
                                comm += oData.results[i].comment + "\n";
                            }
                            this.getView().byId("_IDGenTextArea2").setValue(comm);
                            this.getView().byId("_IDGenTextArea2").setVisible(true);
                            this.getView().byId("_IDGenLabel11").setVisible(true);
                        }
                    }.bind(this),
                    error: function (oData) {
                        console.log("Error S4h")
                    }
                });
            },

            SFData: async function (oModel, useremail) {
                // Getting Data for the Header Section
                // Fetching Emp Name for the Initiator
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
                var initDetails;
                await $.ajax({
                    url: serviceUrl + "/odata/v2/PerPerson(personIdExternal='" + email.d.results[0].personIdExternal + "')/personalInfoNav?$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        initDetails = {
                            email: email.d.results[0].emailAddress,
                            personIdExternal: email.d.results[0].personIdExternal,        //first name, last name Etc.
                            fullName: data.d.results[0].firstName + " " + data.d.results[0].lastName
                        }
                        initiatorCode = email.d.results[0].personIdExternal;
                        oModel.setProperty("/user", initDetails);
                        return initDetails;
                    }.bind(this),
                    error: function (data) {
                        console.log("error" + data)
                    }
                });
                var actualDate;
                await $.ajax({
                    url: serviceUrl + "/odata/v2/PerPerson(personIdExternal='" + initDetails.personIdExternal + "')/personalInfoNav?$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        oModel.setProperty("/PersonDet", data);
                        //getting the date from model
                        var modelDate = oModel.getProperty("/PersonDet").d.results[0].startDate;
                        actualDate = this.dateToAjax(modelDate);
                        console.log("success" + data);
                    }.bind(this),
                    error: function (e) {
                        console.log("error: " + e);
                    }
                });

                // Fetching Salutation for the Initiator
                await $.ajax({
                    url: serviceUrl + "/odata/v2/PerPersonal(personIdExternal='" + initDetails.personIdExternal + "',startDate=datetime'" + actualDate + "')/salutationNav/picklistLabels?$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {          // salutation
                        oModel.setProperty("/Salutation", data);
                        console.log("success" + data);
                    }.bind(this),
                    error: function (e) {
                        console.log("error: " + e);
                    }
                });

                await $.ajax({
                    url: serviceUrl + "/odata/v2/EmpEmployment(personIdExternal='" + initDetails.personIdExternal + "',userId='" + initDetails.personIdExternal + "')/jobInfoNav?$format=json",
                    type: 'GET',
                    contentType: "application/json", //job Info
                    success: function (data) {
                        oModel.setProperty("/JobTitle", data);
                        console.log("success" + data);
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
                        managerId = data.d.results[0].managerId
                    }.bind(this),
                    error: function (e) {
                        console.log("error: " + e);
                    }
                });
                let cust_Value, values, cust_UserName;
                await $.ajax({
                    url: serviceUrl + "/odata/v2/UserAccount?$format=json&$filter=personIdExternal eq '" + initDetails.personIdExternal + "'",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        console.log("success" + data);
                        cust_UserName = data.d.results[0].username;
                        $.ajax({
                            url: serviceUrl + "/odata/v2/cust_ZFLM_MULTI_USERS?$filter=cust_UserName eq '" + cust_UserName + "'&$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: async function (data) {
                                console.log("success" + data);
                                // Consolidating all the data in one property
                                var person = oModel.getProperty("/PersonDet");
                                var salut = oModel.getProperty("/Salutation");
                                var job = oModel.getProperty("/JobTitle");
                                var finalData = [];
                                var customString3;
                                if (data.d.results.length != 0) {
                                    cust_Value = data.d.results[0].cust_Value.split(",");
                                    var val = [];
                                    cust_Value.forEach(async function (item) {
                                        await $.ajax({
                                            url: serviceUrl + "/odata/v2/cust_PersonnelArea?$filter= externalCode eq '" + item + "'&$format=json",
                                            type: 'GET',
                                            contentType: "application/json",
                                            success: function (data) {
                                                console.log("success" + data);
                                                var req = {
                                                    key: item,
                                                    value: data.d.results[0].externalName
                                                };
                                                val.push(req);
                                                oModel.setProperty("/OrgValues", val);
                                            },
                                            error: function (e) {
                                                console.log("error: " + e);
                                            }
                                        });
                                    }.bind(this));
                                    if (cust_Value.length == 1) {
                                        this.getView().byId("select08").setEditable(false);
                                        await $.ajax({
                                            url: serviceUrl + "/odata/v2/cust_PersonnelArea?$filter= externalCode eq '" + cust_Value[0] + "'&$format=json",
                                            type: 'GET',
                                            contentType: "application/json",
                                            success: function (data) {
                                                console.log("success" + data);
                                                customString3 = data.d.results[0].externalName + " (" + cust_Value[0] + ")";
                                                oModel.setProperty("/OrgValues", { key: cust_Value[0], value: data.d.results[0].externalName });
                                                this.getView().byId("select08").setSelectedKey(cust_Value[0]);
                                            }.bind(this),
                                            error: function (e) {
                                                console.log("error: " + e);
                                            }
                                        });
                                        this.orgIdToName(cust_Value[0]);
                                    }
                                } else {
                                    await $.ajax({
                                        url: serviceUrl + "/odata/v2/cust_PersonnelArea?$filter= externalCode eq '" + job.d.results[0].customString3 + "'&$format=json",
                                        type: 'GET',
                                        contentType: "application/json",
                                        success: function (data) {
                                            console.log("success" + data);
                                            customString3 = data.d.results[0].externalName + " (" + job.d.results[0].customString3 + ")";
                                            this.getView().byId("select08").setSelectedKey(job.d.results[0].customString3);
                                            this.getView().byId("select08").setEditable(false);
                                        }.bind(this),
                                        error: function (e) {
                                            console.log("error: " + e);
                                        }
                                    });
                                    this.orgIdToName(job.d.results[0].customString3);
                                }
                                for (let i = 0; i < job.d.results.length; i++) {

                                    var firstName = person.d.results[i].firstName;
                                    var lastName = person.d.results[i].lastName;
                                    var personIdExternal = person.d.results[i].personIdExternal;

                                    var salutation = salut.d.results[i].label;
                                    this._logCreation("I", firstName + " " + lastName, customString3, "");

                                    var jobTitle = job.d.results[i].jobTitle;
                                    var final = {
                                        firstName: firstName,
                                        lastName: lastName,
                                        personIdExternal: personIdExternal,
                                        label: salutation,
                                        jobTitle: jobTitle,
                                        customString3: customString3
                                    }
                                    finalData.push(final);
                                }
                                oModel.setProperty("/FinalData", finalData);

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
            },

            _getOrgName: async function (items, oModel) {

                return val;
            },

            AddRow: function () {
                var oModel = this.getView().getModel("AbsData").getProperty("/CreateNew");
                var len = oModel.length;
                if (oModel[len - 1].empName == "") {
                    MessageBox.error("Kindly enter the Employee Name first");
                }
                else {
                    var today = new Date();
                    var StartminDate = new Date();
                    StartminDate.setMonth(StartminDate.getMonth() - 2);
                    StartminDate.setDate(1);
                    var newRow = {
                        empName: "",
                        personIdExternal: "",
                        userId: "",
                        timeType: "",
                        timeTypeCode: "",
                        startDate: "",
                        endDate: "",
                        startMinDate: StartminDate,
                        startMaxDate: today,
                        endMinDate: new Date(),
                        description: "",
                        descriptionCode: "",
                        quantityInDays: "",
                        quantityInHours: "",
                        enabledAbs: false,
                        enabledDate: false,
                        enabledDesc: false,
                        enabledLostDays: false,
                        enabledLostHrs: false,
                        valueStateStartDate: "None",
                        valueStateEndDate: "None"
                    }
                    oModel.push(newRow);
                    this.getView().getModel("AbsData").setProperty("/CreateNew", oModel);
                }
            },

            eChangedBy: function (path) {
                // var oUser = parent.sap.ushell.Container.getUser().getId();
                this.getView().getModel("AbsData").setProperty(path + "/changed", true);
            },

            changedBy: function (oEvent) {
                var oInput = oEvent.getSource();
                var oBindingContext = oInput.getBindingContext("AbsData");
                var sPath = oBindingContext.getPath();
                // var oUser = parent.sap.ushell.Container.getUser().getId();
                this.getView().getModel("AbsData").setProperty(sPath + "/changed", true);
            },

            DelRow: function () {
                var oTable = this.getView().byId("_IDGenTable3");
                var oProperty = this.getView().getModel("AbsData").getProperty("/CreateNew");
                var aSelectedItems = oTable.getSelectedItems();
                if (oProperty.length == aSelectedItems.length) {
                    var today = new Date();
                    var StartminDate = new Date();
                    StartminDate.setMonth(StartminDate.getMonth() - 2);
                    StartminDate.setDate(1);
                    var oProperty = [{
                        empName: "",
                        personIdExternal: "",
                        userId: "",
                        timeType: "",
                        timeTypeCode: "",
                        startDate: "",
                        endDate: "",
                        startMinDate: StartminDate,
                        startMaxDate: today,
                        endMinDate: new Date(),
                        description: "",
                        descriptionCode: "",
                        quantityInDays: "",
                        quantityInHours: "",
                        enabledAbs: false,
                        enabledDate: false,
                        enabledDesc: false,
                        enabledLostDays: false,
                        enabledLostHrs: false,
                        valueStateStartDate: "None",
                        valueStateEndDate: "None"
                    }]
                }
                else {
                    for (var i = aSelectedItems.length - 1; i >= 0; i--) {
                        var oItem = aSelectedItems[i];
                        var iIndex = oTable.indexOfItem(oItem);
                        oProperty.splice(iIndex, 1);
                    }
                }
                oTable.removeSelections();
                this.getView().getModel("AbsData").setProperty("/CreateNew", oProperty);
            },

            onOrgChange: function (oEvent) {
                var that = this;
                if (oEvent.getSource().getSelectedItem() == null) {
                    MessageBox.error("Please select a valid Organization");
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                }
                else {
                    this.getView().getModel("AbsData").setProperty("/FinalEmpData", []);
                    this.getView().getModel("AbsData").setProperty("/FinalEmpDataCurr", []);
                    var today = new Date();
                    var StartminDate = new Date();
                    StartminDate.setMonth(StartminDate.getMonth() - 2);
                    StartminDate.setDate(1);
                    var newRow = [{
                        empName: "",
                        personIdExternal: "",
                        userId: "",
                        timeType: "",
                        timeTypeCode: "",
                        startDate: "",
                        endDate: "",
                        startMinDate: StartminDate,
                        startMaxDate: today,
                        endMinDate: new Date(),
                        description: "",
                        descriptionCode: "",
                        quantityInDays: "",
                        quantityInHours: "",
                        enabledAbs: false,
                        enabledDate: false,
                        enabledDesc: false,
                        enabledLostDays: false,
                        enabledLostHrs: false,
                        valueStateStartDate: "None",
                        valueStateEndDate: "None"
                    }]
                    this.getView().getModel("AbsData").setProperty("/CreateNew", newRow);
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                    var orgName = oEvent.getSource().getSelectedItem().getKey();
                    that.orgIdToName(orgName)
                }
            },

            onAddComment: function () {
                var oComm = this.getView().byId("_IDGenTextArea3").getValue();
                var CommExist = this.getView().byId("_IDGenTextArea2").getValue();
                var name = this.getView().getModel("AbsData").getProperty("/user");
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
                    this.getView().byId("_IDGenLabel11").setVisible(true);
                    this.getView().byId("_IDGenTextArea2").setValue(oAuthComm);
                    this.getView().byId("_IDGenTextArea3").setValue("");
                }
            },

            onEmplChange: function (oEvent) {
                warningFlag = true;
                var temp = oEvent.getSource().getSelectedItem();
                if (temp == null) {
                    // MessageBox.error("Select the Employee Name from the given values");
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                    oEvent.oSource.setValueStateText("Employee Name is required");
                    oModel.setProperty(oBindingContext.getPath() + "/enabledAbs", false);
                    oModel.setProperty(oBindingContext.getPath() + "/enabledDate", false);
                }
                else {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                    var oInput = oEvent.getSource();
                    var oBindingContext = oInput.getBindingContext("AbsData");
                    var oModel = this.getView().getModel("AbsData");
                    var userId = temp.getKey();
                    var allData = oModel.getProperty("/dropdownEmp");
                    var reqDetails = allData.filter((el) => el.userId == userId);
                    oModel.setProperty(oBindingContext.getPath() + "/personIdExternal", reqDetails[0].personIdExternal);
                    oModel.setProperty(oBindingContext.getPath() + "/userId", userId);
                    var timeType = oBindingContext.getProperty("timeType");
                    var sPath = oBindingContext.getPath();
                    var sStartDate = oBindingContext.getProperty("startDate");
                    var sEndDate = oBindingContext.getProperty("endDate");
                    var sEmpName = oBindingContext.getProperty("empName");
                    var externalCode = oBindingContext.getProperty("externalCode")
                    var temp1 = this.isEndDateToBeDisabled(sStartDate, sEndDate, userId, oModel, sPath, oBindingContext, oEvent);
                    if (temp1 == 1) {
                        oModel.setProperty(sPath + "/valueStateStartDate", "Error");
                        oModel.setProperty(sPath + "/valueStateEndDate", "Error");
                        MessageBox.error("It is not permitted to have overlapping absences for the same person");
                    }
                    else {
                        oModel.setProperty(sPath + "/valueStateStartDate", "None");
                        oModel.setProperty(sPath + "/valueStateEndDate", "None");
                        this.recordExistCheck(oModel, sPath, userId, sStartDate, sEndDate, externalCode)
                            .then(result => {
                                if (result) {
                                    this.lostDays(timeType, sEmpName, sStartDate, sEndDate, oModel, sPath, oBindingContext);
                                    oModel.setProperty(oBindingContext.getPath() + "/enabledAbs", true);
                                    oModel.setProperty(sPath + "/valueStateStartDate", "None");
                                    oModel.setProperty(sPath + "/valueStateEndDate", "None");
                                }
                                else {
                                    MessageBox.error("It is not permitted to have overlapping absences for the same person");
                                    oModel.setProperty(sPath + "/valueStateStartDate", "Error");
                                    oModel.setProperty(sPath + "/valueStateEndDate", "Error");
                                }
                            });
                    }
                }
            },

            onAbsTypChange: function (oEvent) {
                warningFlag = true;
                var oInput = oEvent.getSource();
                var temp = oInput.getSelectedItem();
                if (temp == null) {
                    oInput.setValueState(sap.ui.core.ValueState.Error)
                }
                else {
                    oInput.setValueState(sap.ui.core.ValueState.None)

                    var timeTypeCode = oInput.getSelectedKey();
                    var oBindingContext = oInput.getBindingContext("AbsData");
                    var oModel = this.getView().getModel("AbsData");
                    var timeType = oBindingContext.getProperty("timeType");
                    var sPath = oBindingContext.getPath();
                    var sStartDate = oBindingContext.getProperty("startDate");
                    var sEndDate = oBindingContext.getProperty("endDate");
                    var sEmpName = oBindingContext.getProperty("empName");
                    var userId = oBindingContext.getProperty("userId");
                    var temp1 = this.isEndDateToBeDisabled(sStartDate, sEndDate, userId, oModel, sPath, oBindingContext, oEvent);
                    if (temp1 == 1) {
                        oInput.setValueState(sap.ui.core.ValueState.Error)
                        MessageBox.error("It is not permitted to have overlapping absences for the same person");
                        oModel.setProperty(sPath + "/valueStateStartDate", "Error");
                        oModel.setProperty(sPath + "/valueStateEndDate", "Error");
                    }
                    else {
                        oModel.setProperty(sPath + "/valueStateStartDate", "None");
                        oModel.setProperty(sPath + "/valueStateEndDate", "None");
                        if (sPath.includes("CreateNew")) {
                            var sEmpName = oBindingContext.getProperty("empName");
                            this.lostDays(timeType, sEmpName, sStartDate, sEndDate, oModel, sPath, oBindingContext);
                            oModel.setProperty(sPath + "/timeTypeCode", timeTypeCode);
                            oModel.setProperty(sPath + "/enabledDate", true);
                            oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                            if (timeType.includes("Sickness")) {
                                oModel.setProperty(sPath + "/enabledDesc", true);
                            }
                            else {
                                oModel.setProperty(sPath + "/enabledDesc", false);
                                oModel.setProperty(sPath + "/description", "");
                            }
                        }
                        else {
                            oInput.setValueState(sap.ui.core.ValueState.None)
                            var sJobTitle = oBindingContext.getProperty("jobTitle");
                            this.lostDays(timeType, sJobTitle, sStartDate, sEndDate, oModel, sPath, oBindingContext);
                            if (timeType.includes("Sickness")) {
                                oModel.setProperty(sPath + "/enabledDesc", true);
                            }
                            else {
                                oModel.setProperty(sPath + "/enabledDesc", false);
                                oModel.setProperty(sPath + "/cust_SickReason", "");
                            }
                            this.eChangedBy(sPath);
                        }
                    }
                }
            },

            isStartDateToBeDisabled: function (stdate, endDate, userId, oModel, path, oBind) {
                var sPath = path.charAt(path.length - 1);
                var getProperty = path.slice(0, -2);
                var oProperty = oModel.getProperty(getProperty);
                for (let i = 0; i < oProperty.length; i++) {
                    if (i != sPath) {
                        var aData = oProperty[i];
                        if (path.includes("CreateNew")) {
                            if (aData.userId == userId) {
                                var compStDate = new Date(aData.startDate);
                                var compEndDate = new Date(aData.endDate);
                                if (stdate >= compStDate && stdate <= compEndDate) {
                                    oModel.setProperty(path + "/startDate", "");
                                    return 1;
                                }
                                else if (stdate < compStDate) {
                                    if (endDate >= compStDate) {
                                        oModel.setProperty(path + "/endDate", "");
                                        return 1;
                                    }
                                }
                            }
                        }
                        else {
                            if (aData.userId == userId) {
                                var compStDate = new Date(aData.startDate);
                                var compEndDate = new Date(aData.endDate);
                                if (stdate >= compStDate && stdate <= compEndDate) {
                                    oModel.setProperty(path + "/startDate", "");
                                    return 1;
                                }
                                else if (stdate < compStDate) {
                                    if (endDate >= compStDate) {
                                        oModel.setProperty(path + "/endDate", "");
                                        return 1;
                                    }
                                }
                            }
                        }
                    }
                }
            },

            onAbsStartChange: function (oEvent) {
                warningFlag = true;
                var oModel = this.getView().getModel("AbsData");
                var oInput = oEvent.getSource();
                var oBindingContext = oInput.getBindingContext("AbsData");
                var sPath = oBindingContext.getPath();
                if (!oEvent.getParameter("valid")) {
                    oInput.setValueState(sap.ui.core.ValueState.Error);
                }
                else {
                    oInput.setValueState(sap.ui.core.ValueState.None);
                    var sStartDate = oBindingContext.getProperty("startDate");
                    var userId = oBindingContext.getProperty("userId");
                    sStartDate = new Date(sStartDate);
                    oModel.setProperty(oBindingContext.getPath() + "/endMinDate", sStartDate);
                    var stimeType = oBindingContext.getProperty("timeType");
                    var sEndDate = oBindingContext.getProperty("endDate");
                    sEndDate = new Date(sEndDate);
                    if (sStartDate > sEndDate) {
                        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "dd MMM yyyy" });
                        var startDate = dateFormat.format(sStartDate);
                        oModel.setProperty(sPath + "/endDate", startDate);
                        sEndDate = sStartDate;
                    }
                    this.recordExistCheck(oModel, sPath, userId, oBindingContext.getProperty("startDate"), oBindingContext.getProperty("endDate"), oBindingContext.getProperty("externalCode"))
                        .then(result => {
                            if (result) {
                                oModel.setProperty(sPath + "/valueStateStartDate", "None");
                                oModel.setProperty(sPath + "/valueStateEndDate", "None");
                                var sEmpName = oBindingContext.getProperty("empName");
                                this.lostDays(stimeType, sEmpName, sStartDate, sEndDate, oModel, sPath, oBindingContext);
                                var temp1 = this.isStartDateToBeDisabled(sStartDate, sEndDate, userId, oModel, sPath, oBindingContext);
                                if (temp1 == 1) {
                                    oModel.setProperty(sPath + "/valueStateStartDate", "Error");
                                    oModel.setProperty(sPath + "/valueStateEndDate", "Error");
                                    MessageBox.error("It is not permitted to have overlapping absences for the same person");
                                }
                                else {
                                    oModel.setProperty(sPath + "/valueStateStartDate", "None");
                                    oModel.setProperty(sPath + "/valueStateEndDate", "None");
                                    this.eChangedBy(sPath);
                                }
                            }
                            else {
                                oModel.setProperty(sPath + "/valueStateStartDate", "Error");
                                oModel.setProperty(sPath + "/valueStateEndDate", "Error");
                                MessageBox.error("It is not permitted to have overlapping absences for the same person");
                            }
                        });
                }
            },

            industrialLeaveVal: function (timeType, stdate, endDate, oModel, path) {
                if (timeType == "Industrial Action") {
                    stdate = new Date(stdate);
                    endDate = new Date(endDate);
                    var diff = endDate - stdate;
                    diff = diff / (1000 * 60 * 60 * 24);
                    if (diff + 1 >= 3) {
                        oModel.setProperty(path + "/endDate", "");
                        return 1;
                    }
                }
            },

            _logCreation: async function (status, formOwner, perArea, formOwnerCode) {

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

                var personnel = this.getView().getModel("AbsData").getProperty("/FinalData/0/customString3") != undefined ? this.getView().getModel("AbsData").getProperty("/FinalData/0/customString3") : perArea;
                var initiator = this.getView().getModel("AbsData").getProperty("/PersonDet").d.results[0]
                var log_payload = {
                    "Formid": this.getView().byId("_IDGenInput2").getValue(),
                    "StartedOn": this.getView().byId("DatePicker01").getValue(),
                    "Status": status,
                    "Type": "AR02",
                    "OrganizationName": personnel,
                    "InitCode": initiatorCode,
                    "Initiator": initiator.firstName + " " + initiator.lastName,
                    "Description": "Absence Report Form",
                    "FormOwner": formOwner,
                    "FormOwnerCode": formOwnerCode != "" ? formOwnerCode : initiatorCode,
                    "AvailableFrom": new Date(),
                }
                await this.getOwnerComponent().getModel("logService").create("/zsf_logSet", log_payload,
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

            recordExistCheck: async function (oModel, path, userId, stdate, endDate, externalCode) {

                return new Promise(
                    async function (resolve, reject) {
                        if (userId && stdate && endDate) {
                            stdate = new Date(stdate);
                            var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
                            var startDate = dateFormat.format(stdate);
                            startDate = startDate + "T00:00:00"

                            endDate = new Date(endDate);
                            var endDate1 = dateFormat.format(endDate);
                            endDate1 = endDate1 + "T23:59:59";
                            externalCode = externalCode ? externalCode : "";

                            await $.ajax({
                                url: serviceUrl + "/odata/v2/EmployeeTime?$filter=userId eq '" + userId + "' and startDate ge datetime'" + startDate + "' and endDate le datetime'" + endDate1 + "' and externalCode ne '" + externalCode + "' and approvalStatus eq 'APPROVED' &$format=json",
                                type: 'GET',
                                contentType: "application/json",
                                success: function (data) {
                                    if (data.d.results.length != 0) {
                                        resolve(false)
                                    }
                                },
                                error: function (resp) {
                                    console.log(resp.responseText);
                                }
                            });
                        }
                        var secAData = oModel.getProperty("/FinalEmpData");
                        var secBData = oModel.getProperty("/FinalEmpDataCurr");
                        var secCData = oModel.getProperty("/CreateNew");
                        stdate = new Date(stdate);
                        endDate = new Date(endDate);
                        var flagA = false, flagB = false, flagC = false;
                        path.includes("CreateNew") ? flagC = true : path.includes("FinalEmpDataCurr") ? flagB = true : flagA = true;
                        if (secAData) {
                            for (let i = 0; i < secAData.length; i++) {
                                if (!(i == Number(path.split("/")[2]) && flagA)) {
                                    if (secAData[i].userId == userId) {
                                        var compStDate = new Date(secAData[i].startDate);
                                        var compEndDate = new Date(secAData[i].endDate);
                                        if (stdate >= compStDate && stdate <= compEndDate) {
                                            resolve(false)
                                        }
                                        else if (stdate < compStDate) {
                                            if (endDate >= compStDate) {
                                                resolve(false)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (secBData) {
                            for (let i = 0; i < secBData.length; i++) {
                                if (!(i == Number(path.split("/")[2]) && flagB)) {
                                    if (secBData[i].userId == userId) {
                                        var compStDate = new Date(secBData[i].startDate);
                                        var compEndDate = new Date(secBData[i].endDate);
                                        if (stdate >= compStDate && stdate <= compEndDate) {
                                            resolve(false)
                                        }
                                        else if (stdate < compStDate) {
                                            if (endDate >= compStDate) {
                                                resolve(false)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (secCData) {
                            for (let i = 0; i < secCData.length; i++) {
                                if (!(i == Number(path.split("/")[2]) && flagC)) {
                                    if (secCData[i].userId == userId) {
                                        var compStDate = new Date(secCData[i].startDate);
                                        var compEndDate = new Date(secCData[i].endDate);
                                        if (stdate >= compStDate && stdate <= compEndDate) {
                                            resolve(false)
                                        }
                                        else if (stdate < compStDate) {
                                            if (endDate >= compStDate) {
                                                resolve(false)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        resolve(true);
                    })
            },

            isEndDateToBeDisabled: function (stdate, endDate, userId, oModel, path, oBind, oEvent) {
                var sPath = path.charAt(path.length - 1);
                var getProperty = path.slice(0, -2);
                var oProperty = oModel.getProperty(getProperty);
                stdate = new Date(stdate)
                endDate = new Date(endDate);
                if (endDate < stdate) {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                    oEvent.oSource.setValueStateText("Start date must not be later than end date.");
                    oModel.setProperty(path + "/endDate", "");
                }
                else {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                    for (let i = 0; i < oProperty.length; i++) {
                        if (i != sPath) {
                            var aData = oProperty[i];
                            if (path.includes("CreateNew")) {
                                if (aData.userId == userId) {
                                    var compStDate = new Date(aData.startDate);
                                    if (stdate < compStDate) {
                                        if (endDate >= compStDate) {
                                            oModel.setProperty(path + "/endDate", "");
                                            return 1;
                                        }
                                    }
                                }
                            }
                            else {
                                if (aData.userId == userId) {
                                    var compStDate = new Date(aData.startDate);
                                    if (stdate < compStDate) {
                                        if (endDate >= compStDate) {
                                            oModel.setProperty(path + "/endDate", "");
                                            return 1;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },

            onAbsEndChange: function (oEvent) {
                warningFlag = true;
                var oInput = oEvent.getSource();
                var oBindingContext = oInput.getBindingContext("AbsData");
                var sPath = oBindingContext.getPath();
                var oModel = this.getView().getModel("AbsData");
                if (!oEvent.getParameter("valid")) {
                    oInput.setValueState(sap.ui.core.ValueState.Error);
                }
                else {
                    oInput.setValueState(sap.ui.core.ValueState.None);
                    var sStartDate = oBindingContext.getProperty("startDate");
                    var sEndDate = oBindingContext.getProperty("endDate");
                    var sEmpName = oBindingContext.getProperty("empName");
                    var userId = oBindingContext.getProperty("userId");
                    var externalCode = oBindingContext.getProperty("externalCode")
                    var temp1 = this.isEndDateToBeDisabled(sStartDate, sEndDate, userId, oModel, sPath, oBindingContext, oEvent);
                    if (temp1 == 1) {
                        oModel.setProperty(sPath + "/valueStateStartDate", "Error");
                        oModel.setProperty(sPath + "/valueStateEndDate", "Error");
                        MessageBox.error("It is not permitted to have overlapping absences for the same person");
                    }
                    else {
                        oModel.setProperty(sPath + "/valueStateStartDate", "None");
                        oModel.setProperty(sPath + "/valueStateEndDate", "None");
                        this.recordExistCheck(oModel, sPath, userId, sStartDate, sEndDate, externalCode)
                            .then(result => {
                                if (result) {
                                    oModel.setProperty(sPath + "/valueStateStartDate", "None");
                                    oModel.setProperty(sPath + "/valueStateEndDate", "None");
                                    var stimeType = oBindingContext.getProperty("timeType");
                                    var temp2 = this.industrialLeaveVal(stimeType, sStartDate, sEndDate, oModel, sPath);
                                    if (temp2 == 1) {
                                        oModel.setProperty(sPath + "/valueStateStartDate", "Error");
                                        oModel.setProperty(sPath + "/valueStateEndDate", "Error");
                                        MessageBox.error("Cannot have 3 consecutive absences for this Absence Type");
                                    }
                                    else {
                                        oModel.setProperty(sPath + "/valueStateStartDate", "None");
                                        oModel.setProperty(sPath + "/valueStateEndDate", "None");
                                        this.lostDays(stimeType, sEmpName, sStartDate, sEndDate, oModel, sPath, oBindingContext);
                                        if (sPath.includes("FinalEmpData")) {
                                            this.eChangedBy(sPath);
                                        }
                                    }
                                }
                                else {
                                    oModel.setProperty(sPath + "/valueStateStartDate", "Error");
                                    oModel.setProperty(sPath + "/valueStateEndDate", "Error");
                                    MessageBox.error("It is not permitted to have overlapping absences for the same person");
                                }
                            });
                    }
                }
            },

            lostDays: function (timeType, empName, stdate, endDate, oModel, path, oBind) {
                if (timeType.match(/unpaid leave/gi) || timeType.match(/industrial action/gi)) {
                    var org = oModel.getProperty("/FinalData");
                    if (org[0].customString3 == 4600) {
                        oModel.setProperty(path + "/enabledLostHrs", true);
                        oModel.setProperty(path + "/quantityInDays", "");
                        oModel.setProperty(path + "/quantityInHours", "");
                    }
                    else {
                        oModel.setProperty(path + "/quantityInDays", "");
                        oModel.setProperty(path + "/quantityInHours", "");
                        if (path.includes("CreateNew")) {
                            if (empName.match(/teacher/gi)) {
                                oModel.setProperty(path + "/enabledLostDays", true);
                                oModel.setProperty(path + "/enabledLostHrs", false);
                            }
                            else {
                                oModel.setProperty(path + "/enabledLostHrs", true);
                                oModel.setProperty(path + "/enabledLostDays", false);
                            }
                        }
                        else {
                            var jobTitle = oBind.getProperty("jobTitle");
                            if (jobTitle.match(/teacher/gi)) {
                                oModel.setProperty(path + "/enabledLostDays", true);
                                oModel.setProperty(path + "/enabledLostHrs", false);
                            }
                            else {
                                oModel.setProperty(path + "/enabledLostHrs", true);
                                oModel.setProperty(path + "/enabledLostDays", false);
                            }
                        }
                    }
                }
                else {
                    oModel.setProperty(path + "/enabledLostDays", false);
                    oModel.setProperty(path + "/enabledLostHrs", false);
                    stdate = new Date(stdate);
                    endDate = new Date(endDate);
                    var diff = ((endDate - stdate) / (1000 * 60 * 60 * 24)) + 1;
                    if (diff > 0) {
                        oModel.setProperty(path + "/quantityInDays", diff);
                        oModel.setProperty(path + "/quantityInHours", diff * 8);
                    }
                }
            },

            onValueHelpOpen: function (oEvent) {
                var oInput = oEvent.getSource();
                var oBindingContext = oInput.getBindingContext("AbsData");
                var sStartDate = oBindingContext.getProperty("startDate");
                if (sStartDate == "") {
                    MessageBox.error("Kindly enter the Absence Start Date")
                }
            },

            onDescChange: function (oEvent) {
                warningFlag = true;
                var oInput = oEvent.getSource();
                var oBindingContext = oInput.getBindingContext("AbsData");
                var sPath = oBindingContext.getPath();
                var oModel = this.getView().getModel("AbsData");
                var temp = oEvent.getSource().getSelectedItem();
                var reasonCode = oEvent.getSource().getSelectedKey()
                if (temp == null) {
                    oInput.setValueState(sap.ui.core.ValueState.Error);
                    MessageBox.error("Select the Description of Illness from the given values");
                    oModel.setProperty(oBindingContext.getPath() + "/description", "");
                }
                else {
                    oInput.setValueState(sap.ui.core.ValueState.None);
                    oModel.setProperty(oBindingContext.getPath() + "/descriptionCode", reasonCode);
                    this.eChangedBy(sPath);
                };
            },

            dateToUnix: function (date) {
                if (date) {
                    var temp = new Date(date);
                    var timeInMillisecond = Number((temp.getTime()) + 21600000);
                    return "/Date(" + timeInMillisecond + ")/";
                } else return "";
            },

            payloadforSubmit: function () {
                warningFlag = false;
                var messArr = []
                var oModel = this.getView().getModel("AbsData");
                var header = oModel.getProperty("/FinalData");
                var secA = oModel.getProperty("/FinalEmpData");
                var secAData = [];
                if (secA) {
                    for (let i = 0; i < secA.length; i++) {
                        var startDate = this.dateToUnix(secA[i].startDate);
                        var endDate = this.dateToUnix(secA[i].endDate);

                        var sA = {
                            SeqNumber: (i + 1).toString(),
                            Formid: this.getView().byId("_IDGenInput2").getValue(),
                            Perid: secA[i].personIdExternal,
                            Userid: secA[i].userId,
                            ExternalCode: secA[i].externalCode,
                            EmployeeName: secA[i].label + " " + secA[i].firstName + " " + secA[i].lastName + ", " + secA[i].jobTitle,
                            AbsenceTypeDes: secA[i].timeType != "" ? secA[i].timeType : this.addMessage("A", "Absence Type", messArr),
                            AbsenceType: secA[i].timeTypeCode,
                            AbsenceStartdateInt: startDate != "" ? startDate : "",
                            AbsenceEnddateInt: endDate != "" ? endDate : "",
                            AbsenceStartdate: secA[i].startDate != "" ? secA[i].startDate : this.addMessage("A", "Absence Start Date", messArr),
                            AbsenceEnddate: secA[i].endDate != "" ? secA[i].endDate : this.addMessage("A", "Absnece End Date", messArr),
                            DescIllnessDes: secA[i].cust_SickReason,
                            DescIllness: secA[i].descriptionCode != null ? secA[i].descriptionCode : "",
                            LostWorkingdays: (secA[i].quantityInDays).toString(),
                            LostWorkinghours: (secA[i].quantityInHours).toString(),
                            Changedby: secA[i].changed == true ? "X" : ""
                        };
                        secAData.push(sA);
                    };
                };
                var secB = oModel.getProperty("/FinalEmpDataCurr");
                var secBData = [];
                if (secB) {
                    for (let i = 0; i < secB.length; i++) {
                        var startDate = this.dateToUnix(secB[i].startDate);
                        var endDate = this.dateToUnix(secB[i].endDate);
                        var sB = {
                            SeqNumber: (i + 1).toString(),
                            Formid: this.getView().byId("_IDGenInput2").getValue(),
                            Perid: secB[i].personIdExternal,
                            Userid: secB[i].userId,
                            ExternalCode: secB[i].externalCode,
                            EmployeeName: secB[i].label + " " + secB[i].firstName + " " + secB[i].lastName + ", " + secB[i].jobTitle,
                            AbsenceTypeDes: secB[i].timeType != "" ? secB[i].timeType : this.addMessage("B", "Absence Type", messArr),
                            AbsenceType: secB[i].timeTypeCode,
                            AbsenceStartdateInt: startDate != "" ? startDate : "",
                            AbsenceEnddateInt: endDate != "" ? endDate : "",
                            AbsenceStartdate: secB[i].startDate != "" ? secB[i].startDate : this.addMessage("B", "Absence Start Date", messArr),
                            AbsenceEnddate: secB[i].endDate != "" ? secB[i].endDate : this.addMessage("B", "Absence End Date", messArr),
                            DescIllnessDes: secB[i].cust_SickReason,
                            DescIllness: secB[i].descriptionCode != null ? secB[i].descriptionCode : "",
                            LostWorkingdays: (secB[i].quantityInDays).toString(),
                            LostWorkinghours: (secB[i].quantityInHours).toString(),
                            Changedby: secB[i].changed == true ? "X" : ""
                        }
                        secBData.push(sB);
                    };
                }
                var secC = oModel.getProperty("/CreateNew");
                var secCData = [];
                if (secC.length == 1 && secC[0].empName == "") {
                    secCData.push(sC)
                }
                else {
                    for (let i = 0; i < secC.length; i++) {
                        var startDate = this.dateToUnix(secC[i].startDate);
                        var endDate = this.dateToUnix(secC[i].endDate);
                        var perId = secC[i].personIdExternal;
                        var sC = {
                            SeqNumber: (i + 1).toString(),
                            Formid: this.getView().byId("_IDGenInput2").getValue(),
                            Perid: perId,
                            Userid: secC[i].userId,
                            EmployeeName: secC[i].empName != "" ? secC[i].empName : this.addMessage("C", "Employee Name", messArr),
                            AbsenceTypeDes: secC[i].timeType != "" ? secC[i].timeType : this.addMessage("C", "Absence Type", messArr),
                            AbsenceType: secC[i].timeTypeCode,
                            AbsenceStartdateInt: startDate != "" ? startDate : "",
                            AbsenceEnddateInt: endDate != "" ? endDate : "",
                            AbsenceStartdate: secC[i].startDate != "" ? secC[i].startDate : this.addMessage("C", "Absence Start Date", messArr),
                            AbsenceEnddate: secC[i].endDate != "" ? secC[i].endDate : this.addMessage("C", "Absence End Date", messArr),
                            DescIllnessDes: secC[i].description,
                            DescIllness: secC[i].descriptionCode,
                            LostWorkingdays: (secC[i].quantityInDays).toString(),
                            LostWorkinghours: (secC[i].quantityInHours).toString()
                        }
                        secCData.push(sC);
                    };
                };

                var Request_Paylaod = {
                    "Formid": this.getView().byId("_IDGenInput2").getValue() != null ? this.getView().byId("_IDGenInput2").getValue() : "",
                    "Initiator": header[0].label + " " + header[0].firstName + " " + header[0].lastName,
                    "Ardate": this.getView().byId("DatePicker01").getValue() != null ? this.getView().byId("DatePicker01").getValue() : "",
                    "OrganisationName": header[0].customString3,
                    "OrganisationCode": this.getView().byId("select08").getSelectedItem() != null ? this.getView().byId("select08").getSelectedItem().getKey() : this.getView().byId("select08").getSelectedKey(),
                    "DeletionIndicator": "",
                    "NotifyApprover": this.getView().byId("checkbox1").getSelected() == true ? "X" : "",
                    "Purpose": "I",
                    "HeaderToSectionA_Nav": secAData,
                    "HeaderToSectionB_Nav": secBData,
                    "HeaderToSectionC_Nav": secCData,
                    "HeaderToComment_Nav": [
                        {
                            "Formid": this.getView().byId("_IDGenInput2").getValue() != null ? this.getView().byId("_IDGenInput2").getValue() : "",
                            "comment": this.getView().byId("_IDGenTextArea2").getValue() != null ? this.getView().byId("_IDGenTextArea2").getValue() : ""
                        }
                    ]
                };

                return { Request_Paylaod: Request_Paylaod, messArr: messArr };
            },

            payload: function (purpose, del) {
                warningFlag = false;
                var oModel = this.getView().getModel("AbsData");
                var header = oModel.getProperty("/FinalData");
                var secA = oModel.getProperty("/FinalEmpData");
                var secAData = [];
                if (secA) {
                    for (let i = 0; i < secA.length; i++) {
                        var startDate = this.dateToUnix(secA[i].startDate);
                        var endDate = this.dateToUnix(secA[i].endDate);

                        var sA = {
                            SeqNumber: (i + 1).toString(),
                            Formid: this.getView().byId("_IDGenInput2").getValue(),
                            Perid: secA[i].personIdExternal,
                            Userid: secA[i].userId,
                            ExternalCode: secA[i].externalCode,
                            EmployeeName: secA[i].label + " " + secA[i].firstName + " " + secA[i].lastName + ", " + secA[i].jobTitle,
                            AbsenceTypeDes: secA[i].timeType != "" ? secA[i].timeType : "",
                            AbsenceType: secA[i].timeTypeCode,
                            AbsenceStartdate: secA[i].startDate,
                            AbsenceEnddate: secA[i].endDate,
                            AbsenceStartdateInt: startDate != "" ? startDate : "",
                            AbsenceEnddateInt: endDate != "" ? endDate : "",
                            DescIllnessDes: secA[i].cust_SickReason,
                            DescIllness: secA[i].descriptionCode != null ? secA[i].descriptionCode : "",
                            LostWorkingdays: (secA[i].quantityInDays).toString(),
                            LostWorkinghours: (secA[i].quantityInHours).toString(),
                            Changedby: secA[i].changed == true ? "X" : ""
                        };
                        secAData.push(sA);
                    };
                };
                var secB = oModel.getProperty("/FinalEmpDataCurr");
                var secBData = [];
                if (secB) {
                    for (let i = 0; i < secB.length; i++) {
                        var startDate = this.dateToUnix(secB[i].startDate);
                        var endDate = this.dateToUnix(secB[i].endDate);
                        var sB = {
                            SeqNumber: (i + 1).toString(),
                            Formid: this.getView().byId("_IDGenInput2").getValue(),
                            Perid: secB[i].personIdExternal,
                            Userid: secB[i].userId,
                            ExternalCode: secB[i].externalCode,
                            EmployeeName: secB[i].label + " " + secB[i].firstName + " " + secB[i].lastName + ", " + secB[i].jobTitle,
                            AbsenceTypeDes: secB[i].timeType != "" ? secB[i].timeType : "",
                            AbsenceType: secB[i].timeTypeCode,
                            AbsenceStartdate: secB[i].startDate,
                            AbsenceEnddate: secB[i].endDate,
                            AbsenceStartdateInt: startDate != "" ? startDate : "",
                            AbsenceEnddateInt: endDate != "" ? endDate : "",
                            DescIllnessDes: secB[i].cust_SickReason,
                            DescIllness: secB[i].descriptionCode != null ? secB[i].descriptionCode : "",
                            LostWorkingdays: (secB[i].quantityInDays).toString(),
                            LostWorkinghours: (secB[i].quantityInHours).toString(),
                            Changedby: secB[i].changed == true ? "X" : ""
                        }
                        secBData.push(sB);
                    };
                }
                var secC = oModel.getProperty("/CreateNew");
                var secCData = [];
                if (secC.length == 1 && secC[0].empName == "") {
                    secCData.push(sC)
                }
                else {
                    for (let i = 0; i < secC.length; i++) {
                        var startDate = this.dateToUnix(secC[i].startDate);
                        var endDate = this.dateToUnix(secC[i].endDate);
                        var perId = secC[i].personIdExternal;
                        var sC = {
                            SeqNumber: (i + 1).toString(),
                            Formid: this.getView().byId("_IDGenInput2").getValue(),
                            Perid: perId,
                            Userid: secC[i].userId,
                            EmployeeName: secC[i].empName != "" ? secC[i].empName : "",
                            AbsenceTypeDes: secC[i].timeType != "" ? secC[i].timeType : "",
                            AbsenceType: secC[i].timeTypeCode,
                            AbsenceStartdate: secC[i].startDate,
                            AbsenceEnddate: secC[i].endDate,
                            AbsenceStartdateInt: startDate != "" ? startDate : "",
                            AbsenceEnddateInt: endDate != "" ? endDate : "",
                            DescIllnessDes: secC[i].description,
                            DescIllness: secC[i].descriptionCode,
                            LostWorkingdays: (secC[i].quantityInDays).toString(),
                            LostWorkinghours: (secC[i].quantityInHours).toString()
                        }
                        secCData.push(sC);
                    };
                };

                var Request_Paylaod = {
                    "Formid": this.getView().byId("_IDGenInput2").getValue() != null ? this.getView().byId("_IDGenInput2").getValue() : "",
                    "Initiator": header[0].label + " " + header[0].firstName + " " + header[0].lastName,
                    "Ardate": this.getView().byId("DatePicker01").getValue() != null ? this.getView().byId("DatePicker01").getValue() : "",
                    "OrganisationName": header[0].customString3,
                    "OrganisationCode": this.getView().byId("select08").getSelectedItem() != null ? this.getView().byId("select08").getSelectedItem().getKey() : this.getView().byId("select08").getSelectedKey(),
                    "DeletionIndicator": del,
                    "NotifyApprover": this.getView().byId("checkbox1").getSelected() == true ? "X" : "",
                    "Purpose": purpose,
                    "HeaderToSectionA_Nav": secAData,
                    "HeaderToSectionB_Nav": secBData,
                    "HeaderToSectionC_Nav": secCData,
                    "HeaderToComment_Nav": [
                        {
                            "Formid": this.getView().byId("_IDGenInput2").getValue() != null ? this.getView().byId("_IDGenInput2").getValue() : "",
                            "comment": this.getView().byId("_IDGenTextArea2").getValue() != null ? this.getView().byId("_IDGenTextArea2").getValue() : ""
                        }
                    ]
                };

                return Request_Paylaod;
            },

            onSave: function (oEvent) {

                sap.ui.core.BusyIndicator.show();
                var Request_Paylaod = this.payload("I", "");
                this.getOwnerComponent().getModel("S4hService").create("/ZSFGT_HEADER_AR02Set", Request_Paylaod,
                    {
                        success: function (oData) {
                            sap.ui.core.BusyIndicator.hide()
                            MessageBox.success(`Form: ${this.getView().byId("_IDGenInput2").getValue()} is saved successfully!`);
                            var initiator = this.getView().getModel("AbsData").getProperty("/PersonDet").d.results[0]
                            this._logCreation("E", initiator.firstName + " " + initiator.lastName, "", "");
                            console.log("Success S4h")
                        }.bind(this),
                        error: function () {
                            console.log("Error S4h")
                            sap.ui.core.BusyIndicator.hide()
                            MessageBox.error("Some error occurred. Please try again");
                        }
                    });
            },

            onSubmit: async function () {

                var flag = false;
                var comm = this.getView().byId("_IDGenTextArea3").getValue();
                if (comm != "") {
                    await MessageBox.warning("Data in the Comments field has not been saved! Would you like to save before proceeding?", {
                        title: "Warning Message",
                        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                        emphasizedAction: MessageBox.Action.YES,
                        onClose: function (sAction) {
                            if (sAction == MessageBox.Action.NO) {
                                this.submitData();
                            }
                        }.bind(this)
                    });
                }
                else {
                    this.submitData();
                }
            },

            submitData: function () {
                MessageBox.alert("Are you sure you want to Submit the form?", {
                    title: "Submit Form",
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: function (sAction) {
                        if (sAction == MessageBox.Action.OK) {
                            sap.ui.core.BusyIndicator.show();
                            var { Request_Paylaod, messArr } = this.payloadforSubmit();
                            var errorFlag = this.checkReqFields();
                            if (errorFlag) {
                                MessageBox.error(`Fill all the mandatory fields`);
                                sap.ui.core.BusyIndicator.hide();
                            }
                            else {
                                if (messArr.length != 0) {
                                    sap.ui.core.BusyIndicator.hide();
                                    this.oMessage = sap.ui.xmlfragment("com.gcc.absenceqa.ar02qa.fragment.logMessage", this);
                                    this.getView().addDependent(this.oMessage);
                                    this.oMessage.open();
                                }
                                else {
                                    this.getOwnerComponent().getModel("S4hService").create("/ZSFGT_HEADER_AR02Set", Request_Paylaod,
                                        {
                                            success: function (oData) {
                                                var user = this.getView().getModel("AbsData").getProperty("/user");
                                                var appUrl = window.location.origin + "/site" + window.location.search.split("&")[0] + window.location.hash.split("?")[0];
                                                var reqUrl = appUrl.includes("GCC_SemObj") ? appUrl + "&/?formId=" : appUrl + "#?formId=";
                                                var payload = {
                                                    "definitionId": "eu10.gccdev.eforms.AR02",
                                                    "context": {
                                                        "FormID": this.getView().byId("_IDGenInput2").getValue(),
                                                        "formlinkapprover": reqUrl + this.getView().byId("_IDGenInput2").getValue() + "&mode=display",
                                                        "formlinkinitiator": reqUrl + this.getView().byId("_IDGenInput2").getValue() + "&mode=initiator",
                                                        "initiator": user.email
                                                    }
                                                }
                                                this.triggerWF(payload);
                                                console.log("Success S4h")
                                            }.bind(this),
                                            error: function () {
                                                console.log("Error S4h")
                                                sap.ui.core.BusyIndicator.hide()
                                                window.close()
                                            }
                                        });
                                }
                            }
                        }

                    }.bind(this)
                });
            },

            checkReqFields: function () {

                var errorFlag = false;
                var aControls = this.getView().getControlsByFieldGroupId("checkSecA");
                aControls.forEach(function (oControl) {
                    if (oControl.getId != undefined && (oControl.getId().includes("input") || oControl.getId().includes("datepicker") || oControl.getId().includes("select"))) {
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
                    if (oControl.getId != undefined && (oControl.getId().includes("input") || oControl.getId().includes("datepicker") || oControl.getId().includes("select"))) {
                        if ((oControl.getValue != undefined && oControl.getValue() == "" && oControl.getRequired != undefined && oControl.getRequired()) || (oControl.getValueState != undefined && oControl.getValueState() === sap.ui.core.ValueState.Error)) {
                            oControl.setValueState(sap.ui.core.ValueState.Error);
                            errorFlag = true;
                        }
                        else if (oControl.getValue != undefined && oControl.getValue() != "") {
                            oControl.setValueState(sap.ui.core.ValueState.None);
                        }
                    }
                });

                var secC = this.getView().getModel("AbsData").getProperty("/CreateNew");
                if (secC.length == 1 && secC[0].empName == "") {
                }
                else {
                    var aControls = this.getView().getControlsByFieldGroupId("checkSecC");
                    aControls.forEach(function (oControl) {
                        if (oControl.getId != undefined && (oControl.getId().includes("input") || oControl.getId().includes("datepicker") || oControl.getId().includes("select"))) {
                            if ((oControl.getValue != undefined && oControl.getValue() == "" && oControl.getRequired != undefined && oControl.getRequired()) || (oControl.getValueState != undefined && oControl.getValueState() === sap.ui.core.ValueState.Error)) {
                                oControl.setValueState(sap.ui.core.ValueState.Error);
                                errorFlag = true;
                            }
                            else if (oControl.getValue != undefined && oControl.getValue() != "") {
                                oControl.setValueState(sap.ui.core.ValueState.None);
                            }
                        }
                    });
                }

                return errorFlag;
            },

            onDelete: function () {
                MessageBox.warning("Delete the data in this form and any saved draft version of this form", {
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: function (sAction) {
                        if (sAction == MessageBox.Action.OK) {
                            sap.ui.core.BusyIndicator.show()
                            var Request_Paylaod = this.payload("", "X");
                            this.getOwnerComponent().getModel("S4hService").create("/ZSFGT_HEADER_AR02Set", Request_Paylaod,
                                {
                                    success: function (oData) {
                                        sap.ui.core.BusyIndicator.hide()
                                        var initiator = this.getView().getModel("AbsData").getProperty("/PersonDet").d.results[0]
                                        this._logCreation("D", initiator.firstName + " " + initiator.lastName, "", "");
                                        MessageBox.success("Form Deleted Successfully!", {
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
                                    }.bind(this),
                                    error: function () {
                                        console.log("Error S4h")
                                        sap.ui.core.BusyIndicator.hide()
                                    }
                                });
                        }

                    }.bind(this)
                });
            },

            onPrint: function () {
                var Request_Paylaod = this.payload("P", "");
                this.getOwnerComponent().getModel("S4hService").create("/ZSFGT_HEADER_AR02Set", Request_Paylaod,
                    {
                        success: function (oData) {
                            var s4url = this.getOwnerComponent().getModel("S4hService").sServiceUrl;    // Give your service name
                            var FormID = this.getView().byId("_IDGenInput2").getValue();      // Give your FormID
                            var sSource = s4url + "/ZSFGT_PRINT_AR02Set(Formid='" + FormID + "')/$value";
                            var newTab = window.open(sSource, "_blank");
                            newTab.onload = function () {
                                // newTab.print();
                            }
                            // this._pdfViewer = new sap.m.PDFViewer();
                            // this.getView().addDependent(this._pdfViewer);
                            // this._pdfViewer.setSource(sSource);
                            // this._pdfViewer.setTitle("Absence Report Form - Print");
                            // this._pdfViewer.setShowDownloadButton(false);
                            // this._pdfViewer.open();
                        }.bind(this),
                        error: function () {
                            console.log("Error S4h")
                            sap.ui.core.BusyIndicator.hide()
                        }
                    });
            },

            triggerWF: function (payload) {

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
                            var initiator = this.getView().getModel("AbsData").getProperty("/PersonDet").d.results[0]
                            this._logCreation("S", managerId, "", managerId);
                            MessageBox.success(`Form: ${this.getView().byId("_IDGenInput2").getValue()} is submitted successfully
                            
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
                        }.bind(this)).fail(function (XMLHttpRequest, textStatus) {
                            MessageBox.error(`Some error occurred. Please try again `);
                            sap.ui.core.BusyIndicator.hide();
                        });
                    }

                }.bind(this)).fail(function (XMLHttpRequest, textStatus) {
                    console.log("error");
                    MessageBox.error(`Some error occurred. Please try again`);
                    sap.ui.core.BusyIndicator.hide();
                });

            },

            onCancel: function () {
                warningFlag = false;
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
                    }.bind(this)
                });
            },

            addMessage: function (section, message, messArr) {

                var obj = {
                    "Icon": "sap-icon://status-error",
                    "Message": `${message} is Mandatory Field in Section ${section}`,
                }
                messArr.push(obj);

                this.getView().getModel("AbsData").setProperty("/MessageLog", messArr);
                return "";

            },

            dateConverter: function (date1) {
                if (date1) {
                    var timestamp = parseInt(date1.match(/\d+/)[0], 10);
                    var date = new Date(timestamp);

                    var options = { year: 'numeric', month: 'short', day: '2-digit' };
                    var formattedDate = date.toLocaleDateString('en-US', options);

                    return formattedDate;
                } else return "";
            },

            dateToAjax: function (date2) {

                if (date2) {
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
                } else return "";
            },

            orgIdToName: function (customString3) {
                var that = this;
                var oModel = that.getView().getModel("AbsData");
                this.dropdownEmp(customString3, oModel)
                // $.ajax({
                //     url: serviceUrl + "/odata/v2/EmpJob?$filter=customString3 eq '" + customString3 + "'&$format=json",
                //     type: 'GET',
                //     contentType: "application/json",
                //     success: function (data) {
                //         if (data.d.results.length > 0) {
                //             console.log("success" + data);
                //             var job = data;
                //             var finalData = [];
                //             var finalDataCurr = [];
                //             // oModel.setProperty("/FinalEmpDataCurr", finalData);
                //             // oModel.setProperty("/FinalEmpData", finalDataCurr);
                //             // that.getView().setModel(oModel, "AbsData");
                //             for (let k = 0; k < job.d.results.length; k++) {
                //                 that.idToName(finalData, job, k, oModel, customString3);
                //                 that.idToNameCurrMonth(finalDataCurr, job, k, oModel, customString3);
                //             }
                //         }

                //     },
                //     error: function (e) {
                //         console.log("error: " + e);
                //     }
                // });
            },

            getPrevMonthAbsences: function (emplData, empEmplData, perPersData, oModel, customString3) {
                // Code to get previous month first date and last date
                var prevMonthLastDate = new Date();
                prevMonthLastDate.setDate(0);
                var prevMonthStartDate = new Date(prevMonthLastDate);
                prevMonthStartDate.setDate(1);
                var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
                var firstDateStr = (dateFormat.format(prevMonthStartDate)) + "T00:00:00";
                var lastDateStr = (dateFormat.format(prevMonthLastDate)) + "T23:59:59";
                let a = new sap.ui.model.odata.ODataModel(serviceUrl + "/odata/v2", true);
                a.bTokenHandling = false;
                let batchData = [];
                a.clearBatch();
                emplData.forEach(function (oItem) {
                    batchData.push(a.createBatchOperation(
                        "/EmployeeTime?$filter=userId eq '" + oItem.userId + "' and startDate ge datetime'" + firstDateStr + "' and endDate le datetime'" + lastDateStr + "' and approvalStatus eq 'APPROVED' &$format=json",
                        "GET"
                    ));
                });
                a.addBatchReadOperations(batchData);
                a.setUseBatch(true);
                a.submitBatch(function (data) {
                    var finalData = [];
                    for (let j = data.__batchResponses.length - 1; j >= 0; j--) {
                        if (data.__batchResponses[j].data.results.length > 0) {
                            var sickReason = this.getView().getModel("AbsData").getProperty("/dropdownSick").filter((el) => el.externalCode == data.__batchResponses[j].data.results[0].cust_SickReason);
                            var timeType = this.getView().getModel("AbsData").getProperty("/dropdownAbs").filter((el) => el.timeTypeCode == data.__batchResponses[j].data.results[0].timeType)[0].externalName_defaultValue;
                            var Industrial = (!timeType.includes("Unpaid Leave") && !timeType.includes("Industrial Action"));
                            var Sick = timeType.includes("Sickness");
                            var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "dd MMM yyyy" });
                            if (sickReason.length > 0) {
                                var cust_SickReason = sickReason[0].label_defaultValue;
                            }
                            else {
                                var cust_SickReason = "";
                            }
                            var final = {
                                externalCode: data.__batchResponses[j].data.results[0].externalCode,
                                firstName: perPersData[j].data.results[0].firstName,
                                lastName: perPersData[j].data.results[0].lastName,
                                personIdExternal: perPersData[j].data.results[0].personIdExternal,
                                userId: data.__batchResponses[j].data.results[0].userId,
                                label: oModel.getProperty("/salutations").filter((el) => el.id == perPersData[j].data.results[0].salutation)[0].text,
                                jobTitle: emplData[j].jobTitle,
                                customString3: customString3,
                                timeType: timeType,
                                timeTypeCode: data.__batchResponses[j].data.results[0].timeType,
                                startDate: dateFormat.format(data.__batchResponses[j].data.results[0].startDate),
                                endDate: dateFormat.format(data.__batchResponses[j].data.results[0].endDate),
                                cust_SickReason: cust_SickReason,
                                descriptionCode: data.__batchResponses[j].data.results[0].cust_SickReason,
                                quantityInDays: data.__batchResponses[j].data.results[0].quantityInDays,
                                quantityInHours: data.__batchResponses[j].data.results[0].quantityInHours,
                                changed: false,
                                Sick: Industrial,
                                enabledDesc: Sick,
                                enabledLostDays: false,
                                enabledLostHrs: false,
                                valueStateStartDate: "None",
                                valueStateEndDate: "None"
                            }
                            finalData.push(final);
                        }
                    }
                    oModel.getProperty("/FinalEmpData") ? oModel.setProperty("/FinalEmpData", finalData.concat(oModel.getProperty("/FinalEmpData"))) : oModel.setProperty("/FinalEmpData", finalData);
                    var sortedData = oModel.getProperty("/FinalEmpData").sort((a, b) => {
                        // Sort by Last name
                        if (a.lastName < b.lastName) return -1;
                        if (a.lastName > b.lastName) return 1;

                        // a.firstName.localeCompare(b.firstName)
                        if (a.firstName < b.firstName) return -1;
                        if (a.firstName > b.firstName) return 1;

                        //Sort by UserId
                        if (a.userId < b.userId) return -1;
                        if (a.userId > b.userId) return 1;

                        // Sort by absence date
                        if (new Date(a.startDate) < new Date(b.startDate)) return 1;
                        if (new Date(a.startDate) > new Date(b.startDate)) return -1;
                    });
                    oModel.setProperty("/FinalEmpData", sortedData)
                }.bind(this));
                // var emp
                // await $.ajax({
                //     url: serviceUrl + "/odata/v2/EmployeeTime?$filter=userId eq '" + job[k].userId + "' and startDate ge datetime'" + firstDateStr + "' and endDate le datetime'" + lastDateStr + "' and approvalStatus eq 'APPROVED' &$format=json",
                //     type: 'GET',
                //     contentType: "application/json",
                //     success: function (data) {
                //         emp = data;
                //     }
                // });
                // if (emp.d.results.length > 0) {

                //     var perId;
                //     await $.ajax({
                //         url: serviceUrl + `/odata/v2/EmpEmployment?$filter=userId eq '${emp.d.results[0].userId}' &$format=json`,
                //         type: 'GET',
                //         contentType: "application/json",
                //         success: function (data) {
                //             perId = data.d.results[0].personIdExternal;
                //         },
                //         error: function (resp) {
                //             console.log(resp);
                //         }
                //     });

                //     var firstName, lastName, personIdExternal, jobTitle, personal, salutOptionId
                //     await $.ajax({
                //         url: serviceUrl + "/odata/v2/PerPerson(personIdExternal='" + perId + "')/personalInfoNav?$format=json",
                //         type: 'GET',
                //         contentType: "application/json",
                //         success: function (data) {       //first name, last name Etc.
                //             console.log("success" + data);
                //             personal = data;
                //             salutOptionId = personal.d.results[0].salutation;
                //             firstName = personal.d.results[0].firstName;
                //             lastName = personal.d.results[0].lastName;
                //             personIdExternal = personal.d.results[0].personIdExternal;
                //             jobTitle = job[k].jobTitle;
                //         },
                //         error: function (e) {
                //             console.log("error: " + e);
                //         }
                //     });

                //     var salutation = that.getView().getModel("AbsData").getProperty("/salutations").filter((el) => el.id == salutOptionId)[0].text;
                //     oModel.setProperty("/FinalEmpData", finalData);
                //     that.getView().setModel(oModel, "AbsData");
                //     for (let j = emp.d.results.length - 1; j >= 0; j--) {
                //         var sickReason = that.getView().getModel("AbsData").getProperty("/dropdownSick").filter((el) => el.externalCode == emp.d.results[j].cust_SickReason);
                //         var externalCode = emp.d.results[j].externalCode;
                //         var timeType = that.getView().getModel("AbsData").getProperty("/dropdownAbs").filter((el) => el.timeTypeCode == emp.d.results[j].timeType)[0].externalName_defaultValue;
                //         var timeTypeCode = emp.d.results[j].timeType;
                //         var sickReasonCode = emp.d.results[j].cust_SickReason;
                //         var Industrial = (!timeType.includes("Unpaid Leave") && !timeType.includes("Industrial Action"));
                //         var Sick = timeType.includes("Sickness");
                //         if (sickReason.length > 0) {
                //             var cust_SickReason = sickReason[0].label_defaultValue;
                //         }
                //         else {
                //             var cust_SickReason = "";
                //         }
                //         var startDate = emp.d.results[j].startDate;
                //         startDate = that.dateConverter(startDate);
                //         var endDate = emp.d.results[j].endDate;
                //         endDate = that.dateConverter(endDate);
                //         var quantityInDays = emp.d.results[j].quantityInDays;
                //         var quantityInHours = emp.d.results[j].quantityInHours;
                //         var final = {
                //             externalCode: externalCode,
                //             firstName: firstName,
                //             lastName: lastName,
                //             personIdExternal: personIdExternal,
                //             userId: emp.d.results[j].userId,
                //             label: salutation,
                //             jobTitle: jobTitle,
                //             customString3: customString3,
                //             timeType: timeType,
                //             timeTypeCode: timeTypeCode,
                //             startDate: startDate,
                //             endDate: endDate,
                //             cust_SickReason: cust_SickReason,
                //             descriptionCode: sickReasonCode,
                //             quantityInDays: quantityInDays,
                //             quantityInHours: quantityInHours,
                //             changed: false,
                //             Sick: Industrial,
                //             enabledDesc: Sick,
                //             enabledLostDays: false,
                //             enabledLostHrs: false,
                //             valueStateStartDate: "None",
                //             valueStateEndDate: "None"
                //         }
                //         finalData.push(final);
                //         finalData.sort((a, b) => {
                //             // Sort by Last name
                //             if (a.lastName < b.lastName) return -1;
                //             if (a.lastName > b.lastName) return 1;

                //             // a.firstName.localeCompare(b.firstName)
                //             if (a.firstName < b.firstName) return -1;
                //             if (a.firstName > b.firstName) return 1;

                //             //Sort by UserId
                //             if (a.userId < b.userId) return -1;
                //             if (a.userId > b.userId) return 1;

                //             // Sort by absence date
                //             if (new Date(a.startDate) < new Date(b.startDate)) return -1;
                //             if (new Date(a.startDate) > new Date(b.startDate)) return 1;
                //         });
                //         oModel.setProperty("/FinalEmpData", finalData);
                //         that.getView().setModel(oModel, "AbsData");
                //     }
                // }
            },

            getCurrMonthAbsences: function (emplData, empEmplData, perPersData, oModel, customString3) {

                var today = new Date();
                var currMonthStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
                var currMonthLastDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
                var firstDateStr = (dateFormat.format(currMonthStartDate)) + "T00:00:00";
                var lastDateStr = (dateFormat.format(currMonthLastDate)) + "T23:59:59";
                let a = new sap.ui.model.odata.ODataModel(serviceUrl + "/odata/v2", true);
                a.bTokenHandling = false;
                let batchData = [];
                a.clearBatch();
                emplData.forEach(function (oItem) {
                    batchData.push(a.createBatchOperation(
                        "/EmployeeTime?$filter=userId eq '" + oItem.userId + "' and (endDate eq '' or endDate ge datetime'" + firstDateStr + "') and startDate le datetime'" + lastDateStr + "' and approvalStatus eq 'APPROVED' &$format=json",
                        "GET"
                    ));
                });
                a.addBatchReadOperations(batchData);
                a.setUseBatch(true);
                a.submitBatch(function (data) {
                    var finalDataCurr = [];
                    for (let j = data.__batchResponses.length - 1; j >= 0; j--) {
                        if (data.__batchResponses[j].data.results.length > 0) {
                            var sickReason = this.getView().getModel("AbsData").getProperty("/dropdownSick").filter((el) => el.externalCode == data.__batchResponses[j].data.results[0].cust_SickReason);
                            var timeType = this.getView().getModel("AbsData").getProperty("/dropdownAbs").filter((el) => el.timeTypeCode == data.__batchResponses[j].data.results[0].timeType)[0].externalName_defaultValue;
                            var Industrial = (!timeType.includes("Unpaid Leave") && !timeType.includes("Industrial Action"));
                            var Sick = timeType.includes("Sickness");
                            var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "dd MMM yyyy" });
                            if (sickReason.length > 0) {
                                var cust_SickReason = sickReason[0].label_defaultValue;
                            }
                            else {
                                var cust_SickReason = "";
                            }
                            var finalCurr = {
                                externalCode: data.__batchResponses[j].data.results[0].externalCode,
                                firstName: perPersData[j].data.results[0].firstName,
                                lastName: perPersData[j].data.results[0].lastName,
                                personIdExternal: perPersData[j].data.results[0].personIdExternal,
                                userId: data.__batchResponses[j].data.results[0].userId,
                                label: oModel.getProperty("/salutations").filter((el) => el.id == perPersData[j].data.results[0].salutation)[0].text,
                                jobTitle: emplData[j].jobTitle,
                                customString3: customString3,
                                timeType: timeType,
                                timeTypeCode: data.__batchResponses[j].data.results[0].timeType,
                                startDate: dateFormat.format(data.__batchResponses[j].data.results[0].startDate),
                                endDate: dateFormat.format(data.__batchResponses[j].data.results[0].endDate),
                                cust_SickReason: cust_SickReason,
                                descriptionCode: data.__batchResponses[j].data.results[0].cust_SickReason,
                                quantityInDays: data.__batchResponses[j].data.results[0].quantityInDays,
                                quantityInHours: data.__batchResponses[j].data.results[0].quantityInHours,
                                changed: false,
                                Sick: Industrial,
                                enabledDesc: Sick,
                                enabledLostDays: false,
                                enabledLostHrs: false,
                                valueStateStartDate: "None",
                                valueStateEndDate: "None"
                            }
                            finalDataCurr.push(finalCurr);
                        }
                    }
                    oModel.getProperty("/FinalEmpDataCurr") ? oModel.setProperty("/FinalEmpDataCurr", finalDataCurr.concat(oModel.getProperty("/FinalEmpDataCurr"))) : oModel.setProperty("/FinalEmpDataCurr", finalDataCurr);
                    var sortedData = oModel.getProperty("/FinalEmpDataCurr").sort((a, b) => {
                        // Sort by Last name
                        if (a.lastName < b.lastName) return -1;
                        if (a.lastName > b.lastName) return 1;

                        // a.firstName.localeCompare(b.firstName)
                        if (a.firstName < b.firstName) return -1;
                        if (a.firstName > b.firstName) return 1;

                        //Sort by UserId
                        if (a.userId < b.userId) return -1;
                        if (a.userId > b.userId) return 1;

                        // Sort by absence date
                        if (new Date(a.startDate) < new Date(b.startDate)) return 1;
                        if (new Date(a.startDate) > new Date(b.startDate)) return -1;
                    });
                    oModel.setProperty("/FinalEmpDataCurr", sortedData);
                }.bind(this))
                // $.ajax({
                //     url: serviceUrl + "/odata/v2/EmployeeTime?$filter=userId eq '" + job[k].userId + "' and (endDate eq '' or endDate ge datetime'" + today + "') and approvalStatus eq 'APPROVED' &$format=json",
                //     type: 'GET',
                //     contentType: "application/json",
                //     success: function (data) {
                //         var emp = data;
                //         if (emp.d.results.length > 0) {

                //             $.ajax({
                //                 url: serviceUrl + `/odata/v2/EmpEmployment?$filter=userId eq '${emp.d.results[0].userId}' &$format=json`,
                //                 type: 'GET',
                //                 contentType: "application/json",
                //                 success: function (data) {
                //                     var perId = data.d.results[0].personIdExternal;

                //                     $.ajax({
                //                         url: serviceUrl + "/odata/v2/PerPerson(personIdExternal='" + perId + "')/personalInfoNav?$format=json",
                //                         type: 'GET',
                //                         contentType: "application/json",
                //                         success: function (data) {       //first name, last name Etc.
                //                             console.log("success" + data);
                //                             const personal = data;

                //                             var firstName = personal.d.results[0].firstName;
                //                             var lastName = personal.d.results[0].lastName;
                //                             var salutOptionId = personal.d.results[0].salutation;
                //                             var personIdExternal = personal.d.results[0].personIdExternal;
                //                             var jobTitle = job[k].jobTitle;
                //                             var salutation = that.getView().getModel("AbsData").getProperty("/salutations").filter((el) => el.id == salutOptionId)[0].text;
                //                             for (let j = emp.d.results.length - 1; j >= 0; j--) {
                //                                 var sickReason = that.getView().getModel("AbsData").getProperty("/dropdownSick").filter((el) => el.externalCode == emp.d.results[j].cust_SickReason);
                //                                 var timeType = that.getView().getModel("AbsData").getProperty("/dropdownAbs").filter((el) => el.timeTypeCode == emp.d.results[j].timeType)[0].externalName_defaultValue;
                //                                 var externalCode = emp.d.results[j].externalCode;
                //                                 var timeTypeCode = emp.d.results[j].timeType;
                //                                 var sickReasonCode = emp.d.results[j].cust_SickReason;
                //                                 var Industrial = (!timeType.includes("Unpaid Leave") && !timeType.includes("Industrial Action"));
                //                                 var Sick = timeType.includes("Sickness");
                //                                 if (sickReason.length > 0) {
                //                                     var cust_SickReason = sickReason[0].label_defaultValue;
                //                                 }
                //                                 else {
                //                                     var cust_SickReason = "";
                //                                 }
                //                                 var startDate = emp.d.results[j].startDate;
                //                                 startDate = that.dateConverter(startDate);
                //                                 var endDate = emp.d.results[j].endDate;
                //                                 endDate = that.dateConverter(endDate);
                //                                 var quantityInDays = emp.d.results[j].quantityInDays;
                //                                 var quantityInHours = emp.d.results[j].quantityInHours;
                //                                 var final = {
                //                                     externalCode: externalCode,
                //                                     firstName: firstName,
                //                                     lastName: lastName,
                //                                     personIdExternal: personIdExternal,
                //                                     userId: emp.d.results[j].userId,
                //                                     label: salutation,
                //                                     jobTitle: jobTitle,
                //                                     customString3: customString3,
                //                                     timeType: timeType,
                //                                     timeTypeCode: timeTypeCode,
                //                                     startDate: startDate,
                //                                     endDate: endDate,
                //                                     cust_SickReason: cust_SickReason,
                //                                     descriptionCode: sickReasonCode,
                //                                     quantityInDays: quantityInDays,
                //                                     quantityInHours: quantityInHours,
                //                                     changed: false,
                //                                     Sick: Industrial,
                //                                     enabledDesc: Sick,
                //                                     enabledLostDays: false,
                //                                     enabledLostHrs: false,
                //                                     valueStateStartDate: "None",
                //                                     valueStateEndDate: "None"
                //                                 }
                //                                 finalData.push(final);
                //                                 finalData.sort((a, b) => {
                //                                     // Sort by Last name
                //                                     if (a.lastName < b.lastName) return -1;
                //                                     if (a.lastName > b.lastName) return 1;

                //                                     // a.firstName.localeCompare(b.firstName)
                //                                     if (a.firstName < b.firstName) return -1;
                //                                     if (a.firstName > b.firstName) return 1;

                //                                     //Sort by UserId
                //                                     if (a.userId < b.userId) return -1;
                //                                     if (a.userId > b.userId) return 1;

                //                                     // Sort by absence date
                //                                     if (new Date(a.startDate) < new Date(b.startDate)) return 1;
                //                                     if (new Date(a.startDate) > new Date(b.startDate)) return -1;
                //                                 });
                //                                 oModel.setProperty("/FinalEmpDataCurr", finalData);
                //                                 that.getView().setModel(oModel, "AbsData");
                //                             }
                //                         },
                //                         error: function (e) {
                //                             console.log("error: " + e);
                //                         }
                //                     });
                //                 },
                //                 error: function (resp) {
                //                     console.log(resp);
                //                 }
                //             });
                //         }
                //     }
                // });
            },
            dropdownEmp: async function (orgCode, oModel) {
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
                    url: serviceUrl + `/odata/v2/EmpJob?$filter=customString3 eq '${orgCode}' and emplStatus ne '${discarded}' and emplStatus ne '${terminated}' and emplStatus ne '${retired}' and emplStatus ne '${suspended}' and emplStatus ne '${reportedNoShow}'&$format=json`,
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
                let a = new sap.ui.model.odata.ODataModel(serviceUrl + "/odata/v2", true);
                a.bTokenHandling = false;
                var _self = this;
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
                        var empEmplData = data.__batchResponses;
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
                                _self.getPrevMonthAbsences(emplData, empEmplData, data.__batchResponses, oModel, orgCode);
                                _self.getCurrMonthAbsences(emplData, empEmplData, data.__batchResponses, oModel, orgCode);
                                var EmpData = [];
                                for (let i = 0; i < data.__batchResponses.length; i++) {
                                    try {
                                        var temp = {
                                            firstName: data.__batchResponses[i].data.results[0].firstName,
                                            lastName: data.__batchResponses[i].data.results[0].lastName,
                                            userId: emplData[i].userId,
                                            jobTitle: emplData[i].customString1,
                                            personIdExternal: data.__batchResponses[i].data.results[0].personIdExternal,
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
                                oModel.setProperty("/dropdownEmp", EmpData);
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

            onMessageClose: function () {
                this.oMessage.close();
            },

            onTabChange: function (oEvent) {
                var oModel = this.getView().getModel("AbsData");
                var oFilter = new sap.ui.model.Filter('Formid', sap.ui.model.FilterOperator.EQ, this.getView().byId("_IDGenInput2").getValue());
                this.getOwnerComponent().getModel("logService").read("/zsf_logSet", {
                    filters: [oFilter],
                    success: function (oData) {
                        this.getView().byId("_HIDGenFormId1").setValue(this.getView().byId("_IDGenInput2").getValue());
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
            }

        });
    });
