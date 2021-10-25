import errorLibrary from './Library/ErrorLibrary';
import libVal from './Library/ValidationLibrary';

export default function SyncFailureNav(context) {
    context.getPageProxy().getClientData().SlideOutMenu = false;
    if (!libVal.evalIsEmpty(errorLibrary.getErrorMessage(context))) {
        return context.executeAction('/SAPAssetManager/Actions/SyncError/SyncErrorDetails.action');
    }
    return context.executeAction('/SAPAssetManager/Actions/ErrorArchive/ErrorsArchive.action');
}
