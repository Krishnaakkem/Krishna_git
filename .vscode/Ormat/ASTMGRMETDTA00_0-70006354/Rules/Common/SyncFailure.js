import errorLibrary from './Library/ErrorLibrary';
import Logger from '../Log/Logger';
import libVal from './Library/ValidationLibrary';
import isAndroid from './IsAndroid';

export default function SyncFailure(context) {
    if (!libVal.evalIsEmpty(errorLibrary.getError(context)) || !libVal.evalIsEmpty(context.Error)) {
        errorLibrary.saveError(context);
        Logger.error('SyncFailure', errorLibrary.getErrorMessage(context));
    }
    if (isAndroid(context)) {
        return context.localizeText('view_details');
    }
    return context.localizeText('tap_error_message');
}
