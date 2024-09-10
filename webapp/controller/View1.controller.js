sap.ui.define([
  "sap/m/MessageBox",
  "sap/ui/model/json/JSONModel",
  "sap/ui/core/mvc/Controller",
  "../model/formatter"
],
  /**
   * @param {typeof sap.ui.core.mvc.Controller} Controller
   */
  function (MessageBox, JSONModel, Controller, formatter) {
    "use strict";
    var companyCode = "", initiator = "", useremail = "", formId1 = "", initiatorName = "", userId;
    var serviceURL = "", pernr = "", approverFlag = false, bscFlag = false, initiatorFlag = false, payGroup = "", nationalid = "", empTermination = "", approverCode = "";
    var formOwnerCode = "", personnel = "", emplSubGroup = "";

    return Controller.extend("com.gcc.newstarterqa.newstarterqa.controller.View1", {
      formatter: formatter,
      onInit: function (oEvent) {
        serviceURL = sap.ui.require.toUrl(this.getOwnerComponent().getManifestEntry('/sap.app/id').replaceAll('.', '/'));
        var dateValue = new Date();
        this.getView().byId("DatePicker01").setDateValue(dateValue);
        // this.getView().byId("contStartDate1").setValue(dateValue);

        var link = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("SchoolsnetLink")
        var text = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("IntroText1")
        this.getView().byId("_IDGenFormattedText1").setHtmlText("<p>" + text + "<a title=" + link + " href=\"" + link + "\"</a> e-Forms Pages.</p>")
        // //Dob defaulting 10yrs prior
        // var currYear = CurrDate.getFullYear();
        // var day = CurrDate.getDay();
        // var month = CurrDate.getMonth();
        // var Year = currYear-10;
        // var minDate = day+ "-" + month + "-" + Year;

        // this.getView().byId("Dob11").setMaxDate(new Date(minDate));
        var data = [];
        var oneModel = new JSONModel(data);
        this.getView().setModel(oneModel, "oneModel");
        this.clearFields();
        // this.s4hanaServices(oEvent);
        //this.SFservice(oEvent);

        this.getOwnerComponent().getRouter().getRoute("RouteView1").attachPatternMatched(this._onRouteMatched, this);
        //this._onRouteMatched(oEvent);
      },
      DOBRestrict10years: function (oEvent) {
        //Dob defaulting 10yrs prior
        var CurrDate = new Date();
        var currYear = CurrDate.getFullYear();
        var day = CurrDate.getDay();
        var month = CurrDate.getMonth();
        var Year = currYear - 10;
        var minDate = day + "-" + month + "-" + Year;

        oEvent.getSource().setMaxDate(new Date(minDate));
      },
      editable: function (oValue) {
        if (oValue) {
          return oValue = true;
        } else oValue = false;
      },

      onTabSelect: function (oEvent) {
        // sap.ui.core.BusyIndicator.show();
        var oModel = this.getView().getModel("oneModel");
        var key = oEvent.getParameter("key");
        var oFilter = new sap.ui.model.Filter('Formid', sap.ui.model.FilterOperator.EQ, this.getView().byId("_IDGenInput2").getValue());
        if (key == "History") {
          this.getOwnerComponent().getModel("ZSFGTGW_LOG_SRV").read("/zsf_logSet", {
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

          this.getView().byId("PrintFrame").setVisible(false);
          this.getView().byId("delete").setVisible(false);
          this.getView().byId("save").setVisible(false);
          this.getView().byId("submit").setVisible(false);
          sap.ui.core.BusyIndicator.hide();
        } else {
          this.getView().byId("PrintFrame").setVisible(true);
          this.getView().byId("delete").setVisible(true);
          this.getView().byId("save").setVisible(true);
          this.getView().byId("submit").setVisible(true);
          sap.ui.core.BusyIndicator.hide();
        }
      },

      getBaseURL: function () {
        var appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
        var appPath = appId.replaceAll(".", "/");
        var appModulePath = jQuery.sap.getModulePath(appPath);
        return appModulePath;
      },
      _onRouteMatched: function (oEvent) {
        sap.ui.core.BusyIndicator.show();
        var oModel = new sap.ui.model.json.JSONModel();
        const url = this.getBaseURL() + "/user-api/currentUser";

        var mock = {
          firstname: "Dummy",
          lastname: "User",
          email: "",
          name: "",
          displayName: "Dummy User (dummy.user@com)"
        };
        var that = this;
        oModel.loadData(url);
        oModel.dataLoaded()
          .then(() => {
            if (!oModel.getData().email) {
              oModel.setData(mock);
              useremail = "dummy.user@com";
              //  useremail = "vivek-kumar5@hcl.com" // -------------------------------------------------Comment before deploy
              initiator = "00002062";
              initiatorName = "dummy";
              var disable = {
                formId: "",
                mode: "initiator"
              }
              this.getView().getModel("oneModel").setProperty("/disable", disable);
              this.s4hanaServices();
              this.SFservice();
              sap.ui.core.BusyIndicator.hide();
              //this.readFormidData("0000002450"); //-------------------------------------------------------------------Comment before deploy
            }
            else {
              useremail = oModel.getData().email;
              var query = oEvent.getParameter('arguments')["?query"];
              var that = this;
              if (query == undefined) {
                var disable = {
                  formId: "",
                  mode: ""
                }
                this.getView().getModel("oneModel").setProperty("/disable", disable);

                $.ajax({
                  url: serviceURL + "/odata/v2/PerEmail?$filter=emailAddress eq '" + useremail + "'&$format=json",
                  type: 'GET',
                  contentType: "application/json",
                  success: function (data) {
                    console.log("success" + data);
                    initiator = data.d.results[0].personIdExternal;
                    if (initiator) {
                      this.SFservice();
                      this.s4hanaServices();
                      sap.ui.core.BusyIndicator.hide();
                    }
                  }.bind(this),
                  error: function (e) {
                    console.log("error: " + e);
                    sap.ui.core.BusyIndicator.hide();
                  }

                });

              } else {
                this.getView().getModel("oneModel").setProperty("/disable", query);
                formId1 = query.formId;
                if (query.mode == "bsc") {
                  bscFlag = true;
                  this.getView().byId("delete").setVisible(false);
                  this.getView().byId("submit").setVisible(false);
                } else if (query.mode == "display") {
                  approverFlag = true;
                  this.getView().byId("delete").setVisible(false);
                  this.getView().byId("submit").setVisible(false);
                } else if (query.mode == "initiator") {
                  initiatorFlag = true;
                  this.getView().byId("delete").setVisible(false);
                  this.getView().byId("submit").setVisible(false);
                }
                $.ajax({
                  url: serviceURL + "/odata/v2/PerEmail?$filter=emailAddress eq '" + useremail + "'&$format=json",
                  type: 'GET',
                  contentType: "application/json",
                  success: function (data) {
                    console.log("success" + data);
                    if (data.d.results[0] && data.d.results[0].personIdExternal) {
                      initiator = data.d.results[0].personIdExternal;
                      setTimeout(this.readFormidData(formId1, useremail), 300);
                      if (bscFlag || approverFlag) {
                        this.getView().getModel("oneModel").setProperty("/editable", false);
                        this.getView().byId("_IDGenComboBox1").setEditable(false);
                        this.getView().byId("_IDGenComboBox41").setEditable(false);
                        this.getView().byId("idempCame").setEditable(false);
                        this.getView().byId("_IDGenInput10").setEditable(false);
                        this.getView().byId("_IDGenComboBox411").setEditable(false);
                        this.getView().byId("_IDGenInput11").setEditable(false);
                        this.getView().byId("_IDGenInput112").setEditable(false);

                        this.getView().byId("titleB1").setEditable(false);


                        this.getView().byId("_IDGenComboBox17").setEditable(false);
                        this.getView().byId("_IDGenDatePicker1").setEditable(false);
                        this.getView().byId("_IDGenComboBox2").setEditable(false);
                        this.getView().byId("_IDGenComboBox3").setEditable(false);
                        this.getView().byId("_IDGenComboBox6").setEditable(false);
                        this.getView().byId("Hoursperweek").setEditable(false);
                        this.getView().byId("idWeekYeardrop").setEditable(false);
                        this.getView().byId("idWorkingWeeksdrop").setEditable(false);
                        this.getView().byId("idFTE").setEditable(false);
                        this.getView().byId("idFTEperc").setEditable(false);
                        this.getView().byId("_IDGenInput141").setEditable(false);
                        this.getView().byId("probationEndDatePic").setEditable(false);
                        this.getView().byId("_IDGenComboBox8").setEditable(false);
                        this.getView().byId("_IDGenInput191").setEditable(false);
                        this.getView().byId("_IDGenInput12").setEditable(false);
                        this.getView().byId("_IDGenComboBox82").setEditable(false);
                        this.getView().byId("_IDGenInput1912").setEditable(false);
                        this.getView().byId("_IDGenInput122").setEditable(false);
                        this.getView().byId("_IDGenComboBox83").setEditable(false);
                        this.getView().byId("_IDGenInput1913").setEditable(false);
                        this.getView().byId("_IDGenInput123").setEditable(false);
                      } else sap.ui.core.BusyIndicator.hide();
                      sap.ui.core.BusyIndicator.hide();
                    }
                  }.bind(this),
                  error: function (e) {
                    console.log("error: " + e);
                    sap.ui.core.BusyIndicator.hide();
                  }
                });
              }
            }
          });

      },


      SFservice: function () {
        var that = this;
        var oModel = that.getView().getModel("oneModel");
        var oView = that.getView();
        this.ApproverCode = "";
        //   return new Promise(function (resolve, reject) {

        //property - personal Info dropdown
        $.ajax({
          url: serviceURL + "/odata/v2/EmpEmployment(personIdExternal='" + initiator + "',userId='" + initiator + "')/jobInfoNav?$format=json",
          type: 'GET',
          contentType: "application/json",
          success: function (data) {
            // $.ajax({
            //   url: serviceURL + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'rcmUKEthnicGroup' and status eq 'A' &$format=json",
            //   type: 'GET',
            //   contentType: "application/json",
            //   success: function (data) {
            //     data.d.results.sort();
            //     oModel.setProperty("/Ethnicity", data.d.results);
            //   }.bind(this),
            //   error: function (e) {
            //     console.log("error: " + e);
            //   }
            // });
            $.ajax({
              url: serviceURL + "/odata/v2/cust_PersonnelArea?$filter= externalCode eq '" + data.d.results[0].customString3 + "'&$format=json",
              type: 'GET',
              contentType: "application/json",
              success: function (data) {
                console.log("success" + data);
                personnel = data.d.results[0].externalName + " (" + data.d.results[0].externalCode + ")"
              },
              error: function (e) {
                console.log("error: " + e);
              }
            });
            var orgType = data.d.results[0].customString3;
            var manId = data.d.results[0].managerId;
            $.ajax({
              url: serviceURL + "/odata/v2/PerPerson('" + manId + "')/personalInfoNav?$format=json",
              type: 'GET',
              contentType: "application/json",
              success: function (data) {
                if (bscFlag || approverFlag || initiatorFlag) {
                }
                else {
                  console.log("success per person manager org type" + data);
                  var manName = data.d.results[0].firstName + " " + data.d.results[0].lastName;
                  // settin the value of manager id in header field
                  oView.byId("approver").setValue(manName);
                  this.ApproverCode = data.d.results[0].salutation;
                }
              }, error: function () { }
            }).done(function () {
              if (approverFlag || bscFlag) {
                oView.byId("empCame").setVisible(true);
                oView.byId("idempCame").setVisible(true);
                oView.byId("_IDGenLabel621").setVisible(true);
                oView.byId("_IDGenInput10").setVisible(true);
                oView.byId("_IDGenLabel6421").setVisible(true);
                oView.byId("_IDGenComboBox411").setVisible(true);
                oView.byId("_IDGenLabel6411").setVisible(true);
                oView.byId("_IDGenInput11").setVisible(true);
                oView.byId("_IDGenLabel611").setVisible(true);
                oView.byId("_IDGenInput112").setVisible(true);

                oView.byId("DatePicker01").setEditable(false);
                oView.byId("Dob11").setEditable(false);

                oView.byId("Nationality1").setEditable(false);
                oView.byId("Disability1").setEditable(false);
                oView.byId("DBS1").setEditable(false);
                oView.byId("TeachRegNum1").setEditable(false);
                oView.byId("BankSort1").setEditable(false);
                oView.byId("BankAccNum1").setEditable(false);


                oView.byId("nationalIns1").setEditable(false);
                oView.byId("Ethicity1").setEditable(false);
                oView.byId("Gender1").setEditable(false);
                oView.byId("ClearDate1").setEditable(false);
                oView.byId("ClearDate1").setEditable(false);
                oView.byId("issuDate1").setEditable(false);
                oView.byId("issuDate1").setEditable(false);
                // oView.byId("BankName1").setEnabled(false);
                oView.byId("BuildingSoc1").setEditable(false);
                oView.byId("_IDGefnInput11").setEditable(false);
                oView.byId("_IDGefnInput12").setEditable(false);
                //this.getView().byId("_IDGenfInput13").setEnabled(false);
                oView.byId("_IDGefnInput14").setEditable(false);
                oView.byId("_IDGenItem6").setEditable(false);


                //First Emergency 

                oView.byId("idree4d2").setEditable(false);
                oView.byId("_IDGenItem6").setEditable(false);
                // oView.byId("emergency1County").setEditable(false);
                oView.byId("_IDGenInput15").setEditable(false);
                oView.byId("_IDGenInput16").setEditable(false);
                oView.byId("_IDGenInput16s").setEditable(false);
                oView.byId("_IDGenInput17").setEditable(false);
                oView.byId("_IDGenInput18").setEditable(false);
                // oView.byId("_IDGenInput19").setEditable(false);


                oView.byId("_IDGefnInput122").setEditable(false);
                oView.byId("_IDGefnInput112").setEditable(false);
                //this.getView().byId("_IDGenfInput132").setEnabled(false);
                oView.byId("_IDGefnInput142").setEditable(false);
                // this.getView().byId("idCountry2").setEnabled(false);
                oView.byId("_IDGenInput152").setEditable(false);
                oView.byId("_IDGenInput162").setEditable(false);
                oView.byId("_IDGenInput162s").setEditable(false);
                oView.byId("_IDGenInput172").setEditable(false);
                oView.byId("_IDGenInput182").setEditable(false);
                // oView.byId("_IDGenInput192").setEditable(false);

              }
            });
            // resolve(data);
          }, error: function (e) {
            console.log("error: " + e);
            //reject(e);
          }
        });


        // // organisation name
        // $.ajax({
        //   url: serviceURL + "/odata/v2/cust_ZFLM_MULTI_USERS?$format=json",
        //   type: 'GET',
        //   contentType: "application/json",
        //   success: function (data) {
        //     oModel.setProperty("/organisation", data);
        //   }, error: function (e) { }
        // })

        // // Cost Center AJAX 

        $.ajax({
          url: serviceURL + "/odata/v2/EmpCostAssignmentItem?$filter= EmpCostAssignment_worker eq '" + initiator + "'&$format=json",
          type: 'GET',
          contentType: "application/json",
          success: function (data) {
            console.log("success" + data);
            for (let i = 0; i < data.d.results.length; i++) {
              if (data.d.results[i].defaultAssignment == true) {
                oModel.setProperty("/CostCentreP", data.d.results[0]);
              }
            }
          }.bind(this),
          error: function (e) {
            console.log("error: " + e);
          }
        });
        if (bscFlag || initiatorFlag || approverFlag) {
        }
        else {
          $.ajax({
            url: serviceURL + "/odata/v2/PerPerson('" + initiator + "')?$format=json",
            type: 'GET',
            contentType: "application/json", //first name, last name Etc.
            success: function (data) {
              oModel.setProperty("/Biographical", data);
              //    console.log("Personal Info" +that.getView().getModel("oneModel").getProperty("/personalInfo"));

            },
            error: function (e) {
              console.log("error: " + e);
            }
          });
        }

        var FormOwner, Status = 'I';

        // Including log call - Initiator name loaded here
        $.ajax({
          url: serviceURL + "/odata/v2/PerPerson('" + initiator + "')/personalInfoNav?$format=json",
          type: 'GET',
          contentType: "application/json",
          success: function (data) {
            var salutationInit = data.d.results[0].salutation;
            var firstNameInit = data.d.results[0].firstName;
            var lastNameInit = data.d.results[0].lastName;
            // salutation label
            $.ajax({
              url: serviceURL + "/odata/v2/PicklistOption(" + salutationInit + 'L' + ")/picklistLabels?$format=json",
              type: 'GET',
              contentType: "application/json",
              success: function (data) {
                var salutationLabel = data.d.results[0].label;
                var initName = {
                  salutationLabel: salutationLabel, firstNameInit: firstNameInit, lastNameInit: lastNameInit
                }
                that.InitiatorName = initName.salutationLabel + " " + initName.firstNameInit + " " + initName.lastNameInit;
                initiatorName = initName.firstNameInit + " " + initName.lastNameInit;
                if (bscFlag || initiatorFlag || approverFlag) {
                }
                else {
                  oView.byId("idInitiator").setValue(that.InitiatorName);
                  FormOwner = that.InitiatorName;
                  if (!oModel.getProperty("/disable").mode) {
                    that.s4LogCreation(Status, FormOwner); // LogCreation call
                  }
                }
              }, error: function (e) {
                console.log("Saluttation Label error: " + e);
              }
            })
          },
          error: function (e) { console.log("error: " + e); }

        });
        //property - personal Info dropdown

        this.allDropdowns(oModel, that);

        // });

      },

      clearFields: function () {

        this.getView().getModel("oneModel").setProperty("/editable", true);
        this.getView().getModel("oneModel").setProperty("/enableRate", false);
        this.getView().getModel("oneModel").setProperty("/enableUnit", false);
        this.getView().getModel("oneModel").setProperty("/enableRate1", false);
        this.getView().getModel("oneModel").setProperty("/enableUnit1", false);
        this.getView().getModel("oneModel").setProperty("/enableRate2", false);
        this.getView().getModel("oneModel").setProperty("/enableUnit2", false);
        this.getView().getModel("oneModel").setProperty("/PaymentInformationDetailV3", {});
        this.getView().getModel("oneModel").setProperty("/PaymentInformationDetailV3/accountNumber", "");
        this.getView().getModel("oneModel").setProperty("/PaymentInformationDetailV3/routingNumber", "");
        this.getView().getModel("oneModel").setProperty("/PaymentInformationDetailV3/bank", "");
        this.getView().getModel("oneModel").setProperty("/PaymentInformationDetailV3/nationality", "");
        this.getView().getModel("oneModel").setProperty("/globalInfo", {});
        this.getView().getModel("oneModel").setProperty("/globalInfo/disability", "");
        this.getView().getModel("oneModel").setProperty("/globalInfo/ethnicity", "");
        this.getView().getModel("oneModel").setProperty("/workPermit", {});
        this.getView().getModel("oneModel").setProperty("/workPermit/documentNumber", "");
        this.getView().getModel("oneModel").setProperty("/national", {});
        this.getView().getModel("oneModel").setProperty("/national/nationalId", "");
        this.getView().getModel("oneModel").setProperty("/personalInfo", {});
        this.getView().getModel("oneModel").setProperty("/personalInfo/gender", "");
        this.getView().getModel("oneModel").setProperty("/personalInfo/firstName", "");
        this.getView().getModel("oneModel").setProperty("/personalInfo/middleName", "");
        this.getView().getModel("oneModel").setProperty("/personalInfo/lastName", "");
        this.getView().getModel("oneModel").setProperty("/homeAddress", {});
        this.getView().getModel("oneModel").setProperty("/homeAddress/city", "");
        this.getView().getModel("oneModel").setProperty("/homeAddress/zipCode", "");
        this.getView().getModel("oneModel").setProperty("/homeAddress/address2", "");
        this.getView().getModel("oneModel").setProperty("/homeAddress/address1", "");

        this.getView().getModel("oneModel").setProperty("/PerEmergencyContactsPrimary", {});
        this.getView().getModel("oneModel").setProperty("/EmergencyRelation", "");
        this.getView().getModel("oneModel").setProperty("/PerEmergencyContactsPrimary/address2", "");
        this.getView().getModel("oneModel").setProperty("/PerEmergencyContactsPrimary/city", "");
        this.getView().getModel("oneModel").setProperty("/PerEmergencyContactsPrimary/zipCode", "");


        this.getView().getModel("oneModel").setProperty("/PerEmergencyContactsPrimaryRelation1", {});
        this.getView().getModel("oneModel").setProperty("/PerEmergencyContactsPrimaryRelation2", {});

        this.getView().getModel("oneModel").setProperty("/PerEmergencyContacts", {});
        this.getView().getModel("oneModel").setProperty("/PerEmergencyContacts/name", "");
        this.getView().getModel("oneModel").setProperty("/PerEmergencyContacts/Surname", "");
        this.getView().getModel("oneModel").setProperty("/PerEmergencyContacts/phone", "");
        this.getView().getModel("oneModel").setProperty("/PerEmergencyContacts1", {});
        this.getView().getModel("oneModel").setProperty("/PerEmergencyContacts1/name", "");
        this.getView().getModel("oneModel").setProperty("/PerEmergencyContacts1/Surname", "");
        this.getView().getModel("oneModel").setProperty("/PerEmergencyContacts1/phone", "");


        this.getView().getModel("oneModel").setProperty("/PerEmergencyContactsSecond", {});
        this.getView().getModel("oneModel").setProperty("/EmergencyRelation1", "");
        this.getView().getModel("oneModel").setProperty("/PerEmergencyContactsSecond/address2", "");
        this.getView().getModel("oneModel").setProperty("/PerEmergencyContactsSecond/zipCode", "");
        this.getView().getModel("oneModel").setProperty("/PerEmergencyContactsSecond/city", "");

        this.getView().getModel("oneModel").setProperty("/jobInfo", {});
        this.getView().getModel("oneModel").setProperty("/jobInfo/customString6", "");

      },

      triggeringOemployeeSelecting: function () {
        var that = this;
        var oModel = that.getView().getModel("oneModel");
        var oView = that.getView();
        this.clearFields();
        oModel.setProperty("/fieldCodes", {});
        this.getView().byId("idempCame1").setVisible(true);
        this.getView().byId("empCame").setVisible(true);

        this.getView().byId("idempCame").setVisible(false);
        this.getView().byId("empCame3").setVisible(false);
        if (pernr) {
          //https://api55preview.sapsf.eu/odata/v2/PerNationalId?$filter=personIdExternal eq '10200048'
          $.ajax({
            url: serviceURL + "/odata/v2/PerNationalId?$filter=personIdExternal eq '" + pernr + "'&$format=json",
            type: 'GET',
            contentType: "application/json", //job Info
            success: function (data) {
              if (data.d.results[0]) {
                oModel.setProperty("/national", data.d.results[0]);
                nationalid = data.d.results[0].nationalId;
                // if (empTermination != "" && payGroup == "G4" && nationalid != "" && bscFlag) {
                //   oView.byId("_IDGenPanel451").setVisible(true);
                // }
                // oView.byId("Nationality1").setSelectedKey(data.d.results[0].externalCode);
              }

            },
            error: function (e) {
              console.log("JobInfo service error: " + e);
            }
          });
          var tableArray = [];
          $.ajax(
            {
              url: serviceURL + "/odata/v2/EmpEmployment?$filter=personIdExternal eq '" + pernr + "' &$format=json",
              type: 'GET',
              contentType: "application/json",
              success: function (data) {
                console.log("success" + data);
                var assignUserId = data;
                var lenData = data.d.results.length
                if (data.d.results[0].originalStartDate != "") {
                  var reqServDate = this.requiredDate(data.d.results[0].originalStartDate);
                  this.getView().byId("contStartDate1").setDateValue(new Date(reqServDate));
                }
                if (data.d.results[0].startDate != "") {
                  var reqServDate = this.requiredDate(data.d.results[0].startDate);
                  this.getView().byId("issuDate1").setDateValue(new Date(reqServDate));
                }
                if (data.d.results[0].prevEmployeeId != null) {
                  var prevEmp = data.d.results[0].prevEmployeeId;
                  $.ajax({
                    url: serviceURL + "/odata/v2/cust_PersonnelArea?$format=json&$filter=externalCode eq '" + prevEmp + "'",
                    type: 'GET',
                    contentType: "application/json", //job Info
                    success: function (data) {
                      if (data.d.results[0]) {
                        oView.byId("_IDGenInput10").setValue(data.d.results[0].externalName + " (" + data.d.results[0].externalCode + ")");
                      }
                    }.bind(this),
                    error: function (e) {
                      console.log("Work Permit service error: " + e);
                    }
                  });
                }
                for (let i = 0; i < lenData; i++) {
                  var userId = assignUserId.d.results[i].userId;
                  $.ajax({
                    url: serviceURL + "/odata/v2/EmpEmployment(personIdExternal='" + pernr + "',userId='" + userId + "')/jobInfoNav?$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                      console.log("success" + data);
                      if (data.d.results.length > 0) {

                        var posNo = data.d.results[0].customString1; //positionHeld
                        var eventReason = data.d.results[0].eventReason;
                        var endDate = data.d.results[0].endDate
                        var assignmentIdExternal = assignUserId.d.results[i].assignmentIdExternal; //personnel number

                        var storeArray = {
                          personIdExternal: assignmentIdExternal,
                          positionHeld: posNo,
                          endDate: endDate,
                          eventReason: eventReason
                        }

                        tableArray.push(storeArray);
                        tableArray.sort((a, b) => {
                          if (a.personIdExternal < b.personIdExternal) return -1;
                          if (a.personIdExternal > b.personIdExternal) return 1;
                        });

                        // making property finalData to bind data in table
                        oModel.setProperty("/EmpCameFrom", tableArray);
                      }

                    },
                    error: function (e) { console.log("error: " + e); }
                  });
                } // for loop end

              }.bind(this),
            });



          // $.ajax(
          //   {
          //     //https://api55preview.sapsf.eu/odata/v2/EmpEmploymentTermination?$filter=personIdExternal eq '10200048' 
          //     url: serviceURL + "/odata/v2/EmpEmploymentTermination?$filter=personIdExternal eq '10200048'&$format=json",
          //     type: 'GET', contentType: "application/json", //job Info 
          //     success: function (data) {
          //       if (data.d.results[0]) {
          //         oModel.setProperty("/empTermination", data.d.results[0]);
          //         empTermination = data.d.results[0];

          //       }
          //     }, error: function (e) {
          //       console.log("JobInfo service error: " + e);
          //     }
          //   });

          $.ajax({
            url: serviceURL + "/odata/v2/EmpEmployment(personIdExternal='" + pernr + "',userId='" + pernr + "' )/jobInfoNav?$format=json",
            type: 'GET',
            contentType: "application/json", //job Info
            success: function (data) {
              if (data.d.results[0]) {
                oModel.setProperty("/jobInfo", data.d.results[0]);
                if (data.d.results[0].payGroup != null && data.d.results[0].payGroup == "G4") {
                  // payGroup = "G4";
                  if (empTermination != "" && payGroup == "G4" && nationalid != "" && bscFlag) {
                    oView.byId("_IDGenPanel451").setVisible(true);
                  }
                }
              }

            },
            error: function (e) {
              console.log("JobInfo service error: " + e);
            }
          });

          // Work Permit Code 
          $.ajax({
            url: serviceURL + "/odata/v2/EmpEmployment(personIdExternal='" + pernr + "',userId='" + pernr + "' )/empWorkPermitNav?$format=json",
            type: 'GET',
            contentType: "application/json", //job Info
            success: function (data) {
              if (data.d.results[0]) {
                oModel.setProperty("/workPermit", data.d.results[0]);
                var reqServDate = that.requiredDate(data.d.results[0].issueDate);
                oView.byId("ClearDate1").setDateValue(new Date(reqServDate));
              }
            },
            error: function (e) {
              console.log("Work Permit service error: " + e);
            }
          });

          // salutation label

          $.ajax({
            url: serviceURL + "/odata/v2/PerPerson('" + pernr + "')/personalInfoNav?$format=json",
            type: 'GET', contentType: "application/json",
            success: function (data) {
              if (data) {
                oModel.setProperty("/personalInfo", data.d.results[0]);
                oView.byId("Gender1").setSelectedKey(data.d.results[0].gender);
                oView.byId("Nationality1").setSelectedKey(data.d.results[0].nationality);

                var salutation = data.d.results[0].salutation;
                oView.byId("titleB1").setSelectedKey(salutation);
                $.ajax({
                  url: serviceURL + "/odata/v2/PicklistOption(" + salutation + 'L' + ")/picklistLabels?$format=json",
                  type: 'GET',
                  contentType: "application/json",
                  success: function (data) {
                    oModel.setProperty("/salutation", data);
                    oModel.setProperty("/salutaionP", data);
                    if (data.d.results[0] && data.d.results[0].label) {
                      oView.byId("titleB1").setValue(data.d.results[0].label);
                    }
                  }, error: function (e) {
                    console.log("error: " + e);
                  }
                })
              }
            }, error: function (e) {
              console.log("error: " + e);
            }
          })
          //--------------date-time-------------

          // Global Information 
          $.ajax({
            url: serviceURL + "/odata/v2/PerGlobalInfoGBR?$format=json &$filter=personIdExternal eq '" + pernr + "'",
            type: 'GET',
            contentType: "application/json",
            success: function (data) {
              oModel.setProperty("/globalInfo", {});
              if (data.d.results[0].genericString1) {
                oView.byId("Ethicity1").setSelectedKey(data.d.results[0].genericString1)
                $.ajax({
                  url: serviceURL + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'rcmUKEthnicGroup' and status eq 'A' and optionId eq '" + data.d.results[0].genericString1 + "' &$format=json",
                  type: 'GET',
                  contentType: "application/json",
                  success: function (data) {
                    oModel.setProperty("/globalInfo/ethnicity", data.d.results[0].label_en_GB);
                  }, error: function (e) {
                    console.log("error: " + e);
                  }
                })
              }
              if (data.d.results[0].genericString3) {
                oView.byId("Disability1").setSelectedKey(data.d.results[0].genericString3)
                $.ajax({
                  url: serviceURL + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'GCC_DisabilityType' and status eq 'A' and optionId eq '" + data.d.results[0].genericString3 + "' &$format=json",
                  type: 'GET',
                  contentType: "application/json",
                  success: function (data) {
                    oModel.setProperty("/globalInfo/disability", data.d.results[0].label_en_GB);
                  }, error: function (e) {
                    console.log("error: " + e);
                  }
                })
              }
            }, error: function (e) {
              console.log("error: " + e);
            }
          })
          // url with specific personal id to fetch records

          // var url = serviceURL + "/odata/v2/PaymentInformationV3?$filter=worker eq '" + pernr + "'&$format=json";
          //gets date

          // $.ajax({
          //   url: url,
          //   type: 'GET',
          //   contentType: "application/json",
          //   success: function (data) {
          //     if (data && data.d.results[0] && data.d.results[0].effectiveStartDate) {//getting the date from model
          //----------------------date conversion end--------------------------//
          var url1 = serviceURL + "/odata/v2/PaymentInformationDetailV3?$filter=PaymentInformationV3_worker eq '" + pernr + "'&$format=json"
          // Third Property - Payment Information
          $.ajax({
            url: url1,
            type: 'GET',
            contentType: "application/json",
            success: function (data) {
              if (data.d.results[0].length != 0) {
                oModel.setProperty("/PaymentInformationDetailV3", data.d.results[0]);
                $.ajax({
                  url: serviceURL + "/odata/v2" + data.d.results[0].bankNav.__deferred.uri.split("/odata/v2")[1] + "?$format=json",
                  type: 'GET',
                  contentType: "application/json",
                  success: function (data) {
                    oModel.setProperty("/bankName", data.d)
                  },
                  error: function (e) { console.log("error: " + e); }
                })
              }
            },
            error: function (e) { console.log("error: " + e); }
          }) //payment ajax call end-----------------------
          // }
          //   }, error: function (e) { console.log("error: " + e); }

          // });

          //Date of Birth
          $.ajax({
            url: serviceURL + "/odata/v2/PerPerson('" + pernr + "')?$format=json",
            type: 'GET',
            contentType: "application/json",
            success: function (data) {
              if (data.d) {
                oView.byId("Dob11").setDateValue(new Date(that.dateConverter(data.d.dateOfBirth)))
              }
            },
            error: function (e) {
              console.log("error: " + e);
            }
          })

          //-----------------date-time----------------------end ajax call
          // Fourth Property - Home address

          $.ajax({
            url: serviceURL + "/odata/v2/PerPerson('" + pernr + "')/homeAddressNavDEFLT?$format=json",
            type: 'GET',
            contentType: "application/json",
            success: function (data) {
              oModel.setProperty("/homeAddress", data.d.results[0]);
              //this.getView().byId("Title").setSelectedItem().setText(oData.Title),
              if (data.d.results[0].state != null) {
                $.ajax({
                  url: serviceURL + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'COUNTY_GCC' and status eq 'A' and optionId eq '" + data.d.results[0].state + "' &$format=json",
                  type: 'GET',
                  contentType: "application/json",
                  success: function (data) {
                    oView.byId("country1").setValue(data.d.results[0].label_defaultValue);
                    oView.byId("country1").setSelectedKey(data.d.results[0].optionId);
                  },
                  error: function (e) {
                    console.log("error: " + e);
                  }
                })
              }
            },
            error: function (e) {
              console.log("error: " + e);

            }

          })
          // Fifth Property - Phone Info

          $.ajax({

            url: serviceURL + "/odata/v2/PerPerson('" + pernr + "')/phoneNav?$format=json",
            type: 'GET',
            contentType: "application/json",
            success: function (data) {
              var phoneData = data;
              for (let i = 0; i < data.d.results.length; i++) {
                var phoneType = data.d.results[i].phoneType;
                $.ajax({
                  url: serviceURL + "/odata/v2/PerPhone(personIdExternal='" + pernr + "',phoneType='" + phoneType + "')/phoneTypeNav?$format=json",
                  type: 'GET',
                  contentType: "application/json",
                  success: function (data) {
                    if (data.d.externalCode == "P") {
                      oModel.setProperty("/phoneP", phoneData.d.results[i].phoneNumber);
                    }
                    else if (data.d.externalCode == "B") {
                      oModel.setProperty("/phoneB", phoneData.d.results[i].phoneNumber);
                    }
                  }, error: function (e) { console.log("error: " + e); }
                })
              }
            },
            error: function (e) {
              console.log("error: " + e);

            }

          })

          // sixth Property - Email Info

          $.ajax({
            url: serviceURL + "/odata/v2/PerPerson('" + pernr + "')/emailNav?$format=json",
            type: 'GET',
            contentType: "application/json",
            success: function (data) {
              var emailData = data;
              for (let i = 0; i < data.d.results.length; i++) {
                var emailType = data.d.results[i].emailType;
                $.ajax({
                  url: serviceURL + "/odata/v2/PerEmail(emailType='" + emailType + "',personIdExternal='" + pernr + "')/emailTypeNav?$format=json",
                  type: 'GET',
                  contentType: "application/json",
                  success: function (data) {
                    if (data) {
                      if (data.d.externalCode == "P") {
                        oModel.setProperty("/email", emailData.d.results[i].emailAddress);
                      }
                    }
                  },
                  error: function (e) { console.log("error: " + e); }
                })
              }
            },
            error: function (e) { console.log("error: " + e); }

          })



          // Seventh Property - Emergency Contact

          $.ajax({

            url: serviceURL + "/odata/v2/PerPerson('" + pernr + "')/emergencyContactNav?$format=json",
            type: 'GET',
            contentType: "application/json",
            success: function (data) {
              if (data && data.d.results[0]) {
                oModel.setProperty("/PerEmergencyContacts", data.d.results[0]);
                $.ajax({
                  url: serviceURL + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'relation' and status eq 'A' and optionId eq '" + data.d.results[0].relationship + "'&$format=json",
                  type: 'GET',
                  contentType: "application/json",
                  success: function (data) {
                    oModel.setProperty("EmergencyRelation", data.d.results[0].label_en_GB)
                    oView.byId("addEmergencyContact1").setSelected(true);
                    oView.byId("addEmergencyContact1").setEnabled(false);
                    oView.byId("idAddEmergency").setVisible(true);
                    that.getView().byId("_IDGenInput17").setSelectedKey(data.d.results[0].optionId)
                  }, error: function (e) { console.log("error: " + e); }
                })
              }
              else {
                oView.byId("addEmergencyContact1").setSelected(false);
                oView.byId("addEmergencyContact1").setEnabled(false);
                oView.byId("idAddEmergency").setVisible(false);
              }
              if (data.d.results[1]) {
                oModel.setProperty("/PerEmergencyContacts1", data.d.results[1]);
                $.ajax({
                  url: serviceURL + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'relation' and status eq 'A' and optionId eq '" + data.d.results[1].relationship + "'&$format=json",
                  type: 'GET',
                  contentType: "application/json",
                  success: function (data) {
                    oModel.setProperty("EmergencyRelation1", data.d.results[0].label_en_GB)
                    oView.byId("_IDGenCheckBox2").setSelected(true);
                    oView.byId("_IDGenCheckBox2").setEnabled(false);
                    oView.byId("idSecondEmergency").setVisible(true);
                    that.getView().byId("_IDGenInput172").setSelectedKey(data.d.results[0].optionId)
                  }, error: function (e) { console.log("error: " + e); }

                })
              }
              else {
                oView.byId("_IDGenCheckBox2").setSelected(false);
                oView.byId("_IDGenCheckBox2").setEnabled(false);
                oView.byId("idSecondEmergency").setVisible(false);
              }
              var emergencyData = data;
              for (let i = 0; i < data.d.results.length; i++) {
                var eName = data.d.results[i].name;
                var eRelation = data.d.results[i].relationship;
                // emergency address ajax call

                $.ajax({
                  url: serviceURL + "/odata/v2/PerEmergencyContacts(name='" + eName + "',personIdExternal='" + pernr + "',relationship='" + eRelation + "')/addressNavDEFLT?$format=json",
                  type: 'GET',
                  contentType: "application/json",
                  success: function (data) {
                    if (data) {
                      if (emergencyData.d.results[i].primaryFlag == "Y") {
                        oModel.setProperty("/PerEmergencyContactsPrimary", data.d);
                        if (data.d.state) {
                          oView.byId("_IDGenItem6").setSelectedKey(data.d.state);
                          $.ajax({
                            url: serviceURL + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'COUNTY_GCC' and status eq 'A' and optionId eq '" + data.d.state + "'&$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                              oView.byId("_IDGenItem6").setValue(data.d.results[0].label_en_GB);
                              // oModel.setProperty("/FirstEmergencyCounty", )
                            }, error: function (e) { console.log("error: " + e); }

                          })
                        }
                        console.log("Emergency contacts 1 success"); console.log(data);
                      } if (emergencyData.d.results[i].primaryFlag == "N") {
                        oView.byId("_IDGenHBox1222212").setVisible(true);
                        oView.byId("_IDGenCheckBox2").setVisible(true);
                        oView.byId("_IDGenTfitle12").setVisible(true);
                        oModel.setProperty("/PerEmergencyContactsSecond", data.d);
                        if (data.d.state) {
                          oView.byId("idree4d2").setSelectedKey(data.d.state);
                          $.ajax({
                            url: serviceURL + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'COUNTY_GCC' and status eq 'A' and optionId eq '" + data.d.state + "'&$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                              oView.byId("idree4d2").setValue(data.d.results[0].label_en_GB);
                            }, error: function (e) { console.log("error: " + e); }

                          })
                        }
                        console.log("Emergency contacts 2 success"); console.log(data);
                      }
                    }
                  }, error: function (e) { console.log("error: " + e); }

                })

                // relationship label ajax call

                $.ajax({
                  url: serviceURL + "/odata/v2/PicklistOption(" + eRelation + 'L' + ")/picklistLabels?$format=json",
                  type: 'GET',
                  contentType: "application/json",
                  success: function (data) {
                    if (data) {
                      if (emergencyData.d.results[i].primaryFlag == "Y") {
                        oModel.setProperty("/PerEmergencyContactsPrimaryRelation1", data.d.results[0]);
                        oView.byId("_IDGenInput17").setSelectedKey(data.d.results[0].optionId);
                      } if (emergencyData.d.results[i].primaryFlag == "N") {
                        oModel.setProperty("/PerEmergencyContactsPrimaryRelation2", data.d.results[0]);
                        oView.byId("_IDGenInput172").setSelectedKey(data.d.results[0].optionId);
                      }
                    }
                  }, error: function (e) { console.log("error: " + e); }
                })

              }
            }, error: function (e) { console.log("error: " + e); }

          })

        }



      },

      requiredDate: function (date) {
        const regex = /\/Date\((.*?)\)\//;
        const match = regex.exec(date);
        var epochDate = match[1];
        //converting str to int
        var newDate = parseInt(epochDate, 10);
        //converting epoch to human readable
        const date1 = new Date(newDate);
        var year = date1.getUTCFullYear();
        var month = date1.getUTCMonth() + 1;
        var day = date1.getUTCDate();
        var hours = date1.getUTCHours();
        var minutes = date1.getUTCMinutes();
        var seconds = date1.getUTCSeconds();
        // validation to convert into right format
        if (month < 10) {
          month = (date1.getUTCMonth() + 1).toString().padStart(2, '0');
        }
        if (day < 10) {
          day = date1.getUTCDate().toString().padStart(2, '0');
        }
        if (hours < 10) {
          hours = date1.getUTCHours().toString().padStart(2, '0');
        }
        if (minutes < 10) {
          minutes = date1.getUTCMinutes().toString().padStart(2, '0');
        }
        if (seconds < 10) {
          seconds = date1.getUTCSeconds().toString().padStart(2, '0');
        }
        // getting the date
        var reqDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
        return reqDate;
      },

      oEmployeeSelect: function () {

        var oValue = this.getView().byId("_IDGenComboBox41").getSelectedItem();

        //var oValue = oEvent.getSource().getSelectedItem().getText();

        if (oValue) {
          this.getView().byId("empCame").setVisible(true);
          this.getView().byId("idempCame").setVisible(true);
          this.getView().byId("_IDGenLabel621").setVisible(true);
          this.getView().byId("_IDGenInput10").setVisible(true);
          this.getView().byId("_IDGenLabel6421").setVisible(true);
          this.getView().byId("_IDGenComboBox411").setVisible(true);
          this.getView().byId("_IDGenLabel6411").setVisible(true);
          this.getView().byId("_IDGenInput11").setVisible(true);
          this.getView().byId("_IDGenLabel611").setVisible(true);
          this.getView().byId("_IDGenInput112").setVisible(true);

          this.getView().byId("DatePicker01").setEditable(false);
          this.getView().byId("Dob11").setEditable(false);

          this.getView().byId("Nationality1").setEditable(false);
          this.getView().byId("Disability1").setEditable(false);
          this.getView().byId("DBS1").setEditable(false);
          this.getView().byId("TeachRegNum1").setEditable(false);
          this.getView().byId("BankSort1").setEditable(false);
          this.getView().byId("BankAccNum1").setEditable(false);


          this.getView().byId("nationalIns1").setEditable(false);
          this.getView().byId("Ethicity1").setEditable(false);
          this.getView().byId("Gender1").setEditable(false);
          this.getView().byId("ClearDate1").setEditable(false);
          this.getView().byId("ClearDate1").setEditable(false);
          this.getView().byId("issuDate1").setEditable(false);
          this.getView().byId("issuDate1").setEditable(false);
          // this.getView().byId("BankName1").setEnabled(false);
          this.getView().byId("BuildingSoc1").setEditable(false);
          this.getView().byId("_IDGefnInput11").setEditable(false);
          this.getView().byId("_IDGefnInput12").setEditable(false);
          //this.getView().byId("_IDGenfInput13").setEnabled(false);
          this.getView().byId("_IDGefnInput14").setEditable(false);
          this.getView().byId("_IDGenItem6").setEditable(false);


          //First Emergency 

          this.getView().byId("idree4d2").setEditable(false);
          this.getView().byId("_IDGenItem6").setEditable(false);
          // this.getView().byId("emergency1County").setEditable(false);
          this.getView().byId("_IDGenInput15").setEditable(false);
          this.getView().byId("_IDGenInput16").setEditable(false);
          this.getView().byId("_IDGenInput16s").setEditable(false);
          this.getView().byId("_IDGenInput17").setEditable(false);
          this.getView().byId("_IDGenInput18").setEditable(false);
          // this.getView().byId("_IDGenInput19").setEditable(false);


          this.getView().byId("_IDGefnInput122").setEditable(false);
          this.getView().byId("_IDGefnInput112").setEditable(false);
          //this.getView().byId("_IDGenfInput132").setEnabled(false);
          this.getView().byId("_IDGefnInput142").setEditable(false);
          // this.getView().byId("idCountry2").setEnabled(false);
          this.getView().byId("_IDGenInput152").setEditable(false);
          this.getView().byId("_IDGenInput162").setEditable(false);
          this.getView().byId("_IDGenInput162s").setEditable(false);

          this.getView().byId("_IDGenInput172").setEditable(false);
          this.getView().byId("_IDGenInput182").setEditable(false);
          // this.getView().byId("_IDGenInput192").setEditable(false);


          const myArray = oValue.getText().split(" ", 4);
          var firstName = myArray[0];
          var lastName = myArray[1];
          userId = myArray[2];
          pernr = oValue.getKey();
          if (pernr) {
            this.triggeringOemployeeSelecting();
          }
          var salutation = myArray[3];
          var sectionDArr = { salutation: salutation, firstName: firstName, lastName: lastName, pernr: pernr };

        }


      },

      dateConverter: function (date1) {
        if (date1) {
          var timestamp = parseInt(date1.match(/\d+/)[0], 10);
          var date = new Date(timestamp);

          var options = { year: 'numeric', month: 'short', day: '2-digit' };
          var formattedDate = date.toLocaleDateString('en-US', options);

          return formattedDate;
        } return "";
      },

      checkSectionD: function (oData) {
        var terminated, retired, suspended, discarded;
        $.ajax({
          url: serviceURL + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'employee-status' and status eq 'A'&$format=json",
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
            var todayDate = new Date().toISOString().split("T")[0].split("-");
            var afterSevenDays = new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split("T")[0].split("-");
            $.ajax({
              url: serviceURL + "/odata/v2/EmpEmployment(personIdExternal='" + oData.SelEmpCode + "', userId='" + oData.userID + "')/jobInfoNav?$format=json&fromDate=" + todayDate[0] + "-" + todayDate[2] + "-" + todayDate[1] + "&toDate=" + afterSevenDays[0] + "-" + afterSevenDays[2] + "-" + afterSevenDays[1] + "",
              type: 'GET',
              contentType: "application/json", //job Info
              success: function (data) {
                for (let j = 0; j < data.d.results.length; j++) {
                  if (data.d.results[j].payGroup == "G4" && oData.InsuranceNo && (data.d.results[j].emplStatus == discarded || data.d.results[j].emplStatus == terminated || data.d.results[j].emplStatus == retired || data.d.results[j].emplStatus == suspended)) {
                    this.getView().byId("_IDGenPanel451").setVisible(true);
                    this.getView().byId("idPersonalNum").setValue(oData.SelEmpCode);
                    this.getView().byId("idLEASCHOOL").setValue(oData.Organization);
                    this.getView().getModel("oneModel").setProperty("/SecDTerminData", { seqNumber: data.d.results[j].seqNumber, startDate: this.requiredDate(data.d.results[j].startDate) })
                  }
                }
              }.bind(this),
              error: function (e) {
                console.log("JobInfo service error: " + e);
              }
            });

            $.ajax({
              url: serviceURL + "/odata/v2/EmpEmployment(personIdExternal='" + oData.SelEmpCode + "', userId='" + oData.userID + "')?$format=json",
              type: 'GET',
              contentType: "application/json", //job Info
              success: function (data) {
                this.getView().byId("idPA20").setDateValue(new Date(this.dateConverter(data.d.endDate)));
              }.bind(this),
              error: function (e) {
                console.log("JobInfo service error: " + e);
              }
            });
          }.bind(this),
          error: function (e) {
            console.log(`No Employee Found for ${empl.d.results[0].personIdExternal}`);
          }
        });
      },

      //Reading data from backend using form id
      readFormidData: function (formId1, useremail) {
        // /sap/opu/odata/sap/ZSFGTGW_NS01_SRV/ZSFGT_NS01Set(Formid='0000002450')
        this.getOwnerComponent().getModel("ZSFGTGW_NS01_SRV").read("/ZSFGT_NS01Set(Formid='" + formId1 + "')", {
          success: function (oData) {
            this.getView().getModel("oneModel").setProperty("/oDataCall", oData);

            this.getView().byId("_IDGenInput2").setValue(oData.Formid);
            this.getView().byId("idInitiator").setValue(oData.Initiator);
            // "Zdate": "" , //"Tue Dec 19 2023",
            this.getView().byId("DatePicker01").setDateValue(new Date(oData.Zdate));
            this.getView().byId("_IDGenInput4").setValue(oData.Organization);
            var oModel = this.getView().getModel("oneModel");
            var that = this;
            oModel.setProperty("/CostCentreP", { costCenter: oData.CostCenter });
            this.getView().byId("_IDGen1Inpu1t4").setValue(oData.CostCenter);
            //"CostCenterCode":"" , //"CC01",
            this.getView().byId("approver").setValue(oData.Approver);
            approverCode = oData.ApproverCode;
            userId = oData.userID
            companyCode = oData.CompanyCode;
            emplSubGroup = oData.EmpSubGrpCode;
            payGroup = oData.Paygroup;
            initiator = oData.CostCenterCode;
            this.allDropdowns(oModel, that);
            this.SFservice();
            if (oData.EmployeedOrganization == "N") {
              this.getView().byId("_IDGenPanel4").setHeaderText("Section B – New Employee Details");
              this.getView().byId("_IDGenComboBox1").setSelectedKey(oData.EmployeedOrganization);
              this.getView().byId("idempCame").setVisible(false);
              this.getView().byId("empCame3").setVisible(false);
              this.getView().byId("empCame").setVisible(true);
              this.getView().byId("idempCame1").setVisible(true);
            } else {
              this.getView().byId("_IDGenPanel4").setHeaderText("Section B - Multi Employee Details");
              this.checkSectionD(oData);
              this.getView().byId("_IDGenComboBox41").setSelectedKey(oData.SelEmpCode); // "4789",
              this.getView().byId("_IDGenComboBox41").setValue(oData.SelectEmployee); // "4789",
              this.getView().byId("_IDGenLabel64").setVisible(true);
              this.getView().byId("_IDGenComboBox41").setVisible(true);
              this.getView().byId("_IDGenComboBox1").setSelectedKey(oData.EmployeedOrganization);
              this.getView().byId("idempCame").setVisible(true);
              this.getView().byId("empCame3").setVisible(true);
              this.getView().byId("empCame").setVisible(false);
              this.getView().byId("idempCame1").setVisible(false);
            }
            this.getView().byId("idempCame").setSelectedKey(oData.NewEmployee);  //  "GCC Council",
            this.getView().byId("idempCame").setValue(oData.NewEmployeeText);  //  "GCC Council",
            this.getView().byId("_IDGenInput10").setValue(oData.PreviousEmp);  // "Teacher",
            this.getView().byId("_IDGenComboBox411").setValue(oData.OrgContType); //"Cont Type",
            this.getView().byId("_IDGenComboBox411").setSelectedKey(oData.OrgContTypeCode);  // "Cont Type",
            this.getView().byId("_IDGenInput11").setValue(oData.PositionTitle);  // "Teacher",
            this.getView().byId("_IDGenInput112").setValue(oData.PosCostCentre); //  "00000107622 Down Ampney Church of England ",
            this.getView().byId("_IDGenInput112").setValue(oData.PosCcenterCode);  //  "107622",
            if (oData.ConfirmedButton == "X" && !approverFlag && !bscFlag) {
              var oView = this.getView();
              oView.byId("_IDGenButton122").setText("Confirmed");
              oView.byId("_IDGenButton122").setEnabled(false);
              oView.byId("_IDGenPanel4dh51").setVisible(true);
              oView.byId("_IDGenComboBox1").setEditable(false);
              oView.byId("_IDGenComboBox41").setEditable(false);
              oView.byId("idempCame").setEditable(false);
              oView.byId("_IDGenInput10").setEditable(false);
              oView.byId("_IDGenComboBox411").setEditable(false);
              oView.byId("_IDGenInput11").setEditable(false);
              oView.byId("_IDGenInput112").setEditable(false);
              oView.byId("country1").setEditable(true);
              oView.byId("empCame").setVisible(true);
              oView.byId("idempCame").setVisible(true);
              oView.byId("_IDGenLabel621").setVisible(true);
              oView.byId("_IDGenInput10").setVisible(true);
              oView.byId("_IDGenLabel6421").setVisible(true);
              oView.byId("_IDGenComboBox411").setVisible(true);
              oView.byId("_IDGenLabel6411").setVisible(true);
              oView.byId("_IDGenInput11").setVisible(true);
              oView.byId("_IDGenLabel611").setVisible(true);
              oView.byId("_IDGenInput112").setVisible(true);
              oView.byId("_IDGenPanel45").setVisible(true);
              oView.byId("_IDGenPanel4").setVisible(true);
            }
            oData.ConfirmedButton == "X" ? this.getView().byId("_IDGenButton122").setText("Confirmed") : this.getView().byId("_IDGenButton122").setText("Confirm Employee Details"),

              this.getView().byId("titleB1").setValue(oData.Title);  //"Mr.",
            this.getView().byId("titleB1").setSelectedKey(oData.TitleCode);// "1100",
            this.getView().byId("foreName1").setValue(oData.Forename);  // "Sandeep",
            this.getView().byId("middelname1").setValue(oData.Middlename);  // "Singh",
            this.getView().byId("surname1").setValue(oData.Surname); // // "Singh",
            this.getView().byId("contStartDate1").setDateValue(new Date(oData.SerStartDate)); // // "19.12.2023",
            this.getView().byId("streetHouseNo1").setValue(oData.Houseno); // // "House No",
            this.getView().byId("2ndadd1").setValue(oData.SecAddress); //  //"Second Address",
            // "District":this.getView().byId("_IDGenInput112").getValue() // "District",
            this.getView().byId("city1").setValue(oData.City); // // "City",
            this.getView().byId("country1").setValue(oData.County); //  // "County",
            this.getView().byId("country1").setSelectedKey(oData.CountyCode); // // "CountyCode",
            this.getView().byId("postcode1").setValue(oData.Postcode); // // "201301",
            this.getView().byId("homeTelephone1").setValue(oData.TelNo); // //"9911535981",
            this.getView().byId("mobileTelephone1").setValue(oData.MobNo); //// "9911535981",
            this.getView().byId("emailAdd1").setValue(oData.EmailAdd); // // "abc@abc.com",
            // "TelType"=  "B";
            //   "TelFlag": "X";
            //  "MobType": "P";
            //   "MobFlag": "X";
            //  "EmailType": "EmailType";
            if (oData.EmergencyAdd == "X") {
              this.getView().byId("_IDGefnInput11").setValue(oData.StreetAdd), //"Street1",
                this.getView().byId("_IDGefnInput12").setValue(oData.AddLine)  //"Address1",
              // "DistrictF": this.getView().byId("_IDGefnInput14").getValue() //"District1",
              this.getView().byId("_IDGefnInput14").setValue(oData.CityF)  //"City1",
              this.getView().byId("_IDGenItem6").setValue(oData.CountyF)  // "County1",
              this.getView().byId("_IDGenItem6").setSelectedKey(oData.CountyCodeF)  //"County1Code",
              this.getView().byId("_IDGenInput15").setValue(oData.PostCodeF)  //"201301",

              this.getView().byId("_IDGenInput16").setValue(oData.NameF)
              this.getView().byId("_IDGenInput16s").setValue(oData.NameF)  //"Name1",
              //"SurnameF":"", //this.getView().byId("").getValue() 
              this.getView().byId("_IDGenInput17").setValue(oData.RelationF) //"Son",
              this.getView().byId("_IDGenInput17").setSelectedKey(oData.RelationFCode)  //"Son",
              this.getView().byId("_IDGenInput18").setValue(oData.HomTelNoF) //"123441",
              // this.getView().byId("_IDGenInput19").setValue(oData.MobileNoF) //"412322",
              this.getView().byId("addEmergencyContact1").setSelected(true);
              this.getView().byId("idAddEmergency").setVisible(true);
            }
            this.getView().byId("Dob11").setDateValue(new Date(oData.Dob));  //"20.09.1999",
            this.getView().byId("nationalIns1").setValue(oData.InsuranceNo)  //"Insurance No",
            this.getView().byId("Nationality1").setValue(oData.Nationality); //"Indian",
            this.getView().byId("Nationality1").setSelectedKey(oData.NatCode); //"IN",
            this.getView().byId("Disability1").setValue(oData.Disability)  // "No",
            this.getView().byId("Disability1").setSelectedKey(oData.DisabilityCode);  // "No",
            this.getView().byId("Ethicity1").setValue(oData.Ethicity)  //"Ethicity",
            this.getView().byId("Ethicity1").setSelectedKey(oData.EthnicityCode)  // "Ethicity",
            this.getView().byId("Gender1").setValue(oData.Gender) //"Male",
            this.getView().byId("Gender1").setSelectedKey(oData.GenderCode)  // "M",
            this.getView().byId("DBS1").setValue(oData.DbsNo)  //"123",
            this.getView().byId("TeachRegNum1").setValue(oData.RegNo)  //"321",
            this.getView().byId("ClearDate1").setDateValue(new Date(oData.ClearanceDate))  //"19.12.2023",
            this.getView().byId("issuDate1").setDateValue(new Date(oData.IssueDate))  //"19.12.2023",
            this.getView().byId("BankSort1").setValue(oData.BankSortCode)  //"1234567",
            this.getView().byId("BankName1").setValue(oData.BankName)  //"ABC Bank",
            this.getView().byId("BankAccNum1").setValue(oData.BankAccNo)  //"12321312",
            this.getView().byId("BuildingSoc1").setValue(oData.BuildSocRefNo)  //"RefNo123",
            //   "MobileNo2F":"",
            //  "PhnTypeF": "X",
            //   "PhnFlagF": "X",
            //   "MobTypeF": "X",
            //   "MobFlagF": "X",

            if (oData.SecondEmergencycontact == "X") {
              this.getView().byId("_IDGefnInput112").setValue(oData.StreetAddSec); // "Street2",
              this.getView().byId("_IDGefnInput122").setValue(oData.AddLineSec); //"Address 2",
              // "DistrictSec": this.getView().byId("").getValue()
              this.getView().byId("_IDGefnInput142").setValue(oData.CitySec);  //"County 2",
              this.getView().byId("idree4d2").setValue(oData.CountySec);  // "City 2",
              this.getView().byId("idree4d2").setSelectedKey(oData.CountyCodeSec);  //"CountyCode2",
              this.getView().byId("_IDGenInput152").setValue(oData.PostCodeSec);  // "201301",
              this.getView().byId("_IDGenInput162").setValue(oData.NameSec); // "Name 2",
              this.getView().byId("_IDGenInput162s").setValue(oData.NameSec);  // "Surname 2",
              this.getView().byId("_IDGenInput172").setValue(oData.RelationSec);  // "Son",
              this.getView().byId("_IDGenInput172").setSelectedKey(oData.RelCodeSec); //"Son",
              this.getView().byId("_IDGenInput182").setValue(oData.HomTelNoSec);  // "12321312",
              // this.getView().byId("_IDGenInput192").setValue(oData.MobileNoSec);// "132312",
              this.getView().byId("_IDGenCheckBox2").setSelected(true);
              this.getView().byId("idSecondEmergency").setVisible(true);
            }

            // "PhnTypeSec": "X",
            // "PhnFlagSec": "X",
            // "MobTypeSec": "X",
            //"MobFlagSec": "X",

            this.getView().byId("_IDGenComboBox17").setValue(oData.ContractType);  //"Permanent",
            this.getView().byId("_IDGenComboBox17").setSelectedKey(oData.ContTypeCode);  // "P",
            this.getView().byId("_IDGenDatePicker1").setDateValue(new Date(oData.StartDate)); //  // "19.12.2023",
            this.getView().byId("_IDGenDatePicker2").setDateValue(new Date(oData.EndDate));
            this.getView().byId("_IDGenComboBox2").setValue(oData.Grade);  // "01-Grade",
            this.getView().byId("_IDGenComboBox2").setSelectedKey(oData.GradeCode); // "01",
            this.getView().byId("_IDGenComboBox3").setValue(oData.ScalePoint);  // "01",
            this.getView().byId("_IDGenComboBox3").setSelectedKey(oData.ScalePointCode);  // "01",
            this.getView().byId("_IDGenComboBox6").setValue(oData.ClaimPos);// "11",
            this.getView().byId("idFTE").setValue(oData.FteDec);
            this.getView().byId("idFTEperc").setValue(oData.FtePerc);
            this.getView().byId("Hoursperweek").setValue(oData.HoursPerWeek);
            this.getView().byId("idWeekYeardrop").setSelectedKey(oData.WorkingWeeksInt);
            this.getView().byId("idWeekYeardrop").setValue(oData.WorkingWeeks);
            this.getView().byId("idWorkingWeeksdrop").setValue(oData.AddWorkWeek);
            this.getView().byId("idWorkingWeeksdrop").setSelectedKey(oData.AddWorkWeekInt);
            if (oData.ClaimPos == "Yes") {
              this.getView().byId("idHoursPerWeek1").setVisible(false);
              this.getView().byId("idWeekYear1").setVisible(false);
              this.getView().byId("idfte1").setVisible(false);
              this.getView().byId("idfte1").setFieldGroupIds("");
              this.getView().byId("Hoursperweek").setFieldGroupIds("");
            }
            else {
              if (oData.OrgContTypeCode == '4') {
                this.getView().byId("idHoursPerWeek1").setVisible(false);
                this.getView().byId("idWeekYear1").setVisible(false);
                this.getView().byId("idfte1").setFieldGroupIds("sectionE");
              }
              else {
                this.getView().byId("idfte1").setVisible(false);
                this.getView().byId("Hoursperweek").setFieldGroupIds("sectionE");
              }
            }
            //"FteDec":"1", //this.getView().byId("").getValue() != '' ? this.getView().byId("").getValue() : '', // "10",
            if (oData.Grade || oData.GradeCode) {
              this.onSelectPayScaleGroup("");
            }

            // if (oData.WageTypeCheck1 || oData.WageTypeAmt1) {
            // this.getView().byId("_IDGenComboBox6").setSelectedKey("yes");
            // this.getView().byId("Hoursperweek").setValue(oData.WageType1);
            // this.getView().byId("idWorkingWeeksdrop").setSelectedKey(oData.WageTypeCheck1);
            // this.getView().byId("idWeekYeardrop").setSelectedKey(oData.WageTypeAmt1);
            // this.getView().byId("idWeekYeardrop").setValue(oData.WageTypeAmt1);
            // }
            if (oData.WageTypeCheck2 || oData.WageTypeAmt2) {
              this.getView().getModel("oneModel").setProperty("/wage2Value", oData.WageTypeAmt2);
            } else this.getView().getModel("oneModel").setProperty("/wage2Value", "");
            // if (oData.WageTypeCheck3 || oData.WageTypeAmt3) {
            // this.getView().byId("idWorkingWeeksdrop").setValue(oData.WageTypeAmt3)
            // }


            if (oData.ProbPerEndDt) {
              this.getView().byId("_IDGenInput141").setSelectedKey("Yes");
              this.getView().byId("probationEndDatePic").setDateValue(new Date(oData.ProbPerEndDt));
              this.getView().byId("probationEndDate").setVisible(true);
              this.getView().byId("probationEndDatePic").setVisible(true);
            }
            this.getView().byId("idSelectTypePos1").setSelectedKey(oData.EmpSubGrp);

            this.getView().byId("_IDGenComboBox8").setValue(oData.Allowance1);  // "1100",
            this.getView().byId("_IDGenComboBox8").setSelectedKey(oData.AllowCode1);  // // "1100",
            this.getView().byId("_IDGenInput191").setValue(oData.Amount1); // "100",
            this.getView().byId("_IDGenInput12").setValue(oData.Unit1);  //"No",
            this.getView().byId("_IDGenComboBox82").setValue(oData.Allowance2);  // "1101",
            this.getView().byId("_IDGenComboBox82").setSelectedKey(oData.AllowCode2); / / / "1101",
              this.getView().byId("_IDGenInput1912").setValue(oData.Amount2);  // "231",
            this.getView().byId("_IDGenInput122").setValue(oData.Unit2);  // "Unit",
            this.getView().byId("_IDGenComboBox83").setValue(oData.Allowance3); // "1103",
            this.getView().byId("_IDGenComboBox83").setSelectedKey(oData.AllowCode3);  //"1103",
            this.getView().byId("_IDGenInput1913").setValue(oData.Amount3);  // "223",
            this.getView().byId("_IDGenInput123").setValue(oData.Unit3);  //"UnNo.",

            this.getView().byId("idPersonalNum").setValue(oData.Personalnumber);  //"12312",
            this.getView().byId("idPosTitleD").setValue(oData.PosTitle);  //"Teacher",
            this.getView().byId("idPA20").setDateValue(new Date(oData.Pa20EndDate)); // "20.12.2023",
            this.getView().byId("idSelectOption").setValue(oData.Selectoption); // "SelOpt",
            this.getView().byId("idSelectOption").setSelectedKey(oData.SelOptCode);  // "",
            this.getView().byId("idLEASCHOOL").setValue(oData.LeaSchoolname);  //"Lea School",
            this.getView().byId("idNumberHoursD").setValue(oData.NoHours); // "1",
            this.getView().getModel("oneModel").setProperty("/SecDTerminData", { seqNumber: oData.seqNumber, startDate: oData.TermStartDt })
            sap.ui.core.BusyIndicator.hide();
          }.bind(this),
          error: function (oData) {
            console.log("Error", oData);
          }
        });
        var filter = [];
        filter.push(new sap.ui.model.Filter("Formid", sap.ui.model.FilterOperator.EQ, formId1));
        this.getOwnerComponent().getModel("ZSFGTGW_NS01_SRV").read("/ZSFGT_NS01_COMMENTSet", {
          filters: [filter],
          success: function (oData) {
            var comment = ""
            if (oData.results.length > 1) {
              for (let i = 0; i < oData.results.length; i++) {
                comment += oData.results[i].comment + "\n";
              }
              this.getView().byId("_IDGenTextArea1").setValue(comment);
              this.getView().byId("_IDGenTextArea1").setVisible(true);
              this.getView().byId("_IDGenLabeldf11").setVisible(true);
            }
          }.bind(this),
          error: function (oData) {
            console.log("Error", oData);
          }
        });
      },

      s4hanaServices: function () {
        var that = this;
        // var FormOwner, Status = 'I';
        this.getOwnerComponent().getModel("ZSFGTGW_NS01_SRV").read("/ZSFGT_NS01_FORMID_GETSet",
          {
            success: function (oData) {
              if (oData.results[0]) {
                that.getView().byId("_IDGenInput2").setValue(oData.results[0].Formid);
              }
              //FormOwner = this.getView().byId("idInitiator").getValue();
              //  this.s4LogCreation(Status, FormOwner);

            }.bind(this),
            error: function (oData) {
              console.log(" form id service Error");
              // MessageBox.error(JSON.parse(oData.responseText).error.message.value);
            }
          });



      },

      s4LogCreation: function (Status, FormOwner) {

        if (formOwnerCode != "") {
          if (formOwnerCode != "NO_MANAGER") {
            $.ajax({
              url: serviceURL + "/odata/v2/PerPerson('" + formOwnerCode + "')/personalInfoNav?$format=json",
              type: 'GET', contentType: "application/json",
              success: function (data) {
                FormOwner = data.d.results[0].firstName + " " + data.d.results[0].lastName
              },
              error: function (e) {
                console.log("error: " + e);
              }
            });
          }
          else {
            FormOwner = "NO MANAGER"
          }
        }
        var log_payload = {
          "OrganizationName": this.getView().byId("_IDGenInput4").getValue(),
          "Formid": this.getView().byId("_IDGenInput2").getValue(),
          "StartedOn": new Date(this.getView().byId("DatePicker01").getValue()),
          "Status": Status,
          "Type": "NS01",
          "OrganizationName": personnel,
          "InitCode": initiator,
          "Initiator": this.getView().byId("idInitiator").getValue(),
          "Description": "Schools New Starter Form",
          "FormOwner": FormOwner,
          "FormOwnerCode": formOwnerCode != "" ? formOwnerCode : initiator,
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
      },

      dateToReq: function (date) {
        if (date) {
          var splitdate = date.split("/", 3);
          var mm = splitdate[0]; //month
          var dd = splitdate[1]; // day
          var yy = splitdate[2]; // year

          if (dd.length == 1) { dd = "0" + dd };
          if (mm.length == 1) { mm = "0" + mm };

          return mm + "/" + dd + "/" + yy;
        } else return "";
      },

      onSortCodeChange: function (oEvent) {
        var value = oEvent.getSource().getValue();
        if (value.length < 6 || value.length > 6) {
          oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
          oEvent.oSource.setValueStateText("Please enter a valid Routing Number for GBR that matches the expected ISO format");
        } else {
          oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
          $.ajax({
            url: serviceURL + "/odata/v2/Bank('" + value + "')?$format=json",
            type: 'GET',
            contentType: "application/json",
            success: function (data) {
              console.log("success" + data);
              this.getView().byId("BankName1").setValue(data.d.bankName);
              oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
            }.bind(this),
            error: function (e) {
              oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
              oEvent.oSource.setValueStateText("Please enter a valid Routing Number for GBR that matches the expected ISO format");
              this.getView().byId("BankName1").setValue("");
            }.bind(this)
          });
        }
      },
      onNIChange: function (oEvent) {
        var value = oEvent.getSource().getValue();
        var regex = /^[A-Z]{2} \d{2} \d{2} \d{2} [A-D]$/;
        if (!regex.test(value)) {
          oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
          oEvent.oSource.setValueStateText("Please enter a valid National ID of this type: National Insurance Number. You should use the format: AA NN NN NN A; the last character can only be A, B, C or D.");
        } else {
          oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
        }
      },
      onPositionTypeChange: function (oEvent) {
        if (oEvent) {
          if (oEvent.getSource().getSelectedItem() != null) {
            var oValue = this.getView().byId("idSelectTypePos1").getSelectedItem().getText();
            var oKey = this.getView().byId("idSelectTypePos1").getSelectedItem().getKey();
          }
          else {
            MessageBox.error("Please select a valid value");
          }
        }
        sap.ui.core.BusyIndicator.show();
        var oModel = this.getView().getModel("oneModel");
        var perArea = oModel.getProperty("/jobInfoOrganisation");
        var grade = this.getView().byId("_IDGenComboBox2").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox2").getSelectedItem().getKey() : this.getView().byId("_IDGenComboBox2").getSelectedKey();
        var startDate = new Date(this.getView().byId("_IDGenDatePicker1").getValue()).toISOString().split("T")[0];
        var that = this;
        $.ajax({
          url: serviceURL + "/odata/v2/Position?$format=json&$filter=cust_persArea eq '" + perArea.customString3.split("(")[1].split(")")[0] + "' and vacant eq true and effectiveStartDate le datetime'" + startDate + "T00:00:00' and cust_employeeType eq '" + emplSubGroup + "' and cust_PayScaleGroup eq '" + grade + "'",
          type: 'GET',
          contentType: "application/json",
          success: function (data) {
            sap.ui.core.BusyIndicator.hide();
            data.d.results.sort();
            that.getView().getModel("oneModel").setProperty("/Positions", data.d.results);
            that.getView().byId("selectPositionCombobox").setEnabled(true)
            if (data.d.results.length == 0) {
              MessageBox.error("There are no suitable positions available. Please set one up and then click on the refresh button");
            }

          },
          error: function (e) {
            sap.ui.core.BusyIndicator.hide();
            console.log("error: " + e);
          }
        });
      },

      onPositionChange: function (oEvent) {
        if (oEvent.getSource().getSelectedItem() != null) {
          sap.ui.core.BusyIndicator.show();
          var oKey = oEvent.getSource().getSelectedItem().getKey();
          var oValue = this.getView().byId("selectPositionCombobox").getSelectedItem().getText();
          if (oValue) {
            var obj = this.getView().getModel("oneModel").getProperty("/Positions").filter((el) => el.code == oKey)[0];
            var url = serviceURL + "/odata/v2" + obj.PositionCostAssignmentItems.__deferred.uri.split("/odata/v2")[1] + "?$format=json";
            var that = this;
            $.ajax({
              url: url,
              type: 'GET',
              contentType: "application/json",
              success: function (data) {
                sap.ui.core.BusyIndicator.hide();
                that.getView().getModel("oneModel").setProperty("/costCenter", data.d.results[0]);
              },
              error: function (e) {
                console.log("error: " + e);
                sap.ui.core.BusyIndicator.hide();
              }
            });

            var url1 = serviceURL + "/odata/v2" + obj.cust_employeeTypeNav.__deferred.uri.split("/odata/v2")[1] + "?$format=json";
            $.ajax({
              url: url1,
              type: 'GET',
              contentType: "application/json",
              success: function (data) {
                sap.ui.core.BusyIndicator.hide();
                that.getView().byId("idSelectTypePos1").getSelectedItem() != null ? that.getView().byId("idSelectTypePos1").getSelectedItem().setKey(data.d.optionId) : that.getView().byId("idSelectTypePos1").setSelectedKey(data.d.optionId);
              },
              error: function (e) {
                console.log("error: " + e);
                sap.ui.core.BusyIndicator.hide();
              }
            });

            var isClaimPos = this.getView().byId("_IDGenComboBox6").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox6").getSelectedItem().getText() : this.getView().byId("_IDGenComboBox6").getValue();
            if (isClaimPos == "No") {
              var isTeacher = this.getView().byId("_IDGenComboBox411").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox411").getSelectedItem().getKey() : this.getView().byId("_IDGenComboBox411").getSelectedKey()
              var standHours = obj.standardHours;
              if (isTeacher == '4') {
                var givenFTE = this.getView().byId("idFTE").getValue();
                this.getView().byId("Hoursperweek").setValue(parseFloat(givenFTE) * standHours);
              }
              else {
                var givenHours = this.getView().byId("Hoursperweek").getValue();
                this.getView().byId("idFTE").setValue((parseFloat(givenHours) / parseFloat(standHours)).toFixed(2));
                this.getView().byId("idFTEperc").setValue(((parseFloat(givenHours) / parseFloat(standHours)) * 100).toFixed(2) + "%");
              }
            }
            this.getView().byId("idPos").setVisible(true);
            this.getView().byId("idJobT").setVisible(true);
            this.getView().byId("idEmpSub").setVisible(true);
            this.getView().byId("idGrade1").setVisible(true);
            this.getView().byId("idPositionCostCentre").setVisible(true);
            this.getView().byId("idJobTitle").setVisible(true);
            this.getView().byId("idJobTitle").setValue(obj.jobTitle);
            this.getView().byId("idEmployeeSubGroup").setVisible(true);
            this.getView().byId("idEmployeeSubGroup").setValue(obj.cust_employeeType);
            this.getView().byId("idGrade").setVisible(true);
            this.getView().byId("idGrade").setValue(obj.cust_PayScaleGroup);
          }
        }
        else {
          MessageBox.error("Please select a valid value");
        }
      },

      onFresh: function () {
        this.onPositionTypeChange("");
      },
      onChangeUnit: function (oEvent) {

      },
      onChangeAmount: function (oEvent) {

      },
      onChangeAllowance: function (oEvent) {
        var oValue = oEvent.getSource().getSelectedItem().getText();
        var oKey = oEvent.getSource().getSelectedItem().getKey();
        var bKey = this.getView().byId("_IDGenComboBox82").getSelectedKey();
        var cKey = this.getView().byId("_IDGenComboBox83").getSelectedKey();
        if (oKey === bKey === cKey) {
          MessageBox.error("Please choose different allowance");
        } else if (oValue) {
          var oModel = this.getView().getModel("oneModel");
          $.ajax({
            url: serviceURL + "/odata/v2/cust_ZFLM_WAGCHECK_RU?$filter=cust_WageType eq '" + oKey + "'&$format=json",
            type: 'GET',
            contentType: "application/json",
            success: function (data) {
              if (data) {
                var wagechk = data.d.results[0];
                oModel.setProperty("/WageChk", wagechk);

                if (wagechk.cust_RateAllow == "X") {
                  oModel.setProperty("/enableRate", true);
                  oModel.setProperty("/maxRate", wagechk.cust_MaxRate);
                  oModel.setProperty("/enableUnit", false);
                }
                else if (wagechk.cust_UnitsAllow == "X") {
                  oModel.setProperty("/enableUnit", true);
                  oModel.setProperty("/maxunit", wagechk.cust_MaxUnits);
                  oModel.setProperty("/enableRate", false);
                }

              }
            },
            error: function () {

            }
          });
        }

      },
      onChangeAllowance1: function (oEvent) {
        var oValue = oEvent.getSource().getSelectedItem().getText();
        var oKey = oEvent.getSource().getSelectedItem().getKey();
        var bKey = this.getView().byId("_IDGenComboBox8").getSelectedKey();
        var cKey = this.getView().byId("_IDGenComboBox83").getSelectedKey();
        if (oKey === bKey || oKey === cKey) {
          MessageBox.error("Please choose different allowance");
        } else if (oValue) {
          var that = this;
          var oModel = that.getView().getModel("oneModel");
          $.ajax({

            url: serviceURL + "/odata/v2/cust_ZFLM_WAGCHECK_RU?$filter=cust_WageType eq '" + oKey + "'&$format=json",
            type: 'GET',
            contentType: "application/json",
            success: function (data) {
              if (data) {

                var wagechk = data.d.results[0];
                oModel.setProperty("/WageChk", wagechk);

                if (wagechk.cust_RateAllow == "X") {
                  oModel.setProperty("/enableRate1", true);
                  oModel.setProperty("/maxRate1", wagechk.cust_MaxRate);
                  oModel.setProperty("/enableUnit1", false);
                }
                else if (wagechk.cust_UnitsAllow == "X") {
                  oModel.setProperty("/enableUnit1", true);
                  oModel.setProperty("/maxunit1", wagechk.cust_MaxUnits);
                  oModel.setProperty("/enableRate1", false);
                }
              }
            },
            error: function () {

            }
          });
        }

      },
      onChangeAllowance2: function (oEvent) {
        var oValue = oEvent.getSource().getSelectedItem().getText();
        var oKey = oEvent.getSource().getSelectedItem().getKey();
        var bKey = this.getView().byId("_IDGenComboBox8").getSelectedKey();
        var cKey = this.getView().byId("_IDGenComboBox82").getSelectedKey();
        if (oKey === bKey || oKey === cKey) {
          MessageBox.error("Please choose different allowance");
        } else if (oValue) {
          var oModel = this.getView().getModel("oneModel");
          $.ajax({

            url: serviceURL + "/odata/v2/cust_ZFLM_WAGCHECK_RU?$filter=cust_WageType eq '" + oKey + "'&$format=json",
            type: 'GET',
            contentType: "application/json",
            success: function (data) {
              if (data) {
                var wagechk = data.d.results[0];
                oModel.setProperty("/WageChk", wagechk);

                if (wagechk.cust_RateAllow == "X") {
                  oModel.setProperty("/enableRate2", true);
                  oModel.setProperty("/maxRate2", wagechk.cust_MaxRate);
                  oModel.setProperty("/enableUnit2", false);
                }
                else if (wagechk.cust_UnitsAllow == "X") {
                  oModel.setProperty("/enableUnit2", true);
                  oModel.setProperty("/maxunit2", wagechk.cust_MaxUnits);
                  oModel.setProperty("/enableRate2", false);
                }

              }
            },
            error: function () {

            }
          });
        }

      },

      onSelectPayScaleGroup: function (oEvent) {
        if (oEvent) {
          var grade = oEvent.getSource().getSelectedItem() != null ? oEvent.getSource().getSelectedItem().getKey() : oEvent.getSource().getSelectedKey();
        } else var grade = this.getView().byId("_IDGenComboBox2").getSelectedKey();
        var oModel = this.getView().getModel("oneModel");
        this.getView().byId("_IDGenComboBox3").setValue("");
        if (grade != "") {
          this._getTTOWeeks(grade);
          var workingWeeks = this.getView().byId("idWeekYeardrop").getSelectedItem() != null ? this.getView().byId("idWeekYeardrop").getSelectedItem().getText() : this.getView().byId("idWeekYeardrop").getValue();
          this._checkWage2(grade, workingWeeks);
          // var 
          $.ajax({
            url: serviceURL + "/odata/v2/PayScaleLevel?$filter=substringof('" + grade + "', code)&$format=json",
            type: 'GET',
            contentType: "application/json",
            success: function (data) {
              console.log("success" + data);
              if (!bscFlag || !approverFlag) {
                this.getView().byId("_IDGenComboBox3").setEditable(true);
              }
              oModel.setProperty("/scalePoint", data.d.results);
            }.bind(this),
            error: function (e) {
              console.log("error: " + e);
            }
          });
        }
        else {
          this.getView().byId("_IDGenComboBox3").setEditable(false);
        }

      },

      _getEmployees: async function (orgCode) {
        var oModel = this.getView().getModel("oneModel")
        var terminated, retired, suspended, discarded, reportedNoShow;
        await $.ajax({
          url: serviceURL + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'employee-status' and status eq 'A'&$format=json",
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
          url: serviceURL + `/odata/v2/EmpJob?$filter=customString3 eq '${orgCode}' and emplStatus ne '${discarded}' and emplStatus ne '${terminated}' and emplStatus ne '${retired}' and emplStatus ne '${suspended}' and emplStatus ne '${reportedNoShow}'&$format=json`,
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
        let a = new sap.ui.model.odata.ODataModel("/odata/v2", true);
        a.bTokenHandling = false;
        if (employeeData.length > 180) {
          for (let i = 0; i < employeeData.length / 180; i++) {
            employeeDetails(employeeData.slice(i * 180, (i + 1) * 180));
          }
        }
        else {
          employeeDetails(employeeData);
        }

        function employeeDetails(emplData) {
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
                  var temp = {
                    firstName: data.__batchResponses[i].data.results[0].firstName,
                    lastName: data.__batchResponses[i].data.results[0].lastName,
                    userId: emplData[i].userId,
                    jobInfo: emplData[i].customString1,
                    personIdExternal: data.__batchResponses[i].data.results[0].personIdExternal
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
                }
                oModel.setProperty("/employeeList", EmpData);
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

      onChangeCurrentlyEmployed: function (oEvent) {
        var orgValue = oEvent.getSource().mProperties.value;
        this.clearFields();
        if (orgValue === "Yes") {

          var org = this.getView().byId("_IDGenInput4").getValue().split("(")[1].split(")")[0];
          if (!this.getView().getModel("oneModel").getProperty("/employeeList"))
            this._getEmployees(org);
          this.getView().byId("idempCame").setVisible(false);
          this.getView().byId("empCame3").setVisible(false);

          this.getView().byId("_IDGenLabel64").setVisible(true);
          this.getView().byId("_IDGenComboBox41").setVisible(true);
          this.getView().byId("_IDGenPanel4").setHeaderText("Section B - Multi Employee Details");

        } else {

          this.getView().byId("_IDGenPanel4").setHeaderText("Section B – New Employee Details");
          this.getView().byId("idempCame1").setVisible(false);

          this.getView().byId("empCame").setVisible(false);
          this.getView().byId("idempCame").setVisible(true);
          this.getView().byId("empCame3").setVisible(true);

          this.getView().byId("_IDGenLabel64").setVisible(false);
          this.getView().byId("_IDGenComboBox41").setVisible(false);
          // this.getView().byId("_IDGenLabel641").setVisible(false);

          this.getView().byId("empCame").setVisible(true);
          this.getView().byId("idempCame").setVisible(true);
          this.getView().byId("_IDGenLabel621").setVisible(true);
          this.getView().byId("_IDGenInput10").setVisible(true);
          this.getView().byId("_IDGenLabel6421").setVisible(true);
          this.getView().byId("_IDGenComboBox411").setVisible(true);
          this.getView().byId("_IDGenLabel6411").setVisible(true);
          this.getView().byId("_IDGenInput11").setVisible(true);
          this.getView().byId("_IDGenLabel611").setVisible(true);
          this.getView().byId("_IDGenInput112").setVisible(true);

          this.getView().byId("Dob11").setEditable(true);
          this.getView().byId("Nationality1").setEditable(true);
          this.getView().byId("Disability1").setEditable(true);
          this.getView().byId("DBS1").setEditable(true);
          this.getView().byId("TeachRegNum1").setEditable(true);
          this.getView().byId("BankSort1").setEditable(true);
          this.getView().byId("BankAccNum1").setEditable(true);
          this.getView().byId("nationalIns1").setEditable(true);
          this.getView().byId("Ethicity1").setEditable(true);
          this.getView().byId("Gender1").setEditable(true);
          this.getView().byId("ClearDate1").setEditable(true);
          this.getView().byId("ClearDate1").setEditable(true);
          this.getView().byId("issuDate1").setEditable(true);
          this.getView().byId("issuDate1").setEditable(true);
          //this.getView().byId("BankName1").setEnabled(true);
          this.getView().byId("BuildingSoc1").setEditable(true);
          this.getView().byId("_IDGefnInput11").setEditable(true);
          this.getView().byId("_IDGefnInput12").setEditable(true);
          this.getView().byId("_IDGefnInput14").setEditable(true);
          this.getView().byId("_IDGenItem6").setEditable(true);
          // this.getView().byId("idCountry").setEnabled(true);
          this.getView().byId("_IDGenInput15").setEditable(true);
          this.getView().byId("_IDGenInput16").setEditable(true);
          this.getView().byId("_IDGenInput16s").setEditable(true);
          this.getView().byId("_IDGenInput17").setEditable(true);
          this.getView().byId("_IDGenInput18").setEditable(true);
          // this.getView().byId("_IDGenInput19").setEditable(true);
          this.getView().byId("_IDGefnInput112").setEditable(true);
          this.getView().byId("_IDGefnInput122").setEditable(true);
          this.getView().byId("_IDGefnInput142").setEditable(true);
          this.getView().byId("idree4d2").setEditable(true);
          this.getView().byId("_IDGenInput152").setEditable(true);
          this.getView().byId("_IDGenInput162").setEditable(true);
          this.getView().byId("_IDGenInput162s").setEditable(true);
          this.getView().byId("_IDGenInput172").setEditable(true);
          this.getView().byId("_IDGenInput182").setEditable(true);
          // this.getView().byId("_IDGenInput192").setEditable(true);
        }
      },

      allDropdowns: function (oModel, that) {

        // Second Property - job Info // Allowance service
        $.ajax({
          url: serviceURL + "/odata/v2/EmpEmployment(personIdExternal='" + initiator + "',userId='" + initiator + "')/jobInfoNav?$format=json",
          type: 'GET', contentType: "application/json",
          success: function (data) {
            if (bscFlag || approverFlag || initiatorFlag) { }
            else {
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
              $.ajax({
                url: serviceURL + "/odata/v2" + data.d.results[0].positionNav.__deferred.uri.split("/odata/v2")[1] + "?$format=json",
                type: 'GET',
                contentType: "application/json",
                success: function (data) {
                  console.log("success" + data);
                  $.ajax({
                    url: serviceURL + "/odata/v2" + data.d.PositionCostAssignmentItems.__deferred.uri.split("/odata/v2")[1] + "?$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                      console.log("success" + data);
                      for (let j = 0; j < data.d.results.length; j++) {
                        if (data.d.results[j].defaultAssignment == true) {
                          $.ajax({
                            url: serviceURL + "/odata/v2" + data.d.results[j].costCenterNav.__deferred.uri.split("/odata/v2")[1] + "?$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                              console.log("success" + data);
                              that.getView().byId("_IDGenInput112").setValue(data.d.results[0].externalCode + " " + data.d.results[0].description);
                            },
                            error: function (e) {
                              console.log("error: " + e);
                            }
                          });
                        }
                      }
                    },
                    error: function (e) {
                      console.log("error: " + e);
                    }
                  });
                },
                error: function (e) {
                  console.log("error: " + e);
                }
              });
            }
            oModel.setProperty("/jobInfoOrganisation", data.d.results[0]);
            payGroup = data.d.results[0].payGroup;
            $.ajax({
              url: serviceURL + "/odata/v2/cust_PersonnelArea?$filter= externalCode eq '" + data.d.results[0].customString3 + "'&$format=json",
              type: 'GET',
              contentType: "application/json",
              success: function (data) {
                console.log("success" + data);
                oModel.setProperty("/jobInfoOrganisation/customString3", data.d.results[0].externalName + " (" + data.d.results[0].externalCode + ")");
              },
              error: function (e) {
                console.log("error: " + e);
              }
            });
            that.OrganizationName = data.d.results[0].customString3;
            if (data) {
              var orgData = data.d.results[0];
              //allowance service
              var perArea = orgData.customString3;
              var perSubArea = orgData.customString4;
              var date1 = orgData.startDate;
              var timestamp = parseInt(date1.match(/\d+/)[0], 10);
              var date = new Date(timestamp);
              var formattedDate = date.toISOString().split('T')[0];
              var seqNumber = orgData.seqNumber;
              $.ajax({
                url: serviceURL + "/odata/v2/EmpJob(seqNumber=" + seqNumber + ",startDate=datetime'" + formattedDate + "T00:00:00',userId='" + initiator + "')/employmentTypeNav?$format=json",
                type: 'GET',
                contentType: "application/json",
                success: function (data) {
                  if (bscFlag || approverFlag || initiatorFlag) { }
                  else
                    emplSubGroup = data.d.externalCode;
                  //type of position
                  $.ajax({
                    url: serviceURL + "/odata/v2/cust_ZFLM_POS_LIST?$format=json &$filter=cust_EESubgroup eq '" + emplSubGroup + "'",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                      var posTypeData = [];
                      var posData = data;
                      for (let i = 0; i < posData.d.results.length; i++) {
                        $.ajax({
                          url: serviceURL + "/odata/v2/PickListValueV2?$format=json&$filter=PickListV2_id eq 'employee-type' and status eq 'A' and externalCode eq '" + posData.d.results[i].cust_EESubgroup + "'",
                          type: 'GET',
                          contentType: "application/json",
                          success: function (data) {
                            data.d.results.sort();
                            var temp = {
                              code: data.d.results[0].optionId,
                              posType: posData.d.results[i].cust_PositionType
                            }
                            posTypeData.push(temp);
                            posTypeData.sort((a, b) => {
                              if (a.posType < b.posType) return -1;
                              if (a.posType > b.posType) return 1;
                            });
                            oModel.setProperty("/positionType", posTypeData);
                            //cust_PositionType
                          },
                          error: function (e) {
                            console.log("error: " + e);
                          }
                        })
                      }
                    },
                    error: function (e) {
                      console.log("error: " + e);
                    }
                  })
                  $.ajax({
                    url: serviceURL + "/odata/v2/cust_ZFLM_WAGTYPES_DD?$format=json&$filter=cust_PersSubarea eq '" + perSubArea + "' and cust_EESubgroup eq '" + emplSubGroup + "' and cust_PersArea eq '" + perArea + "' ",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                      var countyArr = [];
                      var countyData = data;
                      for (let i = 0; i < data.d.results.length; i++) {
                        $.ajax({
                          url: serviceURL + "/odata/v2/FOPayComponent?$filter=externalCode eq '" + data.d.results[i].cust_WageType + "' &$format=json",
                          type: 'GET',
                          contentType: "application/json",
                          success: function (data) {
                            var count = {
                              externalCode: countyData.d.results[i].externalCode,
                              cust_WageTypedescription: data.d.results[0].description,
                              wholeData: data.d.results[0]
                            }
                            countyArr.push(data.d.results[0]);
                            countyArr.sort((a, b) => {
                              if (a.externalCode < b.externalCode) return -1;
                              if (a.externalCode > b.externalCode) return 1;

                              if (a.description < b.description) return -1;
                              if (a.description > b.description) return 1;
                            });
                            oModel.setProperty("/Allowance", countyArr);
                          },
                          error: function (e) {
                            console.log("error: " + e);
                          }
                        })
                      }
                    },
                    error: function (e) {
                      console.log("error: " + e);
                    }
                  })
                },
                error: function (e) {
                  console.log("error: " + e);
                }
              })

              //grades drop down
              //grade group
              setTimeout(that.getGrades(oModel, seqNumber, formattedDate), 300);
            }

            // oModel.setProperty("/jobInfoP", data);
            //  that.getView().setModel(oModel, "InitData");
            //  var variable = oModel.getProperty("/jobInfoP").d.results[0].jobTitle;
            // return variable;

          }, error: function (e) {
            console.log("JobInfo service error: " + e);

          }

        });

        //dropdown for where is your employe came from
        $.ajax({
          url: serviceURL + "/odata/v2/PicklistLabel?$filter=label eq 'Hire' and locale eq 'en_GB' &$format=json",
          type: 'GET',
          contentType: "application/json",
          success: function (data) {
            var hireData = data.d.results[0];
            var empCameFrom = [];
            $.ajax({
              url: serviceURL + "/odata/v2/FOEventReason?$filter=status eq 'A' &$format=json",
              type: 'GET',
              contentType: "application/json",
              success: function (data) {
                data.d.results.forEach(function (item) {
                  if (item.event == hireData.optionId) {
                    empCameFrom.push({
                      "name": item.name,
                      "event": item.event
                    })
                  }
                });
                empCameFrom.sort((a, b) => {
                  if (a.name < b.name) return -1;
                  if (a.name > b.name) return 1;
                });
                oModel.setProperty("/empCameFrom", empCameFrom);
              }, error: function (e) { }
            });
          }, error: function (e) { }
        });

        //ContractType
        $.ajax({
          url: serviceURL + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'Contracttype' and status eq 'A' &$format=json",
          type: 'GET',
          contentType: "application/json",
          success: function (data) {
            data.d.results.sort((a, b) => {
              if (a.label_en_GB < b.label_en_GB) return -1;
              if (a.label_en_GB > b.label_en_GB) return 1;
            });
            oModel.setProperty("/oContractType1", data.d.results);
          },
          error: function (e) {
            console.log("error: " + e);
          }
        })

        $.ajax({
          url: serviceURL + "/odata/v2/cust_ZFLM_CONTRACT_TY?$format=json",
          type: 'GET',
          contentType: "application/json",
          success: function (data) {
            data.d.results.sort((a, b) => {
              if (a.cust_Text < b.cust_Text) return -1;
              if (a.cust_Text > b.cust_Text) return 1;
            });
            oModel.setProperty("/oContractType", data);
          },
          error: function (e) {
            console.log("error: " + e);
          }
        })

        //Title
        $.ajax({
          url: serviceURL + "/odata/v2/Picklist('salutation')/picklistOptions?$format=json",
          type: 'GET',
          contentType: "application/json",
          success: function (data) {
            console.log("success" + data);
            var salut = [];
            let a = new sap.ui.model.odata.ODataModel("/odata/v2", true);
            a.bTokenHandling = false;
            if (data.d.results.length > 180) {
              for (let i = 0; i < data.d.results.length / 180; i++) {
                salutDetails(data.d.results.slice(i * 180, (i + 1) * 180));
              }
            }
            else {
              salutDetails(data.d.results);
            }

            function salutDetails(salutData) {
              let batchData = [];
              a.clearBatch();
              salutData.forEach(function (oItem) {
                batchData.push(a.createBatchOperation(
                  "/PicklistOption(" + oItem.id + "L)/picklistLabels?$format=json",
                  "GET"
                ));
              });
              a.addBatchReadOperations(batchData);
              a.setUseBatch(true);
              a.submitBatch(function (data) {
                for (let j = 0; j < data.length; j++) {
                  var temp = {
                    externalCode: data[i].optionId,
                    label_en_GB: data[i].label
                  }
                  salut.push(temp);
                  salut.sort((a, b) => {
                    if (a.label_en_GB < b.label_en_GB) return -1;
                    if (a.label_en_GB > b.label_en_GB) return 1;
                  });
                  oModel.setProperty("/title", salut);
                }
              });
            }
            // for (let i = 0; i < data.d.results.length; i++) {
            //   $.ajax({
            //     url: serviceURL + "/odata/v2/PicklistOption(" + data.d.results[i].id + "L)/picklistLabels?$format=json",
            //     type: 'GET',
            //     contentType: "application/json",
            //     success: function (data) {
            //       console.log("success" + data);
            //     }.bind(this),
            //     error: function (e) {
            //       console.log("error: " + e);
            //     }
            //   });
            // }
          }.bind(this),
          error: function (e) {
            console.log("error: " + e);
          }
        });

        $.ajax({
          url: serviceURL + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'rcmUKEthnicGroup' and status eq 'A' &$format=json",
          type: 'GET',
          contentType: "application/json",
          success: function (data) {
            data.d.results.sort((a, b) => {
              if (a.label_en_GB < b.label_en_GB) return -1;
              if (a.label_en_GB > b.label_en_GB) return 1;
            });
            oModel.setProperty("/Ethnicity", data.d.results);
          }.bind(this),
          error: function (e) {
            console.log("error: " + e);
          }
        });

        // RelationDropdown
        $.ajax({
          url: serviceURL + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'relation' and status eq 'A'&$format=json",
          type: 'GET',
          contentType: "application/json",
          success: function (data) {
            data.d.results.sort((a, b) => {
              if (a.label_en_GB < b.label_en_GB) return -1;
              if (a.label_en_GB > b.label_en_GB) return 1;
            });
            oModel.setProperty("/relationDropdown", data.d.results);
          }.bind(this),
          error: function (e) {
            console.log("error: " + e);
          }
        });
        //  County
        $.ajax({
          url: serviceURL + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'COUNTY_GCC' &$format=json",
          type: 'GET',
          contentType: "application/json",
          success: function (data) {
            data.d.results.sort((a, b) => {
              if (a.label_en_GB < b.label_en_GB) return -1;
              if (a.label_en_GB > b.label_en_GB) return 1;
            });
            oModel.setProperty("/county", data.d.results);
          }.bind(this),
          error: function (e) {
            console.log("error: " + e);
          }
        });

        //Nationality
        $.ajax({
          url: serviceURL + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'ISOCountryList' and status eq 'A'&$format=json",
          type: 'GET',
          contentType: "application/json",
          success: function (data) {
            console.log("success" + data);
            data.d.results.sort((a, b) => {
              if (a.label_en_GB < b.label_en_GB) return -1;
              if (a.label_en_GB > b.label_en_GB) return 1;
            });
            oModel.setProperty("/nationality", data.d.results);
            oModel.setProperty("/defaultNationality", "GBR");
          }.bind(this),
          error: function (e) {
            console.log("error: " + e);
          }
        });

        //Disability
        $.ajax({
          url: serviceURL + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'GCC_DisabilityType' and status eq 'A' &$format=json",
          type: 'GET',
          contentType: "application/json",
          success: function (data) {
            data.d.results.sort((a, b) => {
              if (a.label_en_GB < b.label_en_GB) return -1;
              if (a.label_en_GB > b.label_en_GB) return 1;
            });
            oModel.setProperty("/Disability", data.d.results);
          }.bind(this),
          error: function (e) {
            console.log("error: " + e);
          }
        });

      },

      getGrades: function (oModel, seqNumber, formattedDate) {
        var f3digits = (((oModel.getProperty("/CostCentreP")).costCenter).toString()).substring(oModel.getProperty("/CostCentreP").costCenter.length - 3),
          grade = [];
        if (f3digits != undefined) {
          var job = oModel.getProperty("/jobInfoOrganisation");
          $.ajax({
            url: serviceURL + "/odata/v2/EmpJob(seqNumber=" + seqNumber + ",startDate=datetime'" + formattedDate + "T00:00:00',userId='" + initiator + "')/companyNav?$format=json",
            type: 'GET',
            contentType: "application/json",
            success: function (data) {
              companyCode = data.d.externalCode;
              var CompanyCode = data.d.externalCode;
              var payScaleArea = job.payScaleArea;
              var payScaleType = job.payScaleType;
              $.ajax({
                url: serviceURL + "/odata/v2/PayScaleGroup?$filter=startswith(payScaleGroup,'" + f3digits + "') and payScaleArea eq '" + payScaleArea + "' and payScaleType eq '" + payScaleType + "'&$format=json",
                type: 'GET',
                contentType: "application/json",
                success: function (data) {
                  console.log("success" + data);
                  if (data.d.results.length == 0) {
                    $.ajax({
                      url: serviceURL + "/odata/v2/cust_ZFLM_GRADE_NEW?$filter=cust_CompanyCode eq " + CompanyCode + "&$format=json",
                      type: 'GET',
                      contentType: "application/json",
                      success: function (data) {
                        console.log("success" + data);
                        var custGradeData = data;
                        if (custGradeData.d.results.length == 0) {
                          $.ajax({
                            url: serviceURL + "/odata/v2/cust_ZFLM_GRADE_NEW?$filter=cust_CompanyCode eq null &$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                              console.log("success" + data);
                              var j = 0;
                              var k = 0, payScaleGroupData = [];
                              for (let b = 0; b < data.d.results.length; b++) {
                                var a = payScaleGroupData.find(function (test) {
                                  return test.cust_PayScaleGroup == data.d.results[b].cust_PayScaleGroup
                                });
                                if (!a) {
                                  payScaleGroupData.push(data.d.results[b]);
                                }
                              }
                              for (let i = 0; i < payScaleGroupData.length; i++) {
                                var cust_PayScaleGroup = payScaleGroupData[i].cust_PayScaleGroup;
                                // if (!this.numberPrefix(cust_PayScaleGroup)) {
                                j = j + 1;
                                $.ajax({
                                  url: serviceURL + "/odata/v2/PayScaleGroup?$filter=payScaleGroup eq '" + cust_PayScaleGroup + "' and payScaleArea eq '" + payScaleArea + "' and payScaleType eq '" + payScaleType + "'&$format=json",
                                  type: 'GET',
                                  contentType: "application/json",
                                  success: function (data) {
                                    console.log("success" + data);
                                    if (data.d.results.length != 0) {
                                      grade.push(data.d.results[0]);
                                    }
                                    k = k + 1;
                                    if (k == j) {
                                      grade.sort(function (a, b) {
                                        return a.code.split(" ")[1] - b.code.split(" ")[1];
                                      })
                                      oModel.setProperty("/grade", grade);
                                      sap.ui.core.BusyIndicator.hide();
                                      // this.getView().setModel(oModel, "AllData");
                                      // FormOwner = this.getView().byId("nameText").getValue();
                                      // this.s4LogCreation(Status, FormOwner);
                                    }
                                  }.bind(this),
                                  error: function (e) {
                                    console.log("error: " + e);
                                  }
                                });
                                // }
                              }
                            }.bind(this),
                            error: function (e) {
                              console.log("error: " + e);
                            }
                          });
                        } else {
                          let j = 0, k = 0, cust_ZFLM_GRADE_NEWData = [], flag;
                          for (let i = 0; custGradeData.d.results.length > i; i++) {
                            if (cust_ZFLM_GRADE_NEWData.length == 0 && custGradeData.d.results[i].cust_PayScaleGroup != "") {
                              cust_ZFLM_GRADE_NEWData.push(custGradeData.d.results[i]);
                            } else {

                              for (let a = 0; a < cust_ZFLM_GRADE_NEWData.length; a++) {
                                if (custGradeData.d.results[i].cust_PayScaleGroup == cust_ZFLM_GRADE_NEWData.cust_PayScaleGroup || custGradeData.d.results[i].cust_PayScaleGroup == "") {
                                  flag = 'X';
                                  break;
                                }
                              }
                              if (flag == undefined && cust_ZFLM_GRADE_NEWData.length != 0) {
                                cust_ZFLM_GRADE_NEWData.push(custGradeData.d.results[i])
                              } else {
                                flag = undefined;
                              }
                            }
                          }
                          cust_ZFLM_GRADE_NEWData.forEach(function (custZFLMData) {
                            j = j + 1;
                            $.ajax({
                              url: serviceURL + "/odata/v2/PayScaleGroup?$filter=payScaleGroup eq '" + custZFLMData.cust_PayScaleGroup + "' and payScaleArea eq '" + payScaleArea + "' and payScaleType eq '" + payScaleType + "'&$format=json",
                              type: 'GET',
                              contentType: "application/json",
                              success: function (data) {
                                console.log("success" + data);
                                data.d.results.forEach(function (gradeData) {
                                  grade.push(gradeData);
                                })
                                k = k + 1;
                                if (j == k) {
                                  grade.sort(function (a, b) {
                                    return a.code - b.code;
                                  })
                                  oModel.setProperty("/grade", grade);
                                  sap.ui.core.BusyIndicator.hide();
                                }
                              }.bind(this),
                              error: function (e) {
                                console.log("error: " + e);
                              }
                            });
                          }.bind(this))

                        }
                      }.bind(this),
                      error: function (e) {
                        console.log("error: " + e);
                      }
                    });
                  } else {
                    data.d.results.forEach(function (gradeData) {
                      grade.push(gradeData);
                    })
                    grade.sort(function (a, b) {
                      return a.code - b.code;
                    })
                    oModel.setProperty("/grade", grade);
                    sap.ui.core.BusyIndicator.hide();
                  }
                }.bind(this),
                error: function (e) {
                  console.log("error: " + e);
                }
              });
            },
            error: function (resp) {
              console.log("error" + resp);
            }
          });
        }
      },

      onConfirmEmpDetails: function (oEvent) {
        var that = this;
        //MessageBox.confirm("You will not be able to change your selection. Are you sure you'd like to go ahead?");
        var ComboYesNo = that.getView().byId("_IDGenComboBox1").getSelectedItem() != null ? that.getView().byId("_IDGenComboBox1").getSelectedItem().getKey() : that.getView().byId("_IDGenComboBox1").getSelectedKey();
        var employeeSelect = that.getView().byId("_IDGenComboBox41").getValue();
        var comboContractorType = that.getView().byId("_IDGenComboBox411").getSelectedKey();
        var position = that.getView().byId("_IDGenInput11").getValue();

        if (ComboYesNo == "X" && employeeSelect && comboContractorType && position) {
          MessageBox.confirm("You will not be able to change your selection. Are you sure you'd like to go ahead?", {
            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
            emphasizedAction: MessageBox.Action.OK,
            onClose: function (sAction) {
              if (sAction === "OK") {

                that.getView().byId("_IDGenButton122").setText("Confirmed");
                that.getView().byId("_IDGenButton122").setEnabled(false);

                that.getView().byId("_IDGenComboBox1").setEditable(false);
                that.getView().byId("_IDGenComboBox41").setEditable(false);
                that.getView().byId("idempCame").setEditable(false);
                that.getView().byId("_IDGenInput10").setEditable(false);
                that.getView().byId("_IDGenComboBox411").setEditable(false);
                that.getView().byId("_IDGenInput11").setEditable(false);
                that.getView().byId("_IDGenInput112").setEditable(false);


                // show section B C D E F
                that.getView().byId("_IDGenPanel4").setVisible(true);
                that.getView().byId("_IDGenPanel45").setVisible(true);
                that.getView().byId("_IDGenPanel4dhd51").setVisible(true);
                that.getView().byId("_IDGenPanel4dh51").setVisible(true);
                //that.getView().byId("_IDGenPanel451").setVisible(true);
                // that.getView().byId("_IDGenPanel4d51").setVisible(true);

                that.getView().byId("titleB1").setEditable(false);
                that.getView().byId("foreName1").setEditable(false);
                that.getView().byId("middelname1").setEditable(false);
                that.getView().byId("surname1").setEditable(false);
                that.getView().byId("contStartDate1").setEditable(false);
                // that.getView().byId("empAdd1").setEditable(false);
                that.getView().byId("streetHouseNo1").setEditable(false);
                that.getView().byId("2ndadd1").setEditable(false);

                that.getView().byId("city1").setEditable(false);
                that.getView().byId("country1").setEditable(false);
                that.getView().byId("postcode1").setEditable(false);
                that.getView().byId("homeTelephone1").setEditable(false);
                that.getView().byId("mobileTelephone1").setEditable(false);
                that.getView().byId("emailAdd1").setEditable(false);
                // that.getView().byId("addEmergencyContact1").setEnabled(true);

              }
            }
          });
        } else if (ComboYesNo == "N" && comboContractorType && position) {
          MessageBox.confirm("You will not be able to change your selection. Are you sure you'd like to go ahead?", {
            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
            emphasizedAction: MessageBox.Action.OK,
            onClose: function (sAction) {
              if (sAction === "OK") {

                that.getView().byId("_IDGenButton122").setText("Confirmed");
                that.getView().byId("_IDGenButton122").setEnabled(false);


                that.getView().byId("_IDGenComboBox1").setEditable(false);
                that.getView().byId("_IDGenComboBox41").setEditable(false);
                that.getView().byId("idempCame").setEditable(false);
                that.getView().byId("_IDGenInput10").setEditable(false);
                that.getView().byId("_IDGenComboBox411").setEditable(false);
                that.getView().byId("_IDGenInput11").setEditable(false);
                that.getView().byId("_IDGenInput112").setEditable(false);

                //show section B C D E F
                // that.getView().byId("_IDGenPanel4d51").setVisible(true);
                that.getView().byId("_IDGenPanel4").setVisible(true);
                that.getView().byId("_IDGenPanel45").setVisible(true);

                that.getView().byId("_IDGenPanel4dhd51").setVisible(true);
                that.getView().byId("_IDGenPanel4dh51").setVisible(true);
                //that.getView().byId("_IDGenPanel451").setVisible(true);

                that.getView().byId("titleB1").setEditable(true);
                that.getView().byId("foreName1").setEditable(true);
                that.getView().byId("middelname1").setEditable(true);
                that.getView().byId("surname1").setEditable(true);
                that.getView().byId("contStartDate1").setEditable(true);
                // that.getView().byId("empAdd1").setEditable(true);
                that.getView().byId("streetHouseNo1").setEditable(true);
                that.getView().byId("2ndadd1").setEditable(true);

                that.getView().byId("city1").setEditable(true);

                that.getView().byId("country1").setEditable(true);
                that.getView().byId("postcode1").setEditable(true);
                that.getView().byId("homeTelephone1").setEditable(true);
                that.getView().byId("mobileTelephone1").setEditable(true);
                that.getView().byId("emailAdd1").setEditable(true);
                that.getView().byId("addEmergencyContact1").setEnabled(true);

              }
            }
          });
        } else {
          MessageBox.error("Please fill all mandatory fields");
        }

      },

      onChangeEmergencySecond: function (oEvent) {
        var checked = this.getView().byId("_IDGenCheckBox2").getSelected();
        if (checked) {
          this.getView().byId("idSecondEmergency").setVisible(true);
        } else {
          this.getView().byId("idSecondEmergency").setVisible(false);
        }
      },

      onAddEmergency: function (oEvent) {
        var checked = this.getView().byId("addEmergencyContact1").getSelected();
        if (checked) {
          this.getView().byId("idAddEmergency").setVisible(true);
        } else {
          this.getView().byId("idAddEmergency").setVisible(false);
        }
      },

      onAddComment: function () {
        sap.ui.core.BusyIndicator.show();
        var oComm = this.getView().byId("_IDGenTextArea2").getValue();
        var CommExist = this.getView().byId("_IDGenTextArea1").getValue();
        var newDate = new Date();
        var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
          style: 'long'
        });
        var oDate = oDateFormat.format(newDate)

        if (oComm == "") {
          sap.ui.core.BusyIndicator.hide();
          confirm("Add the Comment first");
        }
        else {

          //initiator values

          var details = initiatorName;

          if (CommExist == "") {
            var oAuthComm = "Comments added by " + details + " on " + oDate + "  at Status Initial - \n" + oComm;
          }
          else {
            oAuthComm = CommExist + "\n\nComments added by " + details + " on " + oDate + " at Status Initial - \n" + oComm;
          }
          this.getView().byId("_IDGenTextArea1").setVisible(true);
          this.getView().byId("_IDGenLabeldf11").setVisible(true);
          this.getView().byId("_IDGenTextArea1").setValue(oAuthComm);
          this.getView().byId("_IDGenTextArea2").setValue("");
          sap.ui.core.BusyIndicator.hide();
        }

      },


      finalValidations: function (oEvent) {
        var flag = false;
        var aControls = this.getView().getControlsByFieldGroupId("sectionE");
        aControls.forEach(function (oControl) {
          if (oControl.getValue != undefined && oControl.getValue() == "") {
            oControl.setValueState(sap.ui.core.ValueState.Error);
            sap.ui.core.BusyIndicator.hide();
            flag = true;
            if (flag) {
              return flag;
            }
          }
        });
        return flag

      },

      finalValidationsSectionB: function (oEvent) {
        var flag = false;
        var aControls = this.getView().getControlsByFieldGroupId("sectionB");
        aControls.forEach(function (oControl) {
          if (oControl.getValue != undefined && oControl.getValue() == "") {
            oControl.setValueState(sap.ui.core.ValueState.Error);
            sap.ui.core.BusyIndicator.hide();
            flag = true;
            if (flag) {
              return flag;
            }
          }
        });
        return flag

      },
      //sectionBSC

      finalValidationsBSC: function (oEvent) {
        var flag = false;
        var aControls = this.getView().getControlsByFieldGroupId("sectionBSC");
        aControls.forEach(function (oControl) {
          if (oControl.getValue != undefined && oControl.getValue() == "") {
            oControl.setValueState(sap.ui.core.ValueState.Error);
            sap.ui.core.BusyIndicator.hide();
            flag = true;
            if (flag) {
              return flag;
            }
          }
        });
        return flag

      },

      oSaveCall: function (call) {
        sap.ui.core.BusyIndicator.show();
        var purpose = "I";
        var Request_Payload = this.payload(purpose, "");
        ///sap/opu/odata/sap/ZSFGTGW_NS01_SRV/ZSFGT_NS01Set
        this.getOwnerComponent().getModel("ZSFGTGW_NS01_SRV").create("/ZSFGT_NS01Set",
          Request_Payload, {

          success: function (oData) {
            // MessageBox.success("Saved successfully");
            console.log(oData.Formid);
            sap.ui.core.BusyIndicator.hide();
            if (call == "submit") {
              this.workflowCall();
              var jobOrg = this.getView().getModel("oneModel").getProperty("/jobInfoOrganisation");
              formOwnerCode = jobOrg.managerId;
              this.s4LogCreation("S", this.InitiatorName);
            } else {
              this.s4LogCreation("E", this.InitiatorName);
              sap.m.MessageBox.success(`Form: ${this.getView().byId("_IDGenInput2").getValue()} is saved as draft successfully`);
            }


          }.bind(this),
          error: function (oData) {
            //MessageBox.error("Error");
            sap.ui.core.BusyIndicator.hide();
            MessageBox.error(JSON.parse(oData.responseText).error.message.value);
          }
        });
      },
      onSave: function (oEvent) {

        if (this.getView().getModel("oneModel").getProperty("/disable") && this.getView().getModel("oneModel").getProperty("/disable/mode") === "bsc") {
          var aControls = this.getView().getControlsByFieldGroupId("sectionBSC");
          aControls.forEach(function (oControl) {
            if (oControl.getValue != undefined) {
              oControl.setValueState(sap.ui.core.ValueState.None);
            }
          });
          var checkValidation = this.finalValidationsBSC(oEvent);

          if (checkValidation) {
            MessageBox.error(`You have not filled all the required fields`);
          } else {
            var that = this;
            MessageBox.confirm("Do you want to save as draft?", {
              actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
              emphasizedAction: MessageBox.Action.Yes,
              onClose: function (sAction) {
                if (sAction === "YES") {
                  that.oSaveCall("save");
                }
              }.bind(this)
            });
          }
        } else {
          var that = this;
          MessageBox.confirm("Do you want to save as draft?", {
            actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
            emphasizedAction: MessageBox.Action.Yes,
            onClose: function (sAction) {
              if (sAction === "YES") {
                that.oSaveCall("save");
              }
            }.bind(this)
          });

        }


      },

      onSubmit: function (oEvent) {
        var aControls = this.getView().getControlsByFieldGroupId("sectionE");
        aControls.forEach(function (oControl) {
          if (oControl.getValue != undefined) {
            oControl.setValueState(sap.ui.core.ValueState.None);
          }
        });
        var checkValidation = this.finalValidations(oEvent);
        // if (!bscFlag && !approverFlag && this.getView().byId("_IDGenComboBox41").getSelectedKey()) {
        //   var checkValidationB = this.finalValidationsSectionB(oEvent);
        // }
        // if (checkValidation) {
        //   MessageBox.error(`You have not filled all the required fields`);
        // } else {
        var that = this;
        MessageBox.alert("Do you want to submit the form?", {
          title: "Submit Form",
          actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.Yes,
          onClose: function (sAction) {
            if (sAction === "YES") {
              that.oSaveCall("submit");
            }
          }
        });
        // }
      },

      _dateForS4: function (date) {
        var temp = new Date(date);
        var temp1 = (temp.toDateString()).toString();
        return temp1.split(' ').slice(1).join(' ')
      },

      convToMillisec: function (date) {
        if (date) {
          var temp = new Date(date);
          var timeInMillisecond = Number((temp.getTime()) + 21600000);
          return timeInMillisecond.toString();
        } else return "";
      },
      payload: function (purpose, delInd) {

        var oModelWS = this.getView().getModel("WSModel") ? this.getView().getModel("WSModel").getProperty("/WSPreviewItems") : [];

        // Preparing data for Work Schedules
        var wsData = [];
        for (let i = 0; i < oModelWS.length; i++) {
          var objData = Object.entries(oModelWS[i]);
          objData.forEach(function (oItem, index) {
            if (oItem[1].DaysName) {
              var prepareWS = {
                "Formid": this.getView().byId("_IDGenInput2").getValue() != '' ? this.getView().byId("_IDGenInput2").getValue() : '',
                "Counter": i.toString(),
                "DaysName": oItem[1].DaysName,
                "Type": "Hours",
                "Value": oItem[1][oItem[0]],
                "ScheduleDay": oItem[1].ScheduleDay
              }
              wsData.push(prepareWS);
            }
          }.bind(this));
        }

        var payload = {
          "Formid": this.getView().byId("_IDGenInput2").getValue() != '' ? this.getView().byId("_IDGenInput2").getValue() : '',
          "Initiator": this.getView().byId("idInitiator").getValue() != '' ? this.getView().byId("idInitiator").getValue() : '',
          "Zdate": this.getView().byId("DatePicker01").getValue() != '' ? this._dateForS4(this.getView().byId("DatePicker01").getValue()) : '',
          "DateInt": this.convToMillisec(this.getView().byId("DatePicker01").getValue()) != '' ? this.convToMillisec(this.getView().byId("DatePicker01").getValue()) : '', //"19.12.2023",
          "Organization": this.getView().byId("_IDGenInput4").getValue() != '' ? this.getView().byId("_IDGenInput4").getValue() : '', // "1001",
          "CostCenter": this.getView().byId("_IDGen1Inpu1t4").getValue() != '' ? this.getView().byId("_IDGen1Inpu1t4").getValue() : '', //"CC01",
          "CostCenterCode": initiator,
          "Approver": this.getView().byId("approver").getValue() != '' ? this.getView().byId("approver").getValue() : '', // "Approver",
          "ApproverCode": this.ApproverCode != undefined ? this.ApproverCode : approverCode, //"AppCode",
          "userID": userId ? userId : "",
          "CompanyCode": companyCode,
          "Paygroup": payGroup,

          "EmployeedOrganization": this.getView().byId("_IDGenComboBox1").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox1").getSelectedItem().getKey() : this.getView().byId("_IDGenComboBox1").getSelectedKey(),
          "SelectEmployee": this.getView().byId("_IDGenComboBox41").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox41").getSelectedItem().getText() : this.getView().byId("_IDGenComboBox41").getValue(), //"4789 Std Candidate 134",
          "SelEmpCode": this.getView().byId("_IDGenComboBox41").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox41").getSelectedItem().getKey() : this.getView().byId("_IDGenComboBox41").getSelectedKey(),// "4789",

          "NewEmployee": this.getView().byId("idempCame").getSelectedItem() != null ? this.getView().byId("idempCame").getSelectedItem().getKey() : this.getView().byId("idempCame").getSelectedKey(), //  "GCC Council",
          "NewEmployeeText": this.getView().byId("idempCame").getSelectedItem() != null ? this.getView().byId("idempCame").getSelectedItem().getText() : this.getView().byId("idempCame").getValue() ? this.getView().byId("idempCame").getValue() : this.getView().byId("idempCame1").getValue(),
          "PreviousEmp": this.getView().byId("_IDGenInput10").getValue() != '' ? this.getView().byId("_IDGenInput10").getValue() : '', // "Teacher",
          "OrgContType": this.getView().byId("_IDGenComboBox411").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox411").getSelectedItem().getText() : this.getView().byId("_IDGenComboBox411").getValue(), //"Cont Type",
          "OrgContTypeCode": this.getView().byId("_IDGenComboBox411").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox411").getSelectedItem().getKey() : this.getView().byId("_IDGenComboBox411").getSelectedKey(), // "Cont Type",
          "PositionTitle": this.getView().byId("_IDGenInput11").getValue() != '' ? this.getView().byId("_IDGenInput11").getValue() : '', // "Teacher",
          "PosCostCentre": this.getView().byId("_IDGenInput112").getValue() != '' ? this.getView().byId("_IDGenInput112").getValue() : '', //  "00000107622 Down Ampney Church of England ",
          "PosCcenterCode": this.getView().byId("_IDGenInput112").getValue() != '' ? this.getView().byId("_IDGenInput112").getValue() : '', //  "107622",
          "ConfirmedButton": this.getView().byId("_IDGenButton122").getText("Confirmed") == 'Confirmed' ? "X" : '',


          "Title": this.getView().byId("titleB1").getSelectedItem() != null ? this.getView().byId("titleB1").getSelectedItem().getText() : this.getView().byId("titleB1").getValue(),

          "TitleCode": this.getView().byId("titleB1").getSelectedItem() != null ? this.getView().byId("titleB1").getSelectedItem().getKey() : this.getView().byId("titleB1").getSelectedKey(),
          "Forename": this.getView().byId("foreName1").getValue() != '' ? this.getView().byId("foreName1").getValue() : '', // "Sandeep",
          "Middlename": this.getView().byId("middelname1").getValue() != '' ? this.getView().byId("middelname1").getValue() : '', // "Singh",
          "Surname": this.getView().byId("surname1").getValue() != '' ? this.getView().byId("surname1").getValue() : '', // "Singh",
          "SerStartDate": this.getView().byId("contStartDate1").getValue() != '' ? this._dateForS4(this.getView().byId("contStartDate1").getValue()) : '',
          "SerStartDateInt": this.convToMillisec(this.getView().byId("contStartDate1").getValue()) != '' ? this.convToMillisec(this.getView().byId("contStartDate1").getValue()) : '', //"19.12.2023",
          // "EmpAddress": this.getView().byId("empAdd1").getValue() != '' ? this.getView().byId("empAdd1").getValue() : '', // "EmpAddress",
          "Houseno": this.getView().byId("streetHouseNo1").getValue() != '' ? this.getView().byId("streetHouseNo1").getValue() : '', // "House No",
          "SecAddress": this.getView().byId("2ndadd1").getValue() != '' ? this.getView().byId("2ndadd1").getValue() : '', //"Second Address",
          // "District":this.getView().byId("_IDGenInput112").getValue() != '' ? this.getView().byId("_IDGenInput112").getValue() : '', // "District",
          "City": this.getView().byId("city1").getValue() != '' ? this.getView().byId("city1").getValue() : '', // "City",
          "County": this.getView().byId("country1").getSelectedItem() != null ? this.getView().byId("country1").getSelectedItem().getText() : this.getView().byId("country1").getValue(), // "County",
          "CountyCode": this.getView().byId("country1").getSelectedItem() != null ? this.getView().byId("country1").getSelectedItem().getKey() : this.getView().byId("country1").getSelectedKey(),
          "Postcode": this.getView().byId("postcode1").getValue() != '' ? this.getView().byId("postcode1").getValue() : '', // "201301",
          "TelNo": this.getView().byId("homeTelephone1").getValue() != '' ? this.getView().byId("homeTelephone1").getValue() : '', //"9911535981",
          "MobNo": this.getView().byId("mobileTelephone1").getValue() != '' ? this.getView().byId("mobileTelephone1").getValue() : '', // "9911535981",
          "EmailAdd": this.getView().byId("emailAdd1").getValue() != '' ? this.getView().byId("emailAdd1").getValue() : '', // "abc@abc.com",

          "TelType": "B",
          "TelFlag": "X",
          "MobType": "P",
          "MobFlag": "X",
          "EmailType": "EmailType",

          "EmergencyAdd": this.getView().byId("addEmergencyContact1").getSelected() == true ? "X" : '',//"X",addEmergencyContact1
          "Dob": this.getView().byId("Dob11").getValue() != '' ? this._dateForS4(this.getView().byId("Dob11").getValue()) : '', //"20.09.1999",
          "DobInt": this.getView().byId("Dob11").getValue() != '' ? this.convToMillisec(this.getView().byId("Dob11").getValue()) : '', //"20.09.1999",
          "InsuranceNo": this.getView().byId("nationalIns1").getValue() != '' ? this.getView().byId("nationalIns1").getValue() : '', //"Insurance No",
          "Nationality": this.getView().byId("Nationality1").getSelectedItem() != null ? this.getView().byId("Nationality1").getSelectedItem().getText() : this.getView().byId("Nationality1").getValue(), //"Indian",
          "NatCode": this.getView().byId("Nationality1").getSelectedItem() != null ? this.getView().byId("Nationality1").getSelectedItem().getKey() : this.getView().byId("Nationality1").getSelectedKey(), //"IN",
          "Disability": this.getView().byId("Disability1").getSelectedItem() != null ? this.getView().byId("Disability1").getSelectedItem().getText() : this.getView().byId("Disability1").getValue(), // "No",
          "DisabilityCode": this.getView().byId("Disability1").getSelectedItem() != null ? this.getView().byId("Disability1").getSelectedItem().getKey() : this.getView().byId("Disability1").getSelectedKey(), // "No",
          "Ethicity": this.getView().byId("Ethicity1").getSelectedItem() != null ? this.getView().byId("Ethicity1").getSelectedItem().getText() : this.getView().byId("Ethicity1").getValue(), //"Ethicity",
          "EthnicityCode": this.getView().byId("Ethicity1").getSelectedItem() != null ? this.getView().byId("Ethicity1").getSelectedItem().getKey() : this.getView().byId("Ethicity1").getSelectedKey(), // "Ethicity",

          "Gender": this.getView().byId("Gender1").getSelectedItem() != null ? this.getView().byId("Gender1").getSelectedItem().getText() : this.getView().byId("Gender1").getValue(), //"Male",
          "GenderCode": this.getView().byId("Gender1").getSelectedItem() != null ? this.getView().byId("Gender1").getSelectedItem().getKey() : this.getView().byId("Gender1").getSelectedKey(), // "M",
          "DbsNo": this.getView().byId("DBS1").getValue() != '' ? this.getView().byId("DBS1").getValue() : '', //"123",
          "RegNo": this.getView().byId("TeachRegNum1").getValue() != '' ? this.getView().byId("TeachRegNum1").getValue() : '', //"321",
          "ClearanceDate": this.getView().byId("ClearDate1").getValue() != '' ? this._dateForS4(this.getView().byId("ClearDate1").getValue()) : '', //"19.12.2023",
          "ClearDateInt": this.getView().byId("ClearDate1").getValue() != '' ? this.convToMillisec(this.getView().byId("ClearDate1").getValue()) : '', //"19.12.2023",
          "IssueDate": this.getView().byId("issuDate1").getValue() != '' ? this._dateForS4(this.getView().byId("issuDate1").getValue()) : '', //"19.12.2023",
          "IssueDateInt": this.getView().byId("issuDate1").getValue() != '' ? this.convToMillisec(this.getView().byId("issuDate1").getValue()) : '', //"19.12.2023",
          "BankSortCode": this.getView().byId("BankSort1").getValue() != '' ? this.getView().byId("BankSort1").getValue() : '', //"1234567",
          "BankName": this.getView().byId("BankName1").getValue() != '' ? this.getView().byId("BankName1").getValue() : '', //"ABC Bank",
          "BankAccNo": this.getView().byId("BankAccNum1").getValue() != '' ? this.getView().byId("BankAccNum1").getValue() : '', //"12321312",
          "BuildSocRefNo": this.getView().byId("BuildingSoc1").getValue() != '' ? this.getView().byId("BuildingSoc1").getValue() : '', //"RefNo123",
          "StreetAdd": this.getView().byId("_IDGefnInput11").getValue() != '' ? this.getView().byId("_IDGefnInput11").getValue() : '', //"Street1",
          "AddLine": this.getView().byId("_IDGefnInput12").getValue() != '' ? this.getView().byId("_IDGefnInput12").getValue() : '', //"Address1",
          // "DistrictF": this.getView().byId("_IDGefnInput14").getValue() != '' ? this.getView().byId("").getValue() : '',//"District1",
          "CityF": this.getView().byId("_IDGefnInput14").getValue() != '' ? this.getView().byId("_IDGefnInput14").getValue() : '', //"City1",

          "CountyF": this.getView().byId("_IDGenItem6").getSelectedItem() != null ? this.getView().byId("_IDGenItem6").getSelectedItem().getText() : this.getView().byId("_IDGenItem6").getValue(), // "County1",
          "CountyCodeF": this.getView().byId("_IDGenItem6").getSelectedItem() != null ? this.getView().byId("_IDGenItem6").getSelectedItem().getKey() : this.getView().byId("_IDGenItem6").getSelectedKey(), //"County1Code",
          "PostCodeF": this.getView().byId("_IDGenInput15").getValue() != '' ? this.getView().byId("_IDGenInput15").getValue() : '', //"201301",
          "NameF": this.getView().byId("_IDGenInput16").getValue() != '' ? this.getView().byId("_IDGenInput16").getValue() : '', //"Name1",
          "SurnameF": this.getView().byId("_IDGenInput16s").getValue() != '' ? this.getView().byId("_IDGenInput16s").getValue() : '',//"Surname 1",
          "RelationF": this.getView().byId("_IDGenInput17").getSelectedItem() != null ? this.getView().byId("_IDGenInput17").getSelectedItem().getText() : this.getView().byId("_IDGenInput17").getValue(),//"Son",
          "RelationFCode": this.getView().byId("_IDGenInput17").getSelectedItem() != null ? this.getView().byId("_IDGenInput17").getSelectedItem().getKey() : this.getView().byId("_IDGenInput17").getSelectedKey(), //"Son",
          "HomTelNoF": this.getView().byId("_IDGenInput18").getValue() != '' ? this.getView().byId("_IDGenInput18").getValue() : '',//"123441",
          // "MobileNoF": this.getView().byId("_IDGenInput19").getValue() != '' ? this.getView().byId("_IDGenInput19").getValue() : '',//"412322",

          "MobileNo2F": "",
          "PhnTypeF": "X",
          "PhnFlagF": "X",
          "MobTypeF": "X",
          "MobFlagF": "X",

          "SecondEmergencycontact": this.getView().byId("_IDGenCheckBox2").getSelected() == true ? "X" : '', //_IDGenCheckBox2 "X",
          "StreetAddSec": this.getView().byId("_IDGefnInput112").getValue() != '' ? this.getView().byId("_IDGefnInput112").getValue() : '', // "Street2",
          "AddLineSec": this.getView().byId("_IDGefnInput122").getValue() != '' ? this.getView().byId("_IDGefnInput122").getValue() : '', //"Address 2",
          // "DistrictSec": this.getView().byId("").getValue() != '' ? this.getView().byId("").getValue() : '',"District2",
          "CitySec": this.getView().byId("_IDGefnInput142").getValue() != '' ? this.getView().byId("_IDGefnInput142").getValue() : '', //"County 2",

          "CountySec": this.getView().byId("idree4d2").getSelectedItem() != null ? this.getView().byId("idree4d2").getSelectedItem().getText() : this.getView().byId("idree4d2").getValue(), // "City 2",
          "CountyCodeSec": this.getView().byId("idree4d2").getSelectedItem() != null ? this.getView().byId("idree4d2").getSelectedItem().getKey() : this.getView().byId("idree4d2").getSelectedKey(), //"CountyCode2",
          "PostCodeSec": this.getView().byId("_IDGenInput152").getValue() != '' ? this.getView().byId("_IDGenInput152").getValue() : '', // "201301",
          "NameSec": this.getView().byId("_IDGenInput162").getValue() != '' ? this.getView().byId("_IDGenInput162").getValue() : '', // "Name 2",
          "SurnameSec": this.getView().byId("_IDGenInput162s").getValue() != '' ? this.getView().byId("_IDGenInput162s").getValue() : '', // "Surname 2",
          "RelationSec": this.getView().byId("_IDGenInput172").getSelectedItem() != null ? this.getView().byId("_IDGenInput172").getSelectedItem().getText() : this.getView().byId("_IDGenInput172").getValue(), // "Son",
          "RelCodeSec": this.getView().byId("_IDGenInput172").getSelectedItem() != null ? this.getView().byId("_IDGenInput172").getSelectedItem().getKey() : this.getView().byId("_IDGenInput172").getSelectedKey(), //"Son",
          "HomTelNoSec": this.getView().byId("_IDGenInput182").getValue() != '' ? this.getView().byId("_IDGenInput182").getValue() : '', // "12321312",
          // "MobileNoSec": this.getView().byId("_IDGenInput192").getValue() != '' ? this.getView().byId("_IDGenInput192").getValue() : '', // "132312",

          "PhnTypeSec": "X",
          "PhnFlagSec": "X",
          "MobTypeSec": "X",
          "MobFlagSec": "X",

          "ContractType": this.getView().byId("_IDGenComboBox17").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox17").getSelectedItem().getText() : this.getView().byId("_IDGenComboBox17").getValue(), // Permanent,
          "ContTypeCode": this.getView().byId("_IDGenComboBox17").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox17").getSelectedItem().getKey() : this.getView().byId("_IDGenComboBox17").getSelectedKey(), // P,
          "StartDate": this.getView().byId("_IDGenDatePicker1").getValue() != '' ? this.dateToReq(this.getView().byId("_IDGenDatePicker1").getValue()) : '', // "19.12.2023",
          "StartDateInt": this.getView().byId("_IDGenDatePicker1").getValue() != '' ? this.convToMillisec(this.getView().byId("_IDGenDatePicker1").getValue()) : '', // "19.12.2023",
          "EndDate": this.getView().byId("_IDGenDatePicker2").getValue() != '' ? this.dateToReq(this.getView().byId("_IDGenDatePicker2").getValue()) : '', // "",
          "EndDateInt": this.getView().byId("_IDGenDatePicker2").getValue() != '' ? this.convToMillisec(this.getView().byId("_IDGenDatePicker2").getValue()) : '', // "",
          "Grade": this.getView().byId("_IDGenComboBox2").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox2").getSelectedItem().getText() : this.getView().byId("_IDGenComboBox2").getValue(), // "01-Grade",
          "GradeCode": this.getView().byId("_IDGenComboBox2").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox2").getSelectedItem().getKey() : this.getView().byId("_IDGenComboBox2").getSelectedKey(), // "01",
          "ScalePoint": this.getView().byId("_IDGenComboBox3").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox3").getSelectedItem().getText() : this.getView().byId("_IDGenComboBox3").getValue(), // "01",
          "ScalePointCode": this.getView().byId("_IDGenComboBox3").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox3").getSelectedItem().getKey() : this.getView().byId("_IDGenComboBox3").getSelectedKey(), // "01",
          "ClaimPos": this.getView().byId("_IDGenComboBox6").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox6").getSelectedItem().getText() : this.getView().byId("_IDGenComboBox6").getValue(), // "11",
          "FteDec": this.getView().byId("idFTE").getValue() != '' ? this.getView().byId("idFTE").getValue() : '',
          "FtePerc": this.getView().byId("idFTEperc").getValue() != '' ? this.getView().byId("idFTEperc").getValue() : '',
          "HoursPerWeek": this.getView().byId("Hoursperweek").getValue() != '' ? this.getView().byId("Hoursperweek").getValue() : '',
          "ProbPeriod": this.getView().byId("_IDGenInput141").getSelectedItem() != null ? this.getView().byId("_IDGenInput141").getSelectedItem().getText() : this.getView().byId("_IDGenInput141").getValue(), // "30",
          "ProbPerEndDt": this.getView().byId("probationEndDatePic").getValue() != '' ? this._dateForS4(this.getView().byId("probationEndDatePic").getValue()) : '', //"",
          "ProbPerEndDtInt": this.getView().byId("probationEndDatePic").getValue() != '' ? this.convToMillisec(this.getView().byId("probationEndDatePic").getValue()) : '', // "",
          "WorkingWeeks": this.getView().byId("idWeekYeardrop").getSelectedItem() != null ? this.getView().byId("idWeekYeardrop").getSelectedItem().getText() : this.getView().byId("idWeekYeardrop").getValue(),
          "WorkingWeeksInt": this.getView().byId("idWeekYeardrop").getSelectedItem() != null ? this.getView().byId("idWeekYeardrop").getSelectedItem().getKey() : this.getView().byId("idWeekYeardrop").getSelectedKey(),
          "AddWorkWeek": this.getView().byId("idWorkingWeeksdrop").getSelectedItem() != null ? this.getView().byId("idWorkingWeeksdrop").getSelectedItem().getText() : this.getView().byId("idWorkingWeeksdrop").getValue(),
          "AddWorkWeekInt": this.getView().byId("idWorkingWeeksdrop").getSelectedItem() != null ? this.getView().byId("idWorkingWeeksdrop").getSelectedItem().getKey() : this.getView().byId("idWorkingWeeksdrop").getSelectedKey(),

          "WageType1": "1005",
          "WageTypeCheck1": this.getView().byId("idWeekYeardrop").getSelectedItem() != null ? "X" : this.getView().byId("idWeekYeardrop").getValue() != "" ? "X" : "",
          "WageTypeAmt1": this.getView().byId("idWeekYeardrop").getSelectedItem() != null ? this.getView().byId("idWeekYeardrop").getSelectedItem().getText() : this.getView().byId("idWeekYeardrop").getValue(),

          "WageType2": "1010",
          "WageTypeCheck2": this.getView().getModel("oneModel").getProperty("/wage2Value") != "" || undefined ? "X" : "",
          "WageTypeAmt2": this.getView().getModel("oneModel").getProperty("/wage2Value") != "" || undefined ? this.getView().getModel("oneModel").getProperty("/wage2Value") : "",

          "WageType3": "1011",
          "WageTypeCheck3": this.getView().byId("idWorkingWeeksdrop").getSelectedItem() != null ? "X" : this.getView().byId("idWorkingWeeksdrop").getValue() != "" ? "X" : "",
          "WageTypeAmt3": this.getView().byId("idWorkingWeeksdrop").getSelectedItem() != null ? this.getView().byId("idWorkingWeeksdrop").getSelectedItem().getText() : this.getView().byId("idWorkingWeeksdrop").getValue(),


          "TypeOfPos": this.getView().byId("idSelectTypePos1").getSelectedItem() != null ? this.getView().byId("idSelectTypePos1").getSelectedItem().getText() : this.getView().byId("idSelectTypePos1").getValue(),
          "TypeOfPosCode": this.getView().byId("idSelectTypePos1").getSelectedItem() != null ? this.getView().byId("idSelectTypePos1").getSelectedItem().getKey() : this.getView().byId("idSelectTypePos1").getSelectedKey(),
          "SelectPos": this.getView().byId("selectPositionCombobox").getSelectedItem() != null ? this.getView().byId("selectPositionCombobox").getSelectedItem().getText() : this.getView().byId("selectPositionCombobox").getValue(),
          "SelectPosCode": this.getView().byId("selectPositionCombobox").getSelectedItem() != null ? this.getView().byId("selectPositionCombobox").getSelectedItem().getKey() : this.getView().byId("selectPositionCombobox").getSelectedKey(),
          "SecEPosCcenter": this.getView().byId("idPositionCostCentre").getSelectedItem() != null ? this.getView().byId("idPositionCostCentre").getSelectedItem().getText() : this.getView().byId("idPositionCostCentre").getValue(),
          "SecEPosCcenterCode": this.getView().byId("idPositionCostCentre").getSelectedItem() != null ? this.getView().byId("idPositionCostCentre").getSelectedItem().getKey() : this.getView().byId("idPositionCostCentre").getSelectedKey(),
          "SecEPosTitle": this.getView().byId("idJobTitle").getValue() != '' ? this.getView().byId("idJobTitle").getValue() : '',
          "EmpSubGrp": this.getView().byId("idSelectTypePos1").getSelectedItem() != null ? this.getView().byId("idSelectTypePos1").getSelectedItem().getKey() : this.getView().byId("idSelectTypePos1").getSelectedKey(),
          "EmpSubGrpCode": emplSubGroup != '' ? emplSubGroup : '',
          "SecEGrade": this.getView().byId("idGrade").getValue() != '' ? this.getView().byId("idGrade").getValue() : '',
          "SecEGradCode": this.getView().byId("idGrade").getValue() != '' ? this.getView().byId("idGrade").getValue() : '',
          "Allowance1": this.getView().byId("_IDGenComboBox8").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox8").getSelectedItem().getText() : this.getView().byId("_IDGenComboBox8").getValue(), // "1100",
          "AllowCode1": this.getView().byId("_IDGenComboBox8").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox8").getSelectedItem().getKey() : this.getView().byId("_IDGenComboBox8").getSelectedKey(), // // "1100",
          "Amount1": this.getView().byId("_IDGenInput191").getValue() != '' ? this.getView().byId("_IDGenInput191").getValue() : '', // "100",
          "Unit1": this.getView().byId("_IDGenInput12").getValue() != '' ? this.getView().byId("_IDGenInput12").getValue() : '', //"No",
          "Allowance2": this.getView().byId("_IDGenComboBox82").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox82").getSelectedItem().getText() : this.getView().byId("_IDGenComboBox82").getValue(), // "1100",
          "AllowCode2": this.getView().byId("_IDGenComboBox82").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox82").getSelectedItem().getKey() : this.getView().byId("_IDGenComboBox82").getSelectedKey(), // // "1100",
          "Amount2": this.getView().byId("_IDGenInput1912").getValue() != '' ? this.getView().byId("_IDGenInput1912").getValue() : '', // "231",
          "Unit2": this.getView().byId("_IDGenInput122").getValue() != '' ? this.getView().byId("_IDGenInput122").getValue() : '', // "Unit",
          "Allowance3": this.getView().byId("_IDGenComboBox83").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox83").getSelectedItem().getText() : this.getView().byId("_IDGenComboBox83").getValue(), // "1100",
          "AllowCode3": this.getView().byId("_IDGenComboBox83").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox83").getSelectedItem().getKey() : this.getView().byId("_IDGenComboBox83").getSelectedKey(), // // "1100",
          "Amount3": this.getView().byId("_IDGenInput1913").getValue() != '' ? this.getView().byId("_IDGenInput1913").getValue() : '', // "223",
          "Unit3": this.getView().byId("_IDGenInput123").getValue() != '' ? this.getView().byId("_IDGenInput123").getValue() : '', //"UnNo.",


          "Personalnumber": this.getView().byId("idPersonalNum").getValue() != '' ? this.getView().byId("idPersonalNum").getValue() : '', //"12312",
          "PosTitle": this.getView().byId("idPosTitleD").getValue() != '' ? this.getView().byId("idPosTitleD").getValue() : '', //"Teacher",
          "Pa20EndDate": this.getView().byId("idPA20").getValue() != '' ? this._dateForS4(this.getView().byId("idPA20").getValue()) : '', // "20.12.2023",
          "Pa20EndDtInt": this.getView().byId("idPA20").getValue() != '' ? this.convToMillisec(this.getView().byId("idPA20").getValue()) : '', //"20.12.2023",
          "Selectoption": this.getView().byId("idSelectOption").getSelectedItem() != null ? this.getView().byId("idSelectOption").getSelectedItem().getText() : this.getView().byId("idSelectOption").getValue(), // "SelOpt",
          "SelOptCode": this.getView().byId("idSelectOption").getSelectedItem() != null ? this.getView().byId("idSelectOption").getSelectedItem().getKey() : this.getView().byId("idSelectOption").getSelectedKey(), // "",
          "LeaSchoolname": this.getView().byId("idLEASCHOOL").getValue() != '' ? this.getView().byId("idLEASCHOOL").getValue() : '', //"Lea School",
          "NoHours": this.getView().byId("idNumberHoursD").getValue() != '' ? this.getView().byId("idNumberHoursD").getValue() : '', // "1",
          "seqNumber": this.getView().getModel("oneModel").getProperty("/SecDTerminData") != undefined || this.getView().getModel("oneModel").getProperty("/SecDTerminData") != "" ? this.getView().getModel("oneModel").getProperty("/SecDTerminData/seqNumber") : "",
          "TermStartDt": this.getView().getModel("oneModel").getProperty("/SecDTerminData") != undefined || this.getView().getModel("oneModel").getProperty("/SecDTerminData") != "" ? this.getView().getModel("oneModel").getProperty("/SecDTerminData/startDate") : "",
          "TermStartDtInt": this.getView().getModel("oneModel").getProperty("/SecDTerminData") != undefined || this.getView().getModel("oneModel").getProperty("/SecDTerminData") != "" ? this.convToMillisec(this.getView().getModel("oneModel").getProperty("/SecDTerminData/startDate")) : "",

          "Purpose": purpose,
          "DeleteIndicator": delInd,
          "hdr_to_com_nav": [
            {
              "Formid": this.getView().byId("_IDGenInput2").getValue() != '' ? this.getView().byId("_IDGenInput2").getValue() : '',
              "comment": this.getView().byId("_IDGenTextArea1").getValue() != '' ? this.getView().byId("_IDGenTextArea1").getValue() : ''
            }
          ],
          // paylod for work schedules
          "HeadToWsNav": wsData
        }
        return payload;
      },
      //Work flow call

      workflowCall: function () {
        sap.ui.core.BusyIndicator.show();
        var appUrl = window.location.origin + "/site" + window.location.search.split("&")[0] + window.location.hash.split("?")[0];
        var reqUrl = appUrl.includes("GCC_SemObj") ? appUrl + "&/?formId=" : appUrl + "#?formId=";
        var Formid = this.getView().byId("_IDGenInput2").getValue();
        var wrkFlow = {
          "definitionId": "eu10.gccdev.eforms.nS01",
          "context": {
            "FormID": Formid,
            "formlinkapprover": reqUrl + Formid + "&mode=display",
            "formlinkinitiator": reqUrl + Formid + "&mode=initiator",
            "formlinkbsc": reqUrl + Formid + "&mode=bsc",
            "initiator": useremail
          }
        }
        var prefix = sap.ui.require.toUrl(this.getOwnerComponent().getManifestEntry('/sap.app/id').replaceAll('.', '/')) + "/";
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
              sap.ui.core.BusyIndicator.hide();
              console.log("---task Data---");
              console.log(taskdata);
              console.log("Workflow has been triggered and Form has been Submitted");
              sap.ui.core.BusyIndicator.hide();
              MessageBox.success(`Form: ${this.getView().byId("_IDGenInput2").getValue()} is submitted successfully
              
              Please call ContactUs on 01452 425888 should you have any queries regarding this e-Form.`, {
                actions: [MessageBox.Action.OK],
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (sAction) {
                  if (sAction == sap.m.MessageBox.Action.OK) {
                    // var oHistory, sPreviousHash;
                    // oHistory = History.getInstance();
                    // sPreviousHash = oHistory.getPreviousHash();
                    // if (sPreviousHash == undefined) {
                    // }
                    window.history.go(-1)
                  }
                }
              });
            }.bind(this)).fail(function (XMLHttpRequest, textStatus) {
              sap.ui.core.BusyIndicator.hide();
              MessageBox.error(JSON.parse(XMLHttpRequest.responseText).error.message.value);
            });
          }

        }.bind(this)).fail(function (XMLHttpRequest, textStatus) {

          sap.m.MessageBox.error("Error");
          //alert("error");
          sap.ui.core.BusyIndicator.hide();
        });




      },

      onPrint: function () {
        sap.ui.core.BusyIndicator.show();
        var purpose = "P";
        var Request_Payload = this.payload(purpose, "");
        var formId = this.getView().byId("_IDGenInput2").getValue();

        this.getOwnerComponent().getModel("ZSFGTGW_NS01_SRV").create("/ZSFGT_NS01Set",
          // this.getOwnerComponent().getModel("/ZSFGTGW_NS01_SRV").create("/ZSFGT_NS01Set",
          Request_Payload, {
          success: function (oData) {
            console.log("success S4h");
            sap.ui.core.BusyIndicator.hide();
            var s4url = this.getOwnerComponent().getModel("ZSFGTGW_NS01_SRV").sServiceUrl;    // Give your service name
            var sSource = s4url + "/ZSFGT_NS01_PRINTSet(Formid='" + formId + "')/$value";
            var newTab = window.open(sSource, "_blank");
            newTab.onload = function () {
              // newTab.print();
            }
            // this._pdfViewer = new sap.m.PDFViewer();
            // this.getView().addDependent(this._pdfViewer);
            // this._pdfViewer.setSource(sSource);
            // this._pdfViewer.setTitle("Schools New Starter Form - Print");
            // this._pdfViewer.setShowDownloadButton(false);
            // this._pdfViewer.open();
          }.bind(this),
          error: function (e) {
            console.log("Error S4h");
            sap.ui.core.BusyIndicator.hide();
            MessageBox.error(JSON.parse(e.responseText).error.message.value);
          }
        });
      },

      onCancel: function (oEvent) {
        MessageBox.warning("This will discard all the changes done. Do you wish to proceed?", {
          actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.YES,
          onClose: function (sAction) {
            if (sAction == MessageBox.Action.YES) {
              // var oHistory, sPreviousHash;
              // oHistory = History.getInstance();
              // sPreviousHash = oHistory.getPreviousHash();
              // if (sPreviousHash == undefined) {
              // }
              window.history.go(-1)
            }
          }
        });
      },
      onDelete: function (oEvent) {

        MessageBox.warning("Delete the data in this form and any saved draft version of this form", {
          actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.YES,
          onClose: function (sAction) {
            if (sAction === "YES") {

              var Request_Payload = this.payload("", "X");
              sap.ui.core.BusyIndicator.show();
              this.getOwnerComponent().getModel("ZSFGTGW_NS01_SRV").create("/ZSFGT_NS01Set",
                Request_Payload, {
                success: function (oData) {
                  console.log("success S4h");
                  sap.ui.core.BusyIndicator.hide();
                  this.s4LogCreation("D", this.InitiatorName);
                  // var oHistory, sPreviousHash;
                  // oHistory = History.getInstance();
                  // sPreviousHash = oHistory.getPreviousHash();
                  // if (sPreviousHash == undefined) {
                  // }
                  window.history.go(-1)
                }.bind(this),
                error: function (e) {
                  console.log("Error S4h");
                  sap.ui.core.BusyIndicator.hide();
                }
              });
            }
          }.bind(this)
        });
      },
      //Validation
      onChangeEndDate: function (oEvent) {
        if (oEvent && oEvent.mParameters && oEvent.mParameters.id) {
          this.getView().byId(oEvent.mParameters.id).setValueState(sap.ui.core.ValueState.None);
        }
        var endDate = this.getView().byId("_IDGgenInput12").getValue();
        var startDate = this.getView().byId("_IDGenDatePicker1").getValue();
        if (!startDate) {
          MessageBox.error("Please fill Start Date before entering End Date");
          this.getView().byId("_IDGgenInput12").setValueState(sap.ui.core.ValueState.Error);
          this.getView().byId("_IDGgenInput12").setValueStateText("Please fill Start Date before entering End Date");
        } else {
          this.getView().byId("_IDGgenInput12").setValueState(sap.ui.core.ValueState.None);
          this.getView().byId("_IDGgenInput12").setValueStateText("");
        }
      },
      validateEmail: function (oEvent) {
        if (oEvent && oEvent.mParameters && oEvent.mParameters.id) {
          this.getView().byId(oEvent.mParameters.id).setValueState(sap.ui.core.ValueState.None);
        }
        var email = this.getView().byId("emailAdd1").getValue();
        var mailregex = /^\w+[\w-+\.]*\@\w+([-\.]\w+)*\.[a-zA-Z]{2,}$/;
        if (!mailregex.test(email)) {
          //  MessageBox.error(email + " is not a valid email address");
          this.getView().byId("emailAdd1").setValueState(sap.ui.core.ValueState.Error);
          this.getView().byId("emailAdd1").setValueStateText(email + " is not a valid email address");
        } else {
          this.getView().byId("emailAdd1").setValueState(sap.ui.core.ValueState.None);
          this.getView().byId("emailAdd1").setValueStateText("");
        }
      },
      validateTelePhoneLiveChange: function (oEvent) {
        if (oEvent && oEvent.mParameters && oEvent.mParameters.id) {
          this.getView().byId(oEvent.mParameters.id).setValueState(sap.ui.core.ValueState.None);
        }
        var phone = oEvent.getParameter("newValue");
        // var phone = this.getView().byId("homeTelephone1").getValue();
        if (phone.substring(0, 1) != "0") {
          phone = "0" + phone;
          this.getView().byId(oEvent.getSource().sId).setValue(phone)
        }
        //var mailregex = /^\w+[\w-+\.]*\@\w+([-\.]\w+)*\.[a-zA-Z]{2,}$/;
        if (phone.length > 11) {
          phone = phone.slice(0, phone.length - 1);
          this.getView().byId(oEvent.getSource().sId).setValue(phone);
        }
      },
      validatePhoneLiveChange: function (oEvent) {
        if (oEvent && oEvent.mParameters && oEvent.mParameters.id) {
          this.getView().byId(oEvent.mParameters.id).setValueState(sap.ui.core.ValueState.None);
        }
        var phone = oEvent.getParameter("newValue");
        //var phone = this.getView().byId("mobileTelephone1").getValue();
        if (phone.substring(0, 1) != "0") {
          phone = "0" + phone;
          this.getView().byId(oEvent.getSource().sId).setValue(phone)
        }

        //var mailregex = /^\w+[\w-+\.]*\@\w+([-\.]\w+)*\.[a-zA-Z]{2,}$/;
        if (phone.length > 11) {
          phone = phone.slice(0, phone.length - 1);
          this.getView().byId(oEvent.getSource().sId).setValue(phone);

        }
      },
      validatePostCode: function (oEvent) {
        if (oEvent && oEvent.mParameters && oEvent.mParameters.id) {
          this.getView().byId(oEvent.mParameters.id).setValueState(sap.ui.core.ValueState.None);
        }
        var postCode = oEvent.getParameter("newValue");
        if (postCode.length > 6 && postCode.length <= 8) {
          this.getView().byId(oEvent.getSource().sId).setValueState(sap.ui.core.ValueState.None);
          this.getView().byId(oEvent.getSource().sId).setValueState("");
          // var regexp = /^[A-Z]{1,2}[0-9RCHNQ][0-9A-Z]?\s?[0-9][ABD-HJLNP-UW-Z]{2}$|^[A-Z]{2}-?[0-9]{4}$/;
          // if (regexp.test(postCode)) {

          // }
        } else {
          MessageBox.error(postCode + " is not a valid UK post code");
          this.getView().byId(oEvent.getSource().sId).setValueState(sap.ui.core.ValueState.Error);
          this.getView().byId(oEvent.getSource().sId).setValueState(postCode + " is not a valid UK postcode ");
        }

      },
      validateTelePhone: function (oEvent) {
        if (oEvent && oEvent.mParameters && oEvent.mParameters.id) {
          this.getView().byId(oEvent.mParameters.id).setValueState(sap.ui.core.ValueState.None);
        }
        var phone = oEvent.getParameter("newValue");
        // var phone = this.getView().byId("homeTelephone1").getValue();
        //var mailregex = /^\w+[\w-+\.]*\@\w+([-\.]\w+)*\.[a-zA-Z]{2,}$/;
        if (phone.length != 11) {
          MessageBox.error(phone + " is not a valid home telephone number");
          this.getView().byId(oEvent.getSource().sId).setValueState(sap.ui.core.ValueState.Error);
          this.getView().byId(oEvent.getSource().sId).setValueState(phone + " is not a valid home telephone number");
        } else {
          this.getView().byId(oEvent.getSource().sId).setValueState(sap.ui.core.ValueState.None);
          this.getView().byId(oEvent.getSource().sId).setValueState("");
        }
      },
      validatePhone: function (oEvent) {
        if (oEvent && oEvent.mParameters && oEvent.mParameters.id) {
          this.getView().byId(oEvent.mParameters.id).setValueState(sap.ui.core.ValueState.None);
        }
        var phone = oEvent.getParameter("newValue");
        // var phone = this.getView().byId("mobileTelephone1").getValue();
        //var mailregex = /^\w+[\w-+\.]*\@\w+([-\.]\w+)*\.[a-zA-Z]{2,}$/;
        if (phone.length != 11) {
          MessageBox.error(phone + " is not a valid Phone Number");
          this.getView().byId(oEvent.getSource().sId).setValueState(sap.ui.core.ValueState.Error);
          this.getView().byId(oEvent.getSource().sId).setValueState(phone + " is not a valid home mobile number");
        } else {
          this.getView().byId(oEvent.getSource().sId).setValueState(sap.ui.core.ValueState.None);
          this.getView().byId(oEvent.getSource().sId).setValueState("");
        }
      },
      probationPeriodChange: function (oEvent) {
        if (oEvent && oEvent.mParameters && oEvent.mParameters.id) {
          this.getView().byId(oEvent.mParameters.id).setValueState(sap.ui.core.ValueState.None);
        }
        var ComboYesNo = this.getView().byId("_IDGenInput141").getSelectedKey();
        if (ComboYesNo == "Yes") {
          this.getView().byId("probationEndDate").setVisible(true);
          this.getView().byId("probationEndDatePic").setVisible(true);
          this.getView().byId("probationEndDatePic").setFieldGroupIds("sectionE");
        } else {
          this.getView().byId("probationEndDate").setVisible(false);
          this.getView().byId("probationEndDatePic").setVisible(false);
        }
      },

      onLiveChangeBankSort: function (oEvent) {
        if (oEvent && oEvent.mParameters && oEvent.mParameters.id) {
          this.getView().byId(oEvent.mParameters.id).setValueState(sap.ui.core.ValueState.None);
        }
        var bankSort = oEvent.getParameter("newValue");
        if (bankSort.length > 6) {
          bankSort = bankSort.slice(0, bankSort.length - 1);
          this.getView().byId("BankSort1").setValue(bankSort);

        }

      },
      onLiveChangeBankAcc: function (oEvent) {
        if (oEvent && oEvent.mParameters && oEvent.mParameters.id) {
          this.getView().byId(oEvent.mParameters.id).setValueState(sap.ui.core.ValueState.None);
        }
        var bankAcc = oEvent.getParameter("newValue");
        if (bankAcc.length > 8) {
          bankAcc = bankAcc.slice(0, bankAcc.length - 1);
          this.getView().byId("BankAccNum1").setValue(bankAcc);
        }

      },
      //   onAccNumChange: function (oEvent) {
      //     if(oEvent && oEvent.mParameters &&  oEvent.mParameters.id){
      //       this.getView().byId(oEvent.mParameters.id).setValueState(sap.ui.core.ValueState.None);
      //       }
      //     var value = oEvent.getSource().getValue();
      //     if (value.length < 8 || value.length > 8) {
      //         oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
      //         oEvent.oSource.setValueStateText("Please enter a valid Account Number for GBR that matches the expected ISO format");
      //     } else {
      //         oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
      //     }
      // },
      onBankAccChange: function (oEvent) {
        if (oEvent && oEvent.mParameters && oEvent.mParameters.id) {
          this.getView().byId(oEvent.mParameters.id).setValueState(sap.ui.core.ValueState.None);
        }
        var bankAcc = oEvent.getParameter("newValue");
        if (bankAcc.length != 8) {
          MessageBox.error(bankAcc + " is not a valid Bank account Number");
          this.getView().byId("BankAccNum1").setValueState(sap.ui.core.ValueState.Error);
          this.getView().byId("BankAccNum1").setValueState(bankAcc + " is not a valid Bank account number");
        } else {
          this.bankAcc = bankAcc;
          // bankAcc = "****" + bankAcc.slice(4);
          //this.getView().byId("BankAccNum1").setType("Text");
          //this.getView().byId("BankAccNum1").setValue(bankAcc);
          this.getView().byId("BankAccNum1").setValueState(sap.ui.core.ValueState.None);
          this.getView().byId("BankAccNum1").setValueState("");
        }
      },

      onChangeContractType: function (oEvent) {
        if (oEvent && oEvent.mParameters && oEvent.mParameters.id) {
          this.getView().byId(oEvent.mParameters.id).setValueState(sap.ui.core.ValueState.None);
        }
        var ContractType = this.getView().byId("_IDGenComboBox411").getSelectedKey();
        if (ContractType == "4") {
          this.getView().byId("_IDGenInput141").setSelectedKey("No");
          this.getView().byId("_IDGenInput141").setEditable(false);
        }
      },
      onChangeClaimPosition: function (oEvent) {
        if (oEvent && oEvent.mParameters && oEvent.mParameters.id) {
          this.getView().byId(oEvent.mParameters.id).setValueState(sap.ui.core.ValueState.None);
        }
        var claimPosition = oEvent.getParameter("newValue");
        var isTeacher = this.getView().byId("_IDGenComboBox411").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox411").getSelectedItem().getKey() : this.getView().byId("_IDGenComboBox411").getSelectedKey()
        if (claimPosition == "No") {
          this.getView().byId("Hoursperweek").setValue("");
          this.getView().byId("idFTEperc").setValue("");
          this.getView().byId("idFTE").setValue("");
          if (isTeacher == "4") {
            this.getView().byId("idfte1").setVisible(true);
            this.getView().byId("idfte1").setFieldGroupIds("sectionE");
          }
          else {
            this.getView().byId("idHoursPerWeek1").setVisible(true);
            this.getView().byId("idWeekYear1").setVisible(true);
            this.getView().byId("Hoursperweek").setFieldGroupIds("sectionE");
          }
          //this.getView().byId("idWeekYear1").setFieldGroupIds("sectionE");
        } else {
          this.getView().byId("idHoursPerWeek1").setVisible(false);
          this.getView().byId("idWeekYear1").setVisible(false);
          this.getView().byId("Hoursperweek").setFieldGroupIds("");
          this.getView().byId("idfte1").setFieldGroupIds("");
          this.getView().byId("Hoursperweek").setValue("37.0");
          this.getView().byId("idFTE").setValue("1.0000");
          this.getView().byId("idFTEperc").setValue("100%");
          this.getView().getModel("oneModel").setProperty("/wage2Value", "");
        }
      },

      onFTEChange: function (oEvent) {
        if (oEvent.getSource().getValue() != "") {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
          var value = parseFloat(oEvent.getSource().getValue());
          if (value > 1) {
            oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
            oEvent.getSource().setValueStateText("FTE cannot be greater than 1.0000");
          }
          else {
            oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
            value = value.toFixed(4);
            oEvent.getSource().setValue(value);
            this.getView().byId("idFTEperc").setValue((parseFloat(value) * 100).toFixed(2) + "%");
          }
        }
        else {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
        }
      },

      onWorkingChange: function (oEvent) {
        if (oEvent.getSource().getSelectedItem() != null) {
          var grade = this.getView().byId("_IDGenComboBox2").getSelectedItem() != null ? this.getView().byId("_IDGenComboBox2").getSelectedItem().getKey() : this.getView().byId("_IDGenComboBox2").getSelectedKey();
          var workingWeeks = oEvent.getSource().getSelectedItem().getText();
          this._checkWage2(grade, workingWeeks);
          $.ajax({
            url: serviceURL + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'TermtimeWeeks' and status eq 'A' and externalCode eq '" + workingWeeks.split(".")[0] + "'&$format=json",
            type: 'GET',
            contentType: "application/json",
            success: function (data) {
              if (data.d.results[0])
                this.getView().byId("idWeekYeardrop").getSelectedItem().setKey(data.d.results[0].optionId);
            }.bind(this),
            error: function (e) {
              console.log("error: " + e);
            }
          });
        }
        else if (oEvent.getSource().getValue() == "") {
          this.getView().getModel("oneModel").setProperty("/wage2Value", "")
        }
        else {
          MessageBox.error("Please select a valid value");
        }
      },

      onAddWorkChange: function (oEvent) {
        if (oEvent.getSource().getSelectedItem() != null) {
          var addWorkingWeeks = oEvent.getSource().getSelectedItem().getText();
          $.ajax({
            url: serviceURL + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'TTOAdditionalWeeks' and status eq 'A' and externalCode eq '" + addWorkingWeeks + "'&$format=json",
            type: 'GET',
            contentType: "application/json",
            success: function (data) {
              this.getView().byId("idWorkingWeeksdrop").getSelectedItem().setKey(data.d.results[0].optionId);
            }.bind(this),
            error: function (e) {
              console.log("error: " + e);
            }
          });
        }
        else {
          MessageBox.error("Please select a valid value");
        }
      },

      _getTTOWeeks: function (grade) {
        grade = "XXXXXXXX"
        $.ajax({
          url: serviceURL + "/odata/v2/cust_ZFLM_TTO_EC?$filter=cust_PayScaleGroup eq '" + grade + "' and cust_CompanyCode eq '" + companyCode + "'&$format=json",
          type: 'GET',
          contentType: "application/json",
          success: function (data) {
            data.d.results.sort(function (a, b) {
              return a.cust_TTOWeeks - b.cust_TTOWeeks;
            })
            this.getView().getModel("oneModel").setProperty("/workingWeeks", data.d.results)
          }.bind(this),
          error: function (e) {
            console.log("error: " + e);
          }
        });
      },

      _checkWage2: function (grade, workingWeeks) {
        grade = "XXXXXXXX"
        this.getView().getModel("oneModel").setProperty("/wage2Value", "");
        if (grade && workingWeeks) {
          var contStartDate = new Date(this.getView().byId("contStartDate1").getValue());
          var consStartYear = contStartDate.getFullYear();
          var consStartMonth = contStartDate.getMonth();
          var todayYear = (new Date()).getFullYear();
          var todayMonth = (new Date()).getMonth()
          var diff = Number(todayYear - consStartYear);
          if (consStartMonth > todayMonth) diff--
          else if (consStartMonth == todayMonth) {
            var consStartDay = (contStartDate).getDate();
            var todayDay = (new Date()).getDate()
            if (consStartDay > todayDay) diff--
          }
          if (diff < 0) {
            diff = 0;
          }
          $.ajax({
            url: serviceURL + "/odata/v2/cust_ZFLM_TTO_EC?$filter=cust_PayScaleGroup eq '" + grade + "' and cust_TTOWeeks eq '" + workingWeeks + "' and cust_CompanyCode eq '" + companyCode + "'&$format=json",
            type: 'GET',
            contentType: "application/json",
            success: function (data) {
              if (data.d.results.lenght != 0) {
                if (diff < 5) {
                  this.getView().getModel("oneModel").setProperty("/wage2Value", data.d.results[0].cust_Service1);
                }
                else if (diff > 10) {
                  this.getView().getModel("oneModel").setProperty("/wage2Value", data.d.results[0].cust_Service3);
                }
                else {
                  this.getView().getModel("oneModel").setProperty("/wage2Value", data.d.results[0].cust_Service2);
                }
              }
              else {
                this.getView().getModel("oneModel").setProperty("/wage2Value", "");
              }
            }.bind(this),
            error: function (e) {
              console.log("error: " + e);
            }
          });
        }
        else {
          this.getView().getModel("oneModel").setProperty("/wage2Value", "");
        }
      },

      onStartDateChange: function (oEvent) {
        if (!oEvent.getParameter("valid")) {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
        }
        else {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
          this.getView().byId("_IDGenDatePicker2").setMinDate(new Date(oEvent.getSource().getValue()))
        }
      },

      onContractChange: function (oEvent) {
        if (oEvent.getSource().getSelectedItem() != null) {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
          if (oEvent.getSource().getSelectedItem().getText().includes("Fixed Term")) {
            this.getView().byId("_IDGenLabel81").setVisible(true);
            this.getView().byId("_IDGenDatePicker2").setVisible(true);
          }
          else {
            this.getView().byId("_IDGenLabel81").setVisible(false);
            this.getView().byId("_IDGenDatePicker2").setVisible(false);
          }
        }
        else {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
        }
      },

      onDateGeneralChange: function (oEvent) {
        if (!oEvent.getParameter("valid")) {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
        }
        else {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
        }
      },

      onChangeGeneral: function (oEvent) {
        if (oEvent && oEvent.mParameters && oEvent.mParameters.id) {
          this.getView().byId(oEvent.mParameters.id).setValueState(sap.ui.core.ValueState.None);
        }
        else {
          this.getView().byId(oEvent.mParameters.id).setValueState(sap.ui.core.ValueState.Error);
        }
      },


      // Controller for Work Schedules

      onWorkSchedBut: function () {
        sap.ui.core.BusyIndicator.show();
        var startDate = new Date(this.getView().byId("_IDGenDatePicker1").getValue());
        var WSStartDate = new Date(this.getView().getModel("WSModel") ? this.getView().getModel("WSModel").getProperty("/WSStartDate") : "12/31/9999");
        if (!this.oWorkSchedules) {
          var oModelWS = new JSONModel();
          this.oWorkSchedules = sap.ui.xmlfragment("com.gcc.newstarterqa.newstarterqa.fragment.WorkSchedules", this);
          this.getView().addDependent(this.oWorkSchedules);
        }
        else var oModelWS = this.getView().getModel("WSModel");
        if (startDate.toDateString() != WSStartDate.toDateString()) {
          oModelWS.setProperty("/WSColumns", [{
            width: "20%",
            header: "Schedule Day",
            demandPopin: false,
            styleClass: "cellBorderLeft cellBorderRight"
          }, {
            width: "auto",
            header: "Day",
            styleClass: "cellBorderRight"
          }, {
            width: "30%",
            header: "Hours Worked (decimal)",
            styleClass: "cellBorderRight"
          }
          ]);
          oModelWS.setProperty("/WSPreviewColumns", [{
            width: "14%",
            header: "Monday",
            styleClass: "cellBorderLeft cellBorderRight colorCell"
          }, {
            width: "14%",
            header: "Tuesday",
            styleClass: "cellBorderRight colorCell"
          }, {
            width: "15%",
            header: "Wednesday",
            styleClass: "cellBorderRight colorCell"
          }, {
            width: "14%",
            header: "Thursday",
            styleClass: "cellBorderRight colorCell"
          }, {
            width: "14%",
            header: "Friday",
            styleClass: "cellBorderRight colorCell"
          }, {
            width: "15%",
            header: "Saturday",
            styleClass: "cellBorderRight colorCell"
          }, {
            width: "14%",
            header: "Sunday",
            styleClass: "cellBorderRight colorCell"
          }
          ]);
          oModelWS.setProperty("/WSItems", [{
            ScheduleDay: "1",
            Day: this.oWeekDays.filter((el) => el.key == startDate.getDay())[0].day,
            DayKey: startDate.getDay(),
            HoursWorked: ""
          }]);
          oModelWS.setProperty("/DelButShow", false);
          oModelWS.setProperty("/WSHoursPerWeek", "0.0");
          oModelWS.setProperty("/WSStartDate", new Date(this.getView().byId("_IDGenDatePicker1").getValue()));
          this.getView().setModel(oModelWS, "WSModel");
        }
        oModelWS.setProperty("/PreviewTableShow", false);
        oModelWS.setProperty("/PreviewText", "Preview Schedule");
        this.oWorkSchedules.open();
        sap.ui.core.BusyIndicator.hide();
      },

      onWSHoursWork: function (oEvent) {
        var value = parseFloat(oEvent.getSource().getValue());
        if (value) {
          if (!(isNaN(value) || value < 0 || value > 24)) {
            oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
            // changing the value upto 1 decimal places without rounding off
            value = (Math.floor(value * 10) / 10).toFixed(1);
            oEvent.getSource().setValue(value);
            // calculating the sum of all the work hours entered
            this.calculateTotalHours();
          }
          else {
            oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
          }
        }
      },

      calculateTotalHours: function () {
        var oProperty = this.getView().getModel("WSModel").getProperty("/WSItems");
        if (oProperty.length > 1) {
          var totalHours = oProperty.reduce((acc, curr) => {
            if (curr.HoursWorked) {
              return parseFloat(acc.HoursWorked ? acc.HoursWorked : acc) + parseFloat(curr.HoursWorked);
            }
            else return acc;
          });
          totalHours = totalHours.toFixed(1);
        } else var totalHours = oProperty[0].HoursWorked;
        this.getView().getModel("WSModel").setProperty("/WSHoursPerWeek", totalHours);
      },

      onWSAddButton: function () {
        var oProperty = this.getView().getModel("WSModel").getProperty("/WSItems");
        var prevDay = this.oWeekDays.filter((el) => el.day == oProperty[oProperty.length - 1].Day)[0].key;
        var key = prevDay == 6 ? 0 : prevDay + 1;
        oProperty.push({
          ScheduleDay: (parseInt(oProperty[oProperty.length - 1].ScheduleDay) + 1).toString(),
          Day: this.oWeekDays.filter((el) => el.key == key)[0].day,
          DayKey: key,
          HoursWorked: ""
        });
        this.getView().getModel("WSModel").setProperty("/WSItems", oProperty);
        this.getView().getModel("WSModel").setProperty("/DelButShow", true);
      },

      onWSDelButton: function () {
        var oProperty = this.getView().getModel("WSModel").getProperty("/WSItems");
        if (oProperty.length == 2) this.getView().getModel("WSModel").setProperty("/DelButShow", false);
        oProperty.pop();
        this.getView().getModel("WSModel").setProperty("/WSItems", oProperty);
        this.calculateTotalHours();
      },

      onWorkSchedulesClose: function () {
        this.oWorkSchedules.close();
      },

      oWeekDays: [
        {
          key: 0,
          day: "Sunday"
        },
        {
          key: 1,
          day: "Monday"
        },
        {
          key: 2,
          day: "Tuesday"
        },
        {
          key: 3,
          day: "Wednesday"
        },
        {
          key: 4,
          day: "Thursday"
        },
        {
          key: 5,
          day: "Friday"
        },
        {
          key: 6,
          day: "Saturday"
        },

      ],

      onWSPreviewBut: function (oEvent) {
        var oModelWS = this.getView().getModel("WSModel");
        if (oEvent.getSource().getText() == "Preview Schedule") {
          oModelWS.setProperty("/PreviewTableShow", true);
          oModelWS.setProperty("/DelButShow", false);
          oModelWS.setProperty("/PreviewText", "Hide Preview");
          this.preparePreviewData(oModelWS);
        }
        else {
          oModelWS.setProperty("/PreviewTableShow", false);
          oModelWS.getProperty("/WSItems").length > 1 ? oModelWS.setProperty("/DelButShow", true) : oModelWS.setProperty("/DelButShow", false);
          oModelWS.setProperty("/DelButShow", true);
          oModelWS.setProperty("/PreviewText", "Preview Schedule");
        }
        this.getView().setModel(oModelWS, "WSModel");
      },

      preparePreviewData: function (oModelWS) {
        var items = oModelWS.getProperty("/WSItems");
        var counter = 0;
        var previewData = [{}];
        // // creating entries of number of days
        // for (let i = 0; i < items.length; i++) {
        //   if (i != items.length && items[i].DayKey == 1 && i != 0) {
        //     previewData.push({}, {});
        //     counter += 2;
        //   }
        //   previewData[counter][items[i].Day] = items[i].ScheduleDay;
        //   previewData[counter].Type = "Day";
        //   previewData[counter].Text = "Schedule Day";
        // }
        // inserting number of hours below days
        // counter = 1;
        for (let i = 0; i < items.length; i++) {
          if (i != items.length && items[i].DayKey == 1 && i != 0) {
            counter += 1;
            previewData.push({});
          }
          previewData[counter][items[i].Day] = { [items[i].Day]: items[i].HoursWorked, dataFound: "true", DaysName: items[i].Day, ScheduleDay: items[i].ScheduleDay };
          previewData[counter].Type = "Hours";
        }
        oModelWS.setProperty("/WSPreviewItems", previewData);
      }

    });
  });
