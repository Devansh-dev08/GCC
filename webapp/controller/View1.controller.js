sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/ui/core/routing/History",
    "sap/ui/model/json/JSONModel",
    "../model/formatter"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, MessageBox, History, JSONModel, formatter) {
        "use strict";
        var phoneFlag;
        var emailFlag;
        var emailType;
        var flag = "0";
        var errText = [];
        var initiatorCode = "", modeFlag = false;
        var prefix = "";

        return Controller.extend("pd01qa.controller.View1", {
            formatter: formatter,
            onInit: function () {
                var link = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("SchoolsnetLink")
                var text = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("IntroText1")
                this.getView().byId("_IDGenText1").setHtmlText("<p>" + text + "<a title=" + link + " href=\"" + link + "\"</a> e-Forms pages.</p>")
                var oModel = new JSONModel();
                this.getView().setModel(oModel, "InitData");
                this.getView().getModel("InitData").setProperty("/dropdownInfoP", []);
                this.getView().getModel("InitData").setProperty("/jobInfoP", {});
                this.getView().getModel("InitData").setProperty("/homeAddressP", {});

                prefix = sap.ui.require.toUrl(this.getOwnerComponent().getManifestEntry('/sap.app/id').replaceAll('.', '/')) + "/";

                //getting the paramter from the app url
                this.getOwnerComponent().getRouter().getRoute("RouteView1").attachPatternMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: async function (oEvent) {
                this.query = oEvent.getParameter('arguments')["?query"];
                var that = this;
                // making the model
                var oModel = this.getView().getModel("InitData");
                const url = prefix + "user-api/currentUser";

                var mock = {
                    firstname: "Dummy",
                    lastname: "User",
                    email: "",
                    name: "",
                    displayName: "Dummy User (dummy.user@com)"
                };
                var oModel1 = new JSONModel();
                oModel1.loadData(url);
                oModel1.dataLoaded()
                    .then(async () => {
                        if (!oModel1.getData().email) {
                            oModel1.setData(mock);
                            var useremail = "test00171345@noemail.gloucestershire.gov.uk";
                        }
                        else {
                            var useremail = oModel1.getData().email;
                        }
                        if (this.query != undefined) {
                            oModel.setProperty("/disable", this.query);
                            var that = this;
                            this._getInitiator(oModel, useremail)
                                .then(initiator => {
                                    var initi = initiator;
                                    // Checking if the user has Multiple Organization
                                    this._checkMultiOrg(oModel, initi)
                                        .then(response => {
                                            this._S4Services(oModel);
                                            if (this.query.mode != "bsc") {
                                            }
                                            else {
                                            }
                                        })
                                        .catch(e => {
                                            var errorMessage = e ? JSON.parse(e.responseText).error.message.value : "Some error occurred"
                                            MessageBox.error(`${errorMessage}`, {
                                                title: "Error Message",
                                                actions: [sap.m.MessageBox.Action.OK],
                                                onClose: function (oAction) {
                                                    if (oAction) {
                                                        window.history.go(-1);
                                                    }
                                                }
                                            });
                                        });
                                });
                            // await $.ajax({
                            //     url: prefix + "odata/v2/PerEmail?$filter=emailAddress eq '" + useremail + "' &$format=json",
                            //     type: 'GET',
                            //     contentType: "application/json",
                            //     success: async function (data) {
                            //         var email = data;
                            //         var initiator = data.d.results[0].personIdExternal;
                            //         initiatorCode = data.d.results[0].personIdExternal;

                            //         await $.ajax({
                            //             url: prefix + "odata/v2/PerPerson('" + initiator + "')/personalInfoNav?$format=json",
                            //             type: 'GET',
                            //             contentType: "application/json",
                            //             success: async function (data) {
                            //                 console.log("success" + data);
                            //                 var userId;
                            //                 var nameData = data;
                            //                 await $.ajax({
                            //                     url: prefix + "odata/v2/EmpEmployment?$filter=personIdExternal eq '" + initiator + "'&$format=json",
                            //                     type: 'GET',
                            //                     contentType: "application/json",
                            //                     success: async function (data) {
                            //                         console.log("success" + data);
                            //                         userId = data.d.results[0].userId
                            //                         that.getNextSevenMonths(userId, that, oModel);
                            //                         var initDetails = {
                            //                             email: email.d.results[0].emailAddress,
                            //                             personIdExternal: initiator,
                            //                             fullName: nameData.d.results[0].firstName + " " + nameData.d.results[0].lastName,
                            //                             userId: data.d.results[0].userId
                            //                         }
                            //                         oModel.setProperty("/user", initDetails);
                            //                     },
                            //                     error: function (resp) {

                            //                     }
                            //                 });
                            //             },
                            //             error: function (resp) {

                            //             }
                            //         });
                            //     },
                            //     error: function (resp) {

                            //     }
                            // });
                            if (this.query.mode == "display") {
                                modeFlag = true;
                                // this.getView().byId("_IDGenButton1").setVisible(false); // Confirm
                                this.getView().byId("_confirmButtonIDEmp").setVisible(false); // Confirmed
                                this.getView().byId("_IDGenButton11").setVisible(true); // PRint
                                this.getView().byId("_IDGenButton8").setVisible(false); //Delete
                                this.getView().byId("_IDGenButton9").setVisible(false); //Submit

                                // unhiding
                                // this.getView().byId("_IDGenVBox12").setVisible(true); //section A checkboxes

                                // unhiding section B 

                                var oView = this.getView();
                                // Disable standalone input fields
                                oView.findAggregatedObjects(true, function (oControl) {
                                    if (oControl.isA("sap.m.Input")) {
                                        oControl.setEditable(false);

                                    }
                                    return false; // Stop searching deeper once an input is found
                                });
                            }
                            else if (this.query.mode == "initiator") {
                                // loading dropdowns
                                this.loadDropdowns(oModel);
                                modeFlag = true;
                                this.getView().byId("_confirmButtonIDEmp").setVisible(false); // Confirmed
                                this.getView().byId("_IDGenButton11").setVisible(true); // PRint
                                this.getView().byId("_IDGenButton8").setVisible(false); //Delete
                                this.getView().byId("_IDGenButton9").setVisible(false); //Submit
                            }
                        }
                        //if ends

                        else {
                            var disable = {
                                formId: "",
                                mode: ""
                            }
                            oModel.setProperty("/disable", disable);

                            // populating date by system
                            oModel.setProperty("/FormCreationDate", new Date());

                            // Initialize the Checkboxes and panels variables
                            this._PanelB = this.byId("_PanelSecB");
                            this._PanelC = this.byId("_PanelSecC");
                            this._PanelD = this.byId("_PanelSecD");
                            this._FlexBoxA = this.byId("_permAddressFlexBox");
                            this._FlexBoxB = this.byId("_firstEmergencyFlexBox");
                            this._FlexBoxC = this.byId("_secondEmergencyFlexBox");
                            this._AddHBox = this.byId("_addressHBox");
                            this._letterSpace = this.byId("_IDGenInput33");
                            this._FlexBoxD = this.byId("_empDetailsConfirmFlexB");
                            this._VBoxA = this.byId("your_comments_boxA");

                            this._getInitiator(oModel, useremail)
                                .then(initiator => {
                                    var initi = initiator;
                                    console.log(`Form initiated by ${initi}`);
                                    // Checking if the user has Multiple Organization
                                    this._checkMultiOrg(oModel, initi)
                                        .then(response => {
                                            // // Calling all the SuccessFactors API's

                                            // loading dropdowns
                                            this.loadDropdowns(oModel);

                                            this._SFServices(oModel, initi, response)
                                                .then(() => {
                                                    // Generating log for initiated status
                                                    // setTimeout(this._logCreation("I"), 3000);
                                                })

                                            // getting the form id
                                            this.getOwnerComponent().getModel("ZSFGTGT_PD01_SRV").read("/zsf_pd01_formidSet",
                                                {
                                                    success: function (oData) {
                                                        console.log(oData.results[0].Formid);
                                                        this.getView().byId("_IDGenInput2").setValue(oData.results[0].Formid)
                                                        this.getView().byId("_HIDGenFormId1").setValue(oData.results[0].Formid)
                                                    }.bind(this),
                                                    error: function (oData) {
                                                        console.log("Error", oData);
                                                    }
                                                });
                                        });
                                })
                                .catch(e => {
                                    var errorMessage = e ? JSON.parse(e.responseText).error.message.value : "Some error occurred"
                                    MessageBox.error(`${errorMessage}`, {
                                        title: "Error Message",
                                        actions: [sap.m.MessageBox.Action.OK],
                                        onClose: function (oAction) {
                                            if (oAction) {
                                                window.history.go(-1);
                                            }
                                        }
                                    });
                                });

                            //     var that = this;
                            // // var useremail = "gupta.ashutosh@hcl.com"
                            // var org;
                            // // initiator ajax MAIN
                            // await $.ajax({
                            //     url: prefix + "odata/v2/PerEmail?$filter=emailAddress eq '" + useremail + "' &$format=json",
                            //     type: 'GET',
                            //     contentType: "application/json",
                            //     success: async function (data) {
                            //         var email = data;

                            //         // var initiator = data.d.results[0].personIdExternal;



                            //         //data Binding-------------------------------> 
                            //         // oModel Declaration
                            //         var oModel = this.getView().getModel("InitData");
                            //         var that = this;

                            //         // First property - personal Info
                            //         // var initiator = "10200048";
                            //         var initiator = data.d.results[0].personIdExternal;
                            //         initiatorCode = data.d.results[0].personIdExternal;

                            //         await $.ajax({
                            //             url: prefix + "odata/v2/PerPerson('" + initiator + "')/personalInfoNav?$format=json",
                            //             type: 'GET',
                            //             contentType: "application/json",
                            //             success: async function (data) {
                            //                 console.log("success" + data);
                            //                 var userId;
                            //                 var nameData = data;
                            //                 await $.ajax({
                            //                     url: prefix + "odata/v2/EmpEmployment?$filter=personIdExternal eq '" + initiator + "'&$format=json",
                            //                     type: 'GET',
                            //                     contentType: "application/json",
                            //                     success: async function (data) {
                            //                         console.log("success" + data);
                            //                         userId = data.d.results[0].userId
                            //                         var initDetails = {
                            //                             email: email.d.results[0].emailAddress,
                            //                             personIdExternal: initiator,
                            //                             fullName: nameData.d.results[0].firstName + " " + nameData.d.results[0].lastName,
                            //                             userId: data.d.results[0].userId
                            //                         }
                            //                         oModel.setProperty("/user", initDetails);

                            //                         // Second Property - job Info / Employee DropDown
                            //                         await $.ajax({
                            //                             url: prefix + "odata/v2/EmpEmployment(personIdExternal='" + initiator + "',userId='" + userId + "')/jobInfoNav?$format=json",
                            //                             type: 'GET',
                            //                             contentType: "application/json",
                            //                             success: async function (data) {
                            //                                 console.log("success" + data);
                            //                                 var orgType = data.d.results[0].customString3;
                            //                                 if (data.d.results[0].managerId == "NO_MANAGER") {
                            //                                     MessageBox.error("Line Manager is missing, Form cannot be Initiated", {
                            //                                         title: "Error Message",
                            //                                         actions: [sap.m.MessageBox.Action.OK],
                            //                                         onClose: function (oAction) {
                            //                                             if (oAction) {
                            //                                                 // var oHistory, sPreviousHash;
                            //                                                 // oHistory = History.getInstance();
                            //                                                 // sPreviousHash = oHistory.getPreviousHash();
                            //                                                 // if (sPreviousHash == undefined) {
                            //                                                 // }
                            //                                                 window.history.go(-1);
                            //                                             }
                            //                                         }
                            //                                     });
                            //                                 }
                            //                                 $.ajax({
                            //                                     url: prefix + "odata/v2/cust_PersonnelArea?$filter= externalCode eq '" + data.d.results[0].customString3 + "'&$format=json",
                            //                                     type: 'GET',
                            //                                     contentType: "application/json",
                            //                                     success: function (data) {
                            //                                         console.log("success" + data);
                            //                                         that.getView().byId("orgInput").setValue(data.d.results[0].externalName + " (" + orgType + ")");
                            //                                         org = data.d.results[0].externalName + " (" + orgType + ")";
                            //                                         that.s4Log(org, that);
                            //                                         oModel.setProperty("/jobInfoP", data);
                            //                                         that.getView().setModel(oModel, "InitData");
                            //                                     },
                            //                                     error: function (e) {
                            //                                         console.log("error: " + e);
                            //                                     }
                            //                                 });


                            //                                 // Personal Info DropDown
                            //                                 await $.ajax({
                            //                                     url: prefix + "odata/v2/EmpJob?$filter=customString3 eq '" + orgType + "'&$format=json",
                            //                                     type: 'GET',
                            //                                     contentType: "application/json",
                            //                                     success: function (data) {
                            //                                         console.log("success" + data);
                            //                                         var dropdownArray = [];
                            //                                         for (let i = 0; i < data.d.results.length; i++) {
                            //                                             var Org = data;
                            //                                             $.ajax({
                            //                                                 url: prefix + "odata/v2/EmpEmployment?$filter=userId eq '" + data.d.results[i].userId + "'&$format=json",
                            //                                                 type: 'GET',
                            //                                                 contentType: "application/json",
                            //                                                 success: function (data) {
                            //                                                     console.log("success" + data);
                            //                                                     $.ajax({
                            //                                                         url: prefix + "odata/v2/PerPerson('" + data.d.results[0].personIdExternal + "')/personalInfoNav?$format=json",
                            //                                                         type: 'GET',
                            //                                                         contentType: "application/json",
                            //                                                         success: function (data) {
                            //                                                             console.log("success" + data);
                            //                                                             var firstNameDrop = data.d.results[0].firstName;
                            //                                                             var lastNameDrop = data.d.results[0].lastName;
                            //                                                             var personIdExternalDrop = data.d.results[0].personIdExternal;
                            //                                                             var customString1Drop = Org.d.results[i].customString1
                            //                                                             var selectEmp = {
                            //                                                                 personIdExternal: personIdExternalDrop,
                            //                                                                 firstName: firstNameDrop,
                            //                                                                 lastName: lastNameDrop,
                            //                                                                 jobInfo: customString1Drop,
                            //                                                                 userId: Org.d.results[i].userId
                            //                                                             }
                            //                                                             // pushing the key value pair to the table array
                            //                                                             dropdownArray.push(selectEmp);

                            //                                                             // sorting
                            //                                                             dropdownArray.sort((a, b) => {
                            //                                                                 // Sort by Last name
                            //                                                                 if (a.lastName < b.lastName) return -1;
                            //                                                                 if (a.lastName > b.lastName) return 1;

                            //                                                                 // a.firstName.localeCompare(b.firstName)
                            //                                                                 if (a.firstName < b.firstName) return -1;
                            //                                                                 if (a.firstName > b.firstName) return 1;

                            //                                                                 //Sort by UserId
                            //                                                                 if (a.userId < b.userId) return -1;
                            //                                                                 if (a.userId > b.userId) return 1;
                            //                                                             });
                            //                                                             // making property dropdownInfoP to bind data in table
                            //                                                             oModel.setProperty("/dropdownInfoP", dropdownArray);
                            //                                                             that.getView().setModel(oModel, "InitData");

                            //                                                         },
                            //                                                         error: function (e) {
                            //                                                             console.log("error: " + e);
                            //                                                             // console.log("userID: " , userIdOrg);
                            //                                                         }
                            //                                                     });
                            //                                                 },
                            //                                                 error: function (e) {
                            //                                                     console.log("error: " + e);
                            //                                                     // console.log("userID: " , userIdOrg);
                            //                                                 }
                            //                                             });
                            //                                         }
                            //                                     },
                            //                                     error: function (e) {
                            //                                         console.log("error: " + e);
                            //                                     }
                            //                                 });
                            //                             },
                            //                             error: function (e) {
                            //                                 console.log("error: " + e);
                            //                             }
                            //                         });
                            //                     },
                            //                     error: function (e) {
                            //                         console.log("error: " + e);
                            //                     }
                            //                 })
                            //                 var salutationInit = nameData.d.results[0].salutation;
                            //                 var firstNameInit = nameData.d.results[0].firstName;
                            //                 var lastNameInit = nameData.d.results[0].lastName;

                            //                 // salutation label
                            //                 await $.ajax({
                            //                     url: prefix + "odata/v2/PicklistOption(" + salutationInit + 'L' + ")/picklistLabels?$format=json",
                            //                     type: 'GET',
                            //                     contentType: "application/json",
                            //                     success: function (data) {
                            //                         console.log("success" + data);
                            //                         var salutationLabel = data.d.results[0].label;
                            //                         var initName = {
                            //                             salutationLabel: salutationLabel,
                            //                             firstNameInit: firstNameInit,
                            //                             lastNameInit: lastNameInit
                            //                         }
                            //                         oModel.setProperty("/initInfoP", initName);
                            //                         that.getView().setModel(oModel, "InitData");
                            //                     },
                            //                     error: function (e) {
                            //                         console.log("error: " + e);
                            //                     }
                            //                 })
                            //                 oModel.setProperty("/personalInfoP", data);
                            //                 that.getView().setModel(oModel, "InitData");
                            //             },
                            //             error: function (e) {
                            //                 console.log("error: " + e);
                            //             }
                            //         });
                            //     }.bind(this)
                            // }); //initiator ajax ending
                        }
                    })// data loaded bracket
            },

            _getEmplData: async function (orgCode, LastDateISO) {

                var terminated, retired, suspended, discarded, reportedNoShow;
                await $.ajax({
                    url: prefix + "odata/v2/PickListValueV2?$filter=PickListV2_id eq 'employee-status' and status eq 'A'&$format=json",
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

                let uri = `odata/v2/EmpJob?$filter=customString3 eq '${orgCode}' and emplStatus ne '${discarded}' and emplStatus ne '${terminated}' and emplStatus ne '${retired}' and emplStatus ne '${suspended}' and emplStatus ne '${reportedNoShow}'&$format=json`
                uri = LastDateISO ? uri + `&toDate=${LastDateISO}` : uri;
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

                    let a = new sap.ui.model.odata.ODataModel(prefix + "odata/v2", false);
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
                                        } catch (e) {
                                            console.log("Inconsistent data found for " + emplData[i].userId);
                                        }
                                    }
                                    var existingData = _self.getView().getModel("InitData").getProperty("/dropdownInfoP");
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
                                    _self.getView().getModel("InitData").setProperty("/dropdownInfoP", finalData);
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
            },

            _getInitiator: async function (oModel, useremail) {

                return new Promise(
                    async function (resolve, reject) {
                        var email;
                        await $.ajax({
                            url: prefix + "odata/v2/PerEmail?$filter=emailAddress eq '" + useremail + "' &$format=json",
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
                            url: prefix + "odata/v2/PerPerson(personIdExternal='" + email.d.results[0].personIdExternal + "')/personalInfoNav?$format=json",
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
                    }.bind(this));
            },

            _checkMultiOrg: async function (oModel, initiator) {

                return new Promise(
                    async function (resolve, reject) {
                        var username;
                        var multiOrgFound = false;
                        await $.ajax({
                            url: prefix + "odata/v2/UserAccount?$format=json&$filter=personIdExternal eq '" + initiator + "'",
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
                            url: prefix + "odata/v2/cust_ZFLM_MULTI_USERS?$filter=cust_UserName eq '" + username + "'&$format=json",
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
                                            url: prefix + "odata/v2/cust_PersonnelArea?$filter= externalCode eq '" + item + "'&$format=json",
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

            _S4Services: function (oModel) {

                // header set
                this.getOwnerComponent().getModel("ZSFGTGT_PD01_SRV").read("/zsf_pd01_hSet('" + this.query.formId + "')?$format=json",
                    {
                        success: function (oData) {
                            console.log(oData.Formid);
                            //Header Values
                            this.getView().byId("_IDGenInput2").setValue(oData.Formid);
                            this.getView().byId("_IDGenInput1").setValue(oData.Initiator);
                            this.getView().byId("_IDGenInput4").setValue(oData.Zdate);
                            this.getView().byId("orgInput").setValue(oData.OrgName);
                            this.getView().byId("datepicker01").setValue(oData.EffDate);
                            this.getView().byId("datepicker01").setEditable(false);
                            this.getView().byId("_IDGenSelect2").setValue(oData.SelectEmployee);
                            this.getView().byId("_IDGenSelect2").setSelectedKey(oData.SelEmpCode);
                            this.getView().byId("_IDGenSelect2").setEditable(false);
                            this.getView().getModel("InitData").setProperty("/confirmedButton", oData.ConfirmedButton);
                            //CheckBoxes 
                            this.getView().byId("_IDGenVBox12").setVisible(true);
                            var checkboxAdd = oData.ChgOfAdd == "X" ? true : false
                            this.getView().byId("ChangeOfAddCheckbox").setSelected(checkboxAdd);

                            var checkboxBank = oData.ChgOfBank == "X" ? true : false
                            this.getView().byId("ChangeOfBankCheckbox").setSelected(checkboxBank);

                            var checkboxName = oData.ChgOfNameStat == "X" ? true : false
                            this.getView().byId("ChangeOfNameCheckbox").setSelected(checkboxName);
                            // END of Checkboxes
                            // Header Value end

                            //disabling the CHECKBOX
                            // this.getView().byId("ChangeOfAddCheckbox").setEditable(false);
                            // this.getView().byId("ChangeOfBankCheckbox").setEditable(false);
                            // this.getView().byId("ChangeOfNameCheckbox").setEditable(false);
                            //UNHIDING THE FIELDS
                            // Unhide Panels
                            this.getView().byId("_PanelSecB").setVisible(checkboxAdd);
                            this.getView().byId("_PanelSecC").setVisible(checkboxBank);
                            this.getView().byId("_PanelSecD").setVisible(checkboxName);
                            this.getView().byId("_confirmButtonIDEmp").setVisible(false); // Confirmed
                            // unhide Panels end

                        }.bind(this),
                        error: function (oData) {
                            console.log("Error", oData);
                        }
                    }
                );
                // End OF Header set

                // secB set
                this.getOwnerComponent().getModel("ZSFGTGT_PD01_SRV").read("/zsf_pd01_hSet('" + this.query.formId + "')/hdr_to_sec_b_nav?$format=json",
                    {
                        success: function (oData) {
                            console.log(oData.results[0].Formid);
                            //SecB CheckBoxes
                            var checkboxPAdd = oData.results[0].ParmAddress == "X" ? true : false
                            this.getView().byId("_IDGenCheckBox4").setSelected(checkboxPAdd);

                            var checkboxFEAdd = oData.results[0].FirstEmgAdd == "X" ? true : false
                            this.getView().byId("_IDGenCheckBox5").setSelected(checkboxFEAdd);

                            var checkboxSEAdd = oData.results[0].SecondEmgAdd == "X" ? true : false
                            this.getView().byId("_IDGenCheckBox6").setSelected(checkboxSEAdd);
                            //SecB checkboxes END

                            //Permanent Address values
                            // var temp = this.getView().getModel("InitData");
                            // var temp1 = {
                            //     "d": {
                            //         "address1": oData.results[0].Streetpar,
                            //         "address2": oData.results[0].AddLine2par
                            //     }
                            // }
                            // this.getView().getModel("InitData").setProperty("/firstEmergencyAddP", temp1);
                            // current details
                            this.getView().byId("input1").setValue(oData.results[0].Streetpar);
                            this.getView().byId("input2").setValue(oData.results[0].AddLine2par);
                            this.getView().byId("input4").setValue(oData.results[0].Citypar);
                            this.getView().byId("input5").setValue(oData.results[0].Countypar);
                            this.getView().byId("input5").setSelectedKey(oData.results[0].CountyCodepar);
                            this.getView().byId("input6").setValue(oData.results[0].PostCodepar);
                            this.getView().byId("input7").setValue(oData.results[0].HomePhonepar);
                            this.getView().byId("_IDGenInput40").setValue(oData.results[0].Mobilepar);
                            this.getView().byId("_IDGenInput41").setValue(oData.results[0].ParEmail);
                            // End Of Current details

                            // New details
                            this.getView().byId("_IDGenInput5").setValue(oData.results[0].Streetpne);
                            this.getView().byId("_IDGenInput6").setValue(oData.results[0].AddLine2pne);
                            this.getView().byId("_IDGenInput8").setValue(oData.results[0].Citypne);
                            this.getView().byId("_IDGenSelect3").setValue(oData.results[0].Countypne);
                            this.getView().byId("_IDGenSelect3").setSelectedKey(oData.results[0].CountyCodepne);
                            this.getView().byId("_IDGenInput9").setValue(oData.results[0].PostCodepne);
                            this.getView().byId("_IDGenInput10").setValue(oData.results[0].HomePhonepne);
                            this.getView().byId("_IDGenInput11").setValue(oData.results[0].Mobilepne);
                            this.getView().byId("_IDGenInput12").setValue(oData.results[0].ParNewEmail);
                            this.getView().byId("_IDGenInput13").setValue(oData.results[0].ParConEmail);
                            this.configData = {
                                phoneTypeP: oData.results[0].ParPhnType,
                                phoneTypeB: oData.results[0].ParMobType,
                                emailTypeP: oData.results[0].ParEmailType,
                                isPhonePrimary: oData.results[0].PhnFlag ? true : false,
                                isHomePrimary: oData.results[0].MobFlag ? true : false,
                                isEmailPrimary: oData.results[0].EmailPrimary ? true : false
                            }
                            oData.results[0].PhnFlag == "X" ? this.getView().getModel("InitData").setProperty("/phoneInfoB", { isPrimary: true }) : "";
                            oData.results[0].MobFlag == "X" ? this.getView().getModel("InitData").setProperty("/phoneInfoP", { isPrimary: true }) : "";

                            this.getView().getModel("InitData").setProperty("/emailInfoP", { emailType: oData.results[0].ParEmailType, isPrimary: oData.results[0].EmailPrimary == "X" ? true : false });
                            // End Of New Details
                            // END of Permanent Address

                            // First Emergency Address
                            // Current Details
                            this.getView().byId("_IDGenInput42").setValue(oData.results[0].Streetfir);
                            this.getView().byId("_IDGenInput43").setValue(oData.results[0].AddLine2fir);
                            this.getView().byId("_IDGenInput45").setValue(oData.results[0].Cityfir);
                            this.getView().byId("_IDGenInput46").setValue(oData.results[0].Countyfir);
                            this.getView().byId("_IDGenInput46").setSelectedKey(oData.results[0].CountyCodefir);
                            this.getView().byId("_IDGenInput47").setValue(oData.results[0].PostCodefir);
                            this.getView().byId("_IDGenInput48").setValue(oData.results[0].FirstKinName);
                            this.getView().byId("_IDGenInputRel").setValue(oData.results[0].CurrFirstRelCode);
                            this.getView().byId("_IDGenInput49").setValue(oData.results[0].HomePhonefir);
                            this.getView().byId("_IDGenInput49").setValue(oData.results[0].Mobilefir);
                            // End Of Current Details

                            // New Details
                            this.getView().byId("_IDGenInput14").setValue(oData.results[0].Streetfne);
                            this.getView().byId("_IDGenInput15").setValue(oData.results[0].AddLine2fne);
                            this.getView().byId("_IDGenInput17").setValue(oData.results[0].Cityfne);
                            this.getView().byId("_IDGenSelect4").setValue(oData.results[0].Countyfne);
                            this.getView().byId("_IDGenSelect4").setSelectedKey(oData.results[0].CountyCodefne);
                            this.getView().byId("_IDGenInput18").setValue(oData.results[0].PostCodefne);
                            this.getView().byId("_IDGenInput19").setValue(oData.results[0].HomePhonefne);
                            // this.getView().byId("_IDGenInput20").setValue(oData.results[0].Mobilefne);
                            this.getView().byId("_IDGenInput21").setValue(oData.results[0].FirstNewKinName);
                            this.getView().byId("_IDGenInputSurne").setValue(oData.results[0].FirstNewKinSurName);
                            this.getView().byId("_IDGenComboBox1").setValue(oData.results[0].FirstRelation);
                            this.getView().byId("_IDGenComboBox1").setSelectedKey(oData.results[0].FirstRelCode);
                            // END Of New Details
                            // END of First Emergency Address

                            // Second Emergency Address
                            // Current Details
                            this.getView().byId("_IDGenInput51").setValue(oData.results[0].Streetsec);
                            this.getView().byId("_IDGenInput52").setValue(oData.results[0].AddLine2sec);
                            this.getView().byId("_IDGenInput54").setValue(oData.results[0].Citysec);
                            this.getView().byId("_IDGenInput55").setValue(oData.results[0].Countysec);
                            this.getView().byId("_IDGenInput55").setSelectedKey(oData.results[0].CountyCodesec);
                            this.getView().byId("_IDGenInput57").setValue(oData.results[0].SecKinName);
                            this.getView().byId("_IDGenInputSurSec").setValue(oData.results[0].SecKinSurName);
                            this.getView().byId("_IDGenInputRelSec").setValue(oData.results[0].CurrSecRelCode);
                            this.getView().byId("_IDGenInput56").setValue(oData.results[0].PostCodesec);
                            this.getView().byId("_IDGenInput58").setValue(oData.results[0].HomePhonesec);
                            // this.getView().byId("_IDGenInput59").setValue(oData.results[0].Mobilesec);
                            // End Of Current Details

                            // New Details
                            this.getView().byId("_IDGenInput23").setValue(oData.results[0].Streetsne);
                            this.getView().byId("_IDGenInput24").setValue(oData.results[0].AddLine2sne);
                            this.getView().byId("_IDGenInput26").setValue(oData.results[0].Citysne);
                            this.getView().byId("_IDGenSelect5").setValue(oData.results[0].Countysne);
                            this.getView().byId("_IDGenSelect5").setSelectedKey(oData.results[0].CountyCodesne);
                            this.getView().byId("_IDGenInput27").setValue(oData.results[0].PostCodesne);
                            this.getView().byId("_IDGenInput30").setValue(oData.results[0].HomePhonesne);
                            // this.getView().byId("_IDGenInput31").setValue(oData.results[0].Mobilesne);
                            this.getView().byId("_IDGenInput28").setValue(oData.results[0].SecNewKinName);
                            this.getView().byId("_IDGenInputSurSne").setValue(oData.results[0].SecNewKinSurName);
                            this.getView().byId("_IDGenComboBox2").setValue(oData.results[0].SecRelation);
                            this.getView().byId("_IDGenComboBox2").setSelectedKey(oData.results[0].SecRelCode);
                            // END Of New Details
                            // END of Second Emergency Address

                            // //disabling the CHECKBOX
                            // this.getView().byId("_IDGenCheckBox4").setEditable(false);
                            // this.getView().byId("_IDGenCheckBox5").setEditable(false);
                            // this.getView().byId("_IDGenCheckBox6").setEditable(false);
                            // //UNHIDING THE FIELDS
                            // Unhide Panels
                            this.byId("_permAddressFlexBox").setVisible(checkboxPAdd);
                            this.byId("_firstEmergencyFlexBox").setVisible(checkboxFEAdd);
                            this.byId("_secondEmergencyFlexBox").setVisible(checkboxSEAdd);
                            // unhide Panels end

                        }.bind(this),
                        error: function (oData) {
                            console.log("Error", oData);
                        }
                    }
                );

                // secC set
                this.getOwnerComponent().getModel("ZSFGTGT_PD01_SRV").read("/zsf_pd01_hSet('" + this.query.formId + "')/hdr_to_sec_c_nav?$format=json",
                    {
                        success: function (oData) {
                            console.log(oData.results[0].Formid);
                            //Values
                            // Current Details
                            this.getView().byId("_IDGenText36").setValue(oData.results[0].SortCodecur);
                            this.getView().byId("_IDGenText37").setValue(oData.results[0].BankBuildcur);
                            this.getView().byId("_IDGenText38").setValue(oData.results[0].Accountcur);
                            this.getView().byId("_IDGenText39").setValue(oData.results[0].BuildSocietyRefcur);
                            // End Of Current Details

                            // New Details
                            this.getView().byId("_IDGenInput33").setValue(oData.results[0].SortCodenew);
                            this.getView().byId("_IDGenInputA1").setValue(oData.results[0].BankBuildnew);
                            this.getView().byId("_IDGenInput34").setValue(oData.results[0].Accountnew);
                            this.getView().byId("_IDGenInput35").setValue(oData.results[0].BuildSocietyRefnew);
                            this.getView().byId("_nextMonthsDrop").setValue(oData.results[0].EffectiveMonth);
                            this.getView().byId("_nextMonthsDrop").setSelectedKey(oData.results[0].EffMonthInt);
                            this.getView().getModel("InitData").setProperty("/paymentInfoP", { d: { results: [{ externalCode: oData.results[0].ExtCode }] } });
                            this.getView().getModel("InitData").setProperty("/effdateIntP", oData.results[0].EffMonthInt);
                            // End Of New Details

                        }.bind(this),
                        error: function (oData) {
                            console.log("Error", oData);
                        }
                    }
                );

                // secD set
                this.getOwnerComponent().getModel("ZSFGTGT_PD01_SRV").read("/zsf_pd01_hSet('" + this.query.formId + "')/hdr_to_sec_d_nav?$format=json",
                    {
                        success: function (oData) {
                            console.log(oData.results[0].Formid);
                            //Values
                            // Current Details
                            this.getView().byId("_IDGenText40").setValue(oData.results[0].Titlecur);
                            this.getView().byId("_IDGenText40").setSelectedKey(oData.results[0].SalutationCodecur);
                            this.getView().byId("_IDGenText41").setValue(oData.results[0].Surnamecur);
                            this.getView().byId("_IDGenText42").setValue(oData.results[0].Namecur);
                            this.getView().byId("_IDGenText43").setValue(oData.results[0].KnownAscur);
                            // End Of Current Details

                            // New Details
                            this.getView().byId("_IDGenSelect6").setValue(oData.results[0].Titlenew);
                            this.getView().byId("_IDGenSelect6").setSelectedKey(oData.results[0].SalutationCodenew);
                            this.getView().byId("_IDGenInput37").setValue(oData.results[0].Surnamenew);
                            this.getView().byId("_IDGenInput50").setValue(oData.results[0].MiddleNamenew);
                            this.getView().byId("_IDGenInput38").setValue(oData.results[0].Namenew);
                            this.getView().byId("_IDGenInput39").setValue(oData.results[0].KnownAsnew);
                            // End Of New Details

                        }.bind(this),
                        error: function (oData) {
                            console.log("Error", oData);
                        }
                    }
                );

                // Comment set
                this.getOwnerComponent().getModel("ZSFGTGT_PD01_SRV").read("/zsf_pd01_hSet('" + this.query.formId + "')/hdr_to_comm_nav?$format=json",
                    {
                        success: function (oData) {
                            var comm = oData.results[0].comment;
                            if (comm != "") {
                                comm = "";
                                for (let i = 0; i < oData.results.length; i++) {
                                    comm += oData.results[i].comment + "\n";
                                }
                                this.getView().byId("_IDGenTextAreaA").setValue(comm);
                                this.getView().byId("_IDGenTextAreaA").setVisible(true);

                            }

                        }.bind(this),
                        error: function (oData) {
                            console.log("Error", oData);
                        }
                    }
                );

            },

            _SFServices: async function (oModel, initiator, multiOrgFlag) {

                var _self = this;
                return new Promise(
                    async function (resolve, reject) {
                        var userData = oModel.getProperty("/user");
                        // salutation label
                        $.ajax({
                            url: prefix + "odata/v2/PicklistOption(" + userData.salutation + 'L' + ")/picklistLabels?$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                                var salutationLabel = data.d.results[0].label;
                                var initName = {
                                    salutationLabel: salutationLabel,
                                    fullName: userData.fullName
                                }
                                oModel.setProperty("/initNameP", initName);
                            },
                            error: function (e) {
                                console.log(`PicklistOption entity failed for ${salutationInit + 'L'}`);
                                reject(e);
                            }
                        });

                        // // orgName Initiator
                        $.ajax({
                            url: prefix + "odata/v2/EmpEmployment(personIdExternal='" + initiator + "',userId='" + initiator + "')/jobInfoNav?$format=json",
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
                                            url: prefix + "odata/v2/cust_PersonnelArea?$filter= externalCode eq '" + data.d.results[0].customString3 + "'&$format=json",
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
                                                oModel.setProperty("/selectedOrg", data.d.results[0].externalCode);
                                            },
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
                            },
                            error: function (e) {
                                console.log(`EmpEmployment entity failed for ${initiator}`);
                                reject(e);
                            }
                        });
                    });
            },

            loadDropdowns: function (oModel) {

                // Salutation Dropdown
                $.ajax({
                    url: prefix + "odata/v2/Picklist('salutation')/picklistOptions?$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        console.log("success" + data);
                        var salutArr = [];
                        let a = new sap.ui.model.odata.ODataModel(prefix + "odata/v2", false);
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
                            for (let i = 0; i < data.__batchResponses.length; i++) {
                                var salut = {
                                    salutId: data.__batchResponses[i].data.results[0].optionId,
                                    salutLabel: data.__batchResponses[i].data.results[0].label
                                }
                                salutArr.push(salut);
                                oModel.setProperty("/salutaionDrop", salutArr);
                            }
                        });

                    },
                    error: function (e) {
                        console.log("error: " + e);
                    }
                })

                // County Dropdown
                $.ajax({
                    url: prefix + "odata/v2/PickListValueV2?$filter=PickListV2_id eq 'COUNTY_GCC' and status eq 'A'&$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        console.log("success" + data);
                        var countyArr = [];
                        var countyData = data;
                        for (let i = 0; i < data.d.results.length; i++) {
                            var count = {
                                externalCode: data.d.results[i].optionId,
                                countyLabel: data.d.results[i].label_en_US
                            }
                            countyArr.push(count);
                            oModel.setProperty("/countyDrop", countyArr);
                        }
                    },
                    error: function (e) {
                        console.log("error: " + e);
                    }
                })

                // Relation Dropdown
                $.ajax({
                    url: prefix + "odata/v2/PickListValueV2?$filter=PickListV2_id eq 'relation' and status eq 'A'&$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        var relationArr = [];
                        for (let i = 0; i < data.d.results.length; i++) {
                            var relation = {
                                optionId: data.d.results[i].optionId,
                                relationLabel: data.d.results[i].label_en_US
                            }
                            relationArr.push(relation);
                            oModel.setProperty("/relationDrop", relationArr);
                        }
                    },
                    error: function (e) {
                        console.log("error: " + e);
                    }
                });

                // Fetching Phone Type
                $.ajax({
                    url: prefix + "odata/v2/PickListValueV2?$filter=PickListV2_id eq 'ecPhoneType' and status eq 'A'&$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        if (this.configData) {
                            this.configData.phoneTypeP = data.d.results.filter((el) => el.externalCode == "P")[0].optionId;
                            this.configData.phoneTypeB = data.d.results.filter((el) => el.externalCode == "B")[0].optionId;
                        } else {
                            this.configData = {
                                phoneTypeP: data.d.results.filter((el) => el.externalCode == "P")[0].optionId,
                                phoneTypeB: data.d.results.filter((el) => el.externalCode == "B")[0].optionId
                            };
                        }
                    }.bind(this),
                    error: function (e) {
                        console.log("error: " + e);
                    }
                });

                // Fetching Email Type
                $.ajax({
                    url: prefix + "odata/v2/PickListValueV2?$filter=PickListV2_id eq 'ecEmailType' and status eq 'A'&$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        if (this.configData)
                            this.configData.emailTypeP = data.d.results.filter((el) => el.externalCode == "P")[0].optionId;
                        else
                            this.configData = {
                                emailTypeP: data.d.results.filter((el) => el.externalCode == "P")[0].optionId
                            };
                    }.bind(this),
                    error: function (e) {
                        console.log("error: " + e);
                    }
                });

                this.getNextSevenMonths(oModel);

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

            s4Log: function (org, that) {
                var Status = 'I';
                var log_payload = {
                    "Formid": that.getView().byId("_IDGenInput2").getValue(),
                    "StartedOn": that.getView().byId("_IDGenInput4").getValue(),
                    "Status": Status,
                    "Type": "PD01",
                    "OrganizationName": org,
                    "InitCode": initiatorCode,
                    "Initiator": that.getView().byId("_IDGenInput1").getValue(),
                    "Description": "Personal Details Form",
                    "FormOwner": that.getView().byId("_IDGenInput1").getValue(),
                    "FormOwnerCode": initiatorCode,
                    "AvailableFrom": new Date(),
                }
                that.getOwnerComponent().getModel("ZSFGTGW_LOG_SRV").create("/zsf_logSet", log_payload,
                    {
                        success: function (oData) {
                            console.log(`${oData.Formid} log created`);

                        }.bind(this),
                        error: function (oData) {
                            console.log("Error", oData);
                        }
                    });
            },

            onTabChange: function (oEvent) {
                var oModel = this.getView().getModel("InitData");
                var key = oEvent.getParameter("key");
                var oFilter = new sap.ui.model.Filter('Formid', sap.ui.model.FilterOperator.EQ, this.getView().byId("_IDGenInput2").getValue());
                if (key == "History") {
                    sap.ui.core.BusyIndicator.show()
                    this.getOwnerComponent().getModel("ZSFGTGW_LOG_SRV").read("/zsf_logSet", {
                        filters: [oFilter],
                        success: function (oData) {
                            this.getView().byId("_HIDGenFormId1").setValue(this.getView().byId("_IDGenInput2").getValue());
                            var historyTable = [];
                            for (let i = 0; i < oData.results.length; i++) {
                                if (oData.results[i].Status == "I") {
                                    oData.results[i].Status = "Initiated"
                                }
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
                            // sap.ui.core.BusyIndicator.hide()
                            console.log("Error", oData);
                        }
                    });

                    this.getView().byId("_IDGenButton11").setVisible(false);
                    this.getView().byId("_IDGenButton8").setVisible(false);
                    this.getView().byId("_IDGenButton10").setVisible(false);
                    this.getView().byId("_IDGenButton9").setVisible(false);
                    // this.getView().byId("_IDGenPanel7").setVisible(true);
                }
                if (key == "Form") {
                    this.getView().byId("_IDGenButton11").setVisible(true);
                    this.getView().byId("_IDGenButton8").setVisible(true);
                    this.getView().byId("_IDGenButton10").setVisible(true);
                    this.getView().byId("_IDGenButton9").setVisible(true);

                }
                sap.ui.core.BusyIndicator.hide()
            },

            getBaseURL: function () {
                var appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
                var appPath = appId.replaceAll(".", "/");
                var appModulePath = jQuery.sap.getModulePath(appPath);
                return appModulePath;
            },

            OnCoAddress: function (oEvent) {
                var bSelected1 = oEvent.getParameter("selected");
                this.byId("_PanelSecB").setVisible(bSelected1);

            },

            OnCoBankDetails: function (oEvent) {
                var bSelected2 = oEvent.getParameter("selected");
                this.byId("_PanelSecC").setVisible(bSelected2);

            },

            OnCoNameStatus: function (oEvent) {
                var bSelected3 = oEvent.getParameter("selected");
                this.byId("_PanelSecD").setVisible(bSelected3);

            },

            OnCoPermanentAdd: function (oEvent) {
                var bSelected4 = oEvent.getParameter("selected");
                this._FlexBoxA.setVisible(bSelected4);
                // this._AddHBox.setVisible(bSelected4);

            },

            OnCoFirstEmergencyAdd: function (oEvent) {
                var bSelected5 = oEvent.getParameter("selected");
                this._FlexBoxB.setVisible(bSelected5);
                // this._AddHBox.setVisible(bSelected5);

            },

            OnCoSecondEmergencyAdd: function (oEvent) {
                var bSelected6 = oEvent.getParameter("selected");
                this._FlexBoxC.setVisible(bSelected6);
                // this._AddHBox.setVisible(bSelected6);

            },

            oEmployeeSelect: async function (oEvent) {
                if (!oEvent.getSource().getSelectedItem())
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                else
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);

            },

            getNextSevenMonths: function (oModel) {
                $.ajax({
                    url: prefix + "odata/v2/EmpJob?$filter=userId eq '" + this.initiatorCode + "'&$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        // var PayGroup = data.d.results[0].payGroup
                        oModel.setProperty("/payGroupP", data);
                        // ------------NEXT SEVEN MONTHS------------
                        var empPayGroup = data.d.results[0].payGroup;
                        var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                        var today = new Date();
                        var monthIndex = today.getMonth();
                        var currentMonthIndex = monthIndex;
                        var currentYear = today.getFullYear();
                        var lastYear = currentYear - 1;
                        var todayDate = Number(new Date().toISOString().substring(0, 10).replaceAll('-', ''));
                        var nextSevenMonths = [];
                        $.ajax({
                            url: prefix + "odata/v2/cust_ZFLM_GCC_MSSDEAD/$count?$filter= cust_PayrollArea eq '" + empPayGroup + "'&$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                                var recordCount = data;
                                // oModel.setProperty("/countyPermanentP", data);
                                if (recordCount !== "0") {
                                    var urlP = prefix + "odata/v2/cust_ZFLM_GCC_MSSDEAD?$filter= cust_PayrollArea eq '" + empPayGroup + "' and (cust_PayrollYear eq '" + lastYear + "' or cust_PayrollYear eq '" + currentYear + "' )&$format=json";
                                } else {
                                    var urlP = prefix + "odata/v2/cust_ZFLM_GCC_MSSDEAD?$filter= cust_PayrollArea eq null and (cust_PayrollYear eq '" + lastYear + "' or cust_PayrollYear eq '" + currentYear + "' )&$format=json";
                                }
                                $.ajax({
                                    url: urlP,
                                    type: 'GET',
                                    contentType: "application/json",
                                    success: function (data) {
                                        var locked = "";
                                        var nextMonth = "";
                                        for (let i = 0; i < data.d.results.length; i++) {
                                            var PayrollLockDates = data.d.results[i];
                                            var startDateArray = PayrollLockDates.cust_StartDate.split('.');
                                            var startDate = Number(startDateArray[2] + startDateArray[1] + startDateArray[0]);
                                            var startMonth = Number(startDateArray[1])
                                            var endDateArray = PayrollLockDates.cust_EndDate.split('.');
                                            var endDate = Number(endDateArray[2] + endDateArray[1] + endDateArray[0]);
                                            if (todayDate >= startDate && todayDate <= endDate) {
                                                locked = "X";
                                                if (currentMonthIndex == startMonth - 1) {
                                                    nextMonth = "X";
                                                }
                                                var lockedCon = {
                                                    locked: locked,
                                                    nextMonth: nextMonth
                                                }
                                                oModel.setProperty("/lockedP", lockedCon);
                                                break;
                                            }
                                        }
                                        if (nextMonth == "X") {
                                            currentMonthIndex += 1;
                                        }
                                        for (var i = 0; i < 7; i++) {
                                            var nextMonthIndex = (currentMonthIndex + i) % 12;
                                            var nextMonth = months[nextMonthIndex];

                                            // Calculate the year for the next month
                                            var nextYear = currentYear + Math.floor((currentMonthIndex + i) / 12);

                                            // Create a string representing month and year
                                            var monthAndYear = nextMonth + ' ' + nextYear;
                                            var temp = {
                                                months: monthAndYear,
                                                key: nextMonthIndex + 1
                                            }
                                            nextSevenMonths.push(temp);
                                        }

                                        oModel.setProperty("/nextSevenMonths", nextSevenMonths);
                                    },
                                    error: function (e) {
                                        console.log("error: " + e);
                                    }
                                })
                            },
                            error: function (e) {
                                console.log("error: " + e);
                            }
                        });
                    }.bind(this),
                    error: function (e) {
                        console.log("error: " + e);
                    }
                })
            },

            oMonthSelect: function (oEvent) {
                var sMonthIndex = oEvent.getSource().getSelectedItem().getKey();
                var sMonthYear = oEvent.getSource().getSelectedItem().getText();
                var arraySel = sMonthYear.split(" ");
                var sYear = arraySel[1];
                var firstDate = new Date(sYear, sMonthIndex - 1, 1);
                var firstDateTime = this.dateToUnix(firstDate);
                var oModel = this.getView().getModel("InitData");
                oModel.setProperty("/effdateIntP", firstDateTime);
            },

            dateToUnix: function (date) {
                var temp = new Date(date);
                var timeInMillisecond = Number((temp.getTime()) + 21600000);
                return "/Date(" + timeInMillisecond + ")/";
            },

            onConfirmButtonPress: function (oEvent) {
                var oModel = this.getView().getModel("InitData");
                if (this.getView().byId("_IDGenSelect2").getSelectedItem() == null) {
                    MessageBox.alert("Please Select an Employee to continue.", {
                        title: "Alert",
                        actions: MessageBox.Action.OK,
                        emphasizedAction: MessageBox.Action.OK,
                        onClose: null
                    });
                }
                if (this.getView().byId("datepicker01").getDateValue() == null) {
                    MessageBox.alert("Please Select an Effective Date to continue.", {
                        title: "Alert",
                        actions: MessageBox.Action.OK,
                        emphasizedAction: MessageBox.Action.OK,
                        onClose: null
                    });
                }

                if (this.getView().byId("datepicker01").getDateValue() != null && this.getView().byId("_IDGenSelect2").getSelectedItem() != null) {
                    MessageBox.confirm("You will not be able to change the selection. Are you sure you'd like to go ahead?", {
                        title: "Confirm",
                        actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                        emphasizedAction: MessageBox.Action.OK,
                        onClose: function (oAction) {
                            if (oAction === MessageBox.Action.OK) {

                                this.fetchSelEmplData(this.getView().byId("_IDGenSelect2").getSelectedKey());
                                oModel.setProperty("/confirmedButton", "X");
                                this.getView().byId("_IDGenVBox12").setVisible(true);
                                this.getView().byId("datepicker01").setEditable(false);
                                this.getView().byId("_IDGenSelect2").setEditable(false);
                                this.getView().byId("_confirmButtonIDEmp").setText("Confirmed");
                                this.getView().byId("_confirmButtonIDEmp").setEnabled(false);
                            }
                        }.bind(this)
                    });
                }

            },

            fetchSelEmplData: function (selEmpCode) {
                var oModel = this.getView().getModel("InitData");
                var pernr = this.getView().getModel("InitData").getProperty("/dropdownInfoP").filter((el) => el.userId == selEmpCode)[0].personIdExternal;
                var that = this;
                // salutation label
                $.ajax({
                    url: prefix + "odata/v2/PerPerson('" + pernr + "')/personalInfoNav?$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        oModel.setProperty("/secDValues", data);
                        that.getView().byId("_IDGenText41").setValue(data.d.results[0].lastName);
                        that.getView().byId("_IDGenText44").setValue(data.d.results[0].middleName);
                        that.getView().byId("_IDGenText42").setValue(data.d.results[0].firstName);
                        that.getView().byId("_IDGenText43").setValue(data.d.results[0].preferredName);
                        that.getView().setModel(oModel, "InitData");
                        var salutation = data.d.results[0].salutation;
                        $.ajax({
                            url: prefix + "odata/v2/PicklistOption(" + salutation + 'L' + ")/picklistLabels?$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                                oModel.setProperty("/salutaionP", data);
                                that.getView().byId("_IDGenText40").setValue(data.d.results[0].label);
                                that.getView().byId("_IDGenText40").setSelectedKey(data.d.results[0].optionId);
                                that.getView().setModel(oModel, "InitData");
                            }.bind(this),
                            error: function (e) {
                                console.log("error: " + e);
                            }
                        })
                    }.bind(this),
                    error: function (e) {
                        console.log("error: " + e);
                    }
                });

                //Payment Information - date and time
                // url with specific personal id to fetch records

                // Property - Payment info and Date time
                var url = prefix + "odata/v2/PaymentInformationV3?$filter=worker eq '" + pernr + "'&$format=json";
                $.ajax({
                    url: url,
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        //getting the date from model
                        // the date is get in the unix format
                        var modelDate = data.d.results[0].effectiveStartDate;

                        // getting the epoch date from model date
                        // fetching just the unix number
                        const regex = /\/Date\((.*?)\)\//;
                        const match = regex.exec(modelDate);
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

                        // validation to convert into right format
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
                        // getting the date
                        const actualDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
                        //----------------------date conversion end--------------------------//
                        var url1 = prefix + "odata/v2/PaymentInformationV3(effectiveStartDate=datetime'" + actualDate + "',worker='" + pernr + "')/toPaymentInformationDetailV3?$format=json"

                        // Third Property - Payment Information
                        $.ajax({
                            url: url1,
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                                var extCode = data.d.results[0].externalCode;
                                $.ajax({
                                    url: prefix + "odata/v2/PaymentInformationDetailV3(PaymentInformationV3_effectiveStartDate=datetime'" + actualDate + "',PaymentInformationV3_worker='" + pernr + "',externalCode=" + extCode + 'L' + ")/bankNav?$format=json",
                                    type: 'GET',
                                    contentType: "application/json",
                                    success: function (data) {
                                        oModel.setProperty("/bankNavP", data);
                                        that.getView().byId("_IDGenText37").setValue(data.d.bankName);
                                        that.getView().setModel(oModel, "InitData");
                                    }.bind(this),
                                    error: function (e) {
                                        console.log("error: " + e);
                                    }
                                })

                                oModel.setProperty("/paymentInfoP", data);
                                that.getView().byId("_IDGenText36").setValue(data.d.results[0].routingNumber);
                                that.getView().byId("_IDGenText38").setValue(data.d.results[0].accountNumber);
                                that.getView().byId("_IDGenText39").setValue(data.d.results[0].cust_BuildingSocRollNo);
                                that.getView().setModel(oModel, "InitData");
                            }.bind(this),
                            error: function (e) {
                                console.log("error: " + e);
                            }
                        })
                        //payment ajax call end-----------------------

                    }.bind(this),
                    error: function (e) {
                        console.log("error: " + e);
                    }
                });

                // Fourth Property - Home address
                $.ajax({
                    url: prefix + "odata/v2/PerPerson('" + pernr + "')/homeAddressNavDEFLT?$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        oModel.setProperty("/homeAddressP", data);
                        that.getView().byId("input1").setValue(data.d.results[0].address1);
                        that.getView().byId("input2").setValue(data.d.results[0].address2);
                        that.getView().byId("input4").setValue(data.d.results[0].city);
                        that.getView().byId("input6").setValue(data.d.results[0].zipCode);
                        that.getView().setModel(oModel, "InitData");
                        var countyCode = data.d.results[0].state;

                        // get county label
                        $.ajax({
                            url: prefix + "odata/v2/PickListValueV2?$filter=PickListV2_id eq 'COUNTY_GCC' and status eq 'A' and optionId eq '" + countyCode + "'&$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                                if (data.d.results.length != 0) {
                                    oModel.setProperty("/countyPermanentP", data);
                                    that.getView().byId("input5").setValue(data.d.results[0].label_en_GB);
                                    that.getView().byId("input5").setSelectedKey(data.d.results[0].optionId);
                                    that.getView().setModel(oModel, "InitData");
                                }
                            }.bind(this),
                            error: function (e) {
                                console.log("error: " + e);
                            }
                        })
                    }.bind(this),
                    error: function (e) {
                        console.log("error: " + e);
                    }
                })

                // Fifth Property - Phone Info
                $.ajax({
                    url: prefix + "odata/v2/PerPerson('" + pernr + "')/phoneNav?$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        var phoneData = data;
                        for (let i = 0; i < data.d.results.length; i++) {
                            var phoneType = data.d.results[i].phoneType;
                            $.ajax({
                                url: prefix + "odata/v2/PerPhone(personIdExternal='" + pernr + "',phoneType='" + data.d.results[i].phoneType + "')/phoneTypeNav?$format=json",
                                type: 'GET',
                                contentType: "application/json",
                                success: function (data) {
                                    if (data.d.externalCode == "P") {
                                        oModel.setProperty("/phoneInfoP", phoneData.d.results[i]);
                                        that.getView().byId("_IDGenInput40").setValue(phoneData.d.results[i].phoneNumber);
                                        that.configData.isPhonePrimary = phoneData.d.results[i].isPrimary;
                                    }
                                    if (data.d.externalCode == "B") {
                                        oModel.setProperty("/phoneInfoB", phoneData.d.results[i]);
                                        that.getView().byId("input7").setValue(phoneData.d.results[i].phoneNumber);
                                        that.configData.isHomePrimary = phoneData.d.results[i].isPrimary;
                                    }
                                }.bind(this),
                                error: function (e) {
                                    console.log("error: " + e);
                                }
                            })

                        }

                    }.bind(this),
                    error: function (e) {
                        console.log("error: " + e);
                    }
                })

                // sixth Property - Email Info
                $.ajax({
                    url: prefix + "odata/v2/PerPerson('" + pernr + "')/emailNav?$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        var emailData = data;
                        if (data.d.results.length == 0)
                            that.configData.isEmailPrimary = true;
                        for (let i = 0; i < data.d.results.length; i++) {
                            // var emailType = data.d.results[i].emailType;
                            $.ajax({
                                url: prefix + "odata/v2/PerEmail(emailType='" + data.d.results[i].emailType + "',personIdExternal='" + pernr + "')/emailTypeNav?$format=json",
                                type: 'GET',
                                contentType: "application/json",
                                success: function (data) {
                                    if (data.d.externalCode == "P") {
                                        oModel.setProperty("/emailInfoP", emailData.d.results[i]);
                                        that.getView().byId("_IDGenInput41").setValue(emailData.d.results[i].emailAddress);
                                        if (emailData.d.results[i].isPrimary)
                                            that.configData.isEmailPrimary = true;
                                    }
                                }.bind(this),
                                error: function (e) {
                                    console.log("error: " + e);
                                }
                            })
                        }
                    }.bind(this),
                    error: function (e) {
                        console.log("error: " + e);
                    }
                })

                // Seventh Property - Emergency Contact
                $.ajax({
                    url: prefix + "odata/v2/PerPerson('" + pernr + "')/emergencyContactNav?$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                        oModel.setProperty("/emergencyContactP", data);
                        that.getView().setModel(oModel, "InitData");
                        var emergencyData = data;
                        for (let i = 0; i < data.d.results.length; i++) {
                            // var eName = data.d.results[i].name;
                            // var eRelation = data.d.results[i].relationship;
                            // emergency address ajax call
                            $.ajax({
                                url: prefix + "odata/v2/PerEmergencyContacts(name='" + data.d.results[i].name + "',personIdExternal='" + pernr + "',relationship='" + data.d.results[i].relationship + "')/addressNavDEFLT?$format=json",
                                type: 'GET',
                                contentType: "application/json",
                                success: function (data) {
                                    var emergencyAddData = data;
                                    $.ajax({
                                        url: prefix + "odata/v2/PickListValueV2?$filter=PickListV2_id eq 'COUNTY_GCC' and status eq 'A' and optionId eq '" + data.d.state + "'&$format=json",
                                        type: 'GET',
                                        contentType: "application/json",
                                        success: function (data) {
                                            if (data.d.results.length != 0) {
                                                if (emergencyData.d.results[i].primaryFlag == "Y") {
                                                    oModel.setProperty("/countyFirstEAdd", data);
                                                    that.getView().byId("_IDGenInput46").setValue(data.d.results[0].label_en_GB);
                                                    that.getView().byId("_IDGenInput46").setSelectedKey(data.d.results[0].optionId);
                                                    that.getView().setModel(oModel, "InitData");
                                                }
                                                if (emergencyData.d.results[i].primaryFlag == "N") {
                                                    oModel.setProperty("/countySecondEAdd", data);
                                                    that.getView().byId("_IDGenInput55").setValue(data.d.results[0].label_en_GB);
                                                    that.getView().byId("_IDGenInput55").setSelectedKey(data.d.results[0].optionId);
                                                    that.getView().setModel(oModel, "InitData");
                                                }
                                            }
                                        }.bind(this),
                                        error: function (e) {
                                            console.log("error: " + e);
                                        }
                                    })
                                    if (emergencyData.d.results[i].primaryFlag == "Y") {
                                        oModel.setProperty("/firstEmergencyP", emergencyData.d.results[i]);
                                        that.getView().byId("_IDGenInput48").setValue(emergencyData.d.results[i].name);
                                        that.getView().byId("_IDGenInputSur").setValue(emergencyData.d.results[i].customString1);
                                        that.getView().byId("_IDGenInput49").setValue(emergencyData.d.results[i].phone);
                                        oModel.setProperty("/firstEmergencyAddP", emergencyAddData);
                                        that.getView().byId("_IDGenInput42").setValue(emergencyAddData.d.address1);
                                        that.getView().byId("_IDGenInput43").setValue(emergencyAddData.d.address2);
                                        that.getView().byId("_IDGenInput45").setValue(emergencyAddData.d.city);
                                        that.getView().byId("_IDGenInput47").setValue(emergencyAddData.d.zipCode);
                                        that.getView().setModel(oModel, "InitData");
                                    }
                                    if (emergencyData.d.results[i].primaryFlag == "N") {
                                        oModel.setProperty("/secondEmergencyP", emergencyData.d.results[i]);
                                        that.getView().byId("_IDGenInput57").setValue(emergencyData.d.results[i].name);
                                        that.getView().byId("_IDGenInputSurSec").setValue(emergencyData.d.results[i].customString1);
                                        that.getView().byId("_IDGenInput58").setValue(emergencyData.d.results[i].phone);
                                        oModel.setProperty("/secondEmergencyAddP", emergencyAddData);
                                        that.getView().byId("_IDGenInput51").setValue(emergencyAddData.d.address1);
                                        that.getView().byId("_IDGenInput52").setValue(emergencyAddData.d.address2);
                                        that.getView().byId("_IDGenInput54").setValue(emergencyAddData.d.city);
                                        that.getView().byId("_IDGenInput56").setValue(emergencyAddData.d.zipCode);
                                        that.getView().setModel(oModel, "InitData");
                                    }
                                }.bind(this),
                                error: function (e) {
                                    console.log("error: " + e);
                                }
                            })
                            // relationship label ajax call 
                            $.ajax({
                                url: prefix + "odata/v2/PicklistOption(" + data.d.results[i].relationship + 'L' + ")/picklistLabels?$format=json",
                                type: 'GET',
                                contentType: "application/json",
                                success: function (data) {
                                    if (emergencyData.d.results[i].primaryFlag == "Y") {
                                        oModel.setProperty("/firstEmergencyRelationP", data);
                                        that.getView().byId("_IDGenInputRel").setValue(data.d.results[0].label);
                                        that.getView().setModel(oModel, "InitData");
                                    }
                                    if (emergencyData.d.results[i].primaryFlag == "N") {
                                        oModel.setProperty("/secondEmergencyRelationP", data);
                                        that.getView().byId("_IDGenInputRelSec").setValue(data.d.results[0].label);
                                        that.getView().setModel(oModel, "InitData");
                                    }
                                }.bind(this),
                                error: function (e) {
                                    console.log("error: " + e);
                                }
                            })
                        }

                    }.bind(this),
                    error: function (e) {
                        console.log("error: " + e);
                    }
                })
            },

            onPostChange: function (oEvent) {
                var postCode = oEvent.getParameter("newValue");
                if (postCode.length > 8 || postCode.length < 6) {
                    MessageBox.error("Postal code should be of 6-8 letters");
                    this.getView().byId(oEvent.getSource().sId).setValueState(sap.ui.core.ValueState.Error);
                    this.getView().byId(oEvent.getSource().sId).setValue("");
                }
                else {
                    this.getView().byId(oEvent.getSource().sId).setValueState(sap.ui.core.ValueState.None);
                }
            },

            onLiveTeleChange: function (oEvent) {
                var phone = oEvent.getParameter("newValue");
                if (phone.substring(0, 1) != "0") {
                    phone = "0" + phone;
                    this.getView().byId(oEvent.getSource().sId).setValue(phone)
                }
                if (phone.length > 11) {
                    phone = phone.slice(0, phone.length - 1);
                    this.getView().byId(oEvent.getSource().sId).setValue(phone);
                }
            },

            onTeleChange: function (oEvent) {
                var elementId = oEvent.getSource().getValue();
                if (elementId.length < 11) {
                    // MessageBox.alert("Please re-enter the telephone number in a valid format and contact your Pay and Conditions Administrator if you have any further difficulties.", {
                    //     title: "Alert",
                    //     actions: MessageBox.Action.OK,
                    //     emphasizedAction: MessageBox.Action.OK,
                    //     onClose: oEvent.getSource().focus()
                    // });
                    //oModel.setProperty("/", data);
                    //that.getView().setModel(oModel, "InitData");
                    //errText.push("- Please re-enter the telephone number in a valid format and contact your Pay and Conditions Administrator if you have any further difficulties");
                    //phoneFlag = true;
                }
                else {
                    phoneFlag = false;
                    $.ajax({
                        url: prefix + "odata/v2/PickListValueV2?$filter=PickListV2_id eq 'ecPhoneType' and status eq 'A' &$format=json",
                        type: 'GET',
                        contentType: "application/json",
                        success: function (data) {
                            for (let i = 0; i < data.d.results.length; i++) {
                                if (data.d.results[i].externalCode == "B") {
                                    var temp = {
                                        key: data.d.results[i].externalCode,
                                        id: data.d.results[i].optionId
                                    }
                                    this.getView().getModel("InitData").setProperty("/phoneTypeB", temp);
                                }
                                else if (data.d.results[i].externalCode == "P") {
                                    var temp = {
                                        key: data.d.results[i].externalCode,
                                        id: data.d.results[i].optionId
                                    }
                                    this.getView().getModel("InitData").setProperty("/phoneTypeP", temp);
                                }
                            }
                        }.bind(this),
                        error: function (e) {
                            console.log("error: " + e);
                        }
                    });
                };
            },

            // onEmailChangePermanent: function (oEvent) {
            //     var elementId = oEvent.getSource().getId();
            //     if (this.getView().byId("_IDGenInput13").getValue() != this.getView().byId("_IDGenInput12").getValue()) {
            //         // MessageBox.alert("Please re-enter the telephone number in a valid format and contact your Pay and Conditions Administrator if you have any further difficulties.", {
            //         //     title: "Alert",
            //         //     actions: MessageBox.Action.OK,
            //         //     emphasizedAction: MessageBox.Action.OK,
            //         //     onClose: this.getView().byId(elementId).focus()
            //         // });
            //         var alertText = [];
            //         errText.push("- Please note that the email addresses must match. Re-enter the email addresses");
            //         var temp = {
            //             errText: errText,
            //             emailFlag: true
            //         }
            //     }
            //     else {
            //         var temp = {
            //             errText: "",
            //             emailFlag: false
            //         }
            //     };
            //     this.getView().getModel("InitData").setProperty("/log", temp);
            // },

            onSortCodeChange: function (oEvent) {
                var sortCode = oEvent.getSource().getValue();
                if ((/^[1-9]{6}$/).test(sortCode)) {
                    $.ajax({
                        url: prefix + "odata/v2/Bank('" + sortCode + "')?$format=json",
                        type: 'GET',
                        contentType: "application/json",
                        success: function (data) {
                            oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                            var oModel = this.getView().getModel("InitData");
                            oModel.setProperty("/bankP", data);
                            this.getView().byId("_IDGenInputA1").setValue(data.d.bankName);
                        }.bind(this),
                        error: function (e) {
                            oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                            this.getView().byId("_IDGenInputA1").setValue("");
                        }.bind(this)
                    })
                } else {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                    this.getView().byId("_IDGenInputA1").setValue("");
                }
            },

            onAddCommentPress: function () {
                this.getView().byId("your_comments_boxA").setVisible(true);
                var oComm = this.getView().byId("_IDGenTextAreaB").getValue();
                var CommExist = this.getView().byId("_IDGenTextAreaA").getValue();
                if (oComm == "") {
                    confirm("Add the Comment first");
                }
                else {
                    var details = this.getView().getModel("InitData").getProperty("/user");
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
                        var oAuthComm = "Comments added by " + details.fullName + " on " + tday[nday] + ", " + ndate + " " + tmonth[nmonth] + " " + nyear + " " + nhour + ":" + nmin + ":" + nsec + " GMT at Status Initial - \n" + oComm;
                    }
                    else {
                        oAuthComm = "Comments added by " + details.fullName + " on " + tday[nday] + ", " + ndate + " " + tmonth[nmonth] + " " + nyear + " " + nhour + ":" + nmin + ":" + nsec + " GMT at Status Initial - \n" + oComm + "\n\n" + CommExist;
                    }
                    // this.getView().byId("_IDGenTextAreaA").setVisible(true);
                    // this.getView().byId("_IDGenLabe20").setVisible(true);
                    this.getView().byId("_IDGenTextAreaA").setValue(oAuthComm);
                    this.getView().byId("_IDGenTextAreaB").setValue("");
                }
            },

            onCancel: function () {
                sap.m.MessageBox.warning(`This will discard all the changes done.
                        Do you wish to proceed ? `, {
                    title: "Warning Message",
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.CANCEL],
                    onClose: function (oAction) {
                        if (oAction == sap.m.MessageBox.Action.YES) {
                            // var oHistory, sPreviousHash;
                            // oHistory = History.getInstance();
                            // sPreviousHash = oHistory.getPreviousHash();
                            // if (sPreviousHash == undefined) {
                            // }
                            window.history.go(-1)
                        }
                    }
                })
            },

            onDateChange: function (oEvent) {
                if (!oEvent.getParameter("valid")) {
                    MessageBox.error("Please Enter a valid Date.");
                    oEvent.getSource().setValue("");
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                }
                else {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                    var orgCode = this.getView().byId("orgInput").getSelectedKey();
                    var effDate = new Date(oEvent.getParameter("newValue"))
                    var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-dd-MM" });
                    var effDateISO = dateFormat.format(effDate);
                    this._getEmplData(orgCode, effDateISO)
                }
            },

            onOrgChange: async function (oEvent) {

                if (oEvent.getSource().getSelectedItem() != null) {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                    var LastDate = this.getView().byId("datepicker01").getValue() ? this.getView().byId("datepicker01").getValue() : "";
                    var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-dd-MM" });
                    var LastDateISO = LastDate ? dateFormat.format(LastDate) : "";
                    var orgCode = oEvent.getSource().getSelectedItem().getKey();
                    this._getEmplData(orgCode, LastDateISO);
                }
                else {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                }
            },

            onEmailChange: function (oEvent) {
                var email = oEvent.getParameter("newValue");
                var mailregex = /^\w+[\w-+\.]*\@\w+([-\.]\w+)*\.[a-zA-Z]{2,}$/;
                if (!mailregex.test(email)) {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                    oEvent.oSource.setValueStateText("Enter a valid email address");
                    emailFlag = "x";
                } else {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.none);
                    oEvent.oSource.setValueStateText("");
                    emailFlag = "0";
                    $.ajax({
                        url: prefix + "odata/v2/PickListValueV2?$filter=PickListV2_id eq 'ecEmailType' and status eq 'A'  and externalCode eq 'P' &$format=json",
                        type: 'GET',
                        contentType: "application/json",
                        success: function (data) {
                            emailType = data.d.results[0].optionId;
                        }.bind(this),
                        error: function (e) {
                            console.log("error: " + e);
                        }
                    });
                }
            },

            addMessage: function (section, message, messArr) {

                var obj = {
                    "Icon": "sap-icon://status-error",
                    "Message": `${message} is Mandatory Field in ${section}`,
                }
                messArr.push(obj);

                this.getView().getModel("InitData").setProperty("/MessageLog", messArr);
                return "";

            },

            ValidationCheck: function () {
                // Address validations
                var pRegex = new RegExp('^[0-9]{11}$');
                if (this.getView().byId("ChangeOfAddCheckbox").getSelected() == true) {
                    if (this.getView().byId("_IDGenCheckBox4").getSelected() == true || this.getView().byId("_IDGenCheckBox5").getSelected() == true || this.getView().byId("_IDGenCheckBox6").getSelected() == true) {
                        // permanent address validation
                        if (this.getView().byId("_IDGenCheckBox4").getSelected() == true) {
                            if (emailFlag == "x") {
                                sap.m.MessageBox.error(`Please note that the email address should
                                                            be in a correct format. `)
                                flag = "2";
                            } else {
                                if (this.getView().byId("_IDGenInput12").getValue() != this.getView().byId("_IDGenInput13").getValue()) {
                                    sap.m.MessageBox.error(`Please note that the email addresses must match.
                                                            Re-enter the email addresses. `)
                                    flag = "2";
                                }
                            }

                            if (this.getView().byId("_IDGenInput11").getValue() != "" && !(pRegex.test(this.getView().byId("_IDGenInput11").getValue()))) {
                                sap.m.MessageBox.error(`Please re-enter the telephone number in a valid format and contact your Pay and Conditions 
                                                        Administrator if you have any further difficulties`)
                                flag = "2";
                            }
                            if (this.getView().byId("_IDGenInput10").getValue() != "" && !(pRegex.test(this.getView().byId("_IDGenInput10").getValue()))) {
                                sap.m.MessageBox.error(`Please re-enter the telephone number in a valid format and contact your Pay and Conditions 
                                                        Administrator if you have any further difficulties`)
                                flag = "2";
                            }
                            if (this.getView().byId("_IDGenInput11").getValue() == "") {
                                flag = "1";
                            }
                            if (this.getView().byId("_IDGenInput9").getValue() == "") {
                                flag = "1";
                            }
                            if (this.getView().byId("_IDGenInput5").getValue() == "") {
                                flag = "1";
                            }
                            if (flag == "1") {
                                sap.m.MessageBox.error(`Please enter all the required fields in the
                                                        Permanent Address Section.`);
                            }


                        }
                        // First Emergency Add Validation
                        if (this.getView().byId("_IDGenCheckBox5").getSelected() == true) {
                            if (this.getView().byId("_IDGenInput19").getValue() != "" && !(pRegex.test(this.getView().byId("_IDGenInput19").getValue()))) {
                                sap.m.MessageBox.error(`Please re-enter the telephone number in a valid format and contact your Pay and Conditions 
                                                        Administrator if you have any further difficulties`)
                                flag = "2";
                            }
                            if (this.getView().byId("_IDGenInput14").getValue() == "") {
                                flag = "3";
                            }
                            if (this.getView().byId("_IDGenInput18").getValue() == "") {
                                flag = "3";
                            }
                            if (this.getView().byId("_IDGenInput21").getValue() == "") {
                                flag = "3";
                            }
                            if (this.getView().byId("_IDGenInputSurne").getValue() == "") {
                                flag = "3";
                            }
                            if (this.getView().byId("_IDGenComboBox1").getSelectedItem() == null) {
                                flag = "3";
                            }
                            if (this.getView().byId("_IDGenInput19").getValue() == "") {
                                flag = "3";
                            }
                            if (flag == "3") {
                                sap.m.MessageBox.error(`Please enter all the required fields in the
                                                        First Emergency Address Section.`);
                            }
                        }
                        // Second Emergency Add Validation
                        if (this.getView().byId("_IDGenCheckBox6").getSelected() == true) {
                            if (this.getView().byId("_IDGenInput30").getValue() != "" && !(pRegex.test(this.getView().byId("_IDGenInput30").getValue()))) {
                                sap.m.MessageBox.error(`Please re-enter the telephone number in a valid format and contact your Pay and Conditions 
                                                        Administrator if you have any further difficulties`)
                                flag = "2";
                            }
                            if (this.getView().byId("_IDGenInput23").getValue() == "") {
                                flag = "4";
                            }
                            if (this.getView().byId("_IDGenInput27").getValue() == "") {
                                flag = "4";
                            }
                            if (this.getView().byId("_IDGenInput28").getValue() == "") {
                                flag = "4";
                            }
                            if (this.getView().byId("_IDGenInputSurSne").getValue() == "") {
                                flag = "4";
                            }
                            if (this.getView().byId("_IDGenComboBox2").getSelectedItem() == null) {
                                flag = "4";
                            }
                            if (this.getView().byId("_IDGenInput30").getValue() == "") {
                                flag = "4";
                            }
                            if (flag == "4") {
                                sap.m.MessageBox.error(`Please enter all the required fields in the
                                                        Second Emergency Address Section.`);
                            }
                        }
                    } else {
                        sap.m.MessageBox.error("Please select atleast one Address Type!");
                        flag = "1";
                    }
                }
                // Bank Validations
                if (this.getView().byId("ChangeOfBankCheckbox").getSelected() == true) {
                    if (this.getView().byId("_IDGenInput34").getValue() != "") {
                        if (this.getView().byId("_IDGenInput34").getValue().length < 8) {
                            sap.m.MessageBox.error("The account number must be an 8 digit number");
                            flag = "2";
                        }
                    } else {
                        flag = "5";
                    }
                    if (this.getView().byId("_IDGenInput33").getValue() == "") {
                        flag = "5";
                    }
                    if (this.getView().byId("_IDGenInputA1").getValue() == "") {
                        flag = "5";
                    }
                    if (this.getView().byId("_nextMonthsDrop").getSelectedItem() == null) {
                        flag = "5";
                    }
                    if (flag == "5") {
                        sap.m.MessageBox.error(`Please enter all the required fields in the
                                                Bank Details change Section.`);
                    }
                }
                // Name Changes
                if (this.getView().byId("ChangeOfNameCheckbox").getSelected() == true) {
                    if (this.getView().byId("_IDGenSelect6").getSelectedItem() == null) {
                        flag = "6";
                    }
                    if (this.getView().byId("_IDGenInput37").getValue() == "") {
                        flag = "6";
                    }
                    if (this.getView().byId("_IDGenInput38").getValue() == "") {
                        flag = "6";
                    }
                    if (flag == "6") {
                        sap.m.MessageBox.error(`Please enter all the required fields in the
                                                Name Details change Section.`);
                    }
                }
            },

            onDelete: function () {
                sap.m.MessageBox.warning(`Delete the data in this form and any saved draft version of this form`, {
                    title: "Warning Message",
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.CANCEL],
                    onClose: function (oAction) {
                        if (oAction == sap.m.MessageBox.Action.YES) {

                            var Request_Payload = this.payload("", "X");

                            this.getOwnerComponent().getModel("ZSFGTGT_PD01_SRV").create("/zsf_pd01_hSet", Request_Payload,
                                {
                                    success: function (oData) {
                                        console.log(oData.Formid);
                                        sap.m.MessageBox.success(`Form: ` + oData.Formid + `is deleted successfully`, {
                                            title: "Success Message",
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

                                    },
                                    error: function (oData) {
                                        console.log("Error", oData);
                                    }
                                });

                            var Status = 'D';
                            var log_payload = {
                                "Formid": that.getView().byId("_IDGenInput2").getValue(),
                                "StartedOn": that.getView().byId("_IDGenInput4").getValue(),
                                "Status": Status,
                                "Type": "PD01",
                                "OrganizationName": that.getView().byId("orgInput").getValue(),
                                "InitCode": initiatorCode,
                                "Initiator": that.getView().byId("_IDGenInput1").getValue(),
                                "Description": "Personal Details Form",
                                "FormOwner": that.getView().byId("_IDGenInput1").getValue(),
                                "FormOwnerCode": initiatorCode,
                                "AvailableFrom": new Date(),
                            }
                            this.getOwnerComponent().getModel("ZSFGTGW_LOG_SRV").create("/zsf_logSet", log_payload,
                                {
                                    success: function (oData) {
                                        console.log(`${oData.Formid} log created`);

                                    }.bind(this),
                                    error: function (oData) {
                                        console.log("Error", oData);
                                    }
                                });

                        }
                    }.bind(this)
                })

            },

            onSave: function () {
                flag = "0";
                if (this.getView().byId("ChangeOfBankCheckbox").getSelected() == true && !modeFlag) {
                    sap.m.MessageBox.error("Form cannot be saved to draft when bank detail changes are being made. ")
                    flag = "1";

                }

                if (flag == "0") {

                    var Request_Payload = this.payload("I", "");

                    this.getOwnerComponent().getModel("ZSFGTGT_PD01_SRV").create("/zsf_pd01_hSet", Request_Payload,
                        {
                            success: function (oData) {
                                console.log(oData.Formid);
                                sap.m.MessageBox.success(`Form: ` + oData.Formid + ` is saved successfully`, {
                                    title: "Success Message",
                                    actions: [sap.m.MessageBox.Action.OK],
                                    onClose: function (oAction) {
                                        if (oAction) {
                                            if (this.query) window.close();
                                            window.history.go(-1);
                                        }
                                    }.bind(this)
                                });

                            },
                            error: function (oData) {
                                console.log("Error", oData);
                            }
                        });


                    var Status = 'E';
                    var log_payload = {
                        "Formid": this.getView().byId("_IDGenInput2").getValue(),
                        "StartedOn": this.getView().byId("_IDGenInput4").getValue(),
                        "Status": Status,
                        "Type": "PD01",
                        "OrganizationName": this.getView().byId("orgInput").getValue(),
                        "InitCode": initiatorCode,
                        "Initiator": this.getView().byId("_IDGenInput1").getValue(),
                        "Description": "Personal Details Form",
                        "FormOwner": this.getView().byId("_IDGenInput1").getValue(),
                        "FormOwnerCode": initiatorCode,
                        "AvailableFrom": new Date(),
                    }
                    this.getOwnerComponent().getModel("ZSFGTGW_LOG_SRV").create("/zsf_logSet", log_payload,
                        {
                            success: function (oData) {
                                console.log(`${oData.Formid} log created`);

                            }.bind(this),
                            error: function (oData) {
                                console.log("Error", oData);
                            }
                        });
                }
            },

            payload: function (purpose, delInd) {
                // Calculations

                // header
                // date conversion into millisecond
                var temp = new Date();
                var timeInMillisecond = Number((temp.getTime()) + 21600000);
                var effDateIntHead = "/Date(" + timeInMillisecond + ")/";
                var confirmedButton = this.getView().getModel("InitData").getProperty("/confirmedButton");
                // END of header//

                // SECTION B
                // permanent
                var phoneProp = this.getView().getModel("InitData").getProperty("/phoneInfoB");
                var perPhoneType = this.getView().getModel("InitData").getProperty("/phoneTypeB") != undefined ? this.getView().getModel("InitData").getProperty("/phoneTypeB").id : "";
                var perPhonePrim = phoneProp != undefined ? phoneProp.isPrimary : "";
                var perPhoneFlag = perPhonePrim == true ? "X" : "";
                var mobProp = this.getView().getModel("InitData").getProperty("/phoneInfoP");
                var permobType = this.getView().getModel("InitData").getProperty("/phoneTypeP") != undefined ? this.getView().getModel("InitData").getProperty("/phoneTypeP").id : "";
                var permobFlag = mobProp != undefined ? mobProp.isPrimary == true ? "X" : "" : "";
                var emailProp = this.getView().getModel("InitData").getProperty("/emailInfoP");
                var perEmailType = emailProp != undefined ? emailProp.emailType : "";
                var isEmailPrimary = emailProp == undefined ? "" : emailProp.isPrimary ? "X" : "";
                // END of Permanent
                // END of Section B

                // Section C
                var bankProp = this.getView().getModel("InitData").getProperty("/paymentInfoP");
                var paymentCode = bankProp != undefined ? bankProp.d.results[0].externalCode : "";
                var EffMonthProp = this.getView().getModel("InitData").getProperty("/effdateIntP");
                var effMonthIntBank = EffMonthProp != undefined ? EffMonthProp : "";
                // END Of Section C

                var Request_Payload = {
                    "Formid": this.getView().byId("_IDGenInput2").getValue() != "" ? this.getView().byId("_IDGenInput2").getValue() : "",
                    "Initiator": this.getView().byId("_IDGenInput1").getValue() != "" ? this.getView().byId("_IDGenInput1").getValue() : "",
                    "OrgName": this.getView().byId("orgInput").getValue() != "" ? this.getView().byId("orgInput").getValue() : "",
                    "Zdate": this.getView().byId("_IDGenInput4").getValue() != "" ? this.getView().byId("_IDGenInput4").getValue() : "",
                    "EffDate": this.getView().byId("datepicker01").getValue() != "" ? this.getView().byId("datepicker01").getValue() : "",
                    "EffDateInt": effDateIntHead,
                    "SelEmpCode": this.byId("_IDGenSelect2").getSelectedItem() != null ? this.getView().byId("_IDGenSelect2").getSelectedItem().getKey() : this.getView().byId("_IDGenSelect2").getSelectedKey(),
                    "SelectEmployee": this.byId("_IDGenSelect2").getSelectedItem() != null ? this.getView().byId("_IDGenSelect2").getSelectedItem().getText() : this.getView().byId("_IDGenSelect2").getValue(),
                    "ChgOfAdd": this.getView().byId("ChangeOfAddCheckbox").getSelected() == true ? "X" : "",
                    "ChgOfBank": this.getView().byId("ChangeOfBankCheckbox").getSelected() == true ? "X" : "",
                    "ChgOfNameStat": this.getView().byId("ChangeOfNameCheckbox").getSelected() == true ? "X" : "",
                    "ConfirmedButton": confirmedButton,
                    "DeleteIndicator": delInd,
                    "Purpose": purpose,
                    "hdr_to_sec_b_nav": [
                        {
                            "Formid": this.getView().byId("_IDGenInput2").getValue() != "" ? this.getView().byId("_IDGenInput2").getValue() : "",
                            // checkBoxes
                            "ParmAddress": this.getView().byId("_IDGenCheckBox4").getSelected() == true ? "X" : "",
                            "FirstEmgAdd": this.getView().byId("_IDGenCheckBox5").getSelected() == true ? "X" : "",
                            "SecondEmgAdd": this.getView().byId("_IDGenCheckBox6").getSelected() == true ? "X" : "",
                            // END oF CheckBoxes

                            // Permanent Address
                            // Current details
                            "Streetpar": this.getView().byId("input1").getValue() != "" ? this.getView().byId("input1").getValue() : "",
                            "AddLine2par": this.getView().byId("input2").getValue() != "" ? this.getView().byId("input2").getValue() : "",
                            "Citypar": this.getView().byId("input4").getValue() != "" ? this.getView().byId("input4").getValue() : "",
                            "CountyCodepar": this.getView().byId("input5").getSelectedItem() != null ? this.getView().byId("input5").getSelectedItem().getKey() : this.getView().byId("input5").getSelectedKey(),
                            "Countypar": this.getView().byId("input5").getSelectedItem() != null ? this.getView().byId("input5").getSelectedItem().getText() : this.getView().byId("input5").getValue(),
                            "PostCodepar": this.getView().byId("input6").getValue() != "" ? this.getView().byId("input6").getValue() : "",
                            "HomePhonepar": this.getView().byId("input7").getValue() != "" ? this.getView().byId("input7").getValue() : "",
                            "ParPhnType": this.configData.phoneTypeB,
                            "PhnFlag": this.configData.isHomePrimary ? "X" : "",
                            "Mobilepar": this.getView().byId("_IDGenInput40").getValue() != "" ? this.getView().byId("_IDGenInput40").getValue() : "",
                            "ParMobType": this.configData.phoneTypeP,
                            "MobFlag": !(this.configData.isPhonePrimary || this.configData.isHomePrimary) ? "X" : this.configData.isPhonePrimary ? "X" : "",
                            "ParEmail": this.getView().byId("_IDGenInput41").getValue() != "" ? this.getView().byId("_IDGenInput41").getValue() : "",
                            "ParEmailType": this.configData.emailTypeP,
                            "EmailPrimary": this.configData.isEmailPrimary ? "X" : "",
                            // End Of Current

                            // New Details
                            "Streetpne": this.getView().byId("_IDGenInput5").getValue() != "" ? this.getView().byId("_IDGenInput5").getValue() : "",
                            "AddLine2pne": this.getView().byId("_IDGenInput6").getValue() != "" ? this.getView().byId("_IDGenInput6").getValue() : "",
                            "Citypne": this.getView().byId("_IDGenInput8").getValue() != "" ? this.getView().byId("_IDGenInput8").getValue() : "",
                            "CountyCodepne": this.byId("_IDGenSelect3").getSelectedItem() != null ? this.getView().byId("_IDGenSelect3").getSelectedItem().getKey() : this.getView().byId("_IDGenSelect3").getSelectedKey(),
                            "Countypne": this.byId("_IDGenSelect3").getSelectedItem() != null ? this.getView().byId("_IDGenSelect3").getSelectedItem().getText() : this.getView().byId("_IDGenSelect3").getValue(),
                            "PostCodepne": this.getView().byId("_IDGenInput9").getValue() != "" ? this.getView().byId("_IDGenInput9").getValue() : "",
                            "HomePhonepne": this.getView().byId("_IDGenInput10").getValue() != "" ? this.getView().byId("_IDGenInput10").getValue() : "",
                            "Mobilepne": this.getView().byId("_IDGenInput11").getValue() != "" ? this.getView().byId("_IDGenInput11").getValue() : "",
                            "ParNewEmail": this.getView().byId("_IDGenInput12").getValue() != "" ? this.getView().byId("_IDGenInput12").getValue() : "",
                            "ParConEmail": this.getView().byId("_IDGenInput13").getValue() != "" ? this.getView().byId("_IDGenInput13").getValue() : "",
                            // End of New Details
                            // END of Permanent Address

                            // First Emergency Address
                            // Current details
                            "Streetfir": this.getView().byId("_IDGenInput42").getValue() != "" ? this.getView().byId("_IDGenInput42").getValue() : "",
                            "AddLine2fir": this.getView().byId("_IDGenInput43").getValue() != "" ? this.getView().byId("_IDGenInput43").getValue() : "",
                            "Cityfir": this.getView().byId("_IDGenInput45").getValue() != "" ? this.getView().byId("_IDGenInput45").getValue() : "",
                            "CountyCodefir": this.getView().byId("_IDGenInput46").getSelectedItem() != null ? this.getView().byId("_IDGenInput46").getSelectedItem().getKey() : this.getView().byId("_IDGenInput46").getSelectedKey(),
                            "Countyfir": this.getView().byId("_IDGenInput46").getSelectedItem() != null ? this.getView().byId("_IDGenInput46").getSelectedItem().getText() : this.getView().byId("_IDGenInput46").getValue(),
                            "PostCodefir": this.getView().byId("_IDGenInput47").getValue() != "" ? this.getView().byId("_IDGenInput47").getValue() : "",
                            "FirstKinName": this.getView().byId("_IDGenInput48").getValue() != "" ? this.getView().byId("_IDGenInput48").getValue() : "",
                            "FirstKinSurName": this.getView().byId("_IDGenInputSur").getValue() != "" ? this.getView().byId("_IDGenInputSur").getValue() : "",
                            "CurrFirstRelCode": this.getView().byId("_IDGenInputRel").getValue() != "" ? this.getView().byId("_IDGenInputRel").getValue() : "",
                            "HomePhonefir": this.getView().byId("_IDGenInput49").getValue() != "" ? this.getView().byId("_IDGenInput49").getValue() : "",
                            // "Mobilefir": this.getView().byId("_IDGenInput49").getValue() != "" ? this.getView().byId("_IDGenInput49").getValue() : "",
                            // End of Current

                            // New Details
                            "Streetfne": this.getView().byId("_IDGenInput14").getValue() != "" ? this.getView().byId("_IDGenInput14").getValue() : "",
                            "AddLine2fne": this.getView().byId("_IDGenInput15").getValue() != "" ? this.getView().byId("_IDGenInput15").getValue() : "",
                            "Cityfne": this.getView().byId("_IDGenInput17").getValue() != "" ? this.getView().byId("_IDGenInput17").getValue() : "",
                            "CountyCodefne": this.byId("_IDGenSelect4").getSelectedItem() != null ? this.getView().byId("_IDGenSelect4").getSelectedItem().getKey() : this.getView().byId("_IDGenSelect4").getSelectedKey(),
                            "Countyfne": this.byId("_IDGenSelect4").getSelectedItem() != null ? this.getView().byId("_IDGenSelect4").getSelectedItem().getText() : this.getView().byId("_IDGenSelect4").getValue(),
                            "PostCodefne": this.getView().byId("_IDGenInput18").getValue() != "" ? this.getView().byId("_IDGenInput18").getValue() : "",
                            "HomePhonefne": this.getView().byId("_IDGenInput19").getValue() != "" ? this.getView().byId("_IDGenInput19").getValue() : "",
                            // "Mobilefne": this.getView().byId("_IDGenInput20").getValue() != "" ? this.getView().byId("_IDGenInput20").getValue() : "",
                            "FirstNewKinName": this.getView().byId("_IDGenInput21").getValue() != "" ? this.getView().byId("_IDGenInput21").getValue() : "",
                            "FirstNewKinSurName": this.getView().byId("_IDGenInputSurne").getValue() != "" ? this.getView().byId("_IDGenInputSurne").getValue() : "",
                            "FirstRelation": this.byId("_IDGenComboBox1").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox1").getSelectedItem().getText() : this.getView().byId("_IDGenComboBox1").getValue(),
                            "FirstRelCode": this.byId("_IDGenComboBox1").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox1").getSelectedItem().getKey() : this.getView().byId("_IDGenComboBox1").getSelectedKey(),
                            // End Of New Details
                            // END Of First Emergency Address

                            // Secondary Emergency Address
                            // Current Details
                            "Streetsec": this.getView().byId("_IDGenInput51").getValue() != "" ? this.getView().byId("_IDGenInput51").getValue() : "",
                            "AddLine2sec": this.getView().byId("_IDGenInput52").getValue() != "" ? this.getView().byId("_IDGenInput52").getValue() : "",
                            "Citysec": this.getView().byId("_IDGenInput54").getValue() != "" ? this.getView().byId("_IDGenInput54").getValue() : "",
                            "CountyCodesec": this.getView().byId("_IDGenInput55").getSelectedItem() != null ? this.getView().byId("_IDGenInput55").getSelectedItem().getKey() : this.getView().byId("_IDGenInput55").getSelectedKey(),
                            "Countysec": this.getView().byId("_IDGenInput55").getSelectedItem() != null ? this.getView().byId("_IDGenInput55").getSelectedItem().getText() : this.getView().byId("_IDGenInput55").getValue(),
                            "SecKinName": this.getView().byId("_IDGenInput57").getValue() != "" ? this.getView().byId("_IDGenInput57").getValue() : "",
                            "SecKinSurName": this.getView().byId("_IDGenInputSurSec").getValue() != "" ? this.getView().byId("_IDGenInputSurSec").getValue() : "",
                            "CurrSecRelCode": this.getView().byId("_IDGenInputRelSec").getValue() != "" ? this.getView().byId("_IDGenInputRelSec").getValue() : "",
                            "PostCodesec": this.getView().byId("_IDGenInput56").getValue() != "" ? this.getView().byId("_IDGenInput56").getValue() : "",
                            "HomePhonesec": this.getView().byId("_IDGenInput58").getValue() != "" ? this.getView().byId("_IDGenInput58").getValue() : "",
                            // "Mobilesec": this.getView().byId("_IDGenInput59").getValue() != "" ? this.getView().byId("_IDGenInput59").getValue() : "",
                            // End OF current

                            // New Details
                            "Streetsne": this.getView().byId("_IDGenInput23").getValue() != "" ? this.getView().byId("_IDGenInput23").getValue() : "",
                            "AddLine2sne": this.getView().byId("_IDGenInput24").getValue() != "" ? this.getView().byId("_IDGenInput24").getValue() : "",
                            "Citysne": this.getView().byId("_IDGenInput26").getValue() != "" ? this.getView().byId("_IDGenInput26").getValue() : "",
                            "CountyCodesne": this.byId("_IDGenSelect5").getSelectedItem() != null ? this.getView().byId("_IDGenSelect5").getSelectedItem().getKey() : this.getView().byId("_IDGenSelect5").getSelectedKey(),
                            "Countysne": this.byId("_IDGenSelect5").getSelectedItem() != null ? this.getView().byId("_IDGenSelect5").getSelectedItem().getText() : this.getView().byId("_IDGenSelect5").getValue(),
                            "PostCodesne": this.getView().byId("_IDGenInput27").getValue() != "" ? this.getView().byId("_IDGenInput27").getValue() : "",
                            "HomePhonesne": this.getView().byId("_IDGenInput30").getValue() != "" ? this.getView().byId("_IDGenInput30").getValue() : "",
                            // "Mobilesne": this.getView().byId("_IDGenInput31").getValue() != "" ? this.getView().byId("_IDGenInput31").getValue() : "",
                            "SecNewKinName": this.getView().byId("_IDGenInput28").getValue() != "" ? this.getView().byId("_IDGenInput28").getValue() : "",
                            "SecNewKinSurName": this.getView().byId("_IDGenInputSurSne").getValue() != "" ? this.getView().byId("_IDGenInputSurSne").getValue() : "",
                            "SecRelation": this.byId("_IDGenComboBox2").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox2").getSelectedItem().getText() : this.getView().byId("_IDGenComboBox2").getValue(),
                            "SecRelCode": this.byId("_IDGenComboBox2").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox2").getSelectedItem().getKey() : this.getView().byId("_IDGenComboBox2").getSelectedKey()
                            // End Of New Details
                            // END of Secondary Emergency Address
                        }
                    ],
                    "hdr_to_sec_c_nav": [
                        {
                            "Formid": this.getView().byId("_IDGenInput2").getValue() != "" ? this.getView().byId("_IDGenInput2").getValue() : "",
                            "ExtCode": paymentCode,
                            "SortCodecur": this.getView().byId("_IDGenText36").getValue() != "" ? this.getView().byId("_IDGenText36").getValue() : "",
                            "BankBuildcur": this.getView().byId("_IDGenText37").getValue() != "" ? this.getView().byId("_IDGenText37").getValue() : "",
                            "Accountcur": this.getView().byId("_IDGenText38").getValue() != "" ? this.getView().byId("_IDGenText38").getValue() : "",
                            "BuildSocietyRefcur": this.getView().byId("_IDGenText39").getValue() != "" ? this.getView().byId("_IDGenText39").getValue() : "",
                            "SortCodenew": this.getView().byId("_IDGenInput33").getValue() != "" ? this.getView().byId("_IDGenInput33").getValue() : "",
                            "BankBuildnew": this.getView().byId("_IDGenInputA1").getValue() != "" ? this.getView().byId("_IDGenInputA1").getValue() : "",
                            "Accountnew": this.getView().byId("_IDGenInput34").getValue() != "" ? this.getView().byId("_IDGenInput34").getValue() : "",
                            "BuildSocietyRefnew": this.getView().byId("_IDGenInput35").getValue() != "" ? this.getView().byId("_IDGenInput35").getValue() : "",
                            "EffectiveMonth": this.byId("_nextMonthsDrop").getSelectedItem() != null ? this.getView().byId("_nextMonthsDrop").getSelectedItem().getText() : this.getView().byId("_nextMonthsDrop").getValue(),
                            "EffMonthInt": effMonthIntBank
                        }
                    ],
                    "hdr_to_sec_d_nav": [
                        {
                            "Formid": this.getView().byId("_IDGenInput2").getValue() != "" ? this.getView().byId("_IDGenInput2").getValue() : "",
                            "Titlecur": this.getView().byId("_IDGenText40").getSelectedItem() != null ? this.getView().byId("_IDGenText40").getSelectedItem().getText() : this.getView().byId("_IDGenText40").getValue(),
                            "SalutationCodecur": this.getView().byId("_IDGenText40").getSelectedItem() != null ? this.getView().byId("_IDGenText40").getSelectedItem().getKey() : this.getView().byId("_IDGenText40").getSelectedKey(),
                            "Surnamecur": this.getView().byId("_IDGenText41").getValue() != "" ? this.getView().byId("_IDGenText41").getValue() : "",
                            "MiddleNamecur": this.getView().byId("_IDGenText44").getValue() != "" ? this.getView().byId("_IDGenText44").getValue() : "",
                            "Namecur": this.getView().byId("_IDGenText42").getValue() != "" ? this.getView().byId("_IDGenText42").getValue() : "",
                            "KnownAscur": this.getView().byId("_IDGenText43").getValue() != "" ? this.getView().byId("_IDGenText43").getValue() : "",
                            "Titlenew": this.byId("_IDGenSelect6").getSelectedItem() != null ? this.getView().byId("_IDGenSelect6").getSelectedItem().getText() : this.getView().byId("_IDGenSelect6").getValue(),
                            "SalutationCodenew": this.byId("_IDGenSelect6").getSelectedItem() != null ? this.getView().byId("_IDGenSelect6").getSelectedItem().getKey() : this.getView().byId("_IDGenSelect6").getSelectedKey(),
                            "Surnamenew": this.getView().byId("_IDGenInput37").getValue() != "" ? this.getView().byId("_IDGenInput37").getValue() : "",
                            "MiddleNamenew": this.getView().byId("_IDGenInput50").getValue() != "" ? this.getView().byId("_IDGenInput50").getValue() : "",
                            "Namenew": this.getView().byId("_IDGenInput38").getValue() != "" ? this.getView().byId("_IDGenInput38").getValue() : "",
                            "KnownAsnew": this.getView().byId("_IDGenInput39").getValue() != "" ? this.getView().byId("_IDGenInput39").getValue() : ""
                        }
                    ],
                    "hdr_to_comm_nav": [
                        {
                            "Formid": this.getView().byId("_IDGenInput2").getValue() != "" ? this.getView().byId("_IDGenInput2").getValue() : "",
                            "comment": this.getView().byId("_IDGenTextAreaA").getValue() != "" ? this.getView().byId("_IDGenTextAreaA").getValue() : ""
                        }
                    ]
                }
                return Request_Payload;
            },

            onSubmit: function () {
                var that = this;
                sap.m.MessageBox.alert(`Do you want to submit ? `, {
                    title: "Warning Message",
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.CANCEL],
                    onClose: function (oAction) {
                        if (oAction == sap.m.MessageBox.Action.YES) {
                            flag = "0";
                            if (this.getView().byId("_IDGenSelect2").getSelectedItem() == null || this.getView().byId("_IDGenSelect2").getValue() == "") {
                                sap.m.MessageBox.error("Please select an Employee first!");
                                flag = "1";
                            }
                            if (this.getView().byId("datepicker01").getDateValue() == null) {
                                sap.m.MessageBox.error("Please select an Effective Date of Change!");
                                flag = "1";
                            }
                            if (flag == "0") {
                                if (this.getView().byId("ChangeOfAddCheckbox").getSelected() == true || this.getView().byId("ChangeOfBankCheckbox").getSelected() == true || this.getView().byId("ChangeOfNameCheckbox").getSelected() == true) {

                                    this.ValidationCheck();

                                } else {
                                    sap.m.MessageBox.error("Please select atleast one Change type!");
                                    flag = "1";
                                }
                            }

                            if (flag == "0") {

                                var Request_Payload = this.payload("I", "");

                                this.getOwnerComponent().getModel("ZSFGTGT_PD01_SRV").create("/zsf_pd01_hSet", Request_Payload,
                                    {
                                        success: function (oData) {
                                            console.log(oData.Formid);
                                            that.getView().byId("_IDGenInput2").setValue(oData.Formid)

                                            var details = that.getView().getModel("InitData").getProperty("/user");
                                            var appUrl = window.location.origin + "/site" + window.location.search.split("&")[0] + window.location.hash.split("?")[0];
                                            var reqUrl = appUrl.includes("GCC_SemObj") ? appUrl + "&/?formId=" : appUrl + "#?formId=";
                                            var wrkFlow =
                                            {
                                                "definitionId": "eu10.gccdev.eforms.pD01",
                                                "context": {
                                                    "FormID": oData.Formid,
                                                    "formlinkinitiator": reqUrl + oData.Formid + "&mode=initiator",
                                                    "formlinkbsc": reqUrl + oData.Formid + "&mode=display",
                                                    "initiator": details.email
                                                }
                                            }

                                            var prefix = sap.ui.require.toUrl(that.getOwnerComponent().getManifestEntry('/sap.app/id').replaceAll('.', '/')) + "/";
                                            var sURL = prefix + "workflow/rest/v1/workflow-instances";
                                            var sURL1 = prefix + "workflow/rest/v1/task-instances";

                                            $.support.cors = true;
                                            $.ajax(sURL, {
                                                method: "POST",
                                                data: JSON.stringify(wrkFlow),
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
                                                        var initiator_prop = that.getView().getModel("InitData").getProperty("/user");
                                                        var initiator = initiator_prop.personIdExternal;
                                                        var userId = initiator_prop.userId;
                                                        var Status = 'S';
                                                        $.ajax({
                                                            url: prefix + "odata/v2/EmpEmployment(personIdExternal='" + initiator + "',userId='" + userId + "')/jobInfoNav?$format=json",
                                                            type: 'GET',
                                                            contentType: "application/json",
                                                            success: function (data) {
                                                                console.log("success" + data);
                                                                if (data.d.results[0].managerId == "NO_MANAGER") {
                                                                    var log_payload = {
                                                                        "Formid": that.getView().byId("_IDGenInput2").getValue(),
                                                                        "StartedOn": that.getView().byId("_IDGenInput4").getValue(),
                                                                        "Status": Status,
                                                                        "Type": "PD01",
                                                                        "OrganizationName": that.getView().byId("orgInput").getValue(),
                                                                        "InitCode": initiatorCode,
                                                                        "Initiator": that.getView().byId("_IDGenInput1").getValue(),
                                                                        "Description": "Personal Details Form",
                                                                        "FormOwner": data.d.results[0].managerId,
                                                                        "FormOwnerCode": data.d.results[0].managerId,
                                                                        "AvailableFrom": new Date(),
                                                                    }
                                                                    that.getOwnerComponent().getModel("ZSFGTGW_LOG_SRV").create("/zsf_logSet", log_payload,
                                                                        {
                                                                            success: function (oData) {
                                                                                console.log(`${oData.Formid} log created`);

                                                                            }.bind(this),
                                                                            error: function (oData) {
                                                                                console.log("Error in log creation", oData);
                                                                            }
                                                                        });

                                                                } else {
                                                                    $.ajax({
                                                                        url: prefix + "odata/v2/PerPerson('" + data.d.results[0].managerId + "')/personalInfoNav?$format=json",
                                                                        type: 'GET',
                                                                        contentType: "application/json",
                                                                        success: function (data) {
                                                                            console.log("success" + data);
                                                                            var FormOwner = data.d.results[0].firstName + " " + data.d.results[0].lastName;
                                                                            var log_payload = {
                                                                                "Formid": that.getView().byId("_IDGenInput2").getValue(),
                                                                                "StartedOn": that.getView().byId("_IDGenInput4").getValue(),
                                                                                "Status": Status,
                                                                                "Type": "PD01",
                                                                                "OrganizationName": that.getView().byId("orgInput").getValue(),
                                                                                "InitCode": initiatorCode,
                                                                                "Initiator": that.getView().byId("_IDGenInput1").getValue(),
                                                                                "Description": "Personal Details Form",
                                                                                "FormOwner": FormOwner,
                                                                                "FormOwnerCode": initiatorCode,
                                                                                "AvailableFrom": new Date(),
                                                                            }
                                                                            that.getOwnerComponent().getModel("ZSFGTGW_LOG_SRV").create("/zsf_logSet", log_payload,
                                                                                {
                                                                                    success: function (oData) {
                                                                                        console.log(`${oData.Formid} log created`);

                                                                                    }.bind(this),
                                                                                    error: function (oData) {
                                                                                        console.log("Error in log creation", oData);
                                                                                    }
                                                                                });
                                                                        },
                                                                        error: function (e) {
                                                                            console.log("error: " + e);
                                                                        }
                                                                    });
                                                                }
                                                            },
                                                            error: function (e) {
                                                                console.log("error: " + e);
                                                            }
                                                        });
                                                        var formIdMess = that.getView().byId("_IDGenInput2").getValue();
                                                        sap.m.MessageBox.success(`Form: ${formIdMess} is submitted successfully
                                                        
                                                        Please call ContactUs on 01452 425888 should you have any queries regarding this e-Form.`, {
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
                                                        }
                                                        );
                                                        // var oHistory, sPreviousHash;
                                                        // oHistory = History.getInstance();
                                                        // sPreviousHash = oHistory.getPreviousHash();
                                                        // if (sPreviousHash == undefined) {
                                                        //     window.history.go(-1);
                                                        // }
                                                    }).fail(function (XMLHttpRequest, textStatus) {

                                                    });
                                                }

                                            }).fail(function (XMLHttpRequest, textStatus) {
                                                alert("error");
                                            });
                                        },
                                        error: function (oData) {
                                            console.log("Error", oData);
                                        }
                                    });
                                // this end

                            }
                        }
                    }.bind(this)
                })
            },

            onPrint: function () {

                var that = this;

                var Request_Payload = this.payload("P", "");

                // print Code//
                that.getOwnerComponent().getModel("ZSFGTGT_PD01_SRV").create("/zsf_pd01_hSet", Request_Payload,
                    {
                        success: function (oData) {
                            console.log(oData.Formid);
                            this.getView().byId("_IDGenInput2").setValue(oData.Formid)
                            var s4url = this.getOwnerComponent().getModel("ZSFGTGT_PD01_SRV").sServiceUrl;    // Give your service name
                            // var FormID = this.getView().byId("_IDGenInput2").getValue();      // Give your FormID
                            var sSource = s4url + "/zsf_pd01_printSet(Formid='" + oData.Formid + "')/$value";
                            var newTab = window.open(sSource, "_blank");
                            newTab.onload = function () {
                                // newTab.print();
                            }
                        }.bind(this),
                        error: function (oData) {
                            console.log("Error", oData);
                        }
                    });
            }
        });
    });
