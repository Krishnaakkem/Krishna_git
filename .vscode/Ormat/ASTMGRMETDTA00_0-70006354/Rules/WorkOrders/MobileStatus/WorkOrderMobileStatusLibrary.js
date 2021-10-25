import libMobile from '../../MobileStatus/MobileStatusLibrary';
import libOprMobile from '../../Operations/MobileStatus/OperationMobileStatusLibrary';
import libCommon from '../../Common/Library/CommonLibrary';
import {PartnerFunction} from '../../Common/Library/PartnerFunction';
import Logger from '../../Log/Logger';
import isTimeSheetsEnabled from '../../TimeSheets/TimeSheetsIsEnabled';
import isConfirmationsEnabled from '../../Confirmations/ConfirmationsIsEnabled';
import confirmationsCreateUpdateNav from '../../Confirmations/CreateUpdate/ConfirmationCreateUpdateNav';
import WorkOrderOperationsCount from '../Operations/WorkOrderOperationsCount';
import CompleteWorkOrderMobileStatusAction from './CompleteWorkOrderMobileStatusAction';
import libClock from '../../ClockInClockOut/ClockInClockOutLibrary';
import WorkOrderStartStatus from '../MobileStatus/WorkOrderStartStatus';
import authorizedConfirmationCreate from '../../UserAuthorizations/Confirmations/EnableConfirmationCreate';
import authorizedTimeSheetCreate from '../../UserAuthorizations/TimeSheets/EnableTimeSheetCreate';
import isSignatureControlEnabled from '../../SignatureControl/SignatureControlViewPermission';
import libDigSig from '../../DigitalSignature/DigitalSignatureLibrary';
import checkDeviceRegistration from '../../DigitalSignature/CheckDeviceCreation';
import libSuper from '../../Supervisor/SupervisorLibrary';
import noteWrapper from '../../Supervisor/MobileStatus/NoteWrapper';
import deviceRegistration from '../../DigitalSignature/TOTPDeviceRegistration';
import IsAssignOrUnAssignEnableWorkOrder from './IsAssignOrUnAssignEnableWorkOrder';
import libThis from './WorkOrderMobileStatusLibrary';
const workOrderDetailsPage = 'WorkOrderDetailsPage';
export default class {

    static startWorkOrder(context) {
        var woStarted = libCommon.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/StartParameterName.global').getValue());
        return libClock.setInterimMobileStatus(context, woStarted).then(() => { //Handle clock in/out logic
            if (context.getPageProxy) {
                libMobile.setStartStatus(context.getPageProxy());
            } else {
                libMobile.setStartStatus(context);
            }
            libCommon.SetBindingObject(context);
            return context.executeAction('/SAPAssetManager/Actions/WorkOrders/WorkOrderStartUpdate.action').then(() => {
                //Set toolbar caption.
                this.setCaption(context, 'Start');
                //Set context binding object mobile status to started.
                context.getBindingObject().OrderMobileStatus_Nav.MobileStatus = woStarted;
                //Set WorkOrderDetailsPage state variable isAnyWorkOrderStarted = true
                libCommon.setStateVariable(context, 'isAnyWorkOrderStarted', true, 'WorkOrderDetailsPage');
                
                libClock.setClockInWorkOrderODataValues(context); //Handle clock in create for work order
                return context.executeAction('/SAPAssetManager/Actions/ClockInClockOut/WorkOrderClockInOut.action').then(() => {
                    return libClock.reloadUserTimeEntries(context).then(() => {
                        this.setCaption(context, 'Start');
                        return context.executeAction('/SAPAssetManager/Actions/WorkOrders/MobileStatus/WorkOrderMobileStatusSuccessMessage.action');
                    });
                }).catch(err => {
                    context.dismissActivityIndicator();
                    /**Implementing our Logger class*/
                    Logger.error(context.getGlobalDefinition('/SAPAssetManager/Globals/Logs/CategoryWorkOrders.global').getValue(), err);
                    return '';
                });
            },
            () => {
                return context.executeAction('/SAPAssetManager/Actions/WorkOrders/MobileStatus/WorkOrderMobileStatusFailureMessage.action');
            });
        });
    }

    static showTimeCaptureMessage(context, isFinalRequired=false, mobileStatus) {

        let reviewStatus = libCommon.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/ReviewParameterName.global').getValue());
        let rejectedStatus = libCommon.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/RejectedParameterName.global').getValue());
        let confirm = (isConfirmationsEnabled(context) && authorizedConfirmationCreate(context));
        let timesheet = (isTimeSheetsEnabled(context) && authorizedTimeSheetCreate(context));

        if (confirm) { //Check if this work order is in review status and supervisor has time flag
            if (mobileStatus && (mobileStatus === reviewStatus || mobileStatus === rejectedStatus)) {
                confirm = libSuper.isSupervisorTimeEnabled(context);
            }
        } else if (timesheet) { //Check if this work order is in review status and supervisor has time flag
            if (mobileStatus && (mobileStatus === reviewStatus || mobileStatus === rejectedStatus)) {
                timesheet = libSuper.isSupervisorTimeEnabled(context);
            }
        }
        if (confirm) {
            return libMobile.getStatusForOperations(context, context.binding.OrderId).then(query => {
                return WorkOrderOperationsCount(context, query).then(count => {
                    // Check to make sure the count for Confirmation Operations > 0
                    if (count > 0) {
                        // Display the confirmations message
                        return this.showConfirmationMessage(context, isFinalRequired);
                    }
                    // If operation count = 0, do nothing
                    return true;
                });
            });
        } else if (timesheet) {
            // If time sheets is enabled, display time sheet message
            return this.showTimeSheetMessage(context);
        }
        // Default resolve true
        return Promise.resolve(true);
    }

    static showTimeSheetMessage(context) {
        return this.showWorkOrderTimesheetMessage(context).then(bool => {
            if (bool) {
                libCommon.setOnCreateUpdateFlag(context, 'CREATE');
                return context.executeAction('/SAPAssetManager/Actions/TimeSheets/TimeSheetEntryCreateForWONav.action').then(() => {
                    return Promise.resolve();
                }, error => {
                    /**Implementing our Logger class*/
                    context.dismissActivityIndicator();
                    Logger.error(context.getGlobalDefinition('/SAPAssetManager/Globals/Logs/CategoryWorkOrders.global').getValue(), error);
                });
            }
            return Promise.resolve();
        });
    }

    static showConfirmationMessage(context, isFinalRequired=false) {
        return this.showWorkOrderConfirmationsMessage(context).then(didSelectOk => {
            if (!didSelectOk) {
                return Promise.resolve();
            }
            let startDate = libCommon.getStateVariable(context, 'StatusStartDate');
            let endDate = libCommon.getStateVariable(context, 'StatusEndDate');
            let binding = context.binding;

            // Override page values as shown
            let overrides = {
                'IsWorkOrderChangable': false,
                'WorkOrderHeader': binding,
                'OrderID': binding.OrderId,
                'IsFromWorkOrderHold': binding.IsFromWorkOrderHold,
                'Plant' : binding.MainWorkCenterPlant,
            };

            if (isFinalRequired) {
                overrides.IsFinalChangable = false;
                overrides.IsFinal = true;
            }

            if (binding.SupervisorDisallowFinal) { //Do not allow tech to change final confirmation slider on review
                binding.SupervisorDisallowFinal = '';
                overrides.IsFinalChangable = false;
            }

            return confirmationsCreateUpdateNav(context, overrides, startDate, endDate).then(() => {
                return Promise.resolve();
            }, error => {
                /**Implementing our Logger class*/
                context.dismissActivityIndicator();
                Logger.error(context.getGlobalDefinition('/SAPAssetManager/Globals/Logs/CategoryWorkOrders.global').getValue(), error);
            });

        });
    }

    static holdWorkOrder(context) {
        var parent = this;
        var woHold = libCommon.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/HoldParameterName.global').getValue());
        
        return libClock.setInterimMobileStatus(context, woHold).then(() => { //Handle clock in/out logic
            libMobile.setHoldStatus(context);
            libCommon.SetBindingObject(context);
            /*
            * Set WorkOrderDetailsPage state variable isAnyWorkOrderStarted to undefined to run the db query again.
            * because we don't know if it was this order that was started or if it was another order.
            */
            libCommon.setStateVariable(context, 'isAnyWorkOrderStarted', undefined, 'WorkOrderDetailsPage');
            return context.executeAction('/SAPAssetManager/Actions/WorkOrders/MobileStatus/WorkOrderHoldUpdate.action').then(() => {
                //Set context binding object mobile status to hold.
                context.getBindingObject().OrderMobileStatus_Nav.MobileStatus = woHold;
                context.getBindingObject().IsFromWorkOrderHold = true;
                //Handle clock out create for work order
                libClock.setClockOutWorkOrderODataValues(context);
                return context.executeAction('/SAPAssetManager/Actions/ClockInClockOut/WorkOrderClockInOut.action').then(() => {
                    parent.showTimeCaptureMessage(context);
                    return libClock.reloadUserTimeEntries(context).then(() => {
                        context.dismissActivityIndicator();
                        parent.setCaption(context, 'Hold');
                        return Promise.resolve(true);
                    });
                }).catch(err => {
                    context.dismissActivityIndicator();
                    /**Implementing our Logger class*/
                    Logger.error(context.getGlobalDefinition('/SAPAssetManager/Globals/Logs/CategoryWorkOrders.global').getValue(), err);
                });
            }, () => {
                return context.executeAction('/SAPAssetManager/Actions/WorkOrders/MobileStatus/WorkOrderMobileStatusFailureMessage.action');
            });
        });
    }

    static showTransferWarningMessage(context) {
        return this.showWorkOrderTransferWarningMessage(context).then(bool => {
            if (bool) {
                libMobile.setTransferStatus(context);
                libCommon.SetBindingObject(context);
                return context.executeAction('/SAPAssetManager/Actions/WorkOrders/WorkOrderTransferNav.action');
            } else {
                return Promise.resolve(false);
            }
        });
    }

    static transferWorkOrder(context) {
        return this.showTransferWarningMessage(context);
    }

    static updateCompleteStatus(context, mobileStatus) {
        let binding = context.binding;
        let actionArgs = {
            WorkOrderId: binding.OrderId,
        };
        let action = new CompleteWorkOrderMobileStatusAction(actionArgs);
        context.getClientData().confirmationArgs = {
            doCheckWorkOrderComplete: false,
        };
        // Add this action to the binding
        context.getClientData().mobileStatusAction = action;
        // Hold the previous state of the context
        let pageContext = context;
        return libSuper.checkReviewRequired(context, context.binding).then(review => {
            context.binding.SupervisorDisallowFinal = '';
            if (review) {
                context.binding.SupervisorDisallowFinal = true; //Tech cannot set final confirmation on review
            }
            return noteWrapper(context, review).then(() => { //Allow tech to leave note for supervisor
                return this.showTimeCaptureMessage(context, !review, mobileStatus).then(() => { //If review is required, then we cannot pass up a final confirmation
                    return action.execute(context).then(() => {
                        return this.didSetWorkOrderComplete(pageContext, mobileStatus);
                    });
                }, () => {
                    return context.executeAction('/SAPAssetManager/Actions/WorkOrders/MobileStatus/WorkOrderMobileStatusFailureMessage.action');
                });
            });            
         });
    }

    // Called after the work order has been set to complete
    static didSetWorkOrderComplete(context, mobileStatus) {
        return libSuper.checkReviewRequired(context, context.binding).then(review => {
            if (review) { //target requires review for technician user
                this.setCaption(context, 'Review');
                libMobile.setReviewStatus(context);
                return context.executeAction('/SAPAssetManager/Actions/WorkOrders/MobileStatus/WorkOrderMobileStatusSuccessMessage.action');
            }
            this.setCaption(context, 'Complete');
            libCommon.enableToolBar(context, workOrderDetailsPage, 'IssuePartTbI', false);
            try {
                context.setActionBarItemVisible(0, false);
                context.setActionBarItemVisible(1, false);
            } catch (exception) {
                /**Implementing our Logger class*/
                Logger.error(context.getGlobalDefinition('/SAPAssetManager/Globals/Logs/CategoryWorkOrders.global').getValue(), `workOrdersListViewPage refresh error: ${exception}`);
            }
            //remove the marked job related if theres any
            if (context.binding.MarkedJob) {
                context.executeAction('/SAPAssetManager/Actions/WorkOrders/MarkedJobDelete.action');
            }
            context.getControl('SectionedTable').redraw();
            let reviewStatus = libCommon.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/ReviewParameterName.global').getValue());
            let rejectedStatus = libCommon.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/RejectedParameterName.global').getValue());
            if (mobileStatus && (mobileStatus === reviewStatus || mobileStatus === rejectedStatus)) {
                let clientData = context.getClientData();
                clientData.ChangeStatus = 'APPROVED';
            }
            return context.executeAction('/SAPAssetManager/Actions/WorkOrders/MobileStatus/WorkOrderMobileStatusSuccessMessage.action');
        });
    }
    
    // Called after the work order has been set to rejected by a supervisor
    static didSetWorkOrderRejected(context) { 
        this.setCaption(context, 'Rejected');
        libMobile.setRejectedStatus(context);
        return context.executeAction('/SAPAssetManager/Actions/WorkOrders/MobileStatus/WorkOrderMobileStatusSuccessMessage.action');
    }

    /**
     * When completing work order, operation or sub-operation, capture the notification malfunction end date on associated parent notification if breakdown is set
     * @param {*} context 
     */
    
    static NotificationUpdateMalfunctionEnd(context, woBinding) {

        if (woBinding.NotificationNumber) {
            let binding = context.getBindingObject();
            let readLink = woBinding['@odata.readLink'] + '/Notification';
            return context.read('/SAPAssetManager/Services/AssetManager.service', readLink, [], '$expand=NotifMobileStatus_Nav').then(results => {
                if (results && results.length > 0) {
                    let notif = results.getItem(0);
                    let complete = libCommon.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/CompleteParameterName.global').getValue());
                    if (notif.BreakdownIndicator && notif.NotifMobileStatus_Nav.MobileStatus !== complete && !notif.MalfunctionEndDate) {  //Breakdown is set and end date is not set and notification is not already complete
                        let oldBinding = binding;
                        context.getPageProxy().setActionBinding(notif);
                        return context.executeAction('/SAPAssetManager/Actions/Notifications/NotificationUpdateMalfunctionEndNav.action').then(() => {
                            context.getPageProxy().setActionBinding(oldBinding);
                            return Promise.resolve();
                        });
                    }
                }
                return Promise.resolve();
            });
        }
        return Promise.resolve();
    }

    static completeWorkOrder(context) {
        let parent = this;
        return parent.headerMobileStatus(context).then((mobileStatus) => {
            return this.showWorkOrderCompleteWarningMessage(context, mobileStatus).then(bool => {
                if (bool) {
                    if (libDigSig.isWODigitalSignatureEnabled(context)) {
                        // check for digital signature and device Registration
                        return checkDeviceRegistration(context).then(registered => {
                            if (!registered) {
                                    // Needs to register and do digital signarure
                                    return deviceRegistration(context).then( () => {
                                        ///Do digital Signature

                                         ///Check is was properly register
                                         return checkDeviceRegistration(context).then(deviceIsRegistered => {
                                            if (deviceIsRegistered) {
                                                //do digital signarure
                                                return this.createDigitalSignatureAndCompleteNotification(context);
                                            } else {
                                                return this.cancelDigitalSignature(context);
                                            }
                                        });
                                    }, () => {
                                        if (libDigSig.isWODigitalSignatureMandatory()) {
                                            return context.executeAction('/SAPAssetManager/Actions/WorkOrders/MobileStatus/WorkOrderMobileStatusFailureMessage.action').then(() => {
                                                return Promise.resolve(false);
                                            });
                                        } else {
                                            return this.executeCompletionStepsAfterDigitalSignature(context, mobileStatus);
                                        }
                                    });
                            } else {
                                // Has registered, needs to do digital signature
                                return this.createDigitalSignatureAndCompleteOrder(context, mobileStatus);
                            }
                        });
                    } else {
                        return this.executeCompletionStepsAfterDigitalSignature(context, mobileStatus);
                    }
                } else {
                    return Promise.resolve(false);
                }
            });
        });
        
    }

    static createDigitalSignatureAndCompleteOrder(context, mobileStatus) {
        return context.executeAction('/SAPAssetManager/Actions/DigitalSignature/CreateDigitalSignatureNav.action').then( () => {
            return this.executeCompletionStepsAfterDigitalSignature(context, mobileStatus);
        }, () => {
            if (libDigSig.isWODigitalSignatureOptional(context)) {
                return this.executeCompletionStepsAfterDigitalSignature(context, mobileStatus);
            } else {
                return context.executeAction('/SAPAssetManager/Actions/WorkOrders/MobileStatus/WorkOrderMobileStatusFailureMessage.action').then(() => {
                    return Promise.resolve(false);
                });
            }
        });
    }

    static executeCompletionStepsAfterDigitalSignature(context, mobileStatus) {
        let parent = this;
        return isSignatureControlEnabled(context, mobileStatus).then(() => {
            libMobile.setCompleteStatus(context); // set the status to complete when user clicks "Yes" on the Work Order complete warning message
            return parent.NotificationUpdateMalfunctionEnd(context, context.getBindingObject()).then(() => { //Capture malfunction end date if breakdown set
                if (libMobile.isHeaderStatusChangeable(context)) { //Handle clock out create for work order
                    libClock.setClockOutWorkOrderODataValues(context);
                    return context.executeAction('/SAPAssetManager/Actions/ClockInClockOut/WorkOrderClockInOut.action').then(() => {
                        return this.updateCompleteStatus(context, mobileStatus).then(() => {
                            return libClock.reloadUserTimeEntries(context);
                        });
                    }).catch(err => {
                        context.dismissActivityIndicator();
                        /**Implementing our Logger class*/
                        Logger.error(context.getGlobalDefinition('/SAPAssetManager/Globals/Logs/CategoryWorkOrders.global').getValue(), err);
                        return '';
                    });
                }
                return Promise.resolve();
            }).catch(err => {
            context.dismissActivityIndicator();
            /**Implementing our Logger class*/
            Logger.error(context.getGlobalDefinition('/SAPAssetManager/Globals/Logs/CategoryWorkOrders.global').getValue(), err);
            return '';
            });
        });
    }

    static setCaption(context, status) {
        switch (status) {
            case 'Start':
                if (typeof context.setToolbarItemCaption !== 'function') {
                    context = context.getPageProxy();
                }
                if (libClock.isCICOEnabled(context)) { //Handle clock in/out feature
                    context.setToolbarItemCaption('IssuePartTbI', context.localizeText('clock_out'));
                } else {
                    context.setToolbarItemCaption('IssuePartTbI', context.localizeText('end_workorder'));
                }
                break;
            case 'Hold':
                if (libClock.isCICOEnabled(context)) { //Handle clock in/out feature
                    context.setToolbarItemCaption('IssuePartTbI', context.localizeText('clock_in'));
                } else {
                    context.setToolbarItemCaption('IssuePartTbI', context.localizeText('start_workorder'));
                }
                break;
            case 'Transfer':
                context.setToolbarItemCaption('IssuePartTbI', context.localizeText('transferred'));
                break;
            case 'Complete':
                context.setToolbarItemCaption('IssuePartTbI', context.localizeText('completed'));
                break;
            case 'Review':
                    context.setToolbarItemCaption('IssuePartTbI', context.localizeText('restart_workorder'));
                    break;
            case 'Rejected':
                context.setToolbarItemCaption('IssuePartTbI', context.localizeText('edit_review'));
                break;
            default:
                context.executeAction('/SAPAssetManager/Actions/WorkOrders/MobileStatus/WorkOrderMobileStatusFailureMessage.action');
                break;
        }
    }

    static workOrderStatusPopoverMenu(context) {
        context.dismissActivityIndicator();
        if (libMobile.isHeaderStatusChangeable(context)) {
            let mobileStatus = libMobile.getMobileStatus(context.binding);
            let woReceived = libCommon.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/ReceivedParameterName.global').getValue());
            let woHold = libCommon.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/HoldParameterName.global').getValue());
            var woStarted = libCommon.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/StartParameterName.global').getValue());
            let review = libCommon.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/ReviewParameterName.global').getValue());
            let rejected = libCommon.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/RejectedParameterName.global').getValue());

            //User may be clocked in to this WO locally regardless of what mobile status is set to
            //Status may have been changed by another user, so trap that here
            if (libClock.isBusinessObjectClockedIn(context)) {
                return context.executeAction('/SAPAssetManager/Actions/WorkOrders/MobileStatus/WorkOrderChangeStausStartPopover.action');
            } else {
                if (mobileStatus === woReceived || mobileStatus === woHold) {
                    //This order is not started. It is currently either on hold or received status.
                    let isAnyOtherWorkOrderStartedPromise = this.isAnyWorkOrderStarted(context);
                    return isAnyOtherWorkOrderStartedPromise.then(
                        isAnyOtherWorkOrderStarted => {
                            if (isAnyOtherWorkOrderStarted) {
                                if (libCommon.isCurrentReadLinkLocal(context.binding['@odata.readLink'])) {
                                    return Promise.resolve();
                                } else {
                                    var pageContext = libMobile.getPageContext(context, 'WorkOrderDetailsPage');
                                    return IsAssignOrUnAssignEnableWorkOrder(context).then(function(result) {
                                        if (result) {
                                            return context.executeAction('/SAPAssetManager/Actions/WorkOrders/MobileStatus/WorkOrderChangeStatusTransferPopover.action');
                                        }
                                        return libThis.transferWorkOrder(pageContext);
                                    });
                                }
                            } else if (mobileStatus === woReceived) {
                                if (libCommon.isCurrentReadLinkLocal(context.binding['@odata.readLink'])) {
                                    return this.startWorkOrder(context);
                                } else {
                                    return context.executeAction('/SAPAssetManager/Actions/WorkOrders/MobileStatus/WorkOrderChangeStausReceivePopover.action');
                                }
                            } else if (mobileStatus === woHold) {
                                if (libCommon.isCurrentReadLinkLocal(context.binding['@odata.readLink'])) {
                                    return this.startWorkOrder(context);
                                } else {
                                    return context.executeAction('/SAPAssetManager/Actions/WorkOrders/MobileStatus/WorkOrderChangeStausHoldPopover.action');
                                }
                            } else {
                                return Promise.resolve('');
                            }
                        }
                    );
                } else if (mobileStatus === woStarted) {
                    if (libClock.isCICOEnabled(context)) { //Handle clock in/out feature
                        if (context.binding.clockMobileUserGUID === libCommon.getUserGuid(context)) {
                            //This WO was started by current user, or user is clocked into this WO
                            return context.executeAction('/SAPAssetManager/Actions/WorkOrders/MobileStatus/WorkOrderChangeStausStartPopover.action');
                        } else {
                            //This WO was started by someone else, so clock current user in and adjust mobile status
                            return WorkOrderStartStatus(context);
                        }
                    } else {
                        return context.executeAction('/SAPAssetManager/Actions/WorkOrders/MobileStatus/WorkOrderChangeStausStartPopover.action');
                    }
                } else if (mobileStatus === review) {
                    context.dismissActivityIndicator();
                    return libSuper.isUserSupervisor(context).then(isSupervisor => {
                        if (isSupervisor) { //Supervisor can approve or reject the technician's work
                            return context.executeAction('/SAPAssetManager/Actions/Supervisor/MobileStatus/WorkOrderSupervisorReviewPopover.action');
                        }
                        //Tech user can restart a review status operation that has not yet been transmitted
                        if (libSuper.isSupervisorFeatureEnabled(context)) {
                            return context.executeAction('/SAPAssetManager/Actions/Supervisor/MobileStatus/WorkOrderTechnicianReviewPopover.action');
                        }
                        return false; //Feature is not enabled, so do nothing
                    });
                } else if (mobileStatus === rejected) {
                    context.dismissActivityIndicator();
                    return libSuper.isUserSupervisor(context).then(isSupervisor => {
                        if (isSupervisor) { //Supervisor can approve or reject the technician's work
                            return context.executeAction('/SAPAssetManager/Actions/Supervisor/MobileStatus/WorkOrderSupervisorRejectedPopover.action');
                        }
                        //Tech user can restart a rejected status operation to correct it
                        if (libSuper.isSupervisorFeatureEnabled(context)) {
                            let isAnyOtherWorkOrderStartedPromise = this.isAnyWorkOrderStarted(context);
                            return isAnyOtherWorkOrderStartedPromise.then(isAnyOtherWorkOrderStarted => {
                                if (isAnyOtherWorkOrderStarted) {
                                    if (libCommon.isCurrentReadLinkLocal(context.binding['@odata.readLink'])) {
                                        return true;
                                    } else {
                                        var pageContext = libMobile.getPageContext(context, 'WorkOrderDetailsPage');
                                        return this.transferWorkOrder(pageContext).then(function(result) {
                                            if (result) {
                                                this.setCaption(context.getPageProxy(), 'Transfer');
                                            }
                                            return true;
                                        });
                                    }
                                }
                                return context.executeAction('/SAPAssetManager/Actions/WorkOrders/MobileStatus/WorkOrderChangeStausReceivePopover.action');
                            });
                        }
                        return false; //Feature is not enabled, so do nothing
                    });
                }
            }
        }
        return Promise.resolve('');
    }

    static showWorkOrderTransferWarningMessage(context) {
        let message = context.localizeText('transfer_workorder');
        return libMobile.showWarningMessage(context, message);
    }

    static showWorkOrderCompleteWarningMessage(context, mobileStatus) {
        return libSuper.checkReviewRequired(context, context.binding).then(review => {
            if (review) {
                return libMobile.showWarningMessage(context, context.localizeText('review_workorder_warning_message'), context.localizeText('confirm_status_change'), context.localizeText('ok'),context.localizeText('cancel'));
            }
            let reviewStatus = libCommon.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/ReviewParameterName.global').getValue());
            let rejectedStatus = libCommon.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/RejectedParameterName.global').getValue());
            if (mobileStatus && (mobileStatus === reviewStatus || mobileStatus === rejectedStatus)) {
                return libMobile.showWarningMessage(context, context.localizeText('approve_workorder_warning_message'), context.localizeText('confirm_status_change'), context.localizeText('ok'),context.localizeText('cancel'));
            }
            return libMobile.showWarningMessage(context, context.localizeText('complete_workorder'));
        });
    }

    static showWorkOrderTimesheetMessage(context) {
        let message = context.localizeText('workorder_add_timesheet_message');
        let caption = context.localizeText('time_entry');
        return libMobile.showWarningMessage(context, message, caption);
    }

    static showWorkOrderConfirmationsMessage(context) {
        let message = context.localizeText('confirmations_add_time_message');
        let caption = context.localizeText('time_entry');
        return libMobile.showWarningMessage(context, message, caption);
    }

    static headerMobileStatus(context) {
        if (libMobile.isHeaderStatusChangeable(context)) {
            return libMobile.mobileStatus(context, context.binding);
        } else if (libMobile.isOperationStatusChangeable(context)) {
            return libOprMobile.operationRollUpMobileStatus(context, 'MyWorkOrderOperations');
        } else if (libMobile.isSubOperationStatusChangeable(context)) {
            return libOprMobile.operationRollUpMobileStatus(context, 'MyWorkOrderSubOperations');
        }
        return libMobile.mobileStatus(context, context.binding);
    }

    static isOrderComplete(context) {
        var pageContext = context;
        try {
            pageContext = context.evaluateTargetPathForAPI('#Page:' + workOrderDetailsPage);
        } catch (error) {
            /**Implementing our Logger class*/
            Logger.error(context.getGlobalDefinition('/SAPAssetManager/Globals/Logs/CategoryWorkOrders.global').getValue(), `isOrderComplete error: ${error}`);
        }
        return new Promise((resolve, reject) => {
            try {
                var woComplete = libCommon.getAppParam(pageContext, 'MOBILESTATUS', pageContext.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/CompleteParameterName.global').getValue());
                let entitySet = pageContext.binding['@odata.readLink'];
                if (pageContext.binding['@odata.type'] === '#sap_mobile.MyWorkOrderOperation') {
                    entitySet = pageContext.binding.WOHeader['@odata.readLink'];
                }
                 /**
                 * This read needs a  work order readLink to verify if the workorder has been completed or not.
                 */
                return context.read('/SAPAssetManager/Services/AssetManager.service', entitySet, [], '$expand=OrderMobileStatus_Nav').then(function(woHeader) {
                    if (woHeader) {
                        return  libMobile.mobileStatus(pageContext, woHeader.getItem(0)).then(status => {
                            if (status === woComplete) {
                                return resolve(true);
                            } else {
                                return resolve(false);
                            }
                        });
                    }
                    return resolve(false);
                });
            } catch (error) {
                return reject(false);
            }
        });
    }

    /**
     * Gets the mobile status of the work order.
     * @param {*} context Context.binding needs to be the work order object.
     */
    static getWorkOrderMobileStatus(context) {
        return libMobile.getMobileStatus(context.binding);
    }

    static getPartnerNumber(context) {
        var OrderId = libCommon.getTargetPathValue(context, '#Property:OrderId');
        var partnerFunction = PartnerFunction.getPersonnelPartnerFunction();
        var queryOptions = "$filter=(OrderId eq '" + OrderId + "' and PartnerFunction eq '" + partnerFunction + "')";
        return context.read('/SAPAssetManager/Services/AssetManager.service', 'MyWorkOrderPartners', [], queryOptions).then(results => {
            if (results && results.length > 0) {
                return results.getItem(0).Partner;
            }
            return '';
        });
    }

    /**
     * Checks to see if at least one work order has been started from all the work orders.
     * Returns a Promise whose value is true if at least one order is in started status and false otherwise.
     * Also, sets state variable 'isAnyWorkOrderStarted' on Page 'WorkOrderDetailsPage' with the same value.
     * @param {*} context MDKPage context
     */
    static isAnyWorkOrderStarted(context) {
        var isAnyWorkOrderStarted = libCommon.getStateVariable(context, 'isAnyWorkOrderStarted', 'WorkOrderDetailsPage');
        if (typeof isAnyWorkOrderStarted !== 'undefined') {
            return Promise.resolve(isAnyWorkOrderStarted);
        } else {
            var userGUID = libCommon.getUserGuid(context);
            let woStarted = libCommon.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/StartParameterName.global').getValue());
            let queryOption = "$expand=OrderMobileStatus_Nav&$filter=OrderMobileStatus_Nav/MobileStatus eq '" + woStarted + "'";
            queryOption += " and OrderMobileStatus_Nav/CreateUserGUID eq '" + userGUID + "'"; //Only find work orders that we started
            isAnyWorkOrderStarted = false;
            return context.read('/SAPAssetManager/Services/AssetManager.service', 'MyWorkOrderHeaders', [], queryOption).then(
                startedOrdersList => {
                    if (startedOrdersList) {
                        var total = startedOrdersList.length;
                        if (total > 0) {
                            isAnyWorkOrderStarted = true;
                        }
                    }
                    if (!isAnyWorkOrderStarted) {
                        return libClock.isUserClockedIn(context).then(clockedIn => { //Check if user is clocked in
                            if (clockedIn) {
                                isAnyWorkOrderStarted = true;
                            }
                            libCommon.setStateVariable(context, 'isAnyWorkOrderStarted', isAnyWorkOrderStarted, 'WorkOrderDetailsPage');
                            return isAnyWorkOrderStarted;
                        });
                    } else {
                        libCommon.setStateVariable(context, 'isAnyWorkOrderStarted', isAnyWorkOrderStarted, 'WorkOrderDetailsPage');
                        return isAnyWorkOrderStarted;
                    }
                },
                error => {
                    // Implementing our Logger class
                    Logger.error(context.getGlobalDefinition('/SAPAssetManager/Globals/Logs/CategoryWorkOrders.global').getValue(), error);
                    return context.executeAction('/SAPAssetManager/Actions/WorkOrders/MobileStatus/WorkOrderMobileStatusFailureMessage.action');
                });
        }
    }
}
