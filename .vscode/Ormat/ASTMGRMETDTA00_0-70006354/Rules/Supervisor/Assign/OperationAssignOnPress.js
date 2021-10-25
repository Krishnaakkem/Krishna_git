import libVal from '../../Common/Library/ValidationLibrary';

export default function OperationAssignOnPress(context) {
    try {
        let clientData = context.evaluateTargetPathForAPI('#Page:WorkOrderOperationDetailsPage').getClientData();
        if (!libVal.evalIsEmpty(clientData) && clientData.hasOwnProperty('IsUnAssign') && clientData.IsUnAssign) {
            return context.executeAction('/SAPAssetManager/Rules/Supervisor/UnAssign/OperationUnAssignChangeSet.js');
        } else if (!libVal.evalIsEmpty(clientData) && clientData.hasOwnProperty('IsAssign') && clientData.IsAssign) {
            return context.executeAction('/SAPAssetManager/Actions/Supervisor/Assign/OperationAssignPageRequiredFields.action');
        } else if (!libVal.evalIsEmpty(clientData) && clientData.hasOwnProperty('IsReAssign') && clientData.IsReAssign) {
            return context.executeAction('/SAPAssetManager/Actions/Supervisor/ReAssign/OperationReAssignPageRequiredFields.action');
        }
    } catch (error) {
        return context.executeAction('/SAPAssetManager/Actions/Supervisor/Assign/OperationAssignPageRequiredFields.action');
    }
}
