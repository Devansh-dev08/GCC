sap.ui.define([
  "sap/m/MessageBox",
  "sap/ui/model/json/JSONModel",
  "./baseController",
  "../model/formatter"
],
  /**
   * @param {typeof sap.ui.core.mvc.Controller} Controller
   */
  function (MessageBox, JSONModel, baseController, formatter) {
    "use strict";
    var companyCode = "", initiator = "", useremail = "", formId1 = "", initiatorName = "", userId;
    var serviceURL = "", pernr = "", approverFlag = false, bscFlag = false, initiatorFlag = false, payGroup = "", nationalid = "", empTermination = "";
    var organizationCode = "", personnel = "", emplSubGroup = "", noMode = false;
    const teacherGrade = "GBR/20", cirencesterCompanyCode = "4600", defaultCompanyCode = "XXXX", defaultPayGrade = "XXXXXXXX",
      exceptionOrgList = ["4500", "4600"], factor = 32.5 / 27.5;

    return baseController.extend("com.gcc.newstarterqa.newstarterqa.controller.View1", {
      formatter: formatter,
      onInit: function (oEvent) {
        serviceURL = sap.ui.require.toUrl(this.getOwnerComponent().getManifestEntry('/sap.app/id').replaceAll('.', '/'));
        var dateValue = new Date();
        this.getId("DatePicker01").setDateValue(dateValue);
        // this.getId("contStartDate1").setValue(dateValue);

        var link = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("SchoolsnetLink")
        var text = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("IntroText1")
        this.getId("_IDGenFormattedText1").setHtmlText("<p>" + text + "<a title=" + link + " href=\"" + link + "\"</a> e-Forms Pages.</p>")
        // //Dob defaulting 10yrs prior
        // var currYear = CurrDate.getFullYear();
        // var day = CurrDate.getDay();
        // var month = CurrDate.getMonth();
        // var Year = currYear-10;
        // var minDate = day+ "-" + month + "-" + Year;

        // this.getId("Dob11").setMaxDate(new Date(minDate));
        var data = [];
        var oneModel = new JSONModel(data);
        this.getView().setModel(oneModel, "oneModel");
        this.clearFields();
        //this.SFservice(oEvent);
        this.getOwnerComponent().getRouter().getRoute("RouteView1").attachPatternMatched(this._onRouteMatched, this);
      },


      _onRouteMatched: function (oEvent) {
        sap.ui.core.BusyIndicator.show();
        var oModel2 = new sap.ui.model.json.JSONModel();
        const url = serviceURL + "/user-api/currentUser";

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
              useremail = "test00171345@noemail.gloucestershire.gov.uk";
              // test00171345@noemail.gloucestershire.gov.uk // Cirencester
              // test00157472@noemail.gloucestershire.gov.uk // MAT user
              // test00121713@noemail.gloucestershire.gov.uk // OxfordShire
            }
            else {
              useremail = oModel2.getData().email;
            }
            this.query = oEvent.getParameter('arguments')["?query"];
            var oModel = this.getView().getModel("oneModel");
            if (this.query == undefined) {
              var disable = {
                formId: "",
                mode: ""
              }
              oModel.setProperty("/disable", disable);

              // // Getting the initiator from the mail id
              this._getInitiator(useremail, oModel)
                .then(initiator => {
                  var initi = initiator;
                  // Checking if the user has Multiple Organization
                  this._checkMultiOrg(oModel, initi)
                    .then(response => {
                      // restricting user to enter anything below if organization is not selected ( when multi org found )
                      if (response) {
                        this.enableSecA(false);
                      }
                      // // Calling all the SuccessFactors API's
                      this.SFservice(response);
                      // // Generating Form ID
                      this.getOwnerComponent().getModel("ZSFGTGW_NS01_SRV").read("/ZSFGT_NS01_FORMID_GETSet", {
                        success: function (oData) {
                          if (oData.results[0]) {
                            this.getId("_IDGenInput2").setValue(oData.results[0].Formid);
                            this.getId("_HIDGenFormId1").setValue(oData.results[0].Formid);
                          }
                        }.bind(this),
                        error: function (oData) {
                          console.log("form id service Error");
                        }
                      });
                    })
                    .catch((e) => {
                      MessageBox.error(e, {
                        title: "Error Message",
                        actions: [MessageBox.Action.OK],
                        onClose: function (oAction) {
                          if (oAction) {
                            if (this.query) window.parent.close();
                            else window.history.go(-1);
                          }
                        }.bind(this)
                      });
                    });
                })
                .catch(error => {
                  MessageBox.error(`We cannot process the form ahead because of the following message:
                     
                     ${error}`);
                });

            } else {

              this.getView().getModel("oneModel").setProperty("/disable", this.query);
              formId1 = this.query.formId;
              if (this.query.mode) {
                // disabling Section A
                this.enableSecA(false);
                this.getId("delete").setVisible(false);
                this.getId("submit").setVisible(false);
                this.getId("save").setText("Save");
                // this.getId("save").detachPress(this.onSave);
                // this.getId("save").attachPress(this.onSubmit, this);
                switch (this.query.mode) {
                  case "bsc":
                    bscFlag = true;
                    oModel.setProperty("/multiOrgFound", false);
                    break;
                  case "display":
                    approverFlag = true;
                    oModel.setProperty("/multiOrgFound", false);
                    break;
                  case "report":
                    approverFlag = true;
                    oModel.setProperty("/multiOrgFound", false);
                    this.getId("save").setVisible(false);
                    this.getId("cancel").setVisible(false);
                    break;
                  case "initiator":
                    initiatorFlag = true;
                    break;
                  default:
                    noMode = true;
                    break;
                }
              } else noMode = true;

              this._getInitiator(useremail, oModel)
                .then(initiator => {
                  var initi = initiator;
                  if (initiatorFlag || noMode) {
                    // Checking if the user has Multiple Organization
                    this._checkMultiOrg(oModel, initi)
                      .then(response => {
                        // doing some necessary calls for dropdowns
                        this._fetchingSFData(oModel, initi)
                          .then(() => {
                            this.readFormidData(formId1, oModel);
                          });
                      })
                      .catch((e) => {
                        MessageBox.error(e, {
                          title: "Error Message",
                          actions: [MessageBox.Action.OK],
                          onClose: function (oAction) {
                            if (oAction) {
                              if (this.query) window.parent.close();
                              else window.history.go(-1);
                            }
                          }.bind(this)
                        });
                      });
                  } else
                    // fetching data from backend
                    this.readFormidData(formId1, oModel);
                });
            }
          });

      },

      DOBRestrict10years: function (oEvent) {
        //Dob defaulting 10yrs prior
        var CurrDate = new Date();
        var currYear = CurrDate.getFullYear();
        var day = CurrDate.getDay();
        var month = CurrDate.getMonth();
        var Year = currYear - 11;
        var minDate = day + "-" + month + "-" + Year;

        oEvent.getSource().setMaxDate(new Date(minDate));
      },

      editable: function (oValue) {
        if (oValue) {
          return oValue = true;
        } else oValue = false;
      },

      _fetchLogData: function (formId) {
        var oModel = this.getView().getModel("oneModel");
        var oFilter = new sap.ui.model.Filter('Formid', sap.ui.model.FilterOperator.EQ, formId);
        this.getOwnerComponent().getModel("ZSFGTGW_LOG_SRV").read("/zsf_logSet", {
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
      },

      onTabChange: function (oEvent) {
        var key = oEvent.getParameter("key");
        if (key == "History") {
          this.getId("PrintFrame").setVisible(false);
          this.getId("delete").setVisible(false);
          this.getId("save").setVisible(false);
          this.getId("submit").setVisible(false);
        } else {
          this.getId("PrintFrame").setVisible(true);
          this.getId("save").setVisible(true);
          if (this.query && this.query.mode) {
          } else {
            this.getId("submit").setVisible(true);
            this.getId("delete").setVisible(true);
          }
        }
      },

      _getInitiator: async function (useremail, oModel) {
        return new Promise(
          async function (resolve, reject) {
            var email;
            await $.ajax({
              url: serviceURL + "/odata/v2/PerEmail?$filter=emailAddress eq '" + useremail + "'&$format=json",
              type: 'GET',
              contentType: "application/json",
              success: function (data) {
                email = data;
                if (data.d.results[0].personIdExternal)
                  initiator = data.d.results[0].personIdExternal;
                else reject("Email is not maintained");
                if (initiator) {
                  sap.ui.core.BusyIndicator.hide();
                }
              }.bind(this),
              error: function (e) {
                console.log("error: " + e);
                sap.ui.core.BusyIndicator.hide();
              }
            });

            await $.ajax({
              url: serviceURL + "/odata/v2/PerPerson(personIdExternal='" + initiator + "')/personalInfoNav?$format=json",
              type: 'GET',
              contentType: "application/json",
              success: function (data) {
                if (data.d.results.length > 0) {
                  var initDetails = {
                    email: email.d.results[0].emailAddress,
                    personIdExternal: email.d.results[0].personIdExternal,        //first name, last name Etc.
                    fullName: data.d.results[0].firstName + " " + data.d.results[0].lastName,
                    salutation: data.d.results[0].salutation
                  }
                  initiatorName = data.d.results[0].firstName + " " + data.d.results[0].lastName;
                  oModel.setProperty("/user", initDetails);
                  resolve(initiator);
                }
                else reject("Initiator details are not maintained");
              }.bind(this),
              error: function (data) {
                console.log(`PerPerson entity failed for ${email.d.results[0].personIdExternal}`);
                reject(data);
              }
            });
          });
      },

      _checkMultiOrg: async function (oModel, initi) {
        return new Promise(
          async function (resolve, reject) {
            await $.ajax({
              url: serviceURL + "/odata/v2/cust_ZFLM_MULTI_USER_NEW?$filter=externalName eq '" + initi + "' and cust_Role eq 'I'&$format=json",
              type: 'GET',
              contentType: "application/json",
              success: async function (data) {
                if (data.d.results.length != 0) {
                  var values = data.d.results.map((value, index) => { return { key: (index), text: (value.cust_Organization) }; });
                  oModel.setProperty("/OrgNameP", "");
                  oModel.setProperty("/multiOrgFound", true);
                  var val = [];
                  values.forEach(async function (item) {
                    $.ajax({
                      url: serviceURL + "/odata/v2/cust_PersonnelArea?$filter= externalCode eq '" + item.text + "'&$format=json",
                      type: 'GET',
                      contentType: "application/json",
                      success: function (data) {
                        var req = {
                          key: item.text,
                          value: data.d.results[0].externalName,
                          companyCode: data.d.results[0].cust_Company
                        };
                        val.push(req);
                        val.sort((a, b) => a.value.localeCompare(b.value))
                        oModel.setProperty("/OrgValues", val);
                        resolve(true);
                      },
                      error: function (e) {
                        console.log(`cust_PersonnelArea entity failed for ${item.text}`);
                        reject(e);
                      }
                    });
                  });

                  if (values.length == 1) {
                    // setting the value of Org if there is only one org
                    $.ajax({
                      url: serviceURL + "/odata/v2/cust_PersonnelArea?$filter= externalCode eq '" + values[0].text + "'&$format=json",
                      type: 'GET',
                      contentType: "application/json",
                      success: function (data) {
                        personnel = data.d.results[0].externalName + " (" + data.d.results[0].externalCode + ")";
                        organizationCode = data.d.results[0].externalCode;
                        var req = [{
                          key: data.d.results[0].externalCode,
                          value: data.d.results[0].externalName,
                          companyCode: data.d.results[0].cust_Company
                        }];
                        companyCode = data.d.results[0].cust_Company;
                        oModel.setProperty("/OrgValues", req);
                        oModel.setProperty("/selectedOrg", data.d.results[0].externalCode);

                        // finding the approver for the org
                        this.findApprover(data.d.results[0].externalCode)
                          .catch((e) => {
                            MessageBox.error(e);
                          })
                      }.bind(this),
                      error: function (e) {
                        console.log("error: " + e);
                      }
                    });

                    // Contract dropdowns
                    this.getContractTypeDropdown(values[0].text, oModel);
                    resolve(false);
                    oModel.setProperty("/multiOrgFound", false);
                  }
                } else {
                  if (this.query && this.query.mode)
                    resolve(false);
                  else
                    reject("You have not been set-up with the authorisation to launch this form. Please call ContactUs on 01452 425888 if you believe this is in error.");
                }
              }.bind(this),
              error: function (e) {
                console.log(`cust_ZFLM_MULTI_USERS entity failed for ${initi}`);
                reject(e);
              }
            });
          }.bind(this));
      },

      SFservice: async function () {
        var that = this;
        var oModel = that.getView().getModel("oneModel");
        var oView = that.getView();
        //   return new Promise(function (resolve, reject) {
        //property - personal Info dropdown
        $.ajax({
          url: serviceURL + "/odata/v2/EmpJob?$format=json&$filter=userId eq '" + initiator + "'",
          type: 'GET',
          contentType: "application/json",
          success: function (data) {
            if (data && data.d.results[0]) {
              if (!(approverFlag || initiatorFlag || bscFlag || noMode)) {
                // companyCode = data.d.results[0].company;
              }
              // fetching position cost Center list
              that.getPosCostCenter(data.d.results[0].company, oModel);
              // setting data of EmpJob for further usage
              oModel.setProperty("/EmpJobData", data.d.results[0]);

              // fetching emplymentType code from its nav
              if (!(approverFlag || bscFlag || initiatorFlag || noMode)) {
                $.ajax({
                  url: serviceURL + `/odata/v2${data.d.results[0].employmentTypeNav.__deferred.uri.split("/odata/v2")[1]}?$format=json`,
                  type: 'GET',
                  contentType: "application/json",
                  success: function (data) {
                    emplSubGroup = data.d.externalCode;
                  },
                  error: function (e) {
                    console.log("error: " + e);
                  }
                });
              }

              // ajax for finding position and its cost center
              $.ajax({
                url: serviceURL + "/odata/v2" + data.d.results[0].positionNav.__deferred.uri.split("/odata/v2")[1] + "?$format=json",
                type: 'GET',
                contentType: "application/json",
                success: function (data) {
                  $.ajax({
                    url: serviceURL + "/odata/v2" + data.d.PositionCostAssignmentItems.__deferred.uri.split("/odata/v2")[1] + "?$format=json",
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                      for (let j = 0; j < data.d.results.length; j++) {
                        if (data.d.results[j].defaultAssignment == true) {
                          $.ajax({
                            url: serviceURL + "/odata/v2" + data.d.results[j].costCenterNav.__deferred.uri.split("/odata/v2")[1] + "?$format=json",
                            type: 'GET',
                            contentType: "application/json",
                            success: function (data) {
                              that.getView().byId("_IDGenInput112").setSelectedKey(data.d.results[0].externalCode);
                              if (Number(data.d.results[0].costcenterExternalObjectID))
                                that.getView().byId("_IDGenInput112").setValue(+data.d.results[0].costcenterExternalObjectID + " - " + data.d.results[0].description);
                              else
                                that.getView().byId("_IDGenInput112").setValue(data.d.results[0].costcenterExternalObjectID + " - " + data.d.results[0].description);
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

                  this.enableFields(false);

                }
              });
            }
            // resolve(data);
          }, error: function (e) {
            console.log("error: " + e);
            //reject(e);
          }
        });

        // // Cost Center AJAX 
        var empCostData;
        await $.ajax({
          url: serviceURL + "/odata/v2/EmpCostAssignmentItem?$filter= EmpCostAssignment_worker eq '" + initiator + "'&$format=json",
          type: 'GET',
          contentType: "application/json",
          success: function (data) {
            empCostData = data;
          }.bind(this),
          error: function (e) {
            console.log("error: " + e);
          }
        });

        for (let i = 0; i < empCostData.d.results.length; i++) {
          if (empCostData.d.results[i].defaultAssignment == true) {
            oModel.setProperty("/costCenterCode", empCostData.d.results[i].costCenter);
            await $.ajax({
              url: serviceURL + `/odata/v2${empCostData.d.results[i].costCenterNav.__deferred.uri.split("/odata/v2")[1]}?$format=json`,
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
          }
        }

        if (bscFlag || initiatorFlag || approverFlag || noMode) {
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
                if (bscFlag || initiatorFlag || approverFlag || noMode) {
                }
                else {
                  oView.byId("idInitiator").setValue(that.InitiatorName);
                  FormOwner = that.InitiatorName;
                  if (!oModel.getProperty("/disable").mode) {
                    that.s4LogCreation(Status); // LogCreation call
                  }
                }
              }, error: function (e) {
                console.log("Saluttation Label error: " + e);
              }
            })
          },
          error: function (e) { console.log("error: " + e); }

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

      },

      _fetchingSFData: function (oModel, initi) {
        return new Promise(
          function (resolve, reject) {

            $.ajax({
              url: serviceURL + `/odata/v2/EmpEmployment?$format=json&$filter=personIdExternal eq '${initi}'&$expand=jobInfoNav`,
              type: 'GET',
              contentType: "application/json",
              success: function (data) {
                if (data && data.d.results[0]) {
                  // setting data of EmpJob for further usage
                  oModel.setProperty("/EmpJobData", data.d.results[0].jobInfoNav.results[0]);
                  resolve();
                } else reject();
              },
              error: function (e) {
                console.log(e);
                reject();
              }
            });
          });
      },

      getPosCostCenter: function (company, oModel) {
        // dropdown for Position Cost Center
        $.ajax({
          url: serviceURL + "/odata/v2/FOCostCenter?$format=json&$filter=legalEntity eq '" + company + "'",
          type: 'GET',
          contentType: "application/json",
          success: function (data) {
            var reqArr = [];
            if (data.d.results.length == 1) {
              this.getId("_IDGenInput112").setEditable(false);
              this.getId("_IDGenInput112").setFieldGroupIds("hardEdit");
            }
            else {
              data.d.results.forEach(function (oItem) {
                if (Number(oItem.costcenterExternalObjectID))
                  oItem.costcenterExternalObjectID = +oItem.costcenterExternalObjectID;
                reqArr.push(oItem)
              });
              reqArr.sort((a, b) => {
                if (a.costcenterExternalObjectID > b.costcenterExternalObjectID) return 1;
                else return -1;
              });
              oModel.setProperty("/posCostCenterList", reqArr);
            }
          }.bind(this), error: function (e) { console.log(e) }
        });
      },

      enableFields: function (bEditable) {

        var oView = this.getView();

        oView.byId("DatePicker01").setEditable(bEditable);
        oView.byId("Dob11").setEditable(bEditable);

        oView.byId("country1").setEditable(bEditable);
        oView.byId("Nationality1").setEditable(bEditable);
        oView.byId("Disability1").setEditable(bEditable);
        oView.byId("DBS1").setEditable(bEditable);
        oView.byId("TeachRegNum1").setEditable(bEditable);
        oView.byId("BankSort1").setEditable(bEditable);
        oView.byId("BankAccNum1").setEditable(bEditable);


        oView.byId("nationalIns1").setEditable(bEditable);
        oView.byId("Ethicity1").setEditable(bEditable);
        oView.byId("Gender1").setEditable(bEditable);
        oView.byId("ClearDate1").setEditable(bEditable);
        oView.byId("ClearDate1").setEditable(bEditable);
        oView.byId("issuDate1").setEditable(bEditable);
        oView.byId("issuDate1").setEditable(bEditable);
        // oView.byId("BankName1").setEnabled(bEditable);
        oView.byId("BuildingSoc1").setEditable(bEditable);
        oView.byId("_IDGefnInput11").setEditable(bEditable);
        oView.byId("_IDGefnInput12").setEditable(bEditable);
        //this.getId("_IDGenfInput13").setEnabled(bEditable);
        oView.byId("_IDGefnInput14").setEditable(bEditable);
        oView.byId("_IDGenItem6").setEditable(bEditable);


        //First Emergency 

        oView.byId("idree4d2").setEditable(bEditable);
        oView.byId("_IDGenItem6").setEditable(bEditable);
        // oView.byId("emergency1County").setEditable(bEditable);
        oView.byId("_IDGenInput15").setEditable(bEditable);
        oView.byId("_IDGenInput16").setEditable(bEditable);
        oView.byId("_IDGenInput16s").setEditable(bEditable);
        oView.byId("_IDGenInput17").setEditable(bEditable);
        oView.byId("_IDGenInput18").setEditable(bEditable);
        // oView.byId("_IDGenInput19").setEditable(bEditable);


        oView.byId("_IDGefnInput122").setEditable(bEditable);
        oView.byId("_IDGefnInput112").setEditable(bEditable);
        //this.getId("_IDGenfInput132").setEnabled(bEditable);
        oView.byId("_IDGefnInput142").setEditable(bEditable);
        // this.getId("idCountry2").setEnabled(bEditable);
        oView.byId("_IDGenInput152").setEditable(bEditable);
        oView.byId("_IDGenInput162").setEditable(bEditable);
        oView.byId("_IDGenInput162s").setEditable(bEditable);
        oView.byId("_IDGenInput172").setEditable(bEditable);
        oView.byId("_IDGenInput182").setEditable(bEditable);
      },

      clearFields: function () {

        this.getId("titleB1").setSelectedKey(null);
        this.getId("contStartDate1").setValue(null);
        this.getId("country1").setSelectedKey(null);
        this.getId("Dob11").setValue(null);
        this.getId("Gender1").setSelectedKey(null);
        this.getId("issuDate1").setValue(null);
        this.getId("ClearDate1").setValue(null);
        this.getId("homeTelephone1").setValue("");
        this.getId("mobileTelephone1").setValue("");
        this.getId("emailAdd1").setValue("");
        this.getId("Ethicity1").setSelectedKey(null);

        this.getId("addEmergencyContact1").setSelected(false);
        this.getId("idAddEmergency").setVisible(false);
        this.getId("_IDGenCheckBox2").setSelected(false);
        this.getId("idSecondEmergency").setVisible(false);
        this.getId("_IDGenItem6").setSelectedKey(null);
        this.getId("_IDGenInput17").setSelectedKey(null);
        this.getId("idree4d2").setSelectedKey(null);
        this.getId("_IDGenInput172").setSelectedKey(null);

        this.getView().getModel("oneModel").setProperty("/editable", true);
        this.getView().getModel("oneModel").setProperty("/enableRate3", false);
        this.getView().getModel("oneModel").setProperty("/enableUnit3", false);
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
        this.getView().getModel("oneModel").setProperty("/bankName", "");
        this.getView().getModel("oneModel").setProperty("/bankName/bankName", "");

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
        this.getId("idempCame1").setVisible(true);
        this.getId("empCame").setVisible(true);

        this.getId("idempCame").setVisible(false);
        this.getId("empCame3").setVisible(false);
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

                var assignUserId = data;
                var lenData = data.d.results.length
                if (data.d.results[0].originalStartDate != "") {
                  var reqServDate = this.requiredDate(data.d.results[0].originalStartDate);
                  this.getId("contStartDate1").setDateValue(new Date(reqServDate));
                }
                if (data.d.results[0].startDate != "") {
                  var reqServDate = this.requiredDate(data.d.results[0].startDate);
                  this.getId("issuDate1").setDateValue(new Date(reqServDate));
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
                // for (let i = 0; i < lenData; i++) {
                //   var userId = assignUserId.d.results[i].userId;
                //   $.ajax({
                //     url: serviceURL + "/odata/v2/EmpEmployment(personIdExternal='" + pernr + "',userId='" + userId + "')/jobInfoNav?$format=json",
                //     type: 'GET',
                //     contentType: "application/json",
                //     success: function (data) {

                //       if (data.d.results.length > 0) {

                //         var posNo = data.d.results[0].customString1; //positionHeld
                //         var eventReason = data.d.results[0].eventReason;
                //         var endDate = data.d.results[0].endDate
                //         var assignmentIdExternal = assignUserId.d.results[i].assignmentIdExternal; //personnel number

                //         var storeArray = {
                //           personIdExternal: assignmentIdExternal,
                //           positionHeld: posNo,
                //           endDate: endDate,
                //           eventReason: eventReason
                //         }

                //         tableArray.push(storeArray);
                //         tableArray.sort((a, b) => {
                //           if (a.personIdExternal < b.personIdExternal) return -1;
                //           if (a.personIdExternal > b.personIdExternal) return 1;
                //         });

                //         // making property finalData to bind data in table
                //         oModel.setProperty("/EmpCameFrom", tableArray);
                //       }

                //     },
                //     error: function (e) { console.log("error: " + e); }
                //   });
                // } // for loop end

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
            url: serviceURL + "/odata/v2/EmpJob?$filter=userId eq '" + pernr + "'&$format=json",
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
            url: serviceURL + "/odata/v2/EmpWorkPermit?$format=json&$filter=userId eq '" + pernr + "'",
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
              //this.getId("Title").setSelectedItem().setText(oData.Title),
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
                    else if (data.d.externalCode == "L") {
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
                      if (data.d.externalCode == "B") {
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
                oView.byId("addEmergencyContact1").setSelected(true);
                oView.byId("addEmergencyContact1").setEnabled(false);
                oView.byId("idAddEmergency").setVisible(true);
              }
              else {
                oView.byId("addEmergencyContact1").setSelected(false);
                oView.byId("addEmergencyContact1").setEnabled(false);
                oView.byId("idAddEmergency").setVisible(false);
              }
              if (data.d.results[1]) {
                oView.byId("_IDGenCheckBox2").setVisible(true);
                oView.byId("_IDGenCheckBox2").setSelected(true);
                oView.byId("_IDGenCheckBox2").setEnabled(false);
                oView.byId("idSecondEmergency").setVisible(true);
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
                        oModel.setProperty("/PerEmergencyContacts", emergencyData.d.results[i]);
                        $.ajax({
                          url: serviceURL + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'relation' and status eq 'A' and optionId eq '" + data.d.results[i].relationship + "'&$format=json",
                          type: 'GET',
                          contentType: "application/json",
                          success: function (data) {
                            oModel.setProperty("EmergencyRelation", data.d.results[0].label_en_GB)
                            that.getView().byId("_IDGenInput17").setSelectedKey(data.d.results[0].optionId)
                          }, error: function (e) { console.log("error: " + e); }
                        })
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
                      } else {
                        oModel.setProperty("/PerEmergencyContactsSecond", data.d);
                        oModel.setProperty("/PerEmergencyContacts1", emergencyData.d.results[i]);
                        $.ajax({
                          url: serviceURL + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'relation' and status eq 'A' and optionId eq '" + data.d.results[i].relationship + "'&$format=json",
                          type: 'GET',
                          contentType: "application/json",
                          success: function (data) {
                            oModel.setProperty("EmergencyRelation1", data.d.results[0].label_en_GB)
                            that.getView().byId("_IDGenInput172").setSelectedKey(data.d.results[0].optionId)
                          }, error: function (e) { console.log("error: " + e); }

                        })
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

      getApproverDetails: function (mangerId) {
        $.ajax({
          url: serviceURL + "/odata/v2/PerPerson('" + mangerId + "')/personalInfoNav?$format=json",
          type: 'GET',
          contentType: "application/json",
          success: function (data) {
            this.ApproverCode = data.d.results[0].salutation;
            var manName = data.d.results[0].firstName + " " + data.d.results[0].lastName;
            $.ajax({
              url: serviceURL + "/odata/v2/PicklistOption(" + data.d.results[0].salutation + "L)/picklistLabels?$format=json",
              type: 'GET',
              contentType: "application/json",
              success: function (data) {
                this.getId("approver").setValue(data.d.results[0].label + " " + manName);
              }.bind(this), error: function () { }
            });
          }.bind(this), error: function () { }
        })
      },

      findApprover: function (orgCode) {
        return new Promise(
          function (resolve, reject) {
            $.ajax({
              url: serviceURL + "/odata/v2/cust_ZFLM_MULTI_USER_NEW?$filter=cust_Organization eq '" + orgCode + "' and cust_Role eq 'A'&$format=json",
              type: 'GET',
              contentType: "application/json",
              success: function (data) {
                if (data.d.results.length != 0) {
                  this.getApproverDetails(data.d.results[0].externalName);
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
        if (oEvent.getSource().getSelectedItem() == null) {
          MessageBox.error("Please select a valid Organization");
          oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
          this.enableSecA(false);
        }
        else {
          var orgCode = oEvent.getSource().getSelectedItem().getKey();
          personnel = oEvent.getSource().getSelectedItem().getText();
          var oModel = this.getView().getModel("oneModel");
          if (oModel.getProperty("/lastSelectedOrg") && oModel.getProperty("/lastSelectedOrg") != oEvent.getSource().getSelectedItem().getKey()) {
            MessageBox.warning(`Changing the organization will erase all form data.
                Do you want to proceed?`, {
              actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
              emphasizedAction: sap.m.MessageBox.Action.NO,
              onClose: function (oAction) {
                oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
                if (oAction === sap.m.MessageBox.Action.YES) {
                  // setting company Code
                  companyCode = oModel.getProperty("/OrgValues").find((el) => el.key == orgCode).companyCode;
                  organizationCode = orgCode;
                  // finding approver for the selected Org
                  this.findApprover(orgCode)
                    .then(() => {
                      // Contract dropdowns
                      this.getContractTypeDropdown(orgCode, oModel);
                      oModel.setProperty("/lastSelectedOrg", orgCode);
                      this._getEmployees(orgCode);
                      this.enableSecA(true);

                      // clearing out the form
                      // hiding section B C D E F
                      this.getId("_IDGenPanel4").setVisible(false);
                      this.getId("_IDGenPanel45").setVisible(false);
                      this.getId("_IDGenPanel4dhd51").setVisible(false);
                      this.getId("_IDGenPanel4dh51").setVisible(false);

                      this.getId("_IDGenComboBox1").setSelectedKey(null);
                      //clearing out data of Section A
                      this.getId("_IDGenComboBox41").setValue(null);
                      this.getId("idempCame").setValue(null);
                      this.getId("_IDGenInput10").setValue(null);
                      this.getId("_IDGenComboBox411").setValue(null);
                      this.getId("_IDGenInput11").setValue(null);
                      this.getId("_IDGenInput112").getEditable() ? this.getId("_IDGenInput112").setValue(null) : "";
                      this.getId("TeachRegNum12").setValue(null);

                      // hiding fields of Section A
                      this.getId("_IDGenComboBox41").setVisible(false);
                      this.getId("idempCame1").setVisible(false);
                      this.getId("idempCame").setVisible(false);
                      this.getId("_IDGenInput10").setVisible(false);
                      this.getId("_IDGenComboBox411").setVisible(false);
                      this.getId("_IDGenInput11").setVisible(false);
                      this.getId("_IDGenInput112").setVisible(false);
                      this.getId("TeachRegNum12").setVisible(false);

                    })
                    .catch((e) => {
                      MessageBox.error(e);
                      oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
                    })
                }
                else {
                  this.getId("select08").setSelectedKey(oModel.getProperty("/lastSelectedOrg"));
                }
              }.bind(this)
            });
          }
          else {
            oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
            // Contract dropdowns
            this.getContractTypeDropdown(orgCode, oModel);
            // finding approver for the selected Org
            this.findApprover(orgCode)
              .then(() => {
                // setting company Code
                companyCode = oModel.getProperty("/OrgValues").find((el) => el.key == orgCode).companyCode;
                organizationCode = orgCode;
                oModel.setProperty("/lastSelectedOrg", orgCode);
                this._getEmployees(orgCode);
                this.enableSecA(true);
              })
              .catch((e) => {
                MessageBox.error(e);
                oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
              })
          }
        }
      },

      generalDropdownCheck: function (oEvent, isRequired) {
        if (oEvent.getSource().getValue()) {
          var value = oEvent.getSource().getSelectedItem();
          if (value) {
            oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
          }
          else {
            oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
          }
        } else {
          if (isRequired) {
            oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
          } else oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
        }
      },

      generalInputCheck: function (oEvent, reqField) {
        var value = oEvent.getSource().getValue();
        if (value) {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
        } else { if (reqField) oEvent.getSource().setValueState(sap.ui.core.ValueState.Error); }
      },

      generalDateCheck: function (oEvent) {
        if (oEvent.getParameter("valid")) {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
        } else oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
      },

      onHoursPerWeekChange: function (oEvent) {
        var value = oEvent.getSource().getValue();
        if (value) {
          if (+value > 40) {
            oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
            oEvent.getSource().setValueStateText("Maximum hours per week are 40 hours. Please enter a number of hours up to 40 hours per week");
          } else {
            oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
            oEvent.getSource().setValueStateText("Hours per week is a required field");
          }
        } else {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
          oEvent.getSource().setValueStateText("Hours per week is a required field");
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

      oEmployeeSelect: function (oEvent) {

        var oValue = this.getId("_IDGenComboBox41").getSelectedItem();
        if (oValue) {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
          this.getId("empCame").setVisible(true);
          this.getId("idempCame").setVisible(true);

          this.showSecAFields(true);
          // this.getId("DatePicker01").setEditable(false);
          // this.getId("Dob11").setEditable(false);

          // this.getId("country1").setEditable(false);
          // this.getId("Nationality1").setEditable(false);
          // this.getId("Disability1").setEditable(false);
          // this.getId("DBS1").setEditable(false);
          // this.getId("TeachRegNum1").setEditable(false);
          // this.getId("BankSort1").setEditable(false);
          // this.getId("BankAccNum1").setEditable(false);


          // this.getId("nationalIns1").setEditable(false);
          // this.getId("Ethicity1").setEditable(false);
          // this.getId("Gender1").setEditable(false);
          // this.getId("ClearDate1").setEditable(false);
          // this.getId("ClearDate1").setEditable(false);
          // this.getId("issuDate1").setEditable(false);
          // this.getId("issuDate1").setEditable(false);
          // // this.getId("BankName1").setEnabled(false);
          // this.getId("BuildingSoc1").setEditable(false);
          // this.getId("_IDGefnInput11").setEditable(false);
          // this.getId("_IDGefnInput12").setEditable(false);
          // //this.getId("_IDGenfInput13").setEnabled(false);
          // this.getId("_IDGefnInput14").setEditable(false);
          // this.getId("_IDGenItem6").setEditable(false);


          // //First Emergency 

          // this.getId("idree4d2").setEditable(false);
          // this.getId("_IDGenItem6").setEditable(false);
          // // this.getId("emergency1County").setEditable(false);
          // this.getId("_IDGenInput15").setEditable(false);
          // this.getId("_IDGenInput16").setEditable(false);
          // this.getId("_IDGenInput16s").setEditable(false);
          // this.getId("_IDGenInput17").setEditable(false);
          // this.getId("_IDGenInput18").setEditable(false);
          // // this.getId("_IDGenInput19").setEditable(false);


          // this.getId("_IDGefnInput122").setEditable(false);
          // this.getId("_IDGefnInput112").setEditable(false);
          // //this.getId("_IDGenfInput132").setEnabled(false);
          // this.getId("_IDGefnInput142").setEditable(false);
          // // this.getId("idCountry2").setEnabled(false);
          // this.getId("_IDGenInput152").setEditable(false);
          // this.getId("_IDGenInput162").setEditable(false);
          // this.getId("_IDGenInput162s").setEditable(false);

          // this.getId("_IDGenInput172").setEditable(false);
          // this.getId("_IDGenInput182").setEditable(false);
          // // this.getId("_IDGenInput192").setEditable(false);
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
        else
          oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
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

            if (oData.InsuranceNo && oData.Paygroup == "G4") {
              $.ajax({
                url: serviceURL + "/odata/v2/PerNationalId?$format=json&$filter=nationalId eq '" + oData.InsuranceNo + "'",
                type: 'GET',
                contentType: "application/json", //job Info
                success: function (data) {
                  if (data.d.results && data.d.results.length > 0) {
                    $.ajax({
                      url: serviceURL + "/odata/v2/EmpEmployment?$format=json&$filter=personIdExternal eq '" + data.d.results[0].personIdExternal + "'",
                      type: 'GET',
                      contentType: "application/json", //job Info
                      success: function (data) {
                        if (data.d.results && data.d.results.length > 0) {
                          var empEmplData = data.d.results;
                          var startDate = oData.StartDate.split("/");
                          var afterSevenDays = new Date(new Date().setDate(new Date(oData.StartDate.split("/").reverse().join("-")).getDate() + 7)).toLocaleDateString('en-GB').split("/");
                          for (let i = 0; i < empEmplData.length; i++) {
                            $.ajax({
                              url: serviceURL + "/odata/v2/EmpJob?$format=json&$filter=userId eq '" + empEmplData[i].userId + "'&fromDate=" + startDate[2] + "-" + startDate[1] + "-" + startDate[0] + "&toDate=" + afterSevenDays[2] + "-" + afterSevenDays[1] + "-" + afterSevenDays[0] + "",
                              type: 'GET',
                              contentType: "application/json", //job Info
                              success: function (data) {
                                if (data.d.results && data.d.results.length > 0) {
                                  for (let j = 0; j < data.d.results.length; j++) {
                                    if ((data.d.results[j].payGroup == "G1" || data.d.results[j].payGroup == "G2" || data.d.results[j].payGroup == "G4") && (data.d.results[j].emplStatus == discarded || data.d.results[j].emplStatus == terminated || data.d.results[j].emplStatus == retired || data.d.results[j].emplStatus == suspended)) {
                                      this.getId("_IDGenPanel451").setVisible(true);
                                      this.getId("idPersonalNum").setValue(empEmplData[i].userId);
                                      this.getId("idPosTitleD").setValue(data.d.results[j].customString1);
                                      this.getId("idNumberHoursD").setValue(data.d.results[j].standardHours);
                                      this.getId("idPA20").setDateValue(new Date(this.dateConverter(empEmplData[i].endDate)));
                                      this.getView().getModel("oneModel").setProperty("/SecDTerminData", { seqNumber: data.d.results[j].seqNumber, startDate: this.requiredDate(data.d.results[j].startDate) })
                                      $.ajax({
                                        url: serviceURL + "/odata/v2/cust_PersonnelArea?$filter= externalCode eq '" + data.d.results[j].customString3 + "'&$format=json",
                                        type: 'GET',
                                        contentType: "application/json", //job Info
                                        success: function (data) {
                                          if (data.d.results && data.d.results.length > 0) {
                                            this.getId("idLEASCHOOL").setValue(data.d.results[0].externalName + " (" + data.d.results[0].externalCode + ")");
                                          }
                                        }.bind(this),
                                        error: function (e) {
                                          console.log("JobInfo service error: " + e);
                                        }
                                      });
                                    }
                                  }
                                }
                              }.bind(this),
                              error: function (e) {
                                console.log("JobInfo service error: " + e);
                              }
                            });
                          }
                        }
                      }.bind(this),
                      error: function (e) {
                        console.log("JobInfo service error: " + e);
                      }
                    });
                  }
                }.bind(this),
                error: function (e) {
                  console.log("JobInfo service error: " + e);
                }
              });
            }
            // $.ajax({
            //   url: serviceURL + "/odata/v2/EmpEmployment(personIdExternal='" + oData.SelEmpCode + "', userId='" + oData.userID + "')/jobInfoNav?$format=json&fromDate=" + todayDate[0] + "-" + todayDate[2] + "-" + todayDate[1] + "&toDate=" + afterSevenDays[0] + "-" + afterSevenDays[2] + "-" + afterSevenDays[1] + "",
            //   type: 'GET',
            //   contentType: "application/json", //job Info
            //   success: function (data) {
            //     for (let j = 0; j < data.d.results.length; j++) {
            //       if (data.d.results[j].payGroup == "G4" && oData.InsuranceNo && (data.d.results[j].emplStatus == discarded || data.d.results[j].emplStatus == terminated || data.d.results[j].emplStatus == retired || data.d.results[j].emplStatus == suspended)) {
            //         this.getId("_IDGenPanel451").setVisible(true);
            //         this.getId("idPersonalNum").setValue(oData.SelEmpCode);
            //         this.getId("idLEASCHOOL").setValue(oData.Organization);
            //         this.getView().getModel("oneModel").setProperty("/SecDTerminData", { seqNumber: data.d.results[j].seqNumber, startDate: this.requiredDate(data.d.results[j].startDate) })
            //       }
            //     }
            //   }.bind(this),
            //   error: function (e) {
            //     console.log("JobInfo service error: " + e);
            //   }
            // });

            // $.ajax({
            //   url: serviceURL + "/odata/v2/EmpEmployment(personIdExternal='" + oData.SelEmpCode + "', userId='" + oData.userID + "')?$format=json",
            //   type: 'GET',
            //   contentType: "application/json", //job Info
            //   success: function (data) {
            //   }.bind(this),
            //   error: function (e) {
            //     console.log("JobInfo service error: " + e);
            //   }
            // });
          }.bind(this),
          error: function (e) {
            console.log(`No Employee Found for ${empl.d.results[0].personIdExternal}`);
          }
        });
      },

      //Reading data from backend using form id
      readFormidData: function (formId1, oModel) {
        // Calling header set and Work Schedule data
        this.getOwnerComponent().getModel("ZSFGTGW_NS01_SRV").read("/ZSFGT_NS01Set(Formid='" + formId1 + "')", {
          urlParameters: {
            "$expand": "HeadToWsNav"
          },
          success: function (oData) {

            // Setting Header data
            this.getId("idInitiator").setValue(oData.Initiator);
            this.getId("_IDGenInput2").setValue(oData.Formid);
            this.getId("_HIDGenFormId1").setValue(oData.Formid);
            this._fetchLogData(oData.Formid);
            this.getId("DatePicker01").setDateValue(new Date(this.convertS4Date(oData.Zdate)));
            this.getId("_IDGenInput4").setValue(oData.Organization);
            organizationCode = oData.Organization.split("(")[1].split(")")[0];
            this.getId("_IDGenInput4").setSelectedKey(organizationCode);
            oModel.setProperty("/lastSelectedOrg", organizationCode);
            // finding the approver for the org
            this.findApprover(organizationCode)
              .catch((e) => {
                MessageBox.error(e);
              })
            oModel.setProperty("/CostCentreP", { costCenter: oData.CostCenter });
            this.getId("_IDGen1Inpu1t4").setValue(oData.CostCenter);
            this.getId("approver").setValue(oData.Approver);
            this.getId("_IDGenCheckBox1").setSelected(oData.Notify ? true : false);
            personnel = oData.Organization;
            this.ApproverCode = oData.ApproverCode;
            userId = oData.userID
            companyCode = oData.CompanyCode;
            emplSubGroup = oData.EmpSubGrpCode;
            payGroup = oData.Paygroup;
            initiator = oData.CostCenterCode;
            if (initiatorFlag || noMode) {
              // loading the dropdown data as EMPSUBGRP is required
              this.allDropdowns(oModel, oData.OrgContTypeCode);
              // fetching grade dropdown
              this.getGrades(oModel, oData.OrgContTypeCode);
              //posCostCenterDropdown
              this.getPosCostCenter(companyCode, oModel)
            }

            // Section A Data
            this.showSecAFields(true);
            if (oData.EmployeedOrganization == "N") {
              // enabling fields for initiator
              if (initiatorFlag || noMode) {
                this.enableSecB(true);
              }
              else this.enableSecB(false);
              //setting panel header
              this.getId("_IDGenPanel4").setHeaderText("Section B – New Employee Details");
              this.getId("idempCame").setVisible(true);
              this.getId("idempCame").setRequired(true);
              this.getId("empCame3").setVisible(true);
              this.getId("empCame3").setRequired(true);

              this.getId("_IDGenLabel64").setVisible(false);
              this.getId("_IDGenLabel64").setRequired(false);
              this.getId("_IDGenComboBox41").setVisible(false);
              this.getId("_IDGenComboBox41").setRequired(false);

              this.getId("idempCame1").setVisible(false);
              this.getId("empCame").setVisible(false);
            } else {
              //setting panel header
              this.getId("_IDGenPanel4").setHeaderText("Section B - Multi Employee Details");
              // disabling fields for user
              this.enableSecB(false);
              // Setting Employee Info
              this.getId("_IDGenComboBox41").setSelectedKey(oData.SelEmpCode); // "4789",
              this.getId("_IDGenComboBox41").setValue(oData.SelectEmployee); // "4789",
              this.getId("idempCame").setVisible(false);
              this.getId("idempCame").setRequired(false);
              this.getId("empCame3").setVisible(false);
              this.getId("empCame3").setRequired(false);

              this.getId("_IDGenLabel64").setVisible(true);
              this.getId("_IDGenLabel64").setRequired(true);
              this.getId("_IDGenComboBox41").setVisible(true);
              this.getId("_IDGenComboBox41").setRequired(true);
            }

            // Setting section A info
            this.getId("_IDGenComboBox1").setSelectedKey(oData.EmployeedOrganization);
            this.getId("idempCame").setSelectedKey(oData.NewEmployee);  //  "GCC Council",
            this.getId("idempCame").setValue(oData.NewEmployeeText);  //  "GCC Council",
            this.getId("_IDGenInput10").setValue(oData.PreviousEmp);  // "Teacher",
            this.getId("_IDGenComboBox411").setValue(oData.OrgContType); //"Cont Type",
            this.getId("_IDGenComboBox411").setSelectedKey(oData.OrgContTypeCode);  // "Cont Type",
            this.getId("_IDGenInput11").setValue(oData.PositionTitle);  // "Teacher",
            this.getId("_IDGenInput112").setValue(oData.PosCostCentre); //  "00000107622 Down Ampney Church of England ",
            this.getId("_IDGenInput112").setSelectedKey(oData.PosCcenterCode);

            if ((oData.OrgContTypeCode == "4" || oData.OrgContTypeCode == "5") || (oData.CompanyCode == cirencesterCompanyCode && oData.OrgContTypeCode == "34")) {
              if (oData.EmployeedOrganization == "X") {
                this.getId("TeachRegNum11").setVisible(true);
                this.getId("TeachRegNum12").setVisible(true);
                this.getId("TeachRegNum").setVisible(false);
                this.getId("TeachRegNum1").setVisible(false);
                this.getId("TeachRegNum12").setRequired(true);
                this.getId("TeachRegNum").setRequired(false);
                this.getId("TeachRegNum1").setRequired(false);
              } else {
                this.getId("TeachRegNum11").setVisible(false);
                this.getId("TeachRegNum12").setVisible(false);
                this.getId("TeachRegNum").setVisible(true);
                this.getId("TeachRegNum1").setVisible(true);
                this.getId("TeachRegNum").setRequired(true);
                this.getId("TeachRegNum1").setRequired(true);
                this.getId("TeachRegNum12").setRequired(false);
              }
            }
            else {
              this.getId("TeachRegNum11").setVisible(false);
              this.getId("TeachRegNum12").setVisible(false);
              this.getId("TeachRegNum").setVisible(true);
              this.getId("TeachRegNum1").setVisible(true);
              this.getId("TeachRegNum12").setRequired(false);
              this.getId("TeachRegNum").setRequired(false);
              this.getId("TeachRegNum1").setRequired(true);
            }
            // Checking if confirmed button is pressed
            if (oData.ConfirmedButton == "X") {
              var oView = this.getView();
              // disable SecA fields
              this.enableSecA(false);
              // Setting button text
              oView.byId("_IDGenButton122").setText("Confirmed");
              oView.byId("_IDGenButton122").setEnabled(false);
              // setting panels visible
              oView.byId("_IDGenPanel45").setVisible(true);
              oView.byId("_IDGenPanel4").setVisible(true);
              oView.byId("_IDGenPanel4dh51").setVisible(true);

              if (initiatorFlag || noMode) {
                this.enableSecC(true);
              } else this.enableSecC(false);
            }
            oData.ConfirmedButton == "X" ? this.getId("_IDGenButton122").setText("Confirmed") : this.getId("_IDGenButton122").setText("Confirm Employee Details"),

              // Setting section B Data
              this.getId("titleB1").setValue(oData.Title);  //"Mr.",
            this.getId("titleB1").setSelectedKey(oData.TitleCode);// "1100",
            this.getId("foreName1").setValue(oData.Forename);  // "Sandeep",
            this.getId("middelname1").setValue(oData.Middlename);  // "Singh",
            this.getId("surname1").setValue(oData.Surname); // // "Singh",
            this.getId("contStartDate1").setDateValue(new Date(this.convertS4Date(oData.SerStartDate))); // // "19.12.2023",
            this.getId("streetHouseNo1").setValue(oData.Houseno); // // "House No",
            this.getId("2ndadd1").setValue(oData.SecAddress); //  //"Second Address",
            this.getId("city1").setValue(oData.City); // // "City",
            this.getId("country1").setValue(oData.County); //  // "County",
            this.getId("country1").setSelectedKey(oData.CountyCode); // // "CountyCode",
            this.getId("postcode1").setValue(oData.Postcode); // // "201301",
            this.getId("homeTelephone1").setValue(oData.TelNo); // //"9911535981",
            this.getId("mobileTelephone1").setValue(oData.MobNo); //// "9911535981",
            this.getId("emailAdd1").setValue(oData.EmailAdd); // // "abc@abc.com",
            this.getId("Dob11").setDateValue(new Date(this.convertS4Date(oData.Dob)));  //"20.09.1999",
            this.getId("nationalIns1").setValue(oData.InsuranceNo)  //"Insurance No",
            this.getId("Nationality1").setValue(oData.Nationality); //"Indian",
            this.getId("Nationality1").setSelectedKey(oData.NatCode); //"IN",
            this.getId("Disability1").setValue(oData.Disability)  // "No",
            this.getId("Disability1").setSelectedKey(oData.DisabilityCode);  // "No",
            this.getId("Ethicity1").setValue(oData.Ethicity)  //"Ethicity",
            this.getId("Ethicity1").setSelectedKey(oData.EthnicityCode)  // "Ethicity",
            this.getId("Gender1").setValue(oData.Gender) //"Male",
            this.getId("Gender1").setSelectedKey(oData.GenderCode)  // "M",
            this.getId("DBS1").setValue(oData.DbsNo)  //"123",
            this.getId("TeachRegNum1").setValue(oData.RegNo)  //"321",
            this.getId("ClearDate1").setDateValue(new Date(this.convertS4Date(oData.ClearanceDate)))  //"19.12.2023",
            this.getId("issuDate1").setDateValue(new Date(this.convertS4Date(oData.IssueDate)))  //"19.12.2023",
            this.getId("BankSort1").setValue(oData.BankSortCode)  //"1234567",
            oModel.setProperty("/bankName", { bankName: oData.BankName })  //"ABC Bank",
            this.getId("BankAccNum1").setValue(oData.BankAccNo)  //"12321312",
            this.getId("BuildingSoc1").setValue(oData.BuildSocRefNo)  //"RefNo123",

            // Setting First Emergency contact data
            if (oData.EmergencyAdd == "X") {
              // setting data to be visible
              this.getId("idAddEmergency").setVisible(true);
              // checking checkbox value
              this.getId("addEmergencyContact1").setSelected(true);
              if (initiatorFlag || noMode) this.enableFirstEmer(true)
              else
                this.enableFirstEmer(false);

              // Setting Data for first emergency contact
              this.getId("_IDGefnInput11").setValue(oData.StreetAdd), //"Street1",
                this.getId("_IDGefnInput12").setValue(oData.AddLine)  //"Address1",
              this.getId("_IDGefnInput14").setValue(oData.CityF)  //"City1",
              this.getId("_IDGenItem6").setValue(oData.CountyF)  // "County1",
              this.getId("_IDGenItem6").setSelectedKey(oData.CountyCodeF)  //"County1Code",
              this.getId("_IDGenInput15").setValue(oData.PostCodeF)  //"201301",
              this.getId("_IDGenInput16").setValue(oData.NameF)
              this.getId("_IDGenInput16s").setValue(oData.SurnameF)  //"Name1",
              this.getId("_IDGenInput17").setValue(oData.RelationF) //"Son",
              this.getId("_IDGenInput17").setSelectedKey(oData.RelationFCode)  //"Son",
              this.getId("_IDGenInput18").setValue(oData.HomTelNoF) //"123441",
            } else this.getId("idAddEmergency").setVisible(false);

            // checking Second emergency contact
            if (oData.SecondEmergencycontact == "X") {
              // same things for second emergency contacts
              this.getId("_IDGenCheckBox2").setSelected(true);
              this.getId("idSecondEmergency").setVisible(true);
              if (initiatorFlag || noMode) this.enableSecEmer(true)
              else
                this.enableSecEmer(false);
              this.getId("_IDGefnInput112").setValue(oData.StreetAddSec); // "Street2",
              this.getId("_IDGefnInput122").setValue(oData.AddLineSec); //"Address 2",
              this.getId("_IDGefnInput142").setValue(oData.CitySec);  //"County 2",
              this.getId("idree4d2").setValue(oData.CountySec);  // "City 2",
              this.getId("idree4d2").setSelectedKey(oData.CountyCodeSec);  //"CountyCode2",
              this.getId("_IDGenInput152").setValue(oData.PostCodeSec);  // "201301",
              this.getId("_IDGenInput162").setValue(oData.NameSec); // "Name 2",
              this.getId("_IDGenInput162s").setValue(oData.SurnameSec);  // "Surname 2",
              this.getId("_IDGenInput172").setValue(oData.RelationSec);  // "Son",
              this.getId("_IDGenInput172").setSelectedKey(oData.RelCodeSec); //"Son",
              this.getId("_IDGenInput182").setValue(oData.HomTelNoSec);  // "12321312",
            } else this.getId("idSecondEmergency").setVisible(false);

            // Setting Section C Data
            if (initiatorFlag || noMode) this.enableSecC(true);
            else this.enableSecC(false);
            this.getId("_IDGenComboBox17").setValue(oData.ContractType);  //"Permanent",
            this.getId("_IDGenComboBox17").setSelectedKey(oData.ContTypeCode);  // "P",
            this.getId("_IDGenDatePicker1").setDateValue(new Date(this.convertS4Date(oData.StartDate))); //  // "19.12.2023",
            this.getId("_IDGenDatePicker2").setDateValue(new Date(this.convertS4Date(oData.EndDate)));
            this.getId("_IDGenComboBox2").setValue(oData.Grade);  // "01-Grade",
            if (!oData.Grade)
              this.getId("_IDGenComboBox3").setEditable(false);
            this.getId("_IDGenComboBox2").setSelectedKey(oData.GradeCode); // "01",
            this.getId("_IDGenComboBox3").setValue(oData.ScalePoint);  // "01",
            this.getId("_IDGenComboBox3").setSelectedKey(oData.ScalePointCode);  // "01",
            this.getId("_IDGenComboBox6").setValue(oData.ClaimPos);// "11",t
            this.getId("_IDGenComboBox6").setSelectedKey(oData.ClaimPos ? oData.ClaimPos : null);
            this.getId("idFTE").setValue(oData.FteDec);
            this.getId("idFTEperc").setValue(oData.FtePerc);
            this.getId("Hoursperweek").setValue(oData.HoursPerWeek);
            if (oData.ProbPeriod) {
              if (oData.ProbPeriod == "Yes") {
                this.getId("_IDGenInput141").setSelectedKey("Yes");
                this.getId("probationEndDatePic").setDateValue(new Date(this.convertS4Date(oData.ProbPerEndDt)));
                this.getId("probationEndDate").setVisible(true);
                this.getId("probationEndDatePic").setVisible(true);
                this.getId("probationEndDatePic").setRequired(true);
              }
              else {
                this.getId("_IDGenInput141").setSelectedKey("No");
                this.getId("probationEndDatePic").setVisible(false);
                this.getId("probationEndDatePic").setRequired(false);
              }
            } else {
              this.getId("_IDGenInput141").setSelectedKey(null);
              this.getId("probationEndDatePic").setVisible(false);
              this.getId("probationEndDatePic").setRequired(false);
            }
            this.getId("idWeekYeardrop").setSelectedKey(oData.WorkingWeeksInt);
            this.getId("idWeekYeardrop").setValue(oData.WorkingWeeks);
            this.getId("idWorkingWeeksdrop").setValue(oData.AddWorkWeek);
            this.getId("idWorkingWeeksdrop").setSelectedKey(oData.AddWorkWeekInt);
            if (oData.ClaimPos == "Yes") {
              this.getId("idHoursPerWeek1").setVisible(false);
              this.getId("idWeekYear1").setVisible(false);
              this.getId("idfte1").setVisible(false);
              // this.getId("idfte1").setFieldGroupIds("");
              // this.getId("Hoursperweek").setFieldGroupIds("");
            }
            else {
              if ((oData.OrgContTypeCode == "4" || oData.OrgContTypeCode == "5") || (oData.CompanyCode == cirencesterCompanyCode && oData.OrgContTypeCode == "34")) {
                this.getId("idHoursPerWeek1").setVisible(false);
                this.getId("idWeekYear1").setVisible(false);
                this.getId("idfte1").setVisible(true);
              }
              else {
                this.getId("idfte1").setVisible(false);
                this.getId("idHoursPerWeek1").setVisible(true);
                this.getId("idWeekYear1").setVisible(true);
              }
            }
            if (oData.Grade || oData.GradeCode) {
              this.onSelectPayScaleGroup("");
            }

            // if (oData.WageTypeCheck1 || oData.WageTypeAmt1) {
            // this.getId("_IDGenComboBox6").setSelectedKey("yes");
            // this.getId("Hoursperweek").setValue(oData.WageType1);
            // this.getId("idWorkingWeeksdrop").setSelectedKey(oData.WageTypeCheck1);
            // this.getId("idWeekYeardrop").setSelectedKey(oData.WageTypeAmt1);
            // this.getId("idWeekYeardrop").setValue(oData.WageTypeAmt1);
            // }
            if (oData.WageTypeCheck2 || oData.WageTypeAmt2) {
              this.getView().getModel("oneModel").setProperty("/wage2Value", oData.WageTypeAmt2);
            } else this.getView().getModel("oneModel").setProperty("/wage2Value", "");
            // if (oData.WageTypeCheck3 || oData.WageTypeAmt3) {
            // this.getId("idWorkingWeeksdrop").setValue(oData.WageTypeAmt3)
            // }


            this.getId("idSelectTypePos1").setSelectedKey(oData.EmpSubGrp);

            this.getId("_IDGenComboBox8").setValue(oData.Allowance1);  // "1100",
            this.getId("_IDGenComboBox8").setSelectedKey(oData.AllowCode1);  // // "1100",
            if (!(oData.Allowance1 || oData.AllowCode1)) {
              this.getId("_IDGenInput191").setEditable(false); // "100",
              this.getId("_IDGenInput12").setEditable(false);
            }
            else {
              if (initiatorFlag || noMode)
                this.getWageDetails(oData.AllowCode1, 1, oModel);
              this.getId("_IDGenInput191").setValue(oData.Amount1); // "100",
              this.getId("_IDGenInput12").setValue(oData.Unit1);  //"No",
            }
            this.getId("_IDGenComboBox82").setValue(oData.Allowance2);  // "1101",
            this.getId("_IDGenComboBox82").setSelectedKey(oData.AllowCode2); // "1101",
            if (!(oData.Allowance2 || oData.AllowCode2)) {
              this.getId("_IDGenInput1912").setEditable(false); // "100",
              this.getId("_IDGenInput122").setEditable(false);
            }
            else {
              if (initiatorFlag || noMode)
                this.getWageDetails(oData.AllowCode2, 2, oModel);
              this.getId("_IDGenInput1912").setValue(oData.Amount2);  // "231",
              this.getId("_IDGenInput122").setValue(oData.Unit2);  // "Unit",
            }
            if (!(oData.Allowance3 || oData.AllowCode3)) {
              this.getId("_IDGenInput1913").setEditable(false); // "100",
              this.getId("_IDGenInput123").setEditable(false);
            }
            else {
              this.getId("_IDGenComboBox83").setValue(oData.Allowance3); // "1103",
              this.getId("_IDGenComboBox83").setSelectedKey(oData.AllowCode3);  //"1103",
              if (initiatorFlag || noMode)
                this.getWageDetails(oData.AllowCode3, 3, oModel);
              this.getId("_IDGenInput1913").setValue(oData.Amount3);  // "223",
              this.getId("_IDGenInput123").setValue(oData.Unit3);  //"UnNo.",
            }

            if (this.query && this.query.report) {
              if (oData.Personalnumber && oData.Pa20EndDate && oData.Selectoption && oData.SelOptCode && oData.LeaSchoolname && oData.NoHours)
                this.getId("_IDGenPanel451").setVisible(true);
              this.getId("idSelectTypePos1").setEditable(false);
              this.getId("selectPositionCombobox").setEditable(false);
              this.getId("_IDGenButton1d22").setVisible(false);
            } else {
              if (bscFlag)
                // checking if section D has to be visible
                this.checkSectionD(oData);
            }
            // Setting section D data
            this.getId("idPersonalNum").setValue(oData.Personalnumber);  //"12312",
            this.getId("idPosTitleD").setValue(oData.PosTitle);  //"Teacher",
            this.getId("idPA20").setDateValue(new Date(this.convertS4Date(oData.Pa20EndDate))); // "20.12.2023",
            this.getId("idSelectOption").setValue(oData.Selectoption); // "SelOpt",
            this.getId("idSelectOption").setSelectedKey(oData.SelOptCode);  // "",
            this.getId("idLEASCHOOL").setValue(oData.LeaSchoolname);  //"Lea School",
            this.getId("idNumberHoursD").setValue(oData.NoHours); // "1",
            this.getView().getModel("oneModel").setProperty("/SecDTerminData", { seqNumber: oData.seqNumber, startDate: oData.TermStartDt })

            if (bscFlag) {
              if (this.query && this.query.report) { }
              else
                // loading dropdowns of Position title
                this.dropdownsBsc(oModel, oData);
            }

            // filling section E data
            this.getId("idSelectTypePos1").setSelectedKey(oData.TypeOfPosCode);
            this.getId("idSelectTypePos1").setValue(oData.TypeOfPos);
            this.getId("selectPositionCombobox").setSelectedKey(oData.SelectPosCode);
            this.getId("selectPositionCombobox").setValue(oData.SelectPos);
            this.getId("idPositionCostCentre").setValue(oData.SecEPosCcenter);
            oModel.setProperty("/costCenter", { costCenter: oData.SecEPosCcenter });
            this.getId("idJobTitle").setValue(oData.SecEPosTitle);
            this.getId("idEmployeeSubGroup").setValue(oData.TypeOfPos ? oData.TypeOfPos.split(" ")[0] : "");
            this.getId("idGrade").setValue(oData.SecEGrade);

            //   previewData[counter][items[i].Day] = { [items[i].Day]: items[i].HoursWorked, dataFound: "true", DaysName: items[i].Day, ScheduleDay: items[i].ScheduleDay, Daykey: items[i].DayKey };
            // previewData[counter].Type = "Hours";
            var oModelWS = new JSONModel();
            if (oData.HeadToWsNav.results && oData.HeadToWsNav.results.length > 0) {
              var wsData = [];
              var s4WsData = oData.HeadToWsNav.results;
              for (let i = 0; i < s4WsData.length; i++) {
                var singleData = {
                  ScheduleDay: s4WsData[i].ScheduleDay,
                  Day: s4WsData[i].DaysName,
                  DayKey: +s4WsData[i].DayKey,
                  HoursWorked: s4WsData[i].Value
                }
                wsData.push(singleData);
              }
              oModelWS.setProperty("/WSItems", JSON.parse(JSON.stringify(wsData)));
              oModelWS.setProperty("/WSSavedItems", JSON.parse(JSON.stringify(wsData)));
              this.preparePreviewData(oModelWS)
            } else {
              if (oData.StartDate) {
                var startDate = new Date(oData.StartDate.split("/")[2], oData.StartDate.split("/")[1], oData.StartDate.split("/")[0]);
                var oModelWS = new JSONModel();
                oModelWS.setProperty("/WSItems", [{
                  ScheduleDay: "1",
                  Day: this.oWeekDays.filter((el) => el.key == startDate.getDay())[0].day,
                  DayKey: startDate.getDay(),
                  HoursWorked: "0.00"
                }]);
              }
            }
            oModelWS.setProperty("/DelButShow", false);
            oModelWS.setProperty("/WSHoursPerWeek", "0.0");
            oModelWS.setProperty("/PreviewTableShow", false);
            oModelWS.setProperty("/PreviewText", "Preview Schedule");
            this.getView().setModel(oModelWS, "WSModel");
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
              this.getId("_IDGenTextArea1").setValue(comment);
              this.getId("_IDGenTextArea1").setVisible(true);
              this.getId("_IDGenLabeldf11").setVisible(true);
            }
          }.bind(this),
          error: function (oData) {
            console.log("Error", oData);
          }
        });
      },

      convertS4Date: function (date1) {
        if (date1) {
          return date1.split("/").reverse().join("-");
        }
      },

      s4LogCreation: async function (Status, managerId) {

        var log_payload = {
          "OrganizationName": this.getId("_IDGenInput4").getValue(),
          "Formid": this.getId("_IDGenInput2").getValue(),
          "StartedOn": new Date(this.getId("DatePicker01").getValue()),
          "Status": Status,
          "Type": "NS01",
          "OrganizationName": personnel,
          "OrgCode": personnel.match(/\((.*?)\)/)[1],
          "InitCode": initiator,
          "Initiator": this.getId("idInitiator").getValue(),
          "Description": "New Starter Form",
          "FormOwner": Status == "S" ? this.getId("approver").getValue() : this.getId("idInitiator").getValue(),
          "FormOwnerCode": Status == "S" ? managerId : initiator,
          "ApproverName": Status == "S" ? this.getId("approver").getValue() : "",
          "ApproverCode": Status == "S" ? managerId : "",
          "AvailableFrom": new Date(),
        }
        this.getOwnerComponent().getModel("ZSFGTGW_LOG_SRV").create("/zsf_logSet", log_payload,
          {
            success: function (oData) {
              console.log(`${oData.Formid} log created`);
              this._fetchLogData(oData.Formid);
            }.bind(this),
            error: function (oData) {
              console.log("Error", oData);
            }
          });
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

              this.getView().getModel("oneModel").setProperty("/bankName", { bankName: data.d.bankName });
              oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
            }.bind(this),
            error: function (e) {
              oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
              oEvent.oSource.setValueStateText("Please enter a valid Routing Number for GBR that matches the expected ISO format");
              this.getView().getModel("oneModel").setProperty("/bankName", { bankName: "" });
            }.bind(this)
          });
        }
      },

      getContractTypeDropdown: function (orgCode, oModel) {
        // Contract dropdowns
        $.ajax({
          url: serviceURL + "/odata/v2/cust_ZFLM_CONTRACT_TY?$format=json&$filter=cust_PersArea eq '" + orgCode + "'",
          type: 'GET',
          contentType: "application/json",
          success: function (data) {
            if (data.d.results.length > 0) {
              data.d.results.sort((a, b) => {
                if (a.cust_Text < b.cust_Text) return -1;
                if (a.cust_Text > b.cust_Text) return 1;
              });
              oModel.setProperty("/oContractType", data);
            }
            else {
              $.ajax({
                url: serviceURL + "/odata/v2/cust_ZFLM_CONTRACT_TY?$format=json&$filter=cust_PersArea eq 'XXXX'",
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
              });
            }
          },
          error: function (e) {
            console.log("error: " + e);
          }
        });
      },

      onNIChange: function (oEvent) {
        var value = oEvent.getSource().getValue();
        var regex = /^(?!BG|GB|NK|KN|TN|NT|ZZ)[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z](?:\s*\d{2}){3}\s*[A-D]$/;
        if (value) {
          let input = value.replace(/\s+/g, "").toUpperCase();
          let formatted = "";
          // Insert spaces at the correct positions
          if (input.length > 2) formatted += input.slice(0, 2) + " ";
          if (input.length > 4) formatted += input.slice(2, 4) + " ";
          if (input.length > 6) formatted += input.slice(4, 6) + " ";
          if (input.length > 8) formatted += input.slice(6, 8) + " ";
          if (input.length > 8) formatted += input.slice(8);
          value = formatted;
          if (!regex.test(value)) {
            oEvent.oSource.setValueState(sap.ui.core.ValueState.Error);
            oEvent.getSource().setValueStateText("This NI number is invalid, please re-enter. Please note that the NI number should be in the format AA 99 99 99 A including spaces. Should you have any further difficulties please call Contact Us on 01452 425888");
          } else {
            oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
            $.ajax({
              url: serviceURL + "/odata/v2/PerNationalId?$format=json&$filter=nationalId eq '" + value + "'",
              type: 'GET',
              contentType: "application/json",
              success: function (data) {
                if (data.d.results && data.d.results.length > 0) {
                  oEvent.oSource.setValueState(sap.ui.core.ValueState.Warning);
                  MessageBox.warning(`This person already exists in the system with personnel number ${data.d.results[0].personIdExternal}. Please check the NI number is correct and Cancel this form if this is a duplicate`)
                  oEvent.getSource().setValueStateText(`This person already exists in the system with personnel number ${data.d.results[0].personIdExternal}. Please check the NI number is correct and Cancel this form if this is a duplicate`);
                  oEvent.getSource().setValue(value);
                } else {
                  oEvent.oSource.setValueState(sap.ui.core.ValueState.None);
                  oEvent.getSource().setValue(value);
                }
              }.bind(this),
              error: function (e) {
                MessageBox.error(`Some error occured. Please re-write NI number`);
                oEvent.getSource().setValue(null);
              }.bind(this)
            });
          }
        } else oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
      },

      onProbDateChange: function (oEvent) {

      },

      onPositionTypeChange: function (oEvent) {
        if (oEvent) {
          if (oEvent.getSource().getSelectedItem()) {
            oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
          }
          else {
            oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
            MessageBox.error("Please select a valid value");
          }
        }
        sap.ui.core.BusyIndicator.show();
        var perArea = this.getId("_IDGenInput4").getValue().split("(")[1].split(")")[0];
        var grade = this.getId("_IDGenComboBox2").getSelectedItem() != null ? this.getId("_IDGenComboBox2").getSelectedItem().getKey() : this.getId("_IDGenComboBox2").getSelectedKey();
        var startDate = new Date(this.getId("_IDGenDatePicker1").getValue()).toLocaleDateString('en-CA');
        var empGrp = this.getId("idSelectTypePos1").getValue().split(" ")[0];

        // fetching Position data
        this.getPositions(perArea, grade, startDate, empGrp);
        // $.ajax({
        //   url: serviceURL + "/odata/v2/Position?$format=json&$filter=cust_persArea eq '" + perArea.split("(")[1].split(")")[0] + "' and vacant eq true and effectiveStartDate le datetime'" + startDate + "T00:00:00' and cust_employeeType eq '" + emplSubGroup + "' and cust_PayScaleGroup eq '" + grade + "'",
        //   type: 'GET',
        //   contentType: "application/json",
        //   success: function (data) {
        //     sap.ui.core.BusyIndicator.hide();
        //     data.d.results.sort();
        //     this.getView().getModel("oneModel").setProperty("/Positions", data.d.results);
        //     this.getId("selectPositionCombobox").setEditable(true)
        //     if (data.d.results.length == 0) {
        //       MessageBox.error("There are no suitable positions available. Please set one up and then click on the refresh button");
        //     }

        //   }.bind(this),
        //   error: function (e) {
        //     sap.ui.core.BusyIndicator.hide();
        //     console.log("error: " + e);
        //   }
        // });
      },

      onPositionChange: function (oEvent) {
        if (oEvent.getSource().getSelectedItem()) {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
          sap.ui.core.BusyIndicator.show();
          var oKey = oEvent.getSource().getSelectedItem().getKey();
          var oValue = this.getId("selectPositionCombobox").getSelectedItem().getText();
          if (oValue) {
            var obj = this.getView().getModel("oneModel").getProperty("/Positions").filter((el) => el.code == oKey)[0];
            this.checkActualHours(obj)
              .then(() => {
                oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
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

                var isClaimPos = this.getId("_IDGenComboBox6").getSelectedItem() != null ? this.getId("_IDGenComboBox6").getSelectedItem().getText() : this.getId("_IDGenComboBox6").getValue();
                if (isClaimPos == "No") {
                  var isTeacher = this.getId("_IDGenComboBox411").getSelectedItem() != null ? this.getId("_IDGenComboBox411").getSelectedItem().getKey() : this.getId("_IDGenComboBox411").getSelectedKey()
                  const standardHoursFTE = 32.5;
                  if ((isTeacher == "4" || isTeacher == "5") || (companyCode == cirencesterCompanyCode && isTeacher == "34")) {
                    var givenFTE = this.getId("idFTE").getValue();
                    this.getId("Hoursperweek").setValue((parseFloat(givenFTE) * standardHoursFTE).toFixed(2));
                  }
                  else {
                    var standHours = obj.standardHours;
                    var givenHours = this.getId("Hoursperweek").getValue();
                    this.getId("idFTE").setValue((parseFloat(givenHours) / parseFloat(standHours)).toFixed(5));
                    this.getId("idFTEperc").setValue(((parseFloat(givenHours) / parseFloat(standHours)) * 100).toFixed(2) + "%");
                  }
                }
                this.getId("idPos").setVisible(true);
                this.getId("idJobT").setVisible(true);
                this.getId("idEmpSub").setVisible(true);
                this.getId("idGrade1").setVisible(true);
                this.getId("idPositionCostCentre").setVisible(true);
                this.getId("idJobTitle").setVisible(true);
                this.getId("idJobTitle").setValue(obj.jobTitle);
                this.getId("idEmployeeSubGroup").setVisible(true);
                this.getId("idEmployeeSubGroup").setValue(obj.cust_employeeType);
                this.getId("idGrade").setVisible(true);
                this.getId("idGrade").setValue(obj.cust_PayScaleGroup);
              })
              .catch((e) => {
                MessageBox.error(e)
                sap.ui.core.BusyIndicator.hide();
                oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
              })
          }
        }
        else {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
          MessageBox.error("Please select a valid value");
        }
      },

      onFresh: function () {
        this.onPositionTypeChange("");
      },

      onChangeUnit: function (oEvent, allowanceRow) {
        var value = oEvent.getSource().getValue();
        var oModel = this.getView().getModel("oneModel");
        oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
        oEvent.getSource().setValueStateText(`Unit is a required field`);
        if (value) {
          if (value > +oModel.getProperty(`/maxUnit${allowanceRow}`).split(",").join("")) {
            oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
            oEvent.getSource().setValueStateText(`Number / Unit cannot exceed ${+oModel.getProperty(`/maxUnit${allowanceRow}`).split(",").join("")}`);
          }
        }
      },
      onChangeAmount: function (oEvent, allowanceRow) {
        var value = oEvent.getSource().getValue();
        var oModel = this.getView().getModel("oneModel");
        oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
        oEvent.getSource().setValueStateText(`Amount is a required field`);
        if (value) {
          if (value > +oModel.getProperty(`/maxRate${allowanceRow}`).split(",").join("")) {
            oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
            oEvent.getSource().setValueStateText(`Amount cannot exceed ${+oModel.getProperty(`/maxRate${allowanceRow}`).split(",").join("")}`);
          }
        } else {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
        }
      },
      onChangeAllowance: function (oEvent, allowanceRow) {
        var oModel = this.getView().getModel("oneModel");
        if (oEvent.getSource().getValue()) {
          if (oEvent.getSource().getSelectedItem()) {
            oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
            var oKey = oEvent.getSource().getSelectedKey();
            var allowanceExist = this.checkAllowanceType(oKey, allowanceRow);
            if (!allowanceExist) {
              this.clearAllowanceDetails(allowanceRow);
              this.getWageDetails(oKey, allowanceRow, oModel);
            } else {
              oModel.setProperty(`/enableRate${allowanceRow}`, false);
              oModel.setProperty(`/enableUnit${allowanceRow}`, false);
              this.clearAllowanceDetails(allowanceRow);
              oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
              oEvent.getSource().setValueStateText("This allowance type is already selected");
              MessageBox.error("This allowance type is already selected");
            }
          }
          else {
            oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
            oEvent.getSource().setValueStateText("Enter a valid Allowance");
            oModel.setProperty(`/enableRate${allowanceRow}`, false);
            oModel.setProperty(`/enableUnit${allowanceRow}`, false);
            this.clearAllowanceDetails(allowanceRow);
          }
        } else {
          oModel.setProperty(`/enableRate${allowanceRow}`, false);
          oModel.setProperty(`/enableUnit${allowanceRow}`, false);
          this.clearAllowanceDetails(allowanceRow);
        }
      },

      getWageDetails: function (allowanceKey, allowanceRow, oModel) {
        if (allowanceKey && allowanceRow) {
          $.ajax({
            url: serviceURL + "/odata/v2/cust_ZFLM_WAGCHECK_RU?$filter=cust_WageType eq '" + allowanceKey + "'&$format=json",
            type: 'GET',
            contentType: "application/json",
            success: function (data) {
              if (data) {
                var wagechk = data.d.results[0];
                if (wagechk.cust_RateAllow == "X") {
                  oModel.setProperty(`/enableRate${allowanceRow}`, true);
                  oModel.setProperty(`/maxRate${allowanceRow}`, wagechk.cust_MaxRate);
                  oModel.setProperty(`/enableUnit${allowanceRow}`, false);
                }
                else if (wagechk.cust_UnitsAllow == "X") {
                  oModel.setProperty(`/enableUnit${allowanceRow}`, true);
                  oModel.setProperty(`/maxUnit${allowanceRow}`, wagechk.cust_MaxUnits);
                  oModel.setProperty(`/enableRate${allowanceRow}`, false);
                }
              }
            },
            error: function (e) {
              console.log(e);
              this.clearAllowanceDetails(allowanceRow);
            }.bind(this)
          });
        }
      },

      clearAllowanceDetails: function (allowanceRow) {
        if (allowanceRow == 1) {
          this.getId("_IDGenInput191").setValue(null);
          this.getId("_IDGenInput191").setValueState(sap.ui.core.ValueState.Warning);
          this.getId("_IDGenInput191").setValueStateText("Please ensure you enter the monthly allowance amount not annual. If your employee is part time please also pro-rata the allowance as necessary");
          this.getId("_IDGenInput12").setValue(null);
          this.getId("_IDGenInput12").setValueState(sap.ui.core.ValueState.Warning);
          this.getId("_IDGenInput12").setValueStateText("Please ensure you enter the monthly allowance amount not annual. If your employee is part time please also pro-rata the allowance as necessary");
        }
        else if (allowanceRow == 2) {
          this.getId("_IDGenInput1912").setValue(null);
          this.getId("_IDGenInput1912").setValueState(sap.ui.core.ValueState.Warning);
          this.getId("_IDGenInput1912").setValueStateText("Please ensure you enter the monthly allowance amount not annual. If your employee is part time please also pro-rata the allowance as necessary");
          this.getId("_IDGenInput122").setValue(null);
          this.getId("_IDGenInput122").setValueState(sap.ui.core.ValueState.Warning);
          this.getId("_IDGenInput122").setValueStateText("Please ensure you enter the monthly allowance amount not annual. If your employee is part time please also pro-rata the allowance as necessary");
        }
        else {
          this.getId("_IDGenInput1913").setValue(null);
          this.getId("_IDGenInput1913").setValueState(sap.ui.core.ValueState.Warning);
          this.getId("_IDGenInput1913").setValueStateText("Please ensure you enter the monthly allowance amount not annual. If your employee is part time please also pro-rata the allowance as necessary");
          this.getId("_IDGenInput123").setValue(null);
          this.getId("_IDGenInput123").setValueState(sap.ui.core.ValueState.Warning);
          this.getId("_IDGenInput123").setValueStateText("Please ensure you enter the monthly allowance amount not annual. If your employee is part time please also pro-rata the allowance as necessary");
        }
      },

      checkAllowanceType: function (allowanceType, allNumber) {
        var all1 = this.getId("_IDGenComboBox8").getSelectedItem() ? this.getId("_IDGenComboBox8").getSelectedItem().getKey() : this.getId("_IDGenComboBox8").getSelectedKey();
        var all2 = this.getId("_IDGenComboBox82").getSelectedItem() ? this.getId("_IDGenComboBox82").getSelectedItem().getKey() : this.getId("_IDGenComboBox82").getSelectedKey();
        var all3 = this.getId("_IDGenComboBox83").getSelectedItem() ? this.getId("_IDGenComboBox83").getSelectedItem().getKey() : this.getId("_IDGenComboBox83").getSelectedKey();
        var sameAllowanceFound = false;
        if (allNumber != 1) {
          if (all1 == allowanceType)
            sameAllowanceFound = true;
        }
        if (allNumber != 2) {
          if (all2 == allowanceType)
            sameAllowanceFound = true;
        }
        if (allNumber != 3) {
          if (all3 == allowanceType)
            sameAllowanceFound = true;
        }
        return sameAllowanceFound;
      },

      onSelectPayScaleGroup: function (oEvent) {
        if (oEvent) {
          var grade = oEvent.getSource().getSelectedItem() != null ? oEvent.getSource().getSelectedItem().getKey() : oEvent.getSource().getSelectedKey();
        } else var grade = this.getId("_IDGenComboBox2").getSelectedKey();
        if (grade) {
          if (oEvent)
            oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
          var oModel = this.getView().getModel("oneModel");
          this.getId("_IDGenComboBox3").setValue("");
          if (grade != "") {
            this._getTTOWeeks(grade);
            var workingWeeks = this.getId("idWeekYeardrop").getSelectedItem() != null ? this.getId("idWeekYeardrop").getSelectedItem().getText() : this.getId("idWeekYeardrop").getValue();
            this._checkWage2(grade, workingWeeks);

            $.ajax({
              url: serviceURL + "/odata/v2/PayScaleLevel?$filter=substringof('" + grade + "', code)&$format=json",
              type: 'GET',
              contentType: "application/json",
              success: function (data) {
                if (!(approverFlag || bscFlag)) {
                  this.getId("_IDGenComboBox3").setEditable(true);
                }
                oModel.setProperty("/scalePoint", data.d.results);
              }.bind(this),
              error: function (e) {
                console.log("error: " + e);
              }
            });
          }
          else {
            this.getId("_IDGenComboBox3").setEditable(false);
          }
        }
        else {
          if (oEvent)
            oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
        }
      },

      _getEmployees: async function (orgCode) {
        sap.ui.core.BusyIndicator.show();
        var oModel = this.getView().getModel("oneModel")
        oModel.setProperty("/employeeList", []);
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
            employeeData = data.d.results;
          }.bind(this),
          error: function (e) {
            sap.ui.core.BusyIndicator.hide();
            console.log("error: " + e);
          }
        });

        employeeData = this.filterEmplData(employeeData);
        let a = new sap.ui.model.odata.ODataModel(serviceURL + "/odata/v2", true);
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
                  try {
                    var temp = {
                      firstName: data.__batchResponses[i].data.results[0].firstName,
                      lastName: data.__batchResponses[i].data.results[0].lastName,
                      userId: emplData[i].userId,
                      jobInfo: emplData[i].customString1,
                      personIdExternal: data.__batchResponses[i].data.results[0].personIdExternal
                    };
                    EmpData.push(temp);
                  } catch (e) {
                    console.log("Inconsistent data found for " + emplData[i].userId);
                  }
                }
                var existingData = oModel.getProperty("/employeeList");
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
                oModel.setProperty("/employeeList", finalData);
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
        var orgValue = oEvent.getSource().getSelectedItem();
        this.clearFields();
        if (orgValue) {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
          orgValue = oEvent.getSource().getSelectedItem().getText();
          if (orgValue === "Yes") {
            this.getId("_IDGenPanel4").setHeaderText("Section B - Multi Employee Details");
            // getting employee data
            var org = this.getId("_IDGenInput4").getValue().split("(")[1].split(")")[0];
            this._getEmployees(org);

            this.getId("_IDGenInput10").setValue(this.getId("_IDGenInput4").getValue());
            // changing the fields on user inputs
            this.getId("idempCame").setVisible(false);
            this.getId("idempCame").setRequired(false);
            this.getId("empCame3").setVisible(false);
            this.getId("empCame3").setRequired(false);

            this.getId("_IDGenLabel64").setVisible(true);
            this.getId("_IDGenLabel64").setRequired(true);
            this.getId("_IDGenComboBox41").setVisible(true);
            this.getId("_IDGenComboBox41").setRequired(true);

            this.showSecAFields(false);

          } else {

            this.getId("_IDGenPanel4").setHeaderText("Section B – New Employee Details");

            this.getId("_IDGenInput10").setValue("");
            // changing the fields on user inputs
            this.getId("idempCame").setVisible(true);
            this.getId("idempCame").setRequired(true);
            this.getId("empCame3").setVisible(true);
            this.getId("empCame3").setRequired(true);

            this.getId("_IDGenLabel64").setVisible(false);
            this.getId("_IDGenLabel64").setRequired(false);
            this.getId("_IDGenComboBox41").setVisible(false);
            this.getId("_IDGenComboBox41").setRequired(false);

            this.getId("idempCame1").setVisible(false);
            this.getId("empCame").setVisible(false);

            this.getId("TeachRegNum11").setVisible(false);
            this.getId("TeachRegNum12").setVisible(false);
            this.getId("TeachRegNum").setVisible(true);
            this.getId("TeachRegNum1").setVisible(true);
            this.getId("TeachRegNum12").setRequired(false);

            this.showSecAFields(true);

            // this.getId("_IDGenLabel621").setVisible(true);
            // this.getId("_IDGenInput10").setVisible(true);
            // this.getId("_IDGenLabel6421").setVisible(true);
            // this.getId("_IDGenComboBox411").setVisible(true);
            // this.getId("_IDGenLabel6411").setVisible(true);
            // this.getId("_IDGenInput11").setVisible(true);
            // this.getId("_IDGenLabel611").setVisible(true);
            // this.getId("_IDGenInput112").setVisible(true);

            // this.getId("country1").setEditable(true);
            // this.getId("Dob11").setEditable(true);
            // this.getId("Nationality1").setEditable(true);
            // this.getId("Disability1").setEditable(true);
            // this.getId("DBS1").setEditable(true);
            // this.getId("TeachRegNum1").setEditable(true);
            // this.getId("BankSort1").setEditable(true);
            // this.getId("BankAccNum1").setEditable(true);
            // this.getId("nationalIns1").setEditable(true);
            // this.getId("Ethicity1").setEditable(true);
            // this.getId("Gender1").setEditable(true);
            // this.getId("ClearDate1").setEditable(true);
            // this.getId("ClearDate1").setEditable(true);
            // this.getId("issuDate1").setEditable(true);
            // this.getId("issuDate1").setEditable(true);
            // //this.getId("BankName1").setEnabled(true);
            // this.getId("BuildingSoc1").setEditable(true);
            // this.getId("_IDGefnInput11").setEditable(true);
            // this.getId("_IDGefnInput12").setEditable(true);
            // this.getId("_IDGefnInput14").setEditable(true);
            // this.getId("_IDGenItem6").setEditable(true);
            // // this.getId("idCountry").setEnabled(true);
            // this.getId("_IDGenInput15").setEditable(true);
            // this.getId("_IDGenInput16").setEditable(true);
            // this.getId("_IDGenInput16s").setEditable(true);
            // this.getId("_IDGenInput17").setEditable(true);
            // this.getId("_IDGenInput18").setEditable(true);
            // // this.getId("_IDGenInput19").setEditable(true);
            // this.getId("_IDGefnInput112").setEditable(true);
            // this.getId("_IDGefnInput122").setEditable(true);
            // this.getId("_IDGefnInput142").setEditable(true);
            // this.getId("idree4d2").setEditable(true);
            // this.getId("_IDGenInput152").setEditable(true);
            // this.getId("_IDGenInput162").setEditable(true);
            // this.getId("_IDGenInput162s").setEditable(true);
            // this.getId("_IDGenInput172").setEditable(true);
            // this.getId("_IDGenInput182").setEditable(true);
            // // this.getId("_IDGenInput192").setEditable(true);
          }
        }
        else
          oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
      },

      allDropdowns: function (oModel, workContract) {

        //ContractType
        // $.ajax({
        //   url: serviceURL + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'Contracttype' and status eq 'A' &$format=json",
        //   type: 'GET',
        //   contentType: "application/json",
        //   success: function (data) {
        //     data.d.results.sort((a, b) => {
        //       if (a.label_en_GB < b.label_en_GB) return -1;
        //       if (a.label_en_GB > b.label_en_GB) return 1;
        //     });
        //     oModel.setProperty("/oContractType1", data.d.results);
        //   },
        //   error: function (e) {
        //     console.log("error: " + e);
        //   }
        // })

        const workCntrct = workContract ? workContract : this.getId("_IDGenComboBox411").getSelectedKey();

        //Title
        $.ajax({
          url: serviceURL + "/odata/v2/Picklist('salutation')/picklistOptions?$format=json",
          type: 'GET',
          contentType: "application/json",
          success: function (data) {

            var salut = [];
            let a = new sap.ui.model.odata.ODataModel(serviceURL + "/odata/v2", true);
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
                for (let j = 0; j < data.__batchResponses.length; j++) {
                  var temp = {
                    externalCode: data.__batchResponses[j].data.results[0].optionId,
                    label_en_GB: data.__batchResponses[j].data.results[0].label
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
            //       
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
          url: serviceURL + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'COUNTY_GCC' and status eq 'A' &$format=json",
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

            data.d.results.sort((a, b) => {
              if (a.label_en_GB < b.label_en_GB) return -1;
              if (a.label_en_GB > b.label_en_GB) return 1;
            });
            oModel.setProperty("/nationality", data.d.results);
            oModel.setProperty("/defaultNationality", "GBR");
            this.getId("Nationality1").setValue(data.d.results.filter((el) => el.externalCode == "GBR")[0].label_en_GB);
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
            data.d.results.push()
            oModel.setProperty("/Disability", data.d.results);
          }.bind(this),
          error: function (e) {
            console.log("error: " + e);
          }
        });

        // allowance dropdown
        var empJob = oModel.getProperty("/EmpJobData");
        const subArea = (workCntrct == "4" || workCntrct == "5") ? "S001" : (companyCode == cirencesterCompanyCode || workCntrct == "34") ? "SA01" : "S002";
        $.ajax({
          url: serviceURL + `/odata/v2/cust_ZFLM_WAGTYPES_DD?$format=json&$filter=cust_PersSubarea eq '${subArea}' and cust_PersArea eq '${empJob.customString3}'`,
          type: 'GET',
          contentType: "application/json",
          success: function (data) {
            var countyArr = [];
            for (let i = 0; i < data.d.results.length; i++) {
              $.ajax({
                url: serviceURL + "/odata/v2/FOPayComponent?$filter=externalCode eq '" + data.d.results[i].cust_WageType + "' &$format=json",
                type: 'GET',
                contentType: "application/json",
                success: function (data) {
                  countyArr.push(data.d.results[0]);
                  countyArr.sort((a, b) => {
                    if (a.externalCode < b.externalCode) return -1;
                    if (a.externalCode > b.externalCode) return 1;
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
        });

        // Loading all the Personnel Area data
        $.ajax({
          url: serviceURL + "/odata/v2/cust_PersonnelArea?$format=json&$select=cust_PayrollArea,externalCode",
          type: 'GET',
          contentType: "application/json",
          success: function (data) {
            oModel.setProperty("/PersonnelAreaDetails", data.d.results);
            payGroup = data.d.results.find((el) => el.externalCode == organizationCode).cust_PayrollArea;
          },
          error: function (e) {
            console.log("error: " + e);
          }
        })
      },

      getPositions: function (perArea, grade, startDate, empGrp) {
        if (perArea && grade && startDate && empGrp) {
          $.ajax({
            // url: serviceURL + "/odata/v2/Position?$format=json&$filter=cust_persArea eq '" + perArea + "' and vacant eq true and effectiveStartDate le datetime'" + startDate + "T00:00:00' and cust_employeeType eq '" + empGrp + "' and cust_PayScaleGroup eq '" + grade + "'",
            url: serviceURL + "/odata/v2/Position?$format=json&$filter=cust_persArea eq '" + perArea + "' and vacant eq true and effectiveStartDate le datetime'" + startDate + "T00:00:00' and cust_employeeType eq '" + empGrp + "' and substringof('" + grade.split("/")[3] + "', cust_PayScaleGroup)",
            type: 'GET',
            contentType: "application/json",
            success: function (data) {
              sap.ui.core.BusyIndicator.hide();
              data.d.results.sort();
              this.getView().getModel("oneModel").setProperty("/Positions", data.d.results);
              this.getId("selectPositionCombobox").setEditable(true)
              if (data.d.results.length == 0) {
                MessageBox.error("There are no suitable positions available. Please set one up and then click on the refresh button");
              }
            }.bind(this),
            error: function (e) {
              sap.ui.core.BusyIndicator.hide();
              console.log("error: " + e);
            }
          });
        }
      },

      dropdownsBsc: function (oModel, oData) {

        // Positions for BSC team
        sap.ui.core.BusyIndicator.show();
        var lea;
        if (oData.Paygroup == "G1" || oData.Paygroup == "G2" || oData.Paygroup == "G4")
          lea = "A";
        else
          lea = "B";
        var teacher;
        if ((oData.OrgContTypeCode == "4" || oData.OrgContTypeCode == "5") || (oData.CompanyCode == cirencesterCompanyCode && oData.OrgContTypeCode == "34"))
          teacher = "A";
        else
          teacher = "B";

        // fetching position type data for BSC
        $.ajax({
          url: serviceURL + `/odata/v2/cust_ZFLM_POS_LIST?$format=json&$filter=cust_LEARRemaining eq '${lea}' and cust_TeacherRSupport eq '${teacher}'`,
          type: 'GET',
          contentType: "application/json",
          success: function (data) {
            var posData = data.d.results;
            // fetching employee group of the organization
            $.ajax({
              url: serviceURL + `/odata/v2/cust_PersonnelArea?$format=json&$filter=externalCode eq '${organizationCode}'&$select=cust_EmployeeGroup`,
              type: 'GET',
              contentType: "application/json",
              success: function (data) {
                var batchArr = [];
                posData.forEach(function (oItem) {
                  batchArr.push(`/PickListValueV2?$filter=PickListV2_id eq 'employee-type' and status eq 'A' and externalCode eq '${oItem.cust_EESubgroup}' and parentPickListValue eq '${data.d.results[0].cust_EmployeeGroup}'`)
                });

                this.batchCall(batchArr, serviceURL)
                  .then((resp) => {
                    try {
                      var posTypeData = [];
                      for (let i = 0; i < resp.length; i++) {
                        if (resp[i].statusCode == "200" && resp[i].data.results.length != 0) {
                          var temp = {
                            externalCode: resp[i].data.results[0].externalCode,
                            code: resp[i].data.results[0].optionId,
                            posType: resp[i].data.results[0].externalCode + " - " + (resp[i].data.results[0].label_en_GB).toUpperCase()
                          }
                          posTypeData.push(temp);
                        }
                      }
                      posTypeData.sort((a, b) => {
                        if (+a.externalCode < +b.externalCode) return -1;
                        if (+a.externalCode > +b.externalCode) return 1;
                      });
                      oModel.setProperty("/positionType", posTypeData);
                    }
                    catch (e) {
                      console.log(e);
                    }
                  })
                  .catch((e) => console.log(e));
              }.bind(this),
              error: function () {
                console.log("error: " + e);
              }
            })
          }.bind(this),
          error: function (e) {
            console.log("error: " + e);
          }
        });

        //fetching position data if position type is there
        if (oData.TypeOfPos && oData.TypeOfPosCode) {
          var perArea = oData.Organization.split("(")[1].split(")")[0];
          var grade = oData.GradeCode;
          var startDate = this.convertS4Date(oData.StartDate);
          var empGrp = oData.TypeOfPos.split(" ")[0]
          this.getPositions(perArea, grade, startDate, empGrp)
        }
      },

      getGrades: function (oModel, workContract) {
        var f3digits = (((oModel.getProperty("/CostCentreP")).costCenter).toString()).substring(oModel.getProperty("/CostCentreP").costCenter.length - 3);
        if (f3digits != undefined) {
          $.ajax({
            url: serviceURL + "/odata/v2/PayScaleGroup?$filter=startswith(payScaleGroup,'" + f3digits + "')&$format=json",
            type: 'GET',
            contentType: "application/json",
            success: function (data) {
              if (data.d.results.length == 0) {
                this.getGradesFromOrg(oModel);
              } else {
                if ((workContract == "5" || workContract == "4") || (companyCode == cirencesterCompanyCode && workContract == "34")) {
                  var reqGradeList = data.d.results.filter((el) => el.payScaleType == teacherGrade);
                } else {
                  var reqGradeList = data.d.results.filter((el) => el.payScaleType != teacherGrade);
                }
                if (reqGradeList.length == 0) this.getGradesFromOrg(oModel);
                else {
                  reqGradeList.sort(function (a, b) {
                    if (a.externalName_en_GB > b.externalName_en_GB) return -1;
                    else return 1;
                  })
                  oModel.setProperty("/grade", reqGradeList);
                }
              }
            }.bind(this),
            error: function (e) {
              console.log("error: " + e);
            }
          });
        }
      },

      getGradesFromOrg: function (oModel) {
        var ContractType = this.getId("_IDGenComboBox411").getSelectedKey();
        var cirencesterCheck = companyCode == cirencesterCompanyCode;
        var TeacherRSupport = (ContractType == "4" || ContractType == "5") || (cirencesterCheck && ContractType == "34") ? "A" : "B";
        $.ajax({
          url: serviceURL + "/odata/v2/cust_ZFLM_GRADE_NEW?$filter=(cust_CompanyCode eq " + companyCode + " or cust_CompanyCode eq null) and cust_TeacherRSupport eq '" + TeacherRSupport + "'&$format=json",
          type: 'GET',
          contentType: "application/json",
          success: function (data) {
            if (data.d.results.length != 0) {
              var aPayScaleGroups = [];
              aPayScaleGroups = data.d.results.filter((el) => el.cust_CompanyCode == companyCode);
              if (aPayScaleGroups.length == 0)
                aPayScaleGroups = data.d.results.filter((el) => el.cust_CompanyCode == null);

              // code for deleting duplicates
              var finalPayScaleGroupData = [];
              for (let b = 0; b < aPayScaleGroups.length; b++) {
                var a = finalPayScaleGroupData.filter((el) => el.cust_PayScaleGroup == aPayScaleGroups[b].cust_PayScaleGroup);
                if (a.length == 0 && aPayScaleGroups[b].cust_PayScaleGroup != "")
                  finalPayScaleGroupData.push(aPayScaleGroups[b]);
              }

              // fetching data of all the pay scale groups
              //using batch call for avoiding multiple calls
              var aUrls = []
              finalPayScaleGroupData.forEach(function (oItem) {
                aUrls.push("/PayScaleGroup?$filter=payScaleGroup eq '" + oItem.cust_PayScaleGroup + "'")
              })
              this.batchCall(aUrls, serviceURL)
                .then((resp) => {
                  var finalArray = [];
                  for (let i = resp.length - 1; i >= 0; i--) {
                    if (resp[i].statusCode == "200" && resp[i].data.results.length != 0) {
                      finalArray.push(resp[i].data.results[0]);
                    }
                  }
                  finalArray.sort(function (a, b) {
                    if (a.externalName_en_GB < b.externalName_en_GB) return -1;
                    else return 1;
                  })
                  oModel.setProperty("/grade", finalArray);
                })
                .catch((e) => console.log(e));
            }
          }.bind(this),
          error: function (e) {
            console.log("error: " + e);
          }
        });
      },

      onConfirmEmpDetails: function (oEvent) {
        // checking if all the required fields are filled or not
        var errorFound = this.checkSecA();
        if (errorFound) {
          MessageBox.error("Please fill all mandatory fields");
        }
        else {
          var ComboYesNo = this.getId("_IDGenComboBox1").getSelectedItem() != null ? this.getId("_IDGenComboBox1").getSelectedItem().getKey() : this.getId("_IDGenComboBox1").getSelectedKey();
          MessageBox.confirm("You will not be able to change your selection. Are you sure you'd like to go ahead?", {
            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
            emphasizedAction: MessageBox.Action.OK,
            onClose: function (sAction) {
              if (sAction === "OK") {
                // loading all the dropdowns
                this.allDropdowns(this.getView().getModel("oneModel"));
                // disabling confirm button and changing texts
                this.getId("_IDGenButton122").setText("Confirmed");
                // disabling all the fields
                this.enableSecA(false);
                //disabling the organization editable
                this.getId("_IDGenInput4").setEditable(false);
                // show section B C D E F
                this.getId("_IDGenPanel4").setVisible(true);
                this.getId("_IDGenPanel45").setVisible(true);
                this.getId("_IDGenPanel4dhd51").setVisible(true);
                this.getId("_IDGenPanel4dh51").setVisible(true);
                if (ComboYesNo == "X") {
                  this.enableSecB(false);
                  this.enableFirstEmer(false);
                  this.enableSecEmer(false);
                }
                else {
                  this.enableSecB(true);
                  this.getId("addEmergencyContact1").setEnabled(true);
                }
                // that.getView().byId("titleB1").setEditable(false);
                // that.getView().byId("foreName1").setEditable(false);
                // that.getView().byId("middelname1").setEditable(false);
                // that.getView().byId("surname1").setEditable(false);
                // that.getView().byId("contStartDate1").setEditable(false);
                // // that.getView().byId("empAdd1").setEditable(false);
                // that.getView().byId("streetHouseNo1").setEditable(false);
                // that.getView().byId("2ndadd1").setEditable(false);

                // that.getView().byId("city1").setEditable(false);
                // that.getView().byId("country1").setEditable(false);
                // that.getView().byId("postcode1").setEditable(false);
                // that.getView().byId("homeTelephone1").setEditable(false);
                // that.getView().byId("mobileTelephone1").setEditable(false);
                // that.getView().byId("emailAdd1").setEditable(false);

              }
            }.bind(this)
          });
        }

      },

      onChangeEmergencySecond: function (oEvent) {
        var checked = this.getId("_IDGenCheckBox2").getSelected();
        if (checked) {
          this.getId("idSecondEmergency").setVisible(true);
          this.enableSecEmer(true);
        } else {
          this.getId("idSecondEmergency").setVisible(false);
        }
      },

      onAddEmergency: function (oEvent) {
        var checked = this.getId("addEmergencyContact1").getSelected();
        if (checked) {
          this.getId("idAddEmergency").setVisible(true);
          this.enableFirstEmer(true);
        } else {
          this.getId("idAddEmergency").setVisible(false);
        }
      },

      onAddComment: function () {
        sap.ui.core.BusyIndicator.show();
        var oComm = this.getId("_IDGenTextArea2").getValue();
        var CommExist = this.getId("_IDGenTextArea1").getValue();
        var newDate = new Date();
        if (oComm == "") {
          sap.ui.core.BusyIndicator.hide();
          confirm("Add the Comment first");
        }
        else {
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

          var statusText;
          try {
            const arr = this.getView().getModel("oneModel").getProperty("/historyTable");
            const status = arr.reduce((a, b) => +a.SeqNumber > +b.SeqNumber ? a : b).StatusCode;
            switch (status) {
              case "I":
                statusText = "Initial";
                break;
              case "E":
                statusText = "Draft";
                break;
              case "S":
                statusText = "Submitted";
                break;
              case "R":
                statusText = "Rejected";
                break;
              case "B":
                statusText = "BSC Team";
                break;
              default:
                statusText = "Initial";
                break;
            }
          }
          catch {
            statusText = "Initial";
          }

          if (CommExist == "") {
            var oAuthComm = `Comments added by ${initiatorName} on ${tday[nday]}, ${ndate} ${tmonth[nmonth]} ${nyear} ${nhour}:${nmin}:${nsec} at Status ${statusText} - \n` + oComm;
          }
          else {
            oAuthComm = `Comments added by ${initiatorName} on ${tday[nday]}, ${ndate} ${tmonth[nmonth]} ${nyear} ${nhour}:${nmin}:${nsec} at Status ${statusText} - \n` + oComm + "\n\n" + CommExist;
          }
          this.getId("_IDGenTextArea1").setVisible(true);
          this.getId("_IDGenLabeldf11").setVisible(true);
          this.getId("_IDGenTextArea1").setValue(oAuthComm);
          this.getId("_IDGenTextArea2").setValue("");
          sap.ui.core.BusyIndicator.hide();
        }

      },

      //sectionBSC
      finalValidationsBSC: function () {
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

      checkActualHours: function (oPositionData) {
        return new Promise(
          function (resolve, reject) {
            // Getting all the required values
            const actualHours = this.getId("Hoursperweek").getValue();
            var standardHours = oPositionData.standardHours;
            const contractType = this.getId("_IDGenComboBox411").getSelectedKey();

            // checking if the employee is a teacher and org not in exception list
            if ((contractType == "4" || contractType == "5") && !(exceptionOrgList.includes(companyCode))) {
              standardHours *= factor;
            }

            // checking if standard hours is lesser than the actual hours
            if (+actualHours > +standardHours) {
              reject(`The actual expected hours exceed the standard weekly hours.
                Please review and adjust the standard weekly hours accordingly`);
            } else resolve();
          }.bind(this)
        )
      },

      oSaveCall: function (call, that) {
        sap.ui.core.BusyIndicator.show();
        var purpose = "I";
        var Request_Payload = that.payload(purpose, "");
        ///sap/opu/odata/sap/ZSFGTGW_NS01_SRV/ZSFGT_NS01Set
        that.getOwnerComponent().getModel("ZSFGTGW_NS01_SRV").create("/ZSFGT_NS01Set",
          Request_Payload, {

          success: function (oData) {
            // MessageBox.success("Saved successfully");
            console.log(oData.Formid);
            sap.ui.core.BusyIndicator.hide();
            if (call == "submit") {
              that.workflowCall();
              var jobOrg = that.getView().getModel("oneModel").getProperty("/EmpJobData");
              that.s4LogCreation("S", that.managerId);
            } else {
              that.s4LogCreation("E");
              sap.m.MessageBox.success(`Form: ${that.getView().byId("_IDGenInput2").getValue()} is saved successfully!`, {
                onClose: function (oAction) {
                  if (that.query) window.parent.close();
                }
              });
            }


          },
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
          var checkValidation = this.finalValidationsBSC();

          if (checkValidation) {
            MessageBox.error(`You have not filled all the required fields`);
          } else {
            var that = this;
            that.oSaveCall("save", that);
          }
        } else {
          if (this.query && this.query.mode == "initiator")
            this.onSubmit();
          else
            this.oSaveCall("save", this);
        }


      },

      onSubmit: async function () {

        // checking if all the fields are filled before submitting
        this.checkingFields();
        if (this.getId("_IDGenButton122").getEnabled()) {
          this._messLog("Please confirm employee details");
        }
        var MessageLog = this.getView().getModel("oneModel").getProperty("/MessageLog");
        if (MessageLog.length != 0) {
          this._oMessage = sap.ui.xmlfragment("com.gcc.newstarterqa.newstarterqa.fragment.logMessage", this);
          this.getView().addDependent(this._oMessage);
          this._oMessage.open();
          sap.ui.core.BusyIndicator.hide();
        } else {
          this.WSValidations().then((s) => {
            console.log("success");
            if (this.getId("_IDGenComboBox1").getSelectedKey() == "N") {
              if (this.getId("DBS1").getValue() == "") {
                MessageBox.warning(`Please remember it is your responsibility to conduct a risk assessment for this employee before they start work should the DBS clearance not have been received
                  Do you want to Proceed?`, {
                  actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                  emphasizedAction: sap.m.MessageBox.Action.YES,
                  onClose: function (oAction) {
                    if (oAction === sap.m.MessageBox.Action.NO) {
                      this.getId("DBS1").setValueState(sap.ui.core.ValueState.Warning);
                      return;
                    } else submitForm(this)
                  }.bind(this),
                });
              } else submitForm(this)
            } else submitForm(this);
          }).catch((e) => { console.log("error"); console.log(e) });

          function submitForm(_self) {
            if (_self.query && _self.query.mode) {
              _self.oSaveCall("save", _self);
            }
            else {
              MessageBox.alert("Do you want to submit the form?", {
                title: "Submit Form",
                actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.Yes,
                onClose: function (sAction) {
                  if (sAction === "YES") {
                    _self.oSaveCall("submit", _self);
                  }
                }
              });
            }
          }
        }
      },

      WSValidations: function (oModel) {
        return new Promise(
          function (resolve, reject) {
            if (this.getId("_IDGenComboBox6").getSelectedKey() == "No") {
              // checking validations for Work Schedule
              var oModelWS = this.getView().getModel("WSModel");
              var oScheduleData = oModelWS ? oModelWS.getProperty("/WSItems") : undefined;
              var isClaimOnlyNo = this.getId("_IDGenComboBox6").getSelectedKey();
              if (isClaimOnlyNo && isClaimOnlyNo == "No") {
                if (!(oScheduleData && oScheduleData[0].HoursWorked)) {
                  MessageBox.error("You must create a work schedule for each new employee");
                  reject();
                  return;
                }
              }

              // hardcoding total working hours UAT-619
              const fteWorkhours = companyCode == cirencesterCompanyCode ? 37 : 32.5;
              if (!this.getId("idfte1").getVisible())
                var actualHours = this.getId("Hoursperweek").getValue();
              else
                actualHours = (+(this.getId("idFTE").getValue() * fteWorkhours)).toFixed(2);

              var hoursEntered = this.getView().getModel("WSModel") ? this.getView().getModel("WSModel").getProperty("/WSHoursPerWeek") : "";
              if (+hoursEntered != +actualHours) {
                MessageBox.error(`The work schedule entered does not match this employee’s working hours, please update the work schedule so that this matches ${actualHours}`);
                reject();
                return;
              }

              var oPreviewData = oModelWS ? oModelWS.getProperty("/WSPreviewItems") : [];
              if (oPreviewData && oScheduleData.length < 7) {
                MessageBox.warning(`The work schedule you have entered is less than 7 calendar days in length. 
Please note that this schedule will repeat every ${oScheduleData.length} days, and any missed days in the week will not be considered as non-working days`, {
                  actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
                  emphasizedAction: sap.m.MessageBox.Action.OK,
                  onClose: function (oAction) {
                    if (oAction === sap.m.MessageBox.Action.CANCEL) {
                      reject();
                    } else resolve();
                  }.bind(this),
                })
              } else resolve();
            } else resolve();
          }.bind(this));
      },

      onMessageClose: function () {
        this._oMessage.close();
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

      dateToReq: function (date) {
        if (date) {
          return new Date(date).toLocaleDateString('en-GB');
        } else return "";
      },

      payload: function (purpose, delInd) {

        if ((this.getId("_IDGenComboBox6").getSelectedItem() && this.getId("_IDGenComboBox6").getSelectedItem().getKey() == "No") || this.getId("_IDGenComboBox6").getValue() == "No") {
          var wsData = [];
          var oModelWS = this.getView().getModel("WSModel") ? this.getView().getModel("WSModel").getProperty("/WSPreviewItems") ? this.getView().getModel("WSModel").getProperty("/WSPreviewItems") : [] : [];

          // Preparing data for Work Schedules
          for (let i = 0; i < oModelWS.length; i++) {
            var objData = Object.entries(oModelWS[i]);
            objData.forEach(function (oItem, index) {
              if (oItem[1].DaysName) {
                var prepareWS = {
                  "Formid": this.getId("_IDGenInput2").getValue() != '' ? this.getId("_IDGenInput2").getValue() : '',
                  "Counter": (i + 1).toString(),
                  "DaysName": oItem[1].DaysName,
                  "Type": "H",
                  "Value": oItem[1][oItem[0]],
                  "ScheduleDay": oItem[1].ScheduleDay,
                  "DayKey": oItem[1].Daykey.toString()
                }
                wsData.push(prepareWS);
              }
            }.bind(this));
          }
        }
        var payload = {
          "Formid": this.getId("_IDGenInput2").getValue() != '' ? this.getId("_IDGenInput2").getValue() : '',
          "Initiator": this.getId("idInitiator").getValue() != '' ? this.getId("idInitiator").getValue() : '',
          "Zdate": this.getId("DatePicker01").getValue() != '' ? this.dateToReq(this.getId("DatePicker01").getValue()) : '',
          "DateInt": this.convToMillisec(this.getId("DatePicker01").getValue()) != '' ? this.convToMillisec(this.getId("DatePicker01").getValue()) : '', //"19.12.2023",
          "Organization": this.getId("_IDGenInput4").getValue() != '' ? this.getId("_IDGenInput4").getValue() : '', // "1001",
          "CostCenter": this.getId("_IDGen1Inpu1t4").getValue() != '' ? this.getId("_IDGen1Inpu1t4").getValue() : '', //"CC01",
          "CostCenterCode": initiator,
          "Approver": this.getId("approver").getValue() != '' ? this.getId("approver").getValue() : '', // "Approver",
          "ApproverCode": this.ApproverCode != undefined ? this.ApproverCode : approverCode, //"AppCode",
          "userID": userId ? userId : "",
          "CompanyCode": companyCode,
          "Paygroup": payGroup,

          "EmployeedOrganization": this.getId("_IDGenComboBox1").getSelectedItem() != null ? this.getId("_IDGenComboBox1").getSelectedItem().getKey() : this.getId("_IDGenComboBox1").getSelectedKey(),
          "SelectEmployee": this.getId("_IDGenComboBox41").getSelectedItem() != null ? this.getId("_IDGenComboBox41").getSelectedItem().getText() : this.getId("_IDGenComboBox41").getValue(), //"4789 Std Candidate 134",
          "SelEmpCode": this.getId("_IDGenComboBox41").getSelectedItem() != null ? this.getId("_IDGenComboBox41").getSelectedItem().getKey() : this.getId("_IDGenComboBox41").getSelectedKey(),// "4789",

          "NewEmployee": this.getId("idempCame").getSelectedItem() != null ? this.getId("idempCame").getSelectedItem().getKey() : this.getId("idempCame").getSelectedKey(), //  "GCC Council",
          "NewEmployeeText": this.getId("idempCame").getSelectedItem() != null ? this.getId("idempCame").getSelectedItem().getText() : this.getId("idempCame").getValue() ? this.getId("idempCame").getValue() : this.getId("idempCame1").getValue(),
          "PreviousEmp": this.getId("_IDGenInput10").getValue() != '' ? this.getId("_IDGenInput10").getValue() : '', // "Teacher",
          "OrgContType": this.getId("_IDGenComboBox411").getSelectedItem() != null ? this.getId("_IDGenComboBox411").getSelectedItem().getText() : this.getId("_IDGenComboBox411").getValue(), //"Cont Type",
          "OrgContTypeCode": this.getId("_IDGenComboBox411").getSelectedItem() != null ? this.getId("_IDGenComboBox411").getSelectedItem().getKey() : this.getId("_IDGenComboBox411").getSelectedKey(), // "Cont Type",
          "PositionTitle": this.getId("_IDGenInput11").getValue() != '' ? this.getId("_IDGenInput11").getValue() : '', // "Teacher",
          "PosCostCentre": this.getId("_IDGenInput112").getValue() != '' ? this.getId("_IDGenInput112").getValue() : '', //  "00000107622 Down Ampney Church of England ",
          "PosCcenterCode": this.getId("_IDGenInput112").getSelectedKey() != '' ? this.getId("_IDGenInput112").getSelectedKey() : '', //  "107622",
          "ConfirmedButton": this.getId("_IDGenButton122").getText("Confirmed") == 'Confirmed' ? "X" : '',
          "Title": this.getId("titleB1").getSelectedItem() != null ? this.getId("titleB1").getSelectedItem().getText() : this.getId("titleB1").getValue(),
          "TitleCode": this.getId("titleB1").getSelectedItem() != null ? this.getId("titleB1").getSelectedItem().getKey() : this.getId("titleB1").getSelectedKey(),
          "Forename": this.getId("foreName1").getValue() != '' ? this.getId("foreName1").getValue() : '', // "Sandeep",
          "Middlename": this.getId("middelname1").getValue() != '' ? this.getId("middelname1").getValue() : '', // "Singh",
          "Surname": this.getId("surname1").getValue() != '' ? this.getId("surname1").getValue() : '', // "Singh",
          "FullName": this.getId("foreName1").getValue() + " " + this.getId("surname1").getValue(),
          "SerStartDate": this.getId("contStartDate1").getValue() != '' ? this.dateToReq(this.getId("contStartDate1").getValue()) : '',
          "SerStartDateInt": this.convToMillisec(this.getId("contStartDate1").getValue()) != '' ? this.convToMillisec(this.getId("contStartDate1").getValue()) : '', //"19.12.2023",
          // "EmpAddress": this.getId("empAdd1").getValue() != '' ? this.getId("empAdd1").getValue() : '', // "EmpAddress",
          "Houseno": this.getId("streetHouseNo1").getValue() != '' ? this.getId("streetHouseNo1").getValue() : '', // "House No",
          "SecAddress": this.getId("2ndadd1").getValue() != '' ? this.getId("2ndadd1").getValue() : '', //"Second Address",
          // "District":this.getId("_IDGenInput112").getValue() != '' ? this.getId("_IDGenInput112").getValue() : '', // "District",
          "City": this.getId("city1").getValue() != '' ? this.getId("city1").getValue() : '', // "City",
          "County": this.getId("country1").getSelectedItem() != null ? this.getId("country1").getSelectedItem().getText() : this.getId("country1").getValue(), // "County",
          "CountyCode": this.getId("country1").getSelectedItem() != null ? this.getId("country1").getSelectedItem().getKey() : this.getId("country1").getSelectedKey(),
          "Postcode": this.getId("postcode1").getValue() != '' ? (this.getId("postcode1").getValue()).toUpperCase() : '', // "201301",
          "TelNo": this.getId("homeTelephone1").getValue() != '' ? this.getId("homeTelephone1").getValue() : '', //"9911535981",
          "MobNo": this.getId("mobileTelephone1").getValue() != '' ? this.getId("mobileTelephone1").getValue() : '', // "9911535981",
          "EmailAdd": this.getId("emailAdd1").getValue() != '' ? this.getId("emailAdd1").getValue() : '', // "abc@abc.com",

          "TelType": "B",
          "TelFlag": "X",
          "MobType": "P",
          "MobFlag": "X",
          "EmailType": "EmailType",

          "EmergencyAdd": this.getId("addEmergencyContact1").getSelected() == true ? "X" : '',//"X",addEmergencyContact1
          "Dob": this.getId("Dob11").getValue() != '' ? this.dateToReq(this.getId("Dob11").getValue()) : '', //"20.09.1999",
          "DobInt": this.getId("Dob11").getValue() != '' ? this.convToMillisec(this.getId("Dob11").getValue()) : '', //"20.09.1999",
          "InsuranceNo": this.getId("nationalIns1").getValue() != '' ? (this.getId("nationalIns1").getValue()).toUpperCase() : '', //"Insurance No",
          "Nationality": this.getId("Nationality1").getSelectedItem() != null ? (this.getId("Nationality1").getSelectedItem().getText()).toUpperCase() : (this.getId("Nationality1").getValue()).toUpperCase(), //"Indian",
          "NatCode": this.getId("Nationality1").getSelectedItem() != null ? (this.getId("Nationality1").getSelectedItem().getKey()).toUpperCase() : (this.getId("Nationality1").getSelectedKey()).toUpperCase(), //"IN",
          "Disability": this.getId("Disability1").getSelectedItem() != null ? this.getId("Disability1").getSelectedItem().getText() : this.getId("Disability1").getValue(), // "No",
          "DisabilityCode": this.getId("Disability1").getSelectedItem() != null ? this.getId("Disability1").getSelectedItem().getKey() : this.getId("Disability1").getSelectedKey(), // "No",
          "Ethicity": this.getId("Ethicity1").getSelectedItem() != null ? this.getId("Ethicity1").getSelectedItem().getText() : this.getId("Ethicity1").getValue(), //"Ethicity",
          "EthnicityCode": this.getId("Ethicity1").getSelectedItem() != null ? this.getId("Ethicity1").getSelectedItem().getKey() : this.getId("Ethicity1").getSelectedKey(), // "Ethicity",

          "Gender": this.getId("Gender1").getSelectedItem() != null ? this.getId("Gender1").getSelectedItem().getText() : "", //"Male",
          "GenderCode": this.getId("Gender1").getSelectedItem() != null ? this.getId("Gender1").getSelectedItem().getKey() : this.getId("Gender1").getSelectedKey(), // "M",
          "DbsNo": this.getId("DBS1").getValue() != '' ? this.getId("DBS1").getValue() : '', //"123",
          "RegNo": this.getId("TeachRegNum12").getVisible() ? this.getId("TeachRegNum12").getValue() : this.getId("TeachRegNum1").getValue(), //"321",
          "ClearanceDate": this.getId("ClearDate1").getValue() != '' ? this.dateToReq(this.getId("ClearDate1").getValue()) : '', //"19.12.2023",
          "ClearDateInt": this.getId("ClearDate1").getValue() != '' ? this.convToMillisec(this.getId("ClearDate1").getValue()) : '', //"19.12.2023",
          "IssueDate": this.getId("issuDate1").getValue() != '' ? this.dateToReq(this.getId("issuDate1").getValue()) : '', //"19.12.2023",
          "IssueDateInt": this.getId("issuDate1").getValue() != '' ? this.convToMillisec(this.getId("issuDate1").getValue()) : '', //"19.12.2023",
          "BankSortCode": this.getId("BankSort1").getValue() != '' ? this.getId("BankSort1").getValue() : '', //"1234567",
          "BankName": this.getId("BankName1").getValue() != '' ? this.getId("BankName1").getValue() : '', //"ABC Bank",
          "BankAccNo": this.getId("BankAccNum1").getValue() != '' ? this.getId("BankAccNum1").getValue() : '', //"12321312",
          "BuildSocRefNo": this.getId("BuildingSoc1").getValue() != '' ? this.getId("BuildingSoc1").getValue() : '', //"RefNo123",
          "StreetAdd": this.getId("_IDGefnInput11").getValue() != '' ? this.getId("_IDGefnInput11").getValue() : '', //"Street1",
          "AddLine": this.getId("_IDGefnInput12").getValue() != '' ? this.getId("_IDGefnInput12").getValue() : '', //"Address1",
          // "DistrictF": this.getId("_IDGefnInput14").getValue() != '' ? this.getId("").getValue() : '',//"District1",
          "CityF": this.getId("_IDGefnInput14").getValue() != '' ? this.getId("_IDGefnInput14").getValue() : '', //"City1",

          "CountyF": this.getId("_IDGenItem6").getSelectedItem() != null ? this.getId("_IDGenItem6").getSelectedItem().getText() : this.getId("_IDGenItem6").getValue(), // "County1",
          "CountyCodeF": this.getId("_IDGenItem6").getSelectedItem() != null ? this.getId("_IDGenItem6").getSelectedItem().getKey() : this.getId("_IDGenItem6").getSelectedKey(), //"County1Code",
          "PostCodeF": this.getId("_IDGenInput15").getValue() != '' ? (this.getId("_IDGenInput15").getValue()).toUpperCase() : '', //"201301",
          "NameF": this.getId("_IDGenInput16").getValue() != '' ? this.getId("_IDGenInput16").getValue() : '', //"Name1",
          "SurnameF": this.getId("_IDGenInput16s").getValue() != '' ? this.getId("_IDGenInput16s").getValue() : '',//"Surname 1",
          "RelationF": this.getId("_IDGenInput17").getSelectedItem() != null ? this.getId("_IDGenInput17").getSelectedItem().getText() : this.getId("_IDGenInput17").getValue(),//"Son",
          "RelationFCode": this.getId("_IDGenInput17").getSelectedItem() != null ? this.getId("_IDGenInput17").getSelectedItem().getKey() : this.getId("_IDGenInput17").getSelectedKey(), //"Son",
          "HomTelNoF": this.getId("_IDGenInput18").getValue() != '' ? this.getId("_IDGenInput18").getValue() : '',//"123441",
          // "MobileNoF": this.getId("_IDGenInput19").getValue() != '' ? this.getId("_IDGenInput19").getValue() : '',//"412322",

          "MobileNo2F": "",
          "PhnTypeF": "X",
          "PhnFlagF": "X",
          "MobTypeF": "X",
          "MobFlagF": "X",

          "SecondEmergencycontact": this.getId("_IDGenCheckBox2").getSelected() == true ? "X" : '', //_IDGenCheckBox2 "X",
          "StreetAddSec": this.getId("_IDGefnInput112").getValue() != '' ? this.getId("_IDGefnInput112").getValue() : '', // "Street2",
          "AddLineSec": this.getId("_IDGefnInput122").getValue() != '' ? this.getId("_IDGefnInput122").getValue() : '', //"Address 2",
          // "DistrictSec": this.getId("").getValue() != '' ? this.getId("").getValue() : '',"District2",
          "CitySec": this.getId("_IDGefnInput142").getValue() != '' ? this.getId("_IDGefnInput142").getValue() : '', //"County 2",

          "CountySec": this.getId("idree4d2").getSelectedItem() != null ? this.getId("idree4d2").getSelectedItem().getText() : this.getId("idree4d2").getValue(), // "City 2",
          "CountyCodeSec": this.getId("idree4d2").getSelectedItem() != null ? this.getId("idree4d2").getSelectedItem().getKey() : this.getId("idree4d2").getSelectedKey(), //"CountyCode2",
          "PostCodeSec": this.getId("_IDGenInput152").getValue() != '' ? (this.getId("_IDGenInput152").getValue()).toUpperCase() : '', // "201301",
          "NameSec": this.getId("_IDGenInput162").getValue() != '' ? this.getId("_IDGenInput162").getValue() : '', // "Name 2",
          "SurnameSec": this.getId("_IDGenInput162s").getValue() != '' ? this.getId("_IDGenInput162s").getValue() : '', // "Surname 2",
          "RelationSec": this.getId("_IDGenInput172").getSelectedItem() != null ? this.getId("_IDGenInput172").getSelectedItem().getText() : this.getId("_IDGenInput172").getValue(), // "Son",
          "RelCodeSec": this.getId("_IDGenInput172").getSelectedItem() != null ? this.getId("_IDGenInput172").getSelectedItem().getKey() : this.getId("_IDGenInput172").getSelectedKey(), //"Son",
          "HomTelNoSec": this.getId("_IDGenInput182").getValue() != '' ? this.getId("_IDGenInput182").getValue() : '', // "12321312",
          // "MobileNoSec": this.getId("_IDGenInput192").getValue() != '' ? this.getId("_IDGenInput192").getValue() : '', // "132312",

          "PhnTypeSec": "X",
          "PhnFlagSec": "X",
          "MobTypeSec": "X",
          "MobFlagSec": "X",

          "ContractType": this.getId("_IDGenComboBox17").getSelectedItem() != null ? this.getId("_IDGenComboBox17").getSelectedItem().getText() : this.getId("_IDGenComboBox17").getValue(), // Permanent,
          "ContTypeCode": this.getId("_IDGenComboBox17").getSelectedItem() != null ? this.getId("_IDGenComboBox17").getSelectedItem().getKey() : this.getId("_IDGenComboBox17").getSelectedKey(), // P,
          "StartDate": this.getId("_IDGenDatePicker1").getValue() != '' ? this.dateToReq(this.getId("_IDGenDatePicker1").getValue()) : '', // "19.12.2023",
          "StartDateInt": this.getId("_IDGenDatePicker1").getValue() != '' ? this.convToMillisec(this.getId("_IDGenDatePicker1").getValue()) : '', // "19.12.2023",
          "EndDate": this.getId("_IDGenDatePicker2").getValue() != '' ? this.dateToReq(this.getId("_IDGenDatePicker2").getValue()) : '', // "",
          "EndDateInt": this.getId("_IDGenDatePicker2").getValue() != '' ? this.convToMillisec(this.getId("_IDGenDatePicker2").getValue()) : '', // "",
          "Grade": this.getId("_IDGenComboBox2").getSelectedItem() != null ? this.getId("_IDGenComboBox2").getSelectedItem().getText() : this.getId("_IDGenComboBox2").getValue(), // "01-Grade",
          "GradeCode": this.getId("_IDGenComboBox2").getSelectedItem() != null ? this.getId("_IDGenComboBox2").getSelectedItem().getKey() : this.getId("_IDGenComboBox2").getSelectedKey(), // "01",
          "ScalePoint": this.getId("_IDGenComboBox3").getSelectedItem() != null ? this.getId("_IDGenComboBox3").getSelectedItem().getText() : this.getId("_IDGenComboBox3").getValue(), // "01",
          "ScalePointCode": this.getId("_IDGenComboBox3").getSelectedItem() != null ? this.getId("_IDGenComboBox3").getSelectedItem().getKey() : this.getId("_IDGenComboBox3").getSelectedKey(), // "01",
          "ClaimPos": this.getId("_IDGenComboBox6").getSelectedItem() != null ? this.getId("_IDGenComboBox6").getSelectedItem().getText() : this.getId("_IDGenComboBox6").getValue(), // "11",
          "FteDec": this.getId("idFTE").getValue() != '' ? (+this.getId("idFTE").getValue()).toFixed(5) : '',
          "FtePerc": this.getId("idFTEperc").getValue() != '' ? this.getId("idFTEperc").getValue() : '',
          "HoursPerWeek": this.getId("Hoursperweek").getValue() != '' ? this.getId("Hoursperweek").getValue() : '',
          "ProbPeriod": this.getId("_IDGenInput141").getSelectedItem() != null ? this.getId("_IDGenInput141").getSelectedItem().getText() : this.getId("_IDGenInput141").getValue(), // "30",
          "ProbPerEndDt": this.getId("probationEndDatePic").getValue() != '' ? this.dateToReq(this.getId("probationEndDatePic").getValue()) : '', //"",
          "ProbPerEndDtInt": this.getId("probationEndDatePic").getValue() != '' ? this.convToMillisec(this.getId("probationEndDatePic").getValue()) : '', // "",
          "WorkingWeeks": this.getId("idWeekYeardrop").getSelectedItem() != null ? this.getId("idWeekYeardrop").getSelectedItem().getText() : this.getId("idWeekYeardrop").getValue(),
          "WorkingWeeksInt": this.getId("idWeekYeardrop").getSelectedItem() != null ? this.getId("idWeekYeardrop").getSelectedItem().getKey() : this.getId("idWeekYeardrop").getSelectedKey(),
          "AddWorkWeek": this.getId("idWorkingWeeksdrop").getSelectedItem() != null ? this.getId("idWorkingWeeksdrop").getSelectedItem().getText() : this.getId("idWorkingWeeksdrop").getValue(),
          "AddWorkWeekInt": this.getId("idWorkingWeeksdrop").getSelectedItem() != null ? this.getId("idWorkingWeeksdrop").getSelectedItem().getKey() : this.getId("idWorkingWeeksdrop").getSelectedKey(),

          "WageType1": "1005",
          "WageTypeCheck1": this.getId("idWeekYeardrop").getSelectedItem() != null ? "X" : this.getId("idWeekYeardrop").getValue() != "" ? "X" : "",
          "WageTypeAmt1": this.getId("idWeekYeardrop").getSelectedItem() != null ? this.getId("idWeekYeardrop").getSelectedItem().getText() : this.getId("idWeekYeardrop").getValue(),

          "WageType2": "1010",
          "WageTypeCheck2": this.getView().getModel("oneModel").getProperty("/wage2Value") ? "X" : "",
          "WageTypeAmt2": this.getView().getModel("oneModel").getProperty("/wage2Value") ? this.getView().getModel("oneModel").getProperty("/wage2Value") : "",

          "WageType3": "1011",
          "WageTypeCheck3": +this.getId("idWorkingWeeksdrop").getValue() ? "X" : "",
          "WageTypeAmt3": this.getId("idWorkingWeeksdrop").getSelectedItem() != null ? this.getId("idWorkingWeeksdrop").getSelectedItem().getText() : this.getId("idWorkingWeeksdrop").getValue(),

          "TypeOfPos": this.getId("idSelectTypePos1").getSelectedItem() != null ? this.getId("idSelectTypePos1").getSelectedItem().getText() : this.getId("idSelectTypePos1").getValue(),
          "TypeOfPosCode": this.getId("idSelectTypePos1").getSelectedItem() != null ? this.getId("idSelectTypePos1").getSelectedItem().getKey() : this.getId("idSelectTypePos1").getSelectedKey(),
          "SelectPos": this.getId("selectPositionCombobox").getSelectedItem() != null ? this.getId("selectPositionCombobox").getSelectedItem().getText() : this.getId("selectPositionCombobox").getValue(),
          "SelectPosCode": this.getId("selectPositionCombobox").getSelectedItem() != null ? this.getId("selectPositionCombobox").getSelectedItem().getKey() : this.getId("selectPositionCombobox").getSelectedKey(),
          "SecEPosCcenter": this.getId("idPositionCostCentre").getSelectedItem() != null ? this.getId("idPositionCostCentre").getSelectedItem().getText() : this.getId("idPositionCostCentre").getValue(),
          "SecEPosCcenterCode": this.getId("idPositionCostCentre").getSelectedItem() != null ? this.getId("idPositionCostCentre").getSelectedItem().getKey() : this.getId("idPositionCostCentre").getSelectedKey(),
          "SecEPosTitle": this.getId("idJobTitle").getValue() != '' ? this.getId("idJobTitle").getValue() : '',
          "EmpSubGrp": this.getId("idSelectTypePos1").getSelectedItem() != null ? this.getId("idSelectTypePos1").getSelectedItem().getKey() : this.getId("idSelectTypePos1").getSelectedKey(),
          "EmpSubGrpCode": emplSubGroup != '' ? emplSubGroup : '',
          "SecEGrade": this.getId("idGrade").getValue() != '' ? this.getId("idGrade").getValue() : '',
          "SecEGradCode": this.getId("idGrade").getValue() != '' ? this.getId("idGrade").getValue() : '',
          "Allowance1": this.getId("_IDGenComboBox8").getSelectedItem() != null ? this.getId("_IDGenComboBox8").getSelectedItem().getText() : this.getId("_IDGenComboBox8").getValue(), // "1100",
          "AllowCode1": this.getId("_IDGenComboBox8").getSelectedItem() != null ? this.getId("_IDGenComboBox8").getSelectedItem().getKey() : this.getId("_IDGenComboBox8").getSelectedKey(), // // "1100",
          "Amount1": this.getId("_IDGenInput191").getValue() != '' ? this.getId("_IDGenInput191").getValue() : '', // "100",
          "Unit1": this.getId("_IDGenInput12").getValue() != '' ? this.getId("_IDGenInput12").getValue() : '', //"No",
          "Allowance2": this.getId("_IDGenComboBox82").getSelectedItem() != null ? this.getId("_IDGenComboBox82").getSelectedItem().getText() : this.getId("_IDGenComboBox82").getValue(), // "1100",
          "AllowCode2": this.getId("_IDGenComboBox82").getSelectedItem() != null ? this.getId("_IDGenComboBox82").getSelectedItem().getKey() : this.getId("_IDGenComboBox82").getSelectedKey(), // // "1100",
          "Amount2": this.getId("_IDGenInput1912").getValue() != '' ? this.getId("_IDGenInput1912").getValue() : '', // "231",
          "Unit2": this.getId("_IDGenInput122").getValue() != '' ? this.getId("_IDGenInput122").getValue() : '', // "Unit",
          "Allowance3": this.getId("_IDGenComboBox83").getSelectedItem() != null ? this.getId("_IDGenComboBox83").getSelectedItem().getText() : this.getId("_IDGenComboBox83").getValue(), // "1100",
          "AllowCode3": this.getId("_IDGenComboBox83").getSelectedItem() != null ? this.getId("_IDGenComboBox83").getSelectedItem().getKey() : this.getId("_IDGenComboBox83").getSelectedKey(), // // "1100",
          "Amount3": this.getId("_IDGenInput1913").getValue() != '' ? this.getId("_IDGenInput1913").getValue() : '', // "223",
          "Unit3": this.getId("_IDGenInput123").getValue() != '' ? this.getId("_IDGenInput123").getValue() : '', //"UnNo.",


          "Personalnumber": this.getId("idPersonalNum").getValue() != '' ? this.getId("idPersonalNum").getValue() : '', //"12312",
          "PosTitle": this.getId("idPosTitleD").getValue() != '' ? this.getId("idPosTitleD").getValue() : '', //"Teacher",
          "Pa20EndDate": this.getId("idPA20").getValue() != '' ? this.dateToReq(this.getId("idPA20").getValue()) : '', // "20.12.2023",
          "Pa20EndDtInt": this.getId("idPA20").getValue() != '' ? this.convToMillisec(this.getId("idPA20").getValue()) : '', //"20.12.2023",
          "Selectoption": this.getId("idSelectOption").getSelectedItem() != null ? this.getId("idSelectOption").getSelectedItem().getText() : this.getId("idSelectOption").getValue(), // "SelOpt",
          "SelOptCode": this.getId("idSelectOption").getSelectedItem() != null ? this.getId("idSelectOption").getSelectedItem().getKey() : this.getId("idSelectOption").getSelectedKey(), // "",
          "LeaSchoolname": this.getId("idLEASCHOOL").getValue() != '' ? this.getId("idLEASCHOOL").getValue() : '', //"Lea School",
          "NoHours": this.getId("idNumberHoursD").getValue() != '' ? this.getId("idNumberHoursD").getValue() : '', // "1",
          "seqNumber": this.getView().getModel("oneModel").getProperty("/SecDTerminData") != undefined || this.getView().getModel("oneModel").getProperty("/SecDTerminData") != "" ? this.getView().getModel("oneModel").getProperty("/SecDTerminData/seqNumber") : "",
          "TermStartDt": this.getView().getModel("oneModel").getProperty("/SecDTerminData") != undefined || this.getView().getModel("oneModel").getProperty("/SecDTerminData") != "" ? this.dateToReq(this.getView().getModel("oneModel").getProperty("/SecDTerminData/startDate")) : "",
          "TermStartDtInt": this.getView().getModel("oneModel").getProperty("/SecDTerminData") != undefined || this.getView().getModel("oneModel").getProperty("/SecDTerminData") != "" ? this.convToMillisec(this.getView().getModel("oneModel").getProperty("/SecDTerminData/startDate")) : "",

          "Purpose": purpose,
          "DeleteIndicator": delInd,
          "Notify": this.getId("_IDGenCheckBox1").getSelected() ? "X" : "",
          "hdr_to_com_nav": [
            {
              "Formid": this.getId("_IDGenInput2").getValue() != '' ? this.getId("_IDGenInput2").getValue() : '',
              "comment": this.getId("_IDGenTextArea1").getValue() != '' ? this.getId("_IDGenTextArea1").getValue() : ''
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
        var appUrl = window.location.origin + "/site?siteId=" + window.location.search.split("siteId=")[1].split("&")[0] + window.location.hash.split("Display")[0] + "Display";
        var reqUrl = appUrl.includes("GCC_SemObj") ? appUrl + "&/?formId=" : appUrl + "#?formId=";
        var Formid = this.getId("_IDGenInput2").getValue();
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

        $.support.cors = true;
        $.ajax(sURL, {
          method: "POST",
          data: JSON.stringify(wrkFlow),
          crossDomain: true,
          contentType: "application/json"
        }).done(function () {
          console.log("---workflow Data---");
          console.log("Workflow has been triggered and Form has been Submitted");
          sap.ui.core.BusyIndicator.hide();
          MessageBox.success(`Form: ${this.getId("_IDGenInput2").getValue()} is submitted successfully
          
          Please call ContactUs on 01452 425888 should you have any queries regarding this e-Form.`, {
            actions: [MessageBox.Action.OK],
            emphasizedAction: MessageBox.Action.OK,
            onClose: function (sAction) {
              if (sAction == sap.m.MessageBox.Action.OK) {
                this.query ? window.parent.close() : window.history.go(-1);
              }
            }.bind(this)
          });
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
        var formId = this.getId("_IDGenInput2").getValue();

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
              if (this.query) window.parent.close();
              else window.history.go(-1);
            }
          }.bind(this)
        });
      },
      onDelete: function (oEvent) {

        MessageBox.warning("Delete the data in this form and any saved draft version of this form", {
          actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.YES,
          onClose: function (sAction) {
            if (sAction === "YES") {
              sap.ui.core.BusyIndicator.show();
              this.getOwnerComponent().getModel("ZSFGTGW_NS01_SRV").remove(`/ZSFGT_NS01Set('${this.getId("_IDGenInput2").getValue()}')`, {
                success: function (oData) {
                  sap.ui.core.BusyIndicator.hide();
                  this.s4LogCreation("D");
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
          this.getId(oEvent.mParameters.id).setValueState(sap.ui.core.ValueState.None);
        }
        var endDate = this.getId("_IDGgenInput12").getValue();
        var startDate = this.getId("_IDGenDatePicker1").getValue();
        if (!startDate) {
          MessageBox.error("Please fill Start Date before entering End Date");
          this.getId("_IDGgenInput12").setValueState(sap.ui.core.ValueState.Error);
          this.getId("_IDGgenInput12").setValueStateText("Please fill Start Date before entering End Date");
        } else {
          this.getId("_IDGgenInput12").setValueState(sap.ui.core.ValueState.None);
        }
      },
      specialCharCheck: function (oEvent, reqField) {
        var value = oEvent.getParameter("newValue");
        const specialCharRegex = /^[a-zA-Z0-9 -]+$/;
        if (value) {
          if (!specialCharRegex.test(value)) {
            oEvent.getSource().setValueStateText(`Please re-enter the address information in a valid format (i.e., alphanumeric and no special characters)`);
            oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
          }
          else {
            oEvent.getSource().setValueStateText(`${oEvent.getSource().getLabels()[0].mProperties.text} is a required field`);
            oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
          }
        } else {
          oEvent.getSource().setValueStateText(`${oEvent.getSource().getLabels()[0].mProperties.text} is a required field`);
          if (reqField) oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
          else
            oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
        }
      },
      validateEmail: function (oEvent) {
        var email = oEvent.getSource().getValue();
        var busyDialog = new sap.m.BusyDialog();
        var oModel = this.getView().getModel("oneModel");
        oEvent.getSource().setValueStateText("Email is a required field");
        if (email) {
          var mailregex = /^\w+[\w-+\.]*\@\w+([-\.]\w+)*\.[a-zA-Z]{2,}$/;
          if (!mailregex.test(email)) {
            oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
            oEvent.getSource().setValueStateText("This email address is invalid, please re-enter, should you have any further difficulties, please call ContactUs on 01452 425888");
          } else {
            busyDialog.open();
            busyDialog.setText("Validating Email");
            oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
            // Call for checking if email already exist
            $.ajax({
              url: serviceURL + "/odata/v2/PerEmail?$filter=emailAddress eq '" + email + "'&$format=json&$select=personIdExternal",
              type: 'GET',
              contentType: "application/json",
              success: function (data) {
                if (data.d.results && data.d.results.length > 0) {
                  // If found, checking if the person exist in the same pay group
                  $.ajax({
                    url: serviceURL + `/odata/v2/EmpEmployment?$filter=personIdExternal eq '${data.d.results[0].personIdExternal}'&$format=json&$expand=jobInfoNav&$select=personIdExternal,userId,jobInfoNav`,
                    type: 'GET',
                    contentType: "application/json",
                    success: function (data) {
                      try {
                        if (data.d.results && data.d.results.length > 0) {
                          // looping for checking if any job has the same pay group
                          for (let i = 0; i < data.d.results.length; i++) {
                            var tempPayGroup = oModel.getProperty("/PersonnelAreaDetails").find((el) => el.externalCode == data.d.results[i].jobInfoNav.results[0].customString3).cust_PayrollArea;
                            if (tempPayGroup == payGroup) {
                              // Fetching username for showing the error message
                              $.ajax({
                                url: serviceURL + `/odata/v2/UserAccount?$filter=personIdExternal eq '${data.d.results[i].personIdExternal}'&$format=json&$select=personIdExternal,username`,
                                type: 'GET',
                                contentType: "application/json",
                                success: function (data) {
                                  oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
                                  oEvent.getSource().setValueStateText(`We can confirm that ${data.d.results[0].username} is already set up and their SAP ID is ${data.d.results[0].personIdExternal}. Please cancel this form and create a new form selecting Yes to the initial question Is the New Starter currently employed in your organisation?`);
                                  MessageBox.error(`We can confirm that ${data.d.results[0].username} is already set up and their SAP ID is ${data.d.results[0].personIdExternal}. Please cancel this form and create a new form selecting Yes to the initial question Is the New Starter currently employed in your organisation?`);
                                  busyDialog.close();
                                },
                                error: function (e) {
                                  console.log("error: " + e);
                                  busyDialog.close();
                                }
                              });
                              break;
                            }
                          }
                          busyDialog.close();
                        }
                      } catch {
                        busyDialog.close();
                      }
                    }.bind(this),
                    error: function (e) {
                      console.log("error: " + e);
                      busyDialog.close();
                    }
                  });
                } else busyDialog.close();
              }.bind(this),
              error: function (e) {
                console.log("error: " + e);
                busyDialog.close();
              }
            });
          }
        } else oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
      },
      validateTelePhoneLiveChange: function (oEvent) {
        if (oEvent && oEvent.mParameters && oEvent.mParameters.id) {
          this.getId(oEvent.mParameters.id).setValueState(sap.ui.core.ValueState.None);
        }
        var phone = oEvent.getParameter("newValue");
        // var phone = this.getId("homeTelephone1").getValue();
        if (phone.substring(0, 1) != "0") {
          phone = "0" + phone;
          this.getId(oEvent.getSource().sId).setValue(phone)
        }
        //var mailregex = /^\w+[\w-+\.]*\@\w+([-\.]\w+)*\.[a-zA-Z]{2,}$/;
        if (phone.length > 11) {
          phone = phone.slice(0, phone.length - 1);
          this.getId(oEvent.getSource().sId).setValue(phone);
        }
      },
      validatePhoneLiveChange: function (oEvent) {
        if (oEvent && oEvent.mParameters && oEvent.mParameters.id) {
          this.getId(oEvent.mParameters.id).setValueState(sap.ui.core.ValueState.None);
        }
        var phone = oEvent.getParameter("newValue");
        //var phone = this.getId("mobileTelephone1").getValue();
        if (phone.substring(0, 1) != "0") {
          phone = "0" + phone;
          this.getId(oEvent.getSource().sId).setValue(phone)
        }

        //var mailregex = /^\w+[\w-+\.]*\@\w+([-\.]\w+)*\.[a-zA-Z]{2,}$/;
        if (phone.length > 11) {
          phone = phone.slice(0, phone.length - 1);
          this.getId(oEvent.getSource().sId).setValue(phone);

        }
      },
      validatePostCode: function (oEvent) {
        var postCode = oEvent.getParameter("newValue");
        if (postCode.includes(" ")) {
          var postalCodeRegex = /^([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([AZa-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9]?[A-Za-z])))) [0-9][A-Za-z]{2})$/;
          if (postalCodeRegex.test(postCode.toUpperCase())) {
            this.getId(oEvent.getSource().sId).setValueState(sap.ui.core.ValueState.None);
          }
          else {
            MessageBox.error("Please enter the Postcode in a valid format, should you have any further difficulties, please call ContactUs on 01452 425888");
            this.getId(oEvent.getSource().sId).setValueState(sap.ui.core.ValueState.Error);
            this.getId(oEvent.getSource().sId).setValueStateText("Please enter the Postcode in a valid format, should you have any further difficulties, please call ContactUs on 01452 425888");
            this.getId(oEvent.getSource().sId).setValue("");
          }
        }
        else {
          MessageBox.error("Please enter the Postcode in a valid format, should you have any further difficulties, please call ContactUs on 01452 425888");
          this.getId(oEvent.getSource().sId).setValueStateText("Please enter the Postcode in a valid format, should you have any further difficulties, please call ContactUs on 01452 425888");
          this.getId(oEvent.getSource().sId).setValueState(sap.ui.core.ValueState.Error);
          this.getId(oEvent.getSource().sId).setValue("");
        }
      },
      validateTelePhone: function (oEvent) {
        if (oEvent && oEvent.mParameters && oEvent.mParameters.id) {
          this.getId(oEvent.mParameters.id).setValueState(sap.ui.core.ValueState.None);
        }
        var phone = oEvent.getParameter("newValue");
        // var phone = this.getId("homeTelephone1").getValue();
        //var mailregex = /^\w+[\w-+\.]*\@\w+([-\.]\w+)*\.[a-zA-Z]{2,}$/;
        if (phone.length != 11) {
          MessageBox.error("Please enter the telephone number in a valid format, should you have any further difficulties, please call ContactUs on 01452 425888");
          this.getId(oEvent.getSource().sId).setValueState(sap.ui.core.ValueState.Error);
        } else {
          this.getId(oEvent.getSource().sId).setValueState(sap.ui.core.ValueState.None);
        }
      },
      validatePhone: function (oEvent) {
        if (oEvent && oEvent.mParameters && oEvent.mParameters.id) {
          this.getId(oEvent.mParameters.id).setValueState(sap.ui.core.ValueState.None);
        }
        var phone = oEvent.getParameter("newValue");
        // var phone = this.getId("mobileTelephone1").getValue();
        //var mailregex = /^\w+[\w-+\.]*\@\w+([-\.]\w+)*\.[a-zA-Z]{2,}$/;
        if (phone.length != 11) {
          MessageBox.error(phone + " is not a valid Phone Number");
          this.getId(oEvent.getSource().sId).setValueState(sap.ui.core.ValueState.Error);
          this.getId(oEvent.getSource().sId).setValueState(phone + " is not a valid home mobile number");
        } else {
          this.getId(oEvent.getSource().sId).setValueState(sap.ui.core.ValueState.None);
          this.getId(oEvent.getSource().sId).setValueState("");
        }
      },
      probationPeriodChange: function (oEvent) {
        if (oEvent.getSource().getSelectedItem()) {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
          var ComboYesNo = this.getId("_IDGenInput141").getSelectedKey();
          if (ComboYesNo == "Yes") {
            this.getId("probationEndDate").setVisible(true);
            this.getId("probationEndDatePic").setVisible(true);
            this.getId("probationEndDatePic").setRequired(true);
          } else {
            this.getId("probationEndDate").setVisible(false);
            this.getId("probationEndDatePic").setVisible(false);
            this.getId("probationEndDatePic").setRequired(false);
            this.getId("probationEndDatePic").setValueState(sap.ui.core.ValueState.None);
          }
        }
        else {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
        }
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
        var numberRegex = /^\d*\.?\d*$/
        if (!numberRegex.test(value)) {
          value = value.slice(0, value.length - 1);
          oEvent.getSource().setValue(value);
        }
      },

      onLiveChangeBankAcc: function (oEvent) {
        if (oEvent && oEvent.mParameters && oEvent.mParameters.id) {
          this.getId(oEvent.mParameters.id).setValueState(sap.ui.core.ValueState.None);
        }
        var bankAcc = oEvent.getParameter("newValue");
        if (bankAcc.length > 8) {
          bankAcc = bankAcc.slice(0, bankAcc.length - 1);
          this.getId("BankAccNum1").setValue(bankAcc);
        }

      },
      //   onAccNumChange: function (oEvent) {
      //     if(oEvent && oEvent.mParameters &&  oEvent.mParameters.id){
      //       this.getId(oEvent.mParameters.id).setValueState(sap.ui.core.ValueState.None);
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
        var value = oEvent.getParameter("newValue");
        if (value.length != 8) {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
          MessageBox.error("Bank Account entered is invalid, this must be 8 numbers")
        }
        else oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
      },

      onChangeContractType: function (oEvent) {
        var value = oEvent.getSource().getSelectedItem();
        if (value) {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
          this.getGrades(this.getView().getModel("oneModel"), value.getKey());
          var ContractType = this.getId("_IDGenComboBox411").getSelectedKey();
          if (ContractType == "4") {
            this.getId("_IDGenInput141").setSelectedKey("No");
            this.getId("_IDGenInput141").setEditable(false);
          } else {
            this.getId("_IDGenInput141").setSelectedKey(null);
            this.getId("_IDGenInput141").setEditable(true);
          }
          var emplExist = this.getId("_IDGenComboBox1").getSelectedKey();
          var cirencesterCheck = this.getView().getModel("oneModel").getProperty("/EmpJobData").company == cirencesterCompanyCode;
          if ((ContractType == "4" || ContractType == "5") || (cirencesterCheck && ContractType == "34")) {
            if (emplExist == "X") {
              this.getId("TeachRegNum11").setVisible(true);
              this.getId("TeachRegNum12").setVisible(true);
              this.getId("TeachRegNum").setVisible(false);
              this.getId("TeachRegNum1").setVisible(false);
              this.getId("TeachRegNum").setRequired(false);
              this.getId("TeachRegNum1").setRequired(false);
              this.getId("TeachRegNum12").setRequired(true);
            } else {
              this.getId("TeachRegNum11").setVisible(false);
              this.getId("TeachRegNum12").setVisible(false);
              this.getId("TeachRegNum").setVisible(true);
              this.getId("TeachRegNum1").setVisible(true);
              this.getId("TeachRegNum").setRequired(true);
              this.getId("TeachRegNum1").setRequired(true);
              this.getId("TeachRegNum12").setRequired(false);
            }
          }
          else {
            this.getId("TeachRegNum11").setVisible(false);
            this.getId("TeachRegNum12").setVisible(false);
            this.getId("TeachRegNum").setVisible(true);
            this.getId("TeachRegNum1").setVisible(true);
            this.getId("TeachRegNum").setRequired(false);
            this.getId("TeachRegNum1").setRequired(false);
            this.getId("TeachRegNum12").setRequired(false);
          }
        }
        else {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
        }
      },
      onChangeClaimPosition: function (oEvent) {
        if (oEvent.getSource().getSelectedItem()) {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
          var claimPosition = oEvent.getParameter("newValue");
          var isTeacher = this.getId("_IDGenComboBox411").getSelectedItem() != null ? this.getId("_IDGenComboBox411").getSelectedItem().getKey() : this.getId("_IDGenComboBox411").getSelectedKey()
          if (claimPosition == "No") {
            this.getId("Hoursperweek").setValue("");
            this.getId("idFTEperc").setValue("");
            this.getId("idFTE").setValue("");
            if ((isTeacher == "4" || isTeacher == "5") || (companyCode == cirencesterCompanyCode && isTeacher == "34")) {
              this.getId("idfte1").setVisible(true);
              this.getId("idFTE").setRequired(true);
              this.getId("Hoursperweek").setRequired(false);
            }
            else {
              this.getId("idfte1").setVisible(false);
              this.getId("idHoursPerWeek1").setVisible(true);
              this.getId("idWeekYear1").setVisible(true);
              this.getId("Hoursperweek").setRequired(true);
              this.getId("idFTE").setRequired(false);
            }
          } else {
            this.getId("idHoursPerWeek1").setVisible(false);
            this.getId("idfte1").setVisible(false);
            this.getId("idWeekYear1").setVisible(false);
            this.getId("Hoursperweek").setRequired(false)
            this.getId("idFTE").setRequired(false);
            this.getId("Hoursperweek").setValueState(sap.ui.core.ValueState.None);
            this.getId("idFTE").setValueState(sap.ui.core.ValueState.None);
            // this.getId("Hoursperweek").setValue("37.0");
            // this.getId("idFTE").setValue("1.0000");
            // this.getId("idFTEperc").setValue("100%");
            this.getView().getModel("oneModel").setProperty("/wage2Value", "");
          }
        }
        else {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
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
            this.getId("idFTEperc").setValue((parseFloat(value) * 100).toFixed(2) + "%");
          }
        }
        else {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
        }
      },

      validateWorkingWeeks: function (workingWeeks, addWorkingWeeks) {
        return new Promise(
          function (resolve, reject) {
            if (workingWeeks) {
              addWorkingWeeks = addWorkingWeeks ? +addWorkingWeeks : 0;
              $.ajax({
                url: serviceURL + `/odata/v2/cust_ZFLM_TTO_EC?$filter=cust_TTOWeeks eq '${+workingWeeks + addWorkingWeeks}' and (cust_CompanyCode eq '${companyCode}' or cust_CompanyCode eq 'XXXX')&$format=json`,
                type: 'GET',
                contentType: "application/json",
                success: function (data) {
                  if (data.d.results.length > 0) {
                    this.getId("idWeekYeardrop").setValueState("None");
                    this.getId("idWorkingWeeksdrop").setValueState("None");
                    resolve();
                  }
                  else {
                    this.getId("idWeekYeardrop").setValueState("Error");
                    this.getId("idWorkingWeeksdrop").setValueState("Error");
                    reject("Entered Weeks Per Year and Additional Working Weeks are not Valid, please ensure you select correct values");
                  }
                }.bind(this),
                error: function (e) {
                  console.log("error: " + e);
                }
              });
            }
          }.bind(this))
      },

      onWorkingChange: function (oEvent) {
        if (oEvent.getSource().getSelectedItem() != null) {
          var grade = this.getId("_IDGenComboBox2").getSelectedItem() != null ? this.getId("_IDGenComboBox2").getSelectedItem().getKey() : this.getId("_IDGenComboBox2").getSelectedKey();
          var workingWeeks = oEvent.getSource().getSelectedItem().getText();
          this._checkWage2(grade, workingWeeks)
            // var addWorkingWeeks = this.getId("idWorkingWeeksdrop").getValue();
            // this.validateWorkingWeeks(workingWeeks, addWorkingWeeks)
            .then(() => {
            })
            .catch((e) => {
              MessageBox.error(e);
            })
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
          var grade = this.getId("_IDGenComboBox2").getSelectedItem() != null ? this.getId("_IDGenComboBox2").getSelectedItem().getKey() : this.getId("_IDGenComboBox2").getSelectedKey();
          var workingWeeks = this.getId("idWeekYeardrop").getSelectedItem() != null ? this.getId("idWeekYeardrop").getSelectedItem().getText() : this.getId("idWeekYeardrop").getValue();
          this._checkWage2(grade, workingWeeks)
            // this.validateWorkingWeeks(workingWeeks, addWorkingWeeks)
            .then(() => {
              if (+addWorkingWeeks) {
                $.ajax({
                  url: serviceURL + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'TTOAdditionalWeeks' and status eq 'A' and externalCode eq '" + addWorkingWeeks + "'&$format=json",
                  type: 'GET',
                  contentType: "application/json",
                  success: function (data) {
                    this.getId("idWorkingWeeksdrop").getSelectedItem().setKey(data.d.results[0].optionId);
                  }.bind(this),
                  error: function (e) {
                    console.log("error: " + e);
                  }
                });
              }
            })
            .catch((e) => {
              MessageBox.error(e);
            })

        }
        else {
          MessageBox.error("Please select a valid value");
        }
      },

      _getTTOWeeks: async function (grade) {
        let termWeeks = [];
        await $.ajax({
          url: serviceURL + "/odata/v2/PickListValueV2?$filter=PickListV2_id eq 'TermtimeWeeks' and status eq 'A'&$format=json",
          type: 'GET',
          contentType: "application/json",
          success: function (data) {
            if (data.d.results.length > 0) {
              termWeeks = data.d.results;
            }
          }.bind(this),
          error: function (e) {
            console.log("error: " + e);
          }
        });
        $.ajax({
          url: serviceURL + `/odata/v2/cust_ZFLM_TTO_EC?$filter=cust_PayScaleGroup eq '${grade}' and cust_CompanyCode eq '${companyCode}'&$format=json`,
          type: 'GET',
          contentType: "application/json",
          success: function (data) {
            if (data.d.results.length > 0) {
              data.d.results.sort(function (a, b) {
                return a.cust_TTOWeeks - b.cust_TTOWeeks;
              })
              let preparedData = [];
              data.d.results.forEach(function (oItem) {
                var temp = {
                  externalCode: termWeeks.find((el) => el.externalCode == oItem.cust_TTOWeeks.split(".")[0]).optionId,
                  cust_TTOWeeks: oItem.cust_TTOWeeks
                }
                preparedData.push(temp);
              });
              this.getView().getModel("oneModel").setProperty("/workingWeeks", preparedData)
            } else {
              $.ajax({
                url: serviceURL + `/odata/v2/cust_ZFLM_TTO_EC?$filter=cust_PayScaleGroup eq '${defaultPayGrade}' and cust_CompanyCode eq '${defaultCompanyCode}'&$format=json`,
                type: 'GET',
                contentType: "application/json",
                success: function (data) {
                  if (data.d.results.length > 0) {
                    data.d.results.sort(function (a, b) {
                      return a.cust_TTOWeeks - b.cust_TTOWeeks;
                    })
                    let preparedData = [];
                    data.d.results.forEach(function (oItem) {
                      var temp = {
                        externalCode: termWeeks.find((el) => el.externalCode == oItem.cust_TTOWeeks.split(".")[0]).optionId,
                        cust_TTOWeeks: oItem.cust_TTOWeeks
                      }
                      preparedData.push(temp);
                    });
                    this.getView().getModel("oneModel").setProperty("/workingWeeks", preparedData)
                  }
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
      },

      _checkWage2: function (grade, workingWeeks) {
        return new Promise(
          function (resolve, reject) {
            this.getView().getModel("oneModel").setProperty("/wage2Value", "");
            var additonalWorkingWeeks = this.getId("idWorkingWeeksdrop").getValue();
            if (grade && workingWeeks) {
              var contStartDate = new Date(this.getId("contStartDate1").getValue());
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
              additonalWorkingWeeks = additonalWorkingWeeks ? +additonalWorkingWeeks : 0

              // checking if particular company code and working weeks combination exist.
              // If not, then taking the default combination
              const formattedGrade = grade.split("/")[grade.split("/").length - 1];
              $.ajax({
                url: serviceURL + `/odata/v2/cust_ZFLM_TTO_EC?$filter=(cust_PayScaleGroup eq '${formattedGrade}' or cust_PayScaleGroup eq '${defaultPayGrade}') and cust_TTOWeeks eq '${+workingWeeks + additonalWorkingWeeks}' and (cust_CompanyCode eq '${companyCode}' or cust_CompanyCode eq '${defaultCompanyCode}')&$format=json`,
                type: 'GET',
                contentType: "application/json",
                success: function (data) {
                  if (data.d.results.length != 0) {

                    // finding if company code and working weeks combination existingData
                    // otherwise replacing them with thei default values
                    let requiredData = {}; const aData = data.d.results;
                    if (aData.filter((el) => el.cust_CompanyCode == companyCode && el.cust_PayScaleGroup == formattedGrade).length > 0)
                      requiredData = aData.filter((el) => el.cust_CompanyCode == companyCode && el.cust_PayScaleGroup == formattedGrade)[0];
                    else if (aData.filter((el) => el.cust_CompanyCode == companyCode && el.cust_PayScaleGroup == defaultPayGrade).length > 0)
                      requiredData = aData.filter((el) => el.cust_CompanyCode == companyCode && el.cust_PayScaleGroup == defaultPayGrade)[0];
                    else
                      requiredData = aData.filter((el) => el.cust_CompanyCode == defaultCompanyCode && el.cust_PayScaleGroup == defaultPayGrade)[0];
                    // after finding the required data
                    // checking the working time of the employee
                    if (diff < 5) {
                      this.getView().getModel("oneModel").setProperty("/wage2Value", requiredData.cust_Service1);
                    }
                    else if (diff > 10) {
                      this.getView().getModel("oneModel").setProperty("/wage2Value", requiredData.cust_Service3);
                    }
                    else {
                      this.getView().getModel("oneModel").setProperty("/wage2Value", requiredData.cust_Service2);
                    }
                    this.getId("idWeekYeardrop").setValueState("None");
                    this.getId("idWorkingWeeksdrop").setValueState("None");
                    resolve();
                  }
                  else {
                    // If not finding any value, then erroring
                    this.getId("idWeekYeardrop").setValueState("Error");
                    this.getId("idWorkingWeeksdrop").setValueState("Error");
                    reject("Entered Weeks Per Year and Additional Working Weeks are not Valid, please ensure you select correct values");
                  }
                  // else {
                  //   $.ajax({
                  //     url: serviceURL + `/odata/v2/cust_ZFLM_TTO_EC?$filter=cust_PayScaleGroup eq '${defaultPayGrade}' and cust_TTOWeeks eq '${+workingWeeks + +additonalWorkingWeeks}' and cust_CompanyCode eq '${defaultCompanyCode}'&$format=json`,
                  //     type: 'GET',
                  //     contentType: "application/json",
                  //     success: function (data) {
                  //       if (data.d.results.length != 0) {
                  //         if (diff < 5) {
                  //           this.getView().getModel("oneModel").setProperty("/wage2Value", data.d.results[0].cust_Service1);
                  //         }
                  //         else if (diff > 10) {
                  //           this.getView().getModel("oneModel").setProperty("/wage2Value", data.d.results[0].cust_Service3);
                  //         }
                  //         else {
                  //           this.getView().getModel("oneModel").setProperty("/wage2Value", data.d.results[0].cust_Service2);
                  //         }
                  //       }
                  //       else {
                  //         this.getView().getModel("oneModel").setProperty("/wage2Value", "");
                  //       }
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
            }
            else {
              this.getView().getModel("oneModel").setProperty("/wage2Value", "");
            }
          }.bind(this))
      },

      onStartDateChange: function (oEvent) {
        if (!oEvent.getParameter("valid")) {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
        }
        else {
          if (oEvent.getSource().getValue()) {
            oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
            if (new Date(oEvent.getSource().getValue()) > new Date(this.getId("_IDGenDatePicker2").getValue()))
              this.getId("_IDGenDatePicker2").setDateValue(null);
            this.getId("_IDGenDatePicker2").setMinDate(new Date(oEvent.getSource().getValue()));
            if (new Date(oEvent.getSource().getValue()) > new Date(this.getId("probationEndDatePic").getValue()))
              this.getId("probationEndDatePic").setDateValue(null);
            this.getId("probationEndDatePic").setMinDate(new Date(oEvent.getSource().getValue()));
          } else {
            this.getId("_IDGenDatePicker2").setMinDate(null);
            this.getId("probationEndDatePic").setMinDate(null);
          }
        }
      },

      onContractChange: function (oEvent) {
        if (oEvent.getSource().getSelectedItem()) {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
          if (oEvent.getSource().getSelectedItem().getText().includes("Fixed Term")) {
            this.getId("_IDGenLabel81").setVisible(true);
            this.getId("_IDGenDatePicker2").setVisible(true);
            this.getId("_IDGenDatePicker2").setRequired(true);
          }
          else {
            this.getId("_IDGenLabel81").setVisible(false);
            this.getId("_IDGenDatePicker2").setVisible(false);
            this.getId("_IDGenDatePicker2").setRequired(false);
          }

          if (oEvent.getSource().getSelectedItem().getText().includes("Casual")) {
            this.getId("_IDGenComboBox6").setSelectedKey("Yes");
            this.getId("_IDGenComboBox6").setEditable(false);
            this.getId("idHoursPerWeek1").setVisible(false);
            this.getId("idfte1").setVisible(false);
            this.getId("idWeekYear1").setVisible(false);
            this.getId("Hoursperweek").setRequired(false)
            this.getId("idFTE").setRequired(false);
            this.getId("Hoursperweek").setValueState(sap.ui.core.ValueState.None);
            this.getId("idFTE").setValueState(sap.ui.core.ValueState.None);
            // this.getId("Hoursperweek").setValue("37.0");
            // this.getId("idFTE").setValue("1.0000");
            // this.getId("idFTEperc").setValue("100%");
            this.getView().getModel("oneModel").setProperty("/wage2Value", "");
          } else {
            this.getId("_IDGenComboBox6").setEditable(true);
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
          this.getId(oEvent.mParameters.id).setValueState(sap.ui.core.ValueState.None);
        }
        else {
          this.getId(oEvent.mParameters.id).setValueState(sap.ui.core.ValueState.Error);
        }
      },


      // Controller for Work Schedules

      onWorkSchedBut: function () {
        sap.ui.core.BusyIndicator.show();
        var startDate = this.getId("_IDGenDatePicker1").getValue();
        var hoursPerWeek = this.getId("Hoursperweek").getValue();
        var FTE = this.getId("idFTE").getValue();
        if (startDate && (hoursPerWeek || FTE)) {
          startDate = new Date(startDate)
          this.getId("_IDGenDatePicker1").setValueState(sap.ui.core.ValueState.None);
          this.getId("Hoursperweek").setValueState(sap.ui.core.ValueState.None);
          var WSStartDate = new Date(this.getView().getModel("WSModel") ? this.getView().getModel("WSModel").getProperty("/WSStartDate") : "12/31/9999");
          var oModelWS = this.getView().getModel("WSModel") ? this.getView().getModel("WSModel") : new JSONModel();
          if (!this.oWorkSchedules) {
            this.oWorkSchedules = sap.ui.xmlfragment("com.gcc.newstarterqa.newstarterqa.fragment.WorkSchedules", this);
            this.getView().addDependent(this.oWorkSchedules);
          }
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
            if (!(approverFlag || initiatorFlag || bscFlag || noMode)) {
              oModelWS.setProperty("/WSItems", [{
                ScheduleDay: "1",
                Day: this.oWeekDays.filter((el) => el.key == startDate.getDay())[0].day,
                DayKey: startDate.getDay(),
                HoursWorked: "0.00"
              }]);
              oModelWS.setProperty("/DelButShow", false);
              oModelWS.setProperty("/WSHoursPerWeek", "0.0");
              oModelWS.setProperty("/PreviewTableShow", false);
              oModelWS.setProperty("/PreviewText", "Preview Schedule");
            } else {
              this.calculateTotalHours();
              oModelWS.setProperty("/DelButShow", true);
            }
            oModelWS.setProperty("/WSStartDate", new Date(this.getId("_IDGenDatePicker1").getValue()));
            this.getView().setModel(oModelWS, "WSModel");
          } else {
            if (oModelWS.getProperty("/WSSavedItems") && oModelWS.getProperty("/WSSavedItems").length > 0)
              oModelWS.setProperty("/WSItems", JSON.parse(JSON.stringify(oModelWS.getProperty("/WSSavedItems"))))
            else oModelWS.setProperty("/WSItems", [{
              ScheduleDay: "1",
              Day: this.oWeekDays.filter((el) => el.key == startDate.getDay())[0].day,
              DayKey: startDate.getDay(),
              HoursWorked: "0.00"
            }]);
            this.calculateTotalHours();
          }
          this.oWorkSchedules.open();
        } else {
          if (!startDate) {
            this.getId("_IDGenDatePicker1").setValueState(sap.ui.core.ValueState.Error);
            MessageBox.error("Please fill the start date first");
          } else {
            if (this.getId("idHoursPerWeek1").getVisible()) {
              this.getId("Hoursperweek").setValueState(sap.ui.core.ValueState.Error);
              MessageBox.error("Please fill Hours per week first");
            } else {
              this.getId("idFTE").setValueState(sap.ui.core.ValueState.Error);
              MessageBox.error("Please fill FTE first");
            }
          }
        }
        sap.ui.core.BusyIndicator.hide();
      },

      onWSHoursWork: function (oEvent) {
        var value = parseFloat(oEvent.getSource().getValue());
        if (!(isNaN(value) || value < 0 || value > 24)) {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
          // changing the value upto 1 decimal places without rounding off
          value = (value).toFixed(2);
          oEvent.getSource().setValue(value);
          // calculating the sum of all the work hours entered
          this.calculateTotalHours();
        }
        else {
          oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
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
          totalHours = totalHours.toFixed(2);
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
          HoursWorked: "0.00"
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

      onWorkSchedulesClose: function (isSave) {
        if (isSave) {
          var errorFound = this.checkWSData();
          if (errorFound) MessageBox.error("Please fill all the details");
          else {
            var oModelWS = this.getView().getModel("WSModel");
            this.preparePreviewData(oModelWS);
            oModelWS.setProperty("/WSSavedItems", JSON.parse(JSON.stringify(oModelWS.getProperty("/WSItems"))));
            this.oWorkSchedules.close();
          }
        } else {
          if (initiatorFlag || noMode || !this.query) {
            MessageBox.alert("Data will not be saved.\nDo you want to continue?", {
              actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
              emphasizedAction: sap.m.MessageBox.Action.YES,
              onClose: function (oAction) {
                if (oAction === sap.m.MessageBox.Action.YES) {
                  this.oWorkSchedules.close();
                }
              }.bind(this)
            });
          } else {
            this.oWorkSchedules.close();
          }
        }
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
        // var loopIter = items.length < 7 ? 7 : items.length;
        // var j = 0, dayKey = Number(items[0].DayKey);
        // const weekDays = this.oWeekDays;
        // for (let i = 0; i < loopIter; i++) {
        //   if (i != items.length && items[i].DayKey == 1 && i != 0) {
        //     counter += 1;
        //     previewData.push({});
        //   }
        //   j = j == items.length ? 0 : i;
        //   dayKey = dayKey == 7 ? 0 : dayKey
        //   previewData[counter][weekDays[dayKey].day] = { [weekDays[dayKey].day]: items[j].HoursWorked, dataFound: "true", DaysName: [weekDays[dayKey].day], ScheduleDay: (i+1).toString(), Daykey: (dayKey).toString() };
        //   previewData[counter].Type = "Hours";
        //   j++;dayKey++;
        // }
        // oModelWS.setProperty("/WSPreviewItems", previewData);
        for (let i = 0; i < items.length; i++) {
          if (i != items.length && items[i].DayKey == 1 && i != 0) {
            counter += 1;
            previewData.push({});
          }
          previewData[counter][items[i].Day] = { [items[i].Day]: items[i].HoursWorked, dataFound: "true", DaysName: items[i].Day, ScheduleDay: items[i].ScheduleDay, Daykey: items[i].DayKey };
          previewData[counter].Type = "Hours";
        }
        oModelWS.setProperty("/WSPreviewItems", previewData);
      },

      checkWSData: function () {
        var aControls = this.getView().getControlsByFieldGroupId("WSCheck");
        var errorFlag = false;
        aControls.forEach(function (oControl) {
          if (oControl.getId != undefined && oControl.getId().includes("input")) {
            if ((oControl.getValue != undefined && oControl.getValue() == "") || (oControl.getValueState != undefined && oControl.getValueState() === sap.ui.core.ValueState.Error)) {
              oControl.setValueState(sap.ui.core.ValueState.Error);
              errorFlag = true;
            }
            else if (oControl.getValue != undefined && oControl.getValue() != "") {
              oControl.setValueState(sap.ui.core.ValueState.None);
            }
          }
        });

        if (errorFlag) return true;
        else return false;
      }

    });
  });