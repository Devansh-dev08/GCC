sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "../model/formatter"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, MessageBox, formatter) {
        "use strict";

        var initiatorCode = "";
        var serviceUrl = "";

        return Controller.extend("com.gcc.pensionqa.ps03qa.controller.View1", {
            formatter: formatter,
            onInit: function () {
                // var link = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("SchoolsnetLink")
                // var text = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("IntroText1")
                // this.getView().byId("_IDGenFormattedText1").setHtmlText("<p>" + text + "<a title=" + link + " href=\"" + link + "\"</a> e-Forms Pages.</p>")
                serviceUrl = sap.ui.require.toUrl(this.getOwnerComponent().getManifestEntry('/sap.app/id').replaceAll('.', '/'));
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
                    email: "",
                    name: "",
                    displayName: "Dummy User (dummy.user@com)"
                };

                oModel1.loadData(url);
                oModel1.dataLoaded()
                    .then(() => {
                        if (!oModel1.getData().email) {
                            oModel1.setData(mock);
                            var useremail = "devansh.agarwal@hcl.com";
                        } else {
                            var useremail = oModel1.getData().email;
                        }
                        var userModel = new sap.ui.model.json.JSONModel();
                        this.getView().setModel(userModel, "InitData");
                        this.query = oEvent.getParameter('arguments')["?query"];
                        var that = this;
                        userModel.setProperty("/defaultValues", {})
                        // Salutation dropdown
                        $.ajax({
                            url: serviceUrl + "/odata/v2/Picklist('salutation')/picklistOptions?$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {

                                var salut = [];
                                for (let i = 0; i < data.d.results.length; i++) {
                                    $.ajax({
                                        url: serviceUrl + "/odata/v2/PicklistOption(" + data.d.results[i].id + "L)/picklistLabels?$format=json",
                                        type: 'GET',
                                        contentType: "application/json",
                                        success: function (data) {

                                            var temp = {
                                                id: data.d.results[0].optionId,
                                                text: data.d.results[0].label
                                            }
                                            salut.push(temp);
                                            salut.sort((a, b) => {
                                                if (a.text < b.text) return -1;
                                                else return 1;
                                            })
                                            userModel.setProperty("/salutations", salut);
                                        }.bind(this),
                                        error: function (e) {
                                            console.log("error: " + e);
                                        }
                                    });
                                }
                            }.bind(this),
                            error: function (e) {
                                console.log("error: " + e);
                            }
                        });

                        $.ajax({
                            url: serviceUrl + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'COUNTY_GCC' and status eq 'A'&$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {

                                userModel.setProperty("/countyDropdown", data.d.results);

                            }.bind(this),
                            error: function (e) {
                                console.log("error: " + e);
                            }
                        });

                        $.ajax({
                            url: serviceUrl + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'yesNo' and status eq 'A'&$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {

                                userModel.setProperty("/yesNoDropdown", data.d.results);

                            }.bind(this),
                            error: function (e) {
                                console.log("error: " + e);
                            }
                        });

                        $.ajax({
                            url: serviceUrl + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'relation' and status eq 'A'&$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {

                                userModel.setProperty("/relationDropdown", data.d.results);

                            }.bind(this),
                            error: function (e) {
                                console.log("error: " + e);
                            }
                        });

                        $.ajax({
                            url: serviceUrl + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'ISOCountryList' and status eq 'A'&$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {

                                data.d.results.sort();
                                userModel.setProperty("/nationalityDropdown", data.d.results);
                                userModel.setProperty("/defaultNationality", "GBR");
                            }.bind(this),
                            error: function (e) {
                                console.log("error: " + e);
                            }
                        });
                        if (this.query != undefined) {
                            var formid = this.query.formId;
                            userModel.setProperty("/Param", this.query);
                            if (this.query.mode)
                                this.getView().byId("footerButton1").setText("Save");
                            $.ajax({
                                url: serviceUrl + "/odata/v2/PerEmail?$filter=emailAddress eq '" + useremail + "' &$format=json",
                                type: 'GET',
                                contentType: "application/json",
                                success: function (data) {
                                    var email = data;
                                    $.ajax({
                                        url: serviceUrl + "/odata/v2/PerPerson('" + email.d.results[0].personIdExternal + "')/personalInfoNav?$format=json",
                                        type: 'GET',
                                        contentType: "application/json",
                                        success: function (data) {
                                            var initDetails = {
                                                email: email.d.results[0].emailAddress,
                                                personIdExternal: email.d.results[0].personIdExternal,
                                                fullName: data.d.results[0].firstName + " " + data.d.results[0].lastName
                                            }
                                            initiatorCode = email.d.results[0].personIdExternal;
                                            userModel.setProperty("/user", initDetails);

                                        },
                                        error: function (e) {
                                            console.log("error: " + e);

                                        }
                                    });

                                    $.ajax({
                                        url: serviceUrl + "/odata/v2/EmpEmployment?$format=json&$filter=personIdExternal eq '" + email.d.results[0].personIdExternal + "'",
                                        type: 'GET',
                                        contentType: "application/json",
                                        success: function (data) {
                                            var userId = data.d.results[0].userId;
                                            $.ajax({
                                                url: serviceUrl + "/odata/v2/EmpJob?$format=json&$filter=userId eq '" + userId + "'",
                                                type: 'GET',
                                                contentType: "application/json",
                                                success: function (data) {
                                                    if (data.d.results.length > 0)
                                                        this.organization = data.d.results[0].customString3;
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

                                }.bind(this),
                                error: function (data) {
                                    console.log("error");
                                }
                            });
                            this.getOwnerComponent().getModel("S4hService").read("/zsf_h_ps03Set('" + formid + "')", {
                                success: function (oData) {
                                    this.getView().byId("nameText1").setValue(oData.Formid);
                                    this.getView().byId("nameText").setValue(oData.Initiator);
                                    this.getView().byId("date1").setDateValue(new Date(this.convertS4Date(oData.Zdate)));
                                    this.getView().byId("SelectTitle").setValue(oData.Title);
                                    this.getView().getModel("InitData").setProperty("/defaultValues/Title", oData.Salutation);
                                    this.getView().byId("date").setDateValue(new Date(this.convertS4Date(oData.StartDate)));
                                    this.getView().getModel("InitData").setProperty("/wageMinDate", new Date(this.convertS4Date(oData.StartDate)));
                                    this.getView().byId("SelectPay").setValue(oData.PayrollArea);
                                    this.getView().getModel("InitData").setProperty("/defaultValues/Payroll", oData.PayrollAreaCode);
                                    this.getView().byId("nameText2").setValue(oData.CostCenterDisp);
                                    this.CcCode = oData.CostCenterCode;
                                    this.getView().byId("nameText3").setValue(oData.CostCenterName);
                                    this.getView().byId("nameText4").setValue(oData.OrgKey);
                                    this.getView().byId("_nameText").setValue(oData.Forename);
                                    this.getView().byId("nameText5").setValue(oData.Middlename);
                                    this.getView().byId("nameText6").setValue(oData.Surname);
                                    this.getView().byId("SelectGender").setValue(oData.Gender);
                                    this.getView().getModel("InitData").setProperty("/defaultValues/Gender", oData.GenderCode)
                                    this.getView().byId("date2").setDateValue(new Date(this.convertS4Date(oData.Dob)));
                                    this.getView().byId("nameText8").setDateValue(new Date(this.convertS4Date(oData.SSerDt)));
                                    this.getView().byId("nameText9").setValue(oData.InsNo);
                                    this.getView().byId("id2").setValue(oData.Nationality);
                                    this.getView().getModel("InitData").setProperty("/defaultNationality", oData.NationalityCode)
                                    oData.POverseas == "X" ? this.getView().byId("_IDGenCheckBox1").setSelected(true) : this.getView().byId("_IDGenCheckBox1").setSelected(false);
                                    oData.FlexRetirement == "X" ? this.getView().byId("_IDGenCheckBox2").setSelected(true) : this.getView().byId("_IDGenCheckBox2").setSelected(false);
                                    this.getView().byId("nameText10").setValue(oData.PerSapNo);
                                    this.getView().byId("nameText11").setValue(oData.Streetper);
                                    this.getView().byId("nameText12").setValue(oData.AddLine2per);
                                    this.getView().byId("nameText14").setValue(oData.Cityper);
                                    this.getView().byId("nameText15").setValue(oData.Countyper);
                                    this.getView().getModel("InitData").setProperty("/defaultValues/County1", oData.CountyCodeper);
                                    this.getView().byId("nameText16").setValue(oData.PostCodeper);
                                    this.getView().byId("nameText17").setValue(oData.Email);
                                    this.getView().byId("nameText18").setValue(oData.HomePhoneper);
                                    this.getView().byId("nameText19").setValue(oData.Mobileper);
                                    oData.AddEmgCont == "X" ? this.getView().byId("_IDGenCheckBox3").setSelected(true) : this.getView().byId("_IDGenCheckBox3").setSelected(false);
                                    if (oData.AddEmgCont == "X") {
                                        var aControls = this.getView().getControlsByFieldGroupId("fg1");
                                        aControls.forEach(function (oControl) {
                                            oControl.setVisible(true);
                                        });
                                        this.getView().byId("nameText20").setValue(oData.Streetnew);
                                        this.getView().byId("nameText21").setValue(oData.AddLine2new);
                                        this.getView().byId("nameText23").setValue(oData.Citynew);
                                        this.getView().byId("nameText24").setValue(oData.Countynew);
                                        this.getView().getModel("InitData").setProperty("/defaultValues/County2", oData.CountyCodenew);
                                        this.getView().byId("nameText25").setValue(oData.PostCodenew);
                                        this.getView().byId("nameText26").setValue(oData.EmailNew);
                                        this.getView().byId("nameText28").setValue(oData.Mobilenew);
                                        this.getView().byId("nameText282").setValue(oData.FirstNameNew);
                                        this.getView().byId("nameText281").setValue(oData.CustomString1);
                                        this.getView().byId("nameText284").setValue(oData.RelationNew);
                                        this.getView().getModel("InitData").setProperty("/defaultValues/Relation", oData.RelationNewCode);
                                    }
                                    this.getView().byId("nameText29").setValue(oData.BankSortCode);
                                    this.getView().byId("nameText31").setValue(oData.BankName);
                                    this.getView().byId("nameText30").setValue(oData.BankAcNo);
                                    this.getView().byId("nameText32").setValue(oData.BuildSociety);
                                    this.getView().byId("nameText33").setValue(oData.AnnualPension);
                                    this.getView().byId("SelectPension").setValue(oData.TypeOfPen);
                                    this.getView().getModel("InitData").setProperty("/defaultValues/Pension", oData.TypeOfPenCode);
                                    this.getView().byId("nameText34").setValue(oData.DeceasedName);
                                    this.getView().byId("nameText35").setValue(oData.DeceasedSapCode);

                                }.bind(this),
                                error: function (oData) {
                                    console.log("Error S4h");
                                }
                            });

                            this.getOwnerComponent().getModel("S4hService").read("/zsf_h_ps03Set('" + formid + "')/hdr_to_wage_nav", {
                                success: function (oData) {

                                    var allowanceData = [];
                                    if (oData.results.length > 0) {
                                        for (let i = 0; i < oData.results.length; i++) {
                                            var temp = {
                                                wageType: oData.results[i].WageType,
                                                wageTypeCode: oData.results[i].WageTypeCode,
                                                annualAmt: oData.results[i].AnnualAmt,
                                                monthlyAmt: oData.results[i].MonthlyAmt,
                                                // : oData.results[i].StartDate,
                                                startDate: oData.results[i].StartDate ? new Date(this.convertS4Date(oData.results[i].StartDate)) : "",
                                                temp: oData.results[i].Ztemp
                                            }
                                            allowanceData.push(temp);

                                        }
                                    } else {
                                        var temp = {
                                            wageType: "",
                                            wageTypeCode: "",
                                            annualAmt: "",
                                            monthlyAmt: "",
                                            startDate: "",
                                            temp: ""
                                        }
                                        allowanceData.push(temp);
                                    }
                                    userModel.setProperty("/allowance", allowanceData);
                                }.bind(this),
                                error: function (oData) {
                                    console.log("Error S4h");
                                }
                            });

                            this.getOwnerComponent().getModel("S4hService").read("/zsf_h_ps03Set('" + formid + "')/hdr_to_comm_nav", {
                                success: function (oData) {
                                    // var comm = oData.results[0].comment;
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
                                    console.log("Error S4h");
                                }
                            });
                        } else {

                            var query = {
                                formId: "",
                                mode: ""
                            };
                            userModel.setProperty("/Param", query);

                            this.getView().byId("date1").setDateValue(new Date());
                            this.getOwnerComponent().getModel("S4hService").read("/zsf_formid_ps03Set", {
                                success: function (oData) {
                                    console.log("success S4h");
                                    this.getView().byId("nameText1").setValue(oData.results[0].Formid);
                                }.bind(this),
                                error: function (e) {
                                    console.log("error S4h");
                                }
                            });
                            var that = this;
                            $.ajax({
                                url: serviceUrl + "/odata/v2/PerEmail?$filter=emailAddress eq '" + useremail + "' &$format=json",
                                type: 'GET',
                                contentType: "application/json",
                                success: function (data) {
                                    var email = data;
                                    $.ajax({
                                        url: serviceUrl + "/odata/v2/PerPerson('" + email.d.results[0].personIdExternal + "')/personalInfoNav?$format=json",
                                        type: 'GET',
                                        contentType: "application/json",
                                        success: function (data) {
                                            var initDetails = {
                                                email: email.d.results[0].emailAddress,
                                                personIdExternal: email.d.results[0].personIdExternal,
                                                fullName: data.d.results[0].firstName + " " + data.d.results[0].lastName
                                            }
                                            userModel.setProperty("/user", initDetails);
                                            initiatorCode = email.d.results[0].personIdExternal;

                                            var salutationId = data.d.results[0].salutation;
                                            var firstnameInit = data.d.results[0].firstName;
                                            var lastnameInit = data.d.results[0].lastName;

                                            var personIdExternal = data.d.results[0].personIdExternal;

                                            userModel.setProperty("/InitiatorDetails", data);
                                            that.getView().setModel(userModel, "InitData");
                                            $.ajax({
                                                url: serviceUrl + "/odata/v2/PicklistOption(" + salutationId + 'L' + ")/picklistLabels?$format=json",
                                                type: 'GET',
                                                contentType: "application/json",
                                                success: function (data) {

                                                    var salutationLabel = data.d.results[0].label;
                                                    var initName = {
                                                        salutationLabel: salutationLabel,
                                                        firstnameInit: firstnameInit,
                                                        lastnameInit: lastnameInit
                                                    }
                                                    that.getView().byId("nameText").setValue(salutationLabel + " " + firstnameInit + " " + lastnameInit)
                                                    that._logCreation("I");
                                                    userModel.setProperty("/InitiatorName", initName);
                                                    that.getView().setModel(userModel, "InitData");
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

                                    $.ajax({
                                        url: serviceUrl + "/odata/v2/EmpEmployment?$format=json&$filter=personIdExternal eq '" + email.d.results[0].personIdExternal + "'",
                                        type: 'GET',
                                        contentType: "application/json",
                                        success: function (data) {
                                            var userId = data.d.results[0].userId;
                                            $.ajax({
                                                url: serviceUrl + "/odata/v2/EmpJob?$format=json&$filter=userId eq '" + userId + "'",
                                                type: 'GET',
                                                contentType: "application/json",
                                                success: function (data) {
                                                    if (data.d.results.length > 0)
                                                        this.organization = data.d.results[0].customString3;
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
                                }.bind(this),
                                error: function (data) {
                                    console.log("error");
                                }
                            });
                            this.getView().byId("date2").setMaxDate(new Date());

                            var wageTable = [{
                                wageType: "",
                                wageTypeCode: "",
                                annualAmt: "",
                                monthlyAmt: "",
                                startDate: "",
                                temp: ""
                            }];
                            userModel.setProperty("/allowance", wageTable);
                            //  var oJSONModel = new sap.ui.model.json.JSONModel();
                            //  this.getView().setModel(oJSONModel,"userModel")
                        }

                    });
            },

            convertS4Date: function (date1) {
                if (date1) {
                    return date1.split("/").reverse().join("-");
                }
            },

            getFilter: function (arr, id) {
                return arr.find(nation => {
                    return nation.externalCode === id;
                })?.label_en_GB || 'No Nationality Found';
            },

            onPayAreaChange: function (oEvent) {
                if (oEvent.getSource().getSelectedItem()) {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                    var key = oEvent.getSource().getSelectedItem().getKey();
                    if (key == "P4") {
                        this.getView().byId("nameText2").setValue("999001");
                        $.ajax({
                            url: serviceUrl + "/odata/v2/FOCostCenter?$filter=costcenterExternalObjectID eq '0000999001'&$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                                if (data.d.results.length == 0) {
                                    MessageBox.error("No Cost Center Name found");
                                    this.getView().byId("nameText3").setValue("");
                                    this.getView().byId("nameText2").setValueState(sap.ui.core.ValueState.Error);
                                    this.getView().byId("nameText2").setValueStateText("Cost Center is not valid");
                                }
                                else {
                                    this.getView().byId("nameText2").setValueState(sap.ui.core.ValueState.None);
                                    this.CcCode = data.d.results[0].externalCode
                                    this.getView().byId("nameText3").setValue(data.d.results[0].name);
                                }
                            }.bind(this),
                            error: function (e) {
                                this.getView().byId("nameText3").setValue("");
                                this.getView().byId("nameText2").setValueState(sap.ui.core.ValueState.Error);
                                this.getView().byId("nameText2").setValueStateText("Cost Center is not valid");
                            }.bind(this)
                        });
                    } else {
                        this.getView().byId("nameText2").setValue("");
                        this.getView().byId("nameText3").setValue("");
                    }
                } else {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                }
            },

            onCostCentChange: function (oEvent) {
                var costCenter = oEvent.getSource().getValue();
                if (costCenter != null) {
                    if ((/^[1-9]{1}/).test(+costCenter)) costCenter = costCenter.padStart(10, '0');
                    $.ajax({
                        url: serviceUrl + `/odata/v2/FOCostCenter?$filter=costcenterExternalObjectID eq '${(costCenter)}' and status eq 'A'&$format=json`,
                        type: 'GET',
                        contentType: "application/json",
                        success: function (data) {
                            console.log("success" + data.d.results[0]);
                            if (data.d.results.length == 0) {
                                MessageBox.error("No Cost Center Name found");
                                oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                                oEvent.oSource.setValueStateText("Cost Center is not valid");
                                this.getView().byId("nameText3").setValue("");
                            }
                            else {
                                this.getView().byId("nameText3").setValue(data.d.results[0].name);
                                this.getView().byId("nameText2").setValue(+data.d.results[0].costcenterExternalObjectID ? +data.d.results[0].costcenterExternalObjectID : data.d.results[0].costcenterExternalObjectID);
                                this.CcCode = data.d.results[0].externalCode;
                                oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                            }
                        }.bind(this),
                        error: function (e) {
                            oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                            oEvent.oSource.setValueStateText("Cost Center is not valid");
                            this.getView().byId("nameText3").setValue("");
                        }.bind(this)
                    });
                }
            },

            onNIChange: function (oEvent) {
                var value = oEvent.getSource().getValue();
                var regex = /^(?!BG|GB|NK|KN|TN|NT|ZZ)[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z](?:\s*\d{2}){3}\s*[A-D]$/;
                if (!regex.test(value) && value != "") {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                    oEvent.oSource.setValueStateText("Please enter a valid National ID of this type: National Insurance Number. You should use the format: AA NN NN NN A; the last character can only be A, B, C or D.");
                } else {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                }
            },

            onStartDateChange: function (oEvent) {
                if (!oEvent.getParameter("valid")) {
                    MessageBox.error("Enter a valid date");
                    oEvent.getSource().setValue("");
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                }
                else {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                    var wages = this.getView().getModel("InitData").getProperty("/allowance");
                    if (wages && wages.length > 0) {
                        wages.forEach(function (oItem) {
                            if (new Date(oEvent.getSource().getValue()) > new Date(oItem.startDate)) {
                                oItem.startDate = "";
                            }
                        });
                        this.getView().getModel("InitData").setProperty("/allowance", wages);
                    }
                    this.getView().getModel("InitData").setProperty("/wageMinDate", new Date(oEvent.getSource().getValue()));
                }
            },

            onPostCodeChange: function (oEvent) {
                var postCode = oEvent.getParameter("newValue");
                if (postCode.includes(" ")) {
                    var postalCodeRegex = /^([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([AZa-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9]?[A-Za-z])))) [0-9][A-Za-z]{2})$/;
                    if (postalCodeRegex.test(postCode.toUpperCase())) {
                        this.getView().byId(oEvent.getSource().sId).setValueState(sap.ui.core.ValueState.None);
                    }
                    else {
                        MessageBox.error("Please enter a valid Postal Code");
                        this.getView().byId(oEvent.getSource().sId).setValueState(sap.ui.core.ValueState.Error);
                        this.getView().byId(oEvent.getSource().sId).setValueStateText("Please enter a valid Postal Code");
                        this.getView().byId(oEvent.getSource().sId).setValue("");
                    }
                }
                else {
                    MessageBox.error("Please enter the postcode in a valid format. This should include a space in the middle");
                    this.getView().byId(oEvent.getSource().sId).setValueStateText("Please enter the postcode in a valid format. This should include a space in the middle");
                    this.getView().byId(oEvent.getSource().sId).setValueState(sap.ui.core.ValueState.Error);
                    this.getView().byId(oEvent.getSource().sId).setValue("");
                }
            },

            onEmailChange: function (oEvent, isRequired) {
                var email = oEvent.getParameter("newValue");
                oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                if (email) {
                    var mailregex = /^\w+[\w-+\.]*\@\w+([-\.]\w+)*\.[a-zA-Z]{2,}$/;
                    if (!mailregex.test(email)) {
                        oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                        oEvent.oSource.setValueStateText("Enter a valid email address");
                    } else {
                        oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                    }
                } else {
                    if (isRequired) {
                        oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                        oEvent.oSource.setValueStateText("Email is a required field");
                    }
                }
            },

            onTeleLiveChange: function (oEvent) {
                var phone = oEvent.getParameter("newValue");
                var numberRegex = /^[0-9]+$/
                if (!numberRegex.test(phone)) {
                    oEvent.getSource().setValue(phone.slice(0, phone.length - 1));
                }
                if (phone && phone.substring(0, 1) !== "0") {
                    phone = "0" + phone;
                    this.getView().byId(oEvent.getSource().sId).setValue(phone)
                }
                if (phone.length > 11) {
                    phone = phone.slice(0, phone.length - 1);
                    this.getView().byId(oEvent.getSource().sId).setValue(phone);
                }
                if (phone.length == 11) {
                    this.onTeleChange(oEvent);
                }
            },

            onTeleChange: function (oEvent) {
                var elementId = oEvent.getSource().getValue();
                var pRegex = new RegExp('^[0-9]{11}$')
                if (!pRegex.test(elementId)) {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                }
                else {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                };
            },

            dateCheck: function (oEvent) {
                if (!oEvent.getParameter("valid")) {
                    MessageBox.error("Enter a valid date");
                    oEvent.getSource().setValue("");
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                }
                else {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                }
            },

            onMobChange: function (oEvent) {
                var phone = oEvent.getParameter("newValue");
                var numberRegex = /^[0-9]+$/
                if (!numberRegex.test(phone)) {
                    phone = phone.slice(0, phone.length - 1);
                    oEvent.getSource().setValue(phone);
                }
                if (phone.substring(0, 1) !== "0") {
                    phone = "0" + phone;
                    this.getView().byId(oEvent.getSource().sId).setValue(phone)
                }
                if (phone.length > 11) {
                    phone = phone.slice(0, phone.length - 1);
                    this.getView().byId(oEvent.getSource().sId).setValue(phone);
                }
            },

            onLiveSortCodeChange: function (oEvent) {
                var value = oEvent.getSource().getValue();
                var numberRegex = /^[0-9]+$/
                if (!numberRegex.test(value)) {
                    oEvent.getSource().setValue(value.slice(0, value.length - 1));
                }
            },

            onSortCodeChange: function (oEvent) {
                var value = oEvent.getParameter("newValue");
                if (value.length < 6) {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                    oEvent.oSource.setValueStateText("Please enter a valid Routing Number for GBR that matches the expected ISO format");
                }
                else {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                    $.ajax({
                        url: serviceUrl + "/odata/v2/Bank('" + value + "')?$format=json",
                        type: 'GET',
                        contentType: "application/json",
                        success: function (data) {

                            this.getView().byId("nameText31").setValue(data.d.bankName);
                            oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                        }.bind(this),
                        error: function (e) {
                            oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                            oEvent.oSource.setValueStateText("Please enter a valid Routing Number for GBR that matches the expected ISO format");
                            this.getView().byId("nameText31").setValue("");
                        }.bind(this)
                    });
                }
            },

            onAccNumChange: function (oEvent) {
                var value = oEvent.getSource().getValue();
                var numberRegex = /^[0-9]+$/
                if (!numberRegex.test(value)) {
                    oEvent.getSource().setValue(value.slice(0, value.length - 1));
                }
                if (value.length < 8) {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                    oEvent.oSource.setValueStateText("Please enter a valid Account Number for GBR that matches the expected ISO format");
                } else {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                }
            },

            onDropValid: function (oEvent) {
                if (oEvent.getSource().getSelectedItem()) {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                }
                else {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                }
            },

            onWageChange: function (oEvent) {
                var item = oEvent.getSource().getSelectedItem();
                if (item != null) {
                    var key = item.getKey();
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                    var oBind = oEvent.getSource().getBindingContext("InitData");
                    var sPath = oBind.getPath();
                    this.getView().getModel("InitData").setProperty(sPath + "/wageTypeCode", key);
                } else {
                    oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                }
            },

            onLiveAmountChange: function (oEvent) {
                var value = oEvent.getSource().getValue();
                var numberRegex = /^\d*\.?\d*$/
                if (!numberRegex.test(value)) {
                    value = value.slice(0, value.length - 1);
                    oEvent.getSource().setValue(value);
                }
                var oBind = oEvent.getSource().getBindingContext("InitData");
                var monthlyAmount = (Number(value) / 12).toFixed(2);
                this.getView().getModel("InitData").setProperty(oBind + "/monthlyAmt", monthlyAmount);
            },

            onAmountChange: function (oEvent) {
                var value = +oEvent.getSource().getValue();
                if (value) {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                    oEvent.getSource().setValue(value.toFixed(2));
                }
                else {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                }
            },

            numberValidation: function (oEvent) {
                var value = oEvent.getSource().getValue();
                var numberRegex = /^\d*\.?\d*$/
                if (!numberRegex.test(value)) {
                    value = value.slice(0, value.length - 1);
                    oEvent.getSource().setValue(value);
                }
            },

            onTempChange: function (oEvent) {
                var value = +oEvent.getSource().getValue();
                if (value) {
                    oEvent.getSource().setValue(value.toFixed(2));
                }
            },

            AddRow: function () {
                var oModel = this.getView().getModel("InitData").getProperty("/allowance");
                var wageTable = {
                    wageType: "",
                    annualAmt: "",
                    monthlyAmt: "",
                    startDate: "",
                    temp: ""
                };
                oModel.push(wageTable);
                this.getView().getModel("InitData").setProperty("/allowance", oModel);
            },

            DelRow: function () {
                var oTable = this.getView().byId("Table");
                var oProperty = this.getView().getModel("InitData").getProperty("/allowance");
                var aSelectedItems = oTable.getSelectedItems();
                if (oProperty.length == aSelectedItems.length) {
                    var oProperty = [{
                        wageType: "",
                        annualAmt: "",
                        monthlyAmt: "",
                        startDate: "",
                        temp: ""
                    }];
                } else {
                    for (var i = aSelectedItems.length - 1; i >= 0; i--) {
                        var oItem = aSelectedItems[i];
                        var iIndex = oTable.indexOfItem(oItem);
                        oProperty.splice(iIndex, 1);
                    }
                }
                oTable.removeSelections();
                this.getView().getModel("InitData").setProperty("/allowance", oProperty);
            },

            onAddComment: function () {
                var oComm = this.getView().byId("_IDGenTextArea3").getValue();
                var CommExist = this.getView().byId("_IDGenTextArea2").getValue();
                var name = this.getView().getModel("InitData").getProperty("/user");
                if (oComm == "") {
                    confirm("Add the Comment first");
                } else {
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
                    } else {
                        oAuthComm = "Comments added by " + name.fullName + " on " + tday[nday] + ", " + ndate + " " + tmonth[nmonth] + " " + nyear + " " + nhour + ":" + nmin + ":" + nsec + " GMT at Status Initial - \n" + oComm + "\n\n" + CommExist;
                    }
                    this.getView().byId("_IDGenTextArea2").setVisible(true);
                    this.getView().byId("_IDGenLabel11").setVisible(true);
                    this.getView().byId("_IDGenTextArea2").setValue(oAuthComm);
                    this.getView().byId("_IDGenTextArea3").setValue("");
                }
            },

            Onpress: function (oEvent) {
                var x = oEvent.getParameter("selected");
                if (x) {
                    var aControls = this.getView().getControlsByFieldGroupId("fg1");
                    aControls.forEach(function (oControl) {
                        oControl.setVisible(true);
                    });
                } else {
                    var aControls = this.getView().getControlsByFieldGroupId("fg1");
                    aControls.forEach(function (oControl) {
                        oControl.setVisible(false);
                    });
                }
            },

            dateToUnix: function (date) {
                var temp = new Date(date);
                var timeInMillisecond = Number((temp.getTime()) + 21600000);
                return "/Date(" + timeInMillisecond + ")/";
            },

            dateToReq: function (date) {
                if (date) {
                    return new Date(date).toLocaleDateString('en-GB');
                } else return "";
            },

            onInputChange: function (oEvent) {
                var value = oEvent.getSource().getValue();
                if (value) {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                }
                else {
                    oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                }
            },

            payloadforSubmit: function () {

                this.getView().getModel("InitData").setProperty("/MessageLog", []);

                var allowance = this.getView().getModel("InitData").getProperty("/allowance");
                var allowData = [];
                var errorFlag = false;

                // checking if there is any error
                var aControls = this.getView().getControlsByFieldGroupId("checkParams");
                aControls.forEach(function (oControl) {
                    if (oControl.getId != undefined && oControl.getId()) {
                        if (oControl.getId().includes("Select")) {
                            if ((oControl.getSelectedKey != undefined && oControl.getSelectedKey() == "" && oControl.getRequired != undefined && oControl.getRequired()) || (oControl.getValueState != undefined && oControl.getValueState() === sap.ui.core.ValueState.Error)) {
                                oControl.setValueState(sap.ui.core.ValueState.Error);
                                errorFlag = true;
                                this.addMessage(oControl.getValueStateText());
                            }
                        } else
                            if ((oControl.getValue != undefined && oControl.getValue() == "" && oControl.getRequired != undefined && oControl.getRequired()) || (oControl.getValueState != undefined && oControl.getValueState() === sap.ui.core.ValueState.Error)) {
                                oControl.setValueState(sap.ui.core.ValueState.Error);
                                errorFlag = true;
                                this.addMessage(oControl.getValueStateText());
                            }
                        // else if (oControl.getValue != undefined && oControl.getValue() != "") {
                        //     oControl.setValueState(sap.ui.core.ValueState.None);
                        // }
                    }
                }.bind(this));

                //checking if there is any mandatory missing in emergency contact
                if (this.getView().byId("_IDGenCheckBox3").getSelected() == true) {
                    var aControls = this.getView().getControlsByFieldGroupId("fg1");
                    aControls.forEach(function (oControl) {
                        if (oControl.getId != undefined && oControl.getId()) {
                            if ((oControl.getValue != undefined && oControl.getValue() == "" && oControl.getRequired != undefined && oControl.getRequired()) || (oControl.getValueState != undefined && oControl.getValueState() === sap.ui.core.ValueState.Error)) {
                                oControl.setValueState(sap.ui.core.ValueState.Error);
                                errorFlag = true;
                                this.addMessage(oControl.getValueStateText());
                            }
                            else if (oControl.getValue != undefined && oControl.getValue() != "") {
                                oControl.setValueState(sap.ui.core.ValueState.None);
                            }
                        }
                    }.bind(this));
                }
                if (allowance.length == 1 && allowance[0].wageType == "") {
                    this.addMessage("Form should have atleast one wage");
                    errorFlag = true;
                }

                if (errorFlag) return { Request_Payload: {}, messArr: this.getView().getModel("InitData").getProperty("/MessageLog") };
                else {

                    let seqNumber = 0;
                    for (let i = 0; i < allowance.length; i++) {
                        if (allowance[i].wageTypeCode) {
                            seqNumber++;
                            var temp = {
                                "Formid": this.getView().byId("nameText1").getValue() != null ? this.getView().byId("nameText1").getValue() : "",
                                "SequenceNo": seqNumber.toString(),
                                "WageType": allowance[i].wageType,
                                "WageTypeCode": allowance[i].wageTypeCode,
                                "AnnualAmt": (allowance[i].annualAmt).toString() != "" ? (allowance[i].annualAmt).toString() : "",
                                "MonthlyAmt": (allowance[i].monthlyAmt).toString(),
                                "StartDate": allowance[i].startDate != "" ? this.dateToReq(allowance[i].startDate) : "",
                                "StartDateInt": this.dateToUnix(allowance[i].startDate),
                                "Ztemp": (allowance[i].temp).toString()
                            };
                            allowData.push(temp);
                        }
                    }
                }

                var yesno = this.getView().getModel("InitData").getProperty("/yesNoDropdown");
                if (this.getView().byId("_IDGenCheckBox2").getSelected() == true) {
                    var flexCode = yesno.filter((el) => el.externalCode == "Y");
                } else { var flexCode = yesno.filter((el) => el.externalCode == "N"); }

                var typePenCode = this.getView().byId("SelectPension").getSelectedItem() != null ? this.getView().byId("SelectPension").getSelectedItem().getKey() : this.getView().byId("SelectPension").getSelectedKey()
                if (typePenCode == "9002" || typePenCode == "9003") {
                    var typeOfPenCode = yesno.filter((el) => el.externalCode == "Y");
                }
                else { var typeOfPenCode = yesno.filter((el) => el.externalCode == "N"); }

                var Request_Payload = {
                    "Formid": this.getView().byId("nameText1").getValue() != '' ? this.getView().byId("nameText1").getValue() : "",
                    "Initiator": this.getView().byId("nameText").getValue() != '' ? this.getView().byId("nameText").getValue() : "",
                    "Zdate": this.getView().byId("date1").getValue() != '' ? this.dateToReq(this.getView().byId("date1").getValue()) : "",
                    "DateInt": this.getView().byId("date1").getValue() != '' ? this.dateToUnix(this.getView().byId("date1").getValue()) : "",
                    "StartDate": this.getView().byId("date").getValue() != '' ? this.dateToReq(this.getView().byId("date").getValue()) : "",
                    "StartDateInt": this.getView().byId("date").getValue() != '' ? this.dateToUnix(this.getView().byId("date").getValue()) : "",
                    "PayrollAreaCode": this.getView().byId("SelectPay").getSelectedItem() != null ? this.getView().byId("SelectPay").getSelectedItem().getKey() : "",
                    "PayrollArea": this.getView().byId("SelectPay").getSelectedItem() != null ? this.getView().byId("SelectPay").getSelectedItem().getText() : "",
                    "CostCenterDisp": this.getView().byId("nameText2").getValue() != '' ? this.getView().byId("nameText2").getValue() : "",
                    "CostCenterCode": this.CcCode,
                    "CostCenterName": this.getView().byId("nameText3").getValue() != '' ? this.getView().byId("nameText3").getValue() : "",
                    "OrgKey": this.getView().byId("nameText4").getValue() != '' ? this.getView().byId("nameText4").getValue() : "",
                    "Title": this.getView().byId("SelectTitle").getSelectedItem() != null ? this.getView().byId("SelectTitle").getSelectedItem().getText() : "",
                    "Salutation": this.getView().byId("SelectTitle").getSelectedItem() != null ? this.getView().byId("SelectTitle").getSelectedItem().getKey() : "",
                    "Forename": this.getView().byId("_nameText").getValue() != '' ? this.getView().byId("_nameText").getValue() : "",
                    "Middlename": this.getView().byId("nameText5").getValue() != '' ? this.getView().byId("nameText5").getValue() : "",
                    "Surname": this.getView().byId("nameText6").getValue() != '' ? this.getView().byId("nameText6").getValue() : "",
                    "Gender": this.getView().byId("SelectGender").getSelectedItem() != null ? this.getView().byId("SelectGender").getSelectedItem().getText() : "",
                    "GenderCode": this.getView().byId("SelectGender").getSelectedItem() != null ? this.getView().byId("SelectGender").getSelectedItem().getKey() : "",
                    "Dob": this.getView().byId("date2").getValue() != '' ? this.dateToReq(this.getView().byId("date2").getValue()) : "",
                    "DobInt": this.getView().byId("date2").getValue() != '' ? this.dateToUnix(this.getView().byId("date2").getValue()) : "",
                    "SSerDt": this.getView().byId("nameText8").getValue() != '' ? this.dateToReq(this.getView().byId("nameText8").getValue()) : "",
                    "SSerDtInt": this.getView().byId("nameText8").getValue() != '' ? this.dateToUnix(this.getView().byId("nameText8").getValue()) : "",
                    "InsNo": this.getView().byId("nameText9").getValue() != '' ? this.getView().byId("nameText9").getValue() : "",
                    "Nationality": this.getView().byId("id2").getSelectedItem() != null ? this.getView().byId("id2").getSelectedItem().getText() : "",
                    "NationalityCode": this.getView().byId("id2").getSelectedItem() != null ? this.getView().byId("id2").getSelectedItem().getKey() : "",
                    "POverseas": this.getView().byId("_IDGenCheckBox1").getSelected() == true ? "X" : "",
                    "FlexRetireCode": flexCode[0].optionId,
                    "FlexRetirement": this.getView().byId("_IDGenCheckBox2").getSelected() == true ? "X" : "",
                    "PerSapNo": this.getView().byId("nameText10").getValue() != '' ? this.getView().byId("nameText10").getValue() : "",
                    "Streetper": this.getView().byId("nameText11").getValue() != '' ? this.getView().byId("nameText11").getValue() : "",
                    "AddLine2per": this.getView().byId("nameText12").getValue() != '' ? this.getView().byId("nameText12").getValue() : "",
                    "Cityper": this.getView().byId("nameText14").getValue() != '' ? this.getView().byId("nameText14").getValue() : "",
                    "CountyCodeper": this.getView().byId("nameText15").getSelectedItem() != null ? this.getView().byId("nameText15").getSelectedItem().getKey() : "",
                    "Countyper": this.getView().byId("nameText15").getSelectedItem() != null ? this.getView().byId("nameText15").getSelectedItem().getText() : "",
                    "PostCodeper": this.getView().byId("nameText16").getValue() != '' ? (this.getView().byId("nameText16").getValue()).toUpperCase() : "",
                    "HomePhoneper": this.getView().byId("nameText18").getValue() != '' ? this.getView().byId("nameText18").getValue() : "",
                    "Mobileper": this.getView().byId("nameText19").getValue() != '' ? this.getView().byId("nameText19").getValue() : "",
                    "FirstNameNew": this.getView().byId("_IDGenCheckBox3").getSelected() == false ? "" : this.getView().byId("_IDGenCheckBox3").getSelected() == true && this.getView().byId("nameText282").getValue() != '' ? this.getView().byId("nameText282").getValue() : "",
                    "CustomString1": this.getView().byId("_IDGenCheckBox3").getSelected() == false ? "" : this.getView().byId("_IDGenCheckBox3").getSelected() == true && this.getView().byId("nameText281").getValue() != '' ? this.getView().byId("nameText281").getValue() : "",
                    "RelationNew": this.getView().byId("_IDGenCheckBox3").getSelected() == false ? "" : this.getView().byId("_IDGenCheckBox3").getSelected() == true && this.getView().byId("nameText284").getSelectedItem() != null ? this.getView().byId("nameText284").getSelectedItem().getText() : "",
                    "RelationNewCode": this.getView().byId("_IDGenCheckBox3").getSelected() == false ? "" : this.getView().byId("nameText284").getSelectedItem() != null ? this.getView().byId("nameText284").getSelectedItem().getKey() : "",
                    "Streetnew": this.getView().byId("_IDGenCheckBox3").getSelected() == false ? "" : this.getView().byId("_IDGenCheckBox3").getSelected() == true && this.getView().byId("nameText20").getValue() != '' ? this.getView().byId("nameText20").getValue() : "",
                    "AddLine2new": this.getView().byId("nameText21").getValue() != '' ? this.getView().byId("nameText21").getValue() : "",
                    "Citynew": this.getView().byId("_IDGenCheckBox3").getSelected() == false ? "" : this.getView().byId("_IDGenCheckBox3").getSelected() == true && this.getView().byId("nameText23").getValue() != '' ? this.getView().byId("nameText23").getValue() : "",
                    "CountyCodenew": this.getView().byId("nameText24").getSelectedItem() != null ? this.getView().byId("nameText24").getSelectedItem().getKey() : "",
                    "Countynew": this.getView().byId("nameText24").getSelectedItem() != null ? this.getView().byId("nameText24").getSelectedItem().getText() : "",
                    "EmailNew": this.getView().byId("nameText26").getValue() != '' ? this.getView().byId("nameText26").getValue() : "",
                    "PostCodenew": this.getView().byId("_IDGenCheckBox3").getSelected() == false ? "" : this.getView().byId("_IDGenCheckBox3").getSelected() == true && this.getView().byId("nameText25").getValue() != '' ? (this.getView().byId("nameText25").getValue()).toUpperCase() : "",
                    "HomePhonenew": this.getView().byId("nameText27").getValue() != '' ? this.getView().byId("nameText27").getValue() : "",
                    "Mobilenew": this.getView().byId("nameText28").getValue() != '' ? this.getView().byId("nameText28").getValue() : "",
                    "Email": this.getView().byId("nameText17").getValue() != '' ? this.getView().byId("nameText17").getValue() : "",
                    "AddEmgCont": this.getView().byId("_IDGenCheckBox3").getSelected() == true ? "X" : "",
                    "BankSortCode": this.getView().byId("nameText29").getValue() != '' ? this.getView().byId("nameText29").getValue() : "",
                    "BankName": this.getView().byId("nameText31").getValue() != '' ? this.getView().byId("nameText31").getValue() : "",
                    "BankAcNo": this.getView().byId("nameText30").getValue() != '' ? this.getView().byId("nameText30").getValue() : "",
                    "BuildSociety": this.getView().byId("nameText32").getValue() != '' ? this.getView().byId("nameText32").getValue() : "",
                    "AnnualPension": this.getView().byId("nameText33").getValue() != '' ? this.getView().byId("nameText33").getValue() : "",
                    "TypeOfPen": this.getView().byId("SelectPension").getSelectedItem() != null ? this.getView().byId("SelectPension").getSelectedItem().getText() : "",
                    "TypeOfPenCode": this.getView().byId("SelectPension").getSelectedItem() != null ? this.getView().byId("SelectPension").getSelectedItem().getKey() : this.getView().byId("SelectPension").getSelectedKey(),
                    "Recent_Bereaved_Ind": typeOfPenCode[0].optionId,
                    "DeceasedName": this.getView().byId("nameText34").getValue() != '' ? this.getView().byId("nameText34").getValue() : "",
                    "DeceasedSapCode": this.getView().byId("nameText35").getValue() != '' ? this.getView().byId("nameText35").getValue() : "",
                    "Purpose": "I",
                    "DelIndicator": "",
                    "hdr_to_wage_nav": allowData,
                    "hdr_to_comm_nav": [{
                        "Formid": this.getView().byId("nameText1").getValue() != '' ? this.getView().byId("nameText1").getValue() : "",
                        "comment": this.getView().byId("_IDGenTextArea2").getValue() != '' ? this.getView().byId("_IDGenTextArea2").getValue() : ""
                    }]
                };
                return { Request_Payload: Request_Payload, messArr: [] };

            },

            _logCreation: function (status) {
                var initiator = this.getView().byId("nameText").getValue();
                var log_payload = {
                    "Formid": this.getView().byId("nameText1").getValue(),
                    "StartedOn": new Date(this.getView().byId("date1").getValue()).toLocaleDateString('en-GB'),
                    "Status": status,
                    "Type": "PS03",
                    "OrgCode": this.organization ? this.organization : "",
                    "InitCode": initiatorCode,
                    "Initiator": initiator,
                    "Description": "Pensioner New Starter Form",
                    "FormOwner": status == "S" ? "Pension Team" : initiator,
                    "FormOwnerCode": status == "S" ? "Pension" : initiatorCode,
                    "ApproverName": "Pension Team",
                    "ApproverCode": "Pension",
                    "AvailableFrom": new Date().toLocaleDateString('en-GB'),
                }
                this.getOwnerComponent().getModel("logService").create("/zsf_logSet", log_payload,
                    {
                        success: function (oData) {
                            console.log(`${this.getView().byId("nameText1").getValue()} log created`);
                            // this.onTabChange();

                        }.bind(this),
                        error: function (oData) {
                            console.log("Error", oData);
                        }
                    });
            },

            addMessage: function (message) {

                var messArr = this.getView().getModel("InitData").getProperty("/MessageLog");
                var obj = {
                    "Icon": "sap-icon://status-error",
                    "Message": message,
                }
                messArr.push(obj);

                this.getView().getModel("InitData").setProperty("/MessageLog", messArr);
            },

            payload: function (purpose, delInd) {

                var allowance = this.getView().getModel("InitData").getProperty("/allowance");
                var allowData = [];
                if (allowance != undefined) {
                    let seqNumber = 0;
                    for (let i = 0; i < allowance.length; i++) {
                        if (allowance[i].wageTypeCode) {
                            seqNumber++;
                            var temp = {
                                "Formid": this.getView().byId("nameText1").getValue() != null ? this.getView().byId("nameText1").getValue() : "",
                                "SequenceNo": seqNumber.toString(),
                                "WageType": allowance[i].wageType,
                                "WageTypeCode": allowance[i].wageTypeCode,
                                "AnnualAmt": (allowance[i].annualAmt).toString(),
                                "MonthlyAmt": (allowance[i].monthlyAmt).toString(),
                                "StartDate": allowance[i].startDate ? this.dateToReq(allowance[i].startDate) : "",
                                "StartDateInt": this.dateToUnix(allowance[i].startDate),
                                "Ztemp": (allowance[i].temp).toString()
                            };
                            allowData.push(temp);
                        }
                    }
                }

                var yesno = this.getView().getModel("InitData").getProperty("/yesNoDropdown");
                if (this.getView().byId("_IDGenCheckBox2").getSelected() == true) {
                    var flexCode = yesno.filter((el) => el.externalCode == "Y");
                } else { var flexCode = yesno.filter((el) => el.externalCode == "N"); }

                var typePenCode = this.getView().byId("SelectPension").getSelectedItem() != null ? this.getView().byId("SelectPension").getSelectedItem().getKey() : this.getView().byId("SelectPension").getSelectedKey()
                if (typePenCode == "9002" || typePenCode == "9003") {
                    var typeOfPenCode = yesno.filter((el) => el.externalCode == "Y");
                }
                else { var typeOfPenCode = yesno.filter((el) => el.externalCode == "N"); }

                var Request_Payload = {
                    "Formid": this.getView().byId("nameText1").getValue() != '' ? this.getView().byId("nameText1").getValue() : "",
                    "Initiator": this.getView().byId("nameText").getValue() != '' ? this.getView().byId("nameText").getValue() : "",
                    "Zdate": this.getView().byId("date1").getValue() != '' ? this.dateToReq(this.getView().byId("date1").getValue()) : "",
                    "DateInt": this.getView().byId("date1").getValue() != '' ? this.dateToUnix(this.getView().byId("date1").getValue()) : "",
                    "StartDate": this.getView().byId("date").getValue() != '' ? this.dateToReq(this.getView().byId("date").getValue()) : "",
                    "StartDateInt": this.getView().byId("date").getValue() != '' ? this.dateToUnix(this.getView().byId("date").getValue()) : "",
                    "PayrollAreaCode": this.getView().byId("SelectPay").getSelectedItem() != null ? this.getView().byId("SelectPay").getSelectedItem().getKey() : "",
                    "PayrollArea": this.getView().byId("SelectPay").getSelectedItem() != null ? this.getView().byId("SelectPay").getSelectedItem().getText() : "",
                    "CostCenterDisp": this.getView().byId("nameText2").getValue() != '' ? this.getView().byId("nameText2").getValue() : "",
                    "CostCenterCode": this.CcCode,
                    "CostCenterName": this.getView().byId("nameText3").getValue() != '' ? this.getView().byId("nameText3").getValue() : "",
                    "OrgKey": this.getView().byId("nameText4").getValue() != '' ? this.getView().byId("nameText4").getValue() : "",
                    "Title": this.getView().byId("SelectTitle").getSelectedItem() != null ? this.getView().byId("SelectTitle").getSelectedItem().getText() : "",
                    "Salutation": this.getView().byId("SelectTitle").getSelectedItem() != null ? this.getView().byId("SelectTitle").getSelectedItem().getKey() : "",
                    "Forename": this.getView().byId("_nameText").getValue() != '' ? this.getView().byId("_nameText").getValue() : "",
                    "Middlename": this.getView().byId("nameText5").getValue() != '' ? this.getView().byId("nameText5").getValue() : "",
                    "Surname": this.getView().byId("nameText6").getValue() != '' ? this.getView().byId("nameText6").getValue() : "",
                    "Gender": this.getView().byId("SelectGender").getSelectedItem() != null ? this.getView().byId("SelectGender").getSelectedItem().getText() : "",
                    "GenderCode": this.getView().byId("SelectGender").getSelectedItem() != null ? this.getView().byId("SelectGender").getSelectedItem().getKey() : "",
                    "Dob": this.getView().byId("date2").getValue() != '' ? this.dateToReq(this.getView().byId("date2").getValue()) : "",
                    "DobInt": this.getView().byId("date2").getValue() != '' ? this.dateToUnix(this.getView().byId("date2").getValue()) : "",
                    "SSerDt": this.getView().byId("nameText8").getValue() != '' ? this.dateToReq(this.getView().byId("nameText8").getValue()) : "",
                    "SSerDtInt": this.getView().byId("nameText8").getValue() != '' ? this.dateToUnix(this.getView().byId("nameText8").getValue()) : "",
                    "InsNo": this.getView().byId("nameText9").getValue() != '' ? this.getView().byId("nameText9").getValue() : "",
                    "Nationality": this.getView().byId("id2").getSelectedItem() != null ? this.getView().byId("id2").getSelectedItem().getText() : "",
                    "NationalityCode": this.getView().byId("id2").getSelectedItem() != null ? this.getView().byId("id2").getSelectedItem().getKey() : "",
                    "POverseas": this.getView().byId("_IDGenCheckBox1").getSelected() == true ? "X" : "",
                    "FlexRetireCode": flexCode[0].optionId,
                    "FlexRetirement": this.getView().byId("_IDGenCheckBox2").getSelected() == true ? "X" : "",
                    "PerSapNo": this.getView().byId("nameText10").getValue() != '' ? this.getView().byId("nameText10").getValue() : "",
                    "Streetper": this.getView().byId("nameText11").getValue() != '' ? this.getView().byId("nameText11").getValue() : "",
                    "AddLine2per": this.getView().byId("nameText12").getValue() != '' ? this.getView().byId("nameText12").getValue() : "",
                    "Cityper": this.getView().byId("nameText14").getValue() != '' ? this.getView().byId("nameText14").getValue() : "",
                    "CountyCodeper": this.getView().byId("nameText15").getSelectedItem() != null ? this.getView().byId("nameText15").getSelectedItem().getKey() : "",
                    "Countyper": this.getView().byId("nameText15").getSelectedItem() != null ? this.getView().byId("nameText15").getSelectedItem().getText() : "",
                    "PostCodeper": this.getView().byId("nameText16").getValue() != '' ? (this.getView().byId("nameText16").getValue()).toUpperCase() : "",
                    "HomePhoneper": this.getView().byId("nameText18").getValue() != '' ? this.getView().byId("nameText18").getValue() : "",
                    "Mobileper": this.getView().byId("nameText19").getValue() != '' ? this.getView().byId("nameText19").getValue() : "",
                    "FirstNameNew": this.getView().byId("nameText282").getValue() != '' ? this.getView().byId("nameText282").getValue() : "",
                    "CustomString1": this.getView().byId("nameText281").getValue() != '' ? this.getView().byId("nameText281").getValue() : "",
                    "RelationNew": this.getView().byId("nameText284").getSelectedItem() != null ? this.getView().byId("nameText284").getSelectedItem().getText() : "",
                    "RelationNewCode": this.getView().byId("nameText284").getSelectedItem() != null ? this.getView().byId("nameText284").getSelectedItem().getKey() : "",
                    "Streetnew": this.getView().byId("nameText20").getValue() != '' ? this.getView().byId("nameText20").getValue() : "",
                    "AddLine2new": this.getView().byId("nameText21").getValue() != '' ? this.getView().byId("nameText21").getValue() : "",
                    "Citynew": this.getView().byId("nameText23").getValue() != '' ? this.getView().byId("nameText23").getValue() : "",
                    "CountyCodenew": this.getView().byId("nameText24").getSelectedItem() != null ? this.getView().byId("nameText24").getSelectedItem().getKey() : "",
                    "Countynew": this.getView().byId("nameText24").getSelectedItem() != null ? this.getView().byId("nameText24").getSelectedItem().getText() : "",
                    "EmailNew": this.getView().byId("nameText26").getValue() != '' ? this.getView().byId("nameText26").getValue() : "",
                    "PostCodenew": this.getView().byId("nameText25").getValue() != '' ? (this.getView().byId("nameText25").getValue()).toUpperCase() : "",
                    "HomePhonenew": this.getView().byId("nameText27").getValue() != '' ? this.getView().byId("nameText27").getValue() : "",
                    "Mobilenew": this.getView().byId("nameText28").getValue() != '' ? this.getView().byId("nameText28").getValue() : "",
                    "Email": this.getView().byId("nameText17").getValue() != '' ? this.getView().byId("nameText17").getValue() : "",
                    "AddEmgCont": this.getView().byId("_IDGenCheckBox3").getSelected() == true ? "X" : "",
                    "BankSortCode": this.getView().byId("nameText29").getValue() != '' ? this.getView().byId("nameText29").getValue() : "",
                    "BankName": this.getView().byId("nameText31").getValue() != '' ? this.getView().byId("nameText31").getValue() : "",
                    "BankAcNo": this.getView().byId("nameText30").getValue() != '' ? this.getView().byId("nameText30").getValue() : "",
                    "BuildSociety": this.getView().byId("nameText32").getValue() != '' ? this.getView().byId("nameText32").getValue() : "",
                    "AnnualPension": this.getView().byId("nameText33").getValue() != '' ? this.getView().byId("nameText33").getValue() : "",
                    "TypeOfPen": this.getView().byId("SelectPension").getSelectedItem() != null ? this.getView().byId("SelectPension").getSelectedItem().getText() : "",
                    "TypeOfPenCode": this.getView().byId("SelectPension").getSelectedItem() != null ? this.getView().byId("SelectPension").getSelectedItem().getKey() : this.getView().byId("SelectPension").getSelectedKey(),
                    // typeOfPenCode[0].optionId,
                    "DeceasedName": this.getView().byId("nameText34").getValue() != '' ? this.getView().byId("nameText34").getValue() : "",
                    "DeceasedSapCode": this.getView().byId("nameText35").getValue() != '' ? this.getView().byId("nameText35").getValue() : "",
                    "Purpose": purpose,
                    "DelIndicator": delInd,
                    "hdr_to_wage_nav": allowData,
                    "hdr_to_comm_nav": [{
                        "Formid": this.getView().byId("nameText1").getValue() != '' ? this.getView().byId("nameText1").getValue() : "",
                        "comment": this.getView().byId("_IDGenTextArea2").getValue() != '' ? this.getView().byId("_IDGenTextArea2").getValue() : ""
                    }]
                };
                return Request_Payload;

            },

            onSave: function () {

                sap.ui.core.BusyIndicator.show();
                var Request_Payload = this.payload("I", "");
                this.getOwnerComponent().getModel("S4hService").create("/zsf_h_ps03Set", Request_Payload, {
                    success: function (oData) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageBox.success(`Form: ${this.getView().byId("nameText1").getValue()} saved Successfully!`, {
                            onClose: function (oAction) {
                                sap.ui.core.BusyIndicator.hide();
                                if (this.query) window.parent.close();
                                else {
                                    this._logCreation("E");
                                }
                            }.bind(this)
                        });
                    }.bind(this),
                    error: function (e) {
                        console.log("Error S4h");
                        MessageBox.error("Some error occured. Please try again")
                        sap.ui.core.BusyIndicator.hide();
                    }
                });
            },

            onSubmit: function (oEvent) {
                MessageBox.alert("Do you want to Submit?", {
                    title: "Submit Form",
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    emphasizedAction: MessageBox.Action.YES,
                    onClose: function (sAction) {
                        if (sAction == MessageBox.Action.YES) {
                            sap.ui.core.BusyIndicator.show();
                            var { Request_Payload, messArr } = this.payloadforSubmit();
                            if (messArr.length != 0) {
                                sap.ui.core.BusyIndicator.hide();
                                this.oMessage = sap.ui.xmlfragment("com.gcc.pensionqa.ps03qa.fragment.logMessage", this);
                                this.getView().addDependent(this.oMessage);
                                this.oMessage.open();
                            }
                            else {
                                this.getOwnerComponent().getModel("S4hService").create("/zsf_h_ps03Set", Request_Payload, {
                                    success: function (oData) {
                                        var user = this.getView().getModel("InitData").getProperty("/user");
                                        var appUrl = window.location.origin + "/site?siteId=" + window.location.search.split("siteId=")[1].split("&")[0] + window.location.hash.split("Display")[0] + "Display";
                                        var reqUrl = appUrl.includes("GCC_SemObj") ? appUrl + "&/?formId=" : appUrl + "#?formId=";
                                        var payload = {
                                            "definitionId": "eu10.gccdev.eforms.pS03",
                                            "context": {
                                                "formid": this.getView().byId("nameText1").getValue(),
                                                "formlinkapprover": reqUrl + this.getView().byId("nameText1").getValue() + "&mode=display",
                                                "formlinkinitiator": reqUrl + this.getView().byId("nameText1").getValue() + "&mode=initiator",
                                                "initiator": user.email
                                            }
                                        }
                                        this.triggerWF(payload);

                                    }.bind(this),
                                    error: function (e) {
                                        console.log("Error S4h");
                                        MessageBox.error("Some error occured. Please try again")
                                        sap.ui.core.BusyIndicator.hide();
                                    }
                                });
                            }
                        }
                    }.bind(this)
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
                    console.log("Workflow has been triggered and Form has been Submitted");
                    if (data) {
                        sap.ui.core.BusyIndicator.hide()
                        this._logCreation("S");
                        MessageBox.success(`Form: ${this.getView().byId("nameText1").getValue()} is submitted successfully
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

                }.bind(this)).fail(function (XMLHttpRequest) {
                    // alert("error");
                    MessageBox.error(JSON.parse(XMLHttpRequest.responseText).error.message)
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

            onDelete: function () {

                MessageBox.warning(`Delete the data in this form and any saved draft version of this form`, {
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    emphasizedAction: MessageBox.Action.YES,
                    onClose: function (sAction) {
                        if (sAction == MessageBox.Action.YES) {
                            sap.ui.core.BusyIndicator.show();
                            var formid = this.getView().byId("nameText1").getValue();
                            this.getOwnerComponent().getModel("S4hService").remove("/zsf_h_ps03Set('" + formid + "')", {
                                success: function (oData) {
                                    sap.ui.core.BusyIndicator.hide();
                                    this._logCreation("D");
                                    MessageBox.success("Form Deleted Successfully!", {
                                        title: "Success Message",
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
                                error: function (e) {
                                    console.log("Error S4h");
                                    MessageBox.error("Some error occured. Please try again")
                                    sap.ui.core.BusyIndicator.hide();
                                }
                            });
                        }
                    }.bind(this)
                });

            },

            onPrint: function () {

                sap.ui.core.BusyIndicator.show();
                var Request_Payload = this.payload("P", "");
                this.getOwnerComponent().getModel("S4hService").create("/zsf_h_ps03Set", Request_Payload, {
                    success: function (oData) {
                        console.log("success S4h");
                        sap.ui.core.BusyIndicator.hide();
                        var s4url = this.getOwnerComponent().getModel("S4hService").sServiceUrl;    // Give your service name
                        var FormID = this.getView().byId("nameText1").getValue();      // Give your FormID
                        var sSource = s4url + "/zsf_print_ps03Set(Formid='" + FormID + "')/$value";
                        var newTab = window.open(sSource, "_blank");
                        newTab.onload = function () {
                            // newTab.print();
                        }
                        // this._pdfViewer = new sap.m.PDFViewer();
                        // this.getView().addDependent(this._pdfViewer);
                        // this._pdfViewer.setSource(sSource);
                        // this._pdfViewer.setTitle("Pensioner New Starter Form - Print");
                        // this._pdfViewer.setShowDownloadButton(false);
                        // this._pdfViewer.open();
                    }.bind(this),
                    error: function (e) {
                        console.log("Error S4h");
                        MessageBox.error("Some error occured. Please try again")
                        sap.ui.core.BusyIndicator.hide();
                    }
                });
            },

            onMessageClose: function () {
                this.oMessage.close();
            },

            onTabChange: function (oEvent) {

                if (oEvent.getParameter("key") == "History") {
                    var oModel = this.getView().getModel("InitData");
                    var oFilter = new sap.ui.model.Filter('Formid', sap.ui.model.FilterOperator.EQ, this.getView().byId("nameText1").getValue());
                    this.getOwnerComponent().getModel("logService").read("/zsf_logSet", {
                        filters: [oFilter],
                        success: function (oData) {
                            this.getView().byId("_HIDGenFormId1").setValue(this.getView().byId("nameText1").getValue());
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