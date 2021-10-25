import errorLibrary from '../Common/Library/ErrorLibrary';
import libVal from '../Common/Library/ValidationLibrary';

export default function SyncFailureNav(context) {
    if (!libVal.evalIsEmpty(errorLibrary.getErrorMessage(context))) {
        context.evaluateTargetPathForAPI('#Page:-Previous').getClientData().SlideOutMenu = true;
        return context.executeAction('/SAPAssetManager/Actions/SyncError/SyncErrorDetails.action');
    }

    return true;
}
