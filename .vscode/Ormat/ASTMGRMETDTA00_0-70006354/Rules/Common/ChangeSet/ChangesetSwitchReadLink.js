import libCommon from '../Library/CommonLibrary';
import libNotif from '../../Notifications/NotificationLibrary';

export default function ChangesetSwitchReadLink(context) {
    if (context.binding && context.binding['@odata.type'] === '#sap_mobile.MyNotificationHeader' && !libNotif.getAddFromMapFlag(context)) {
        return context.binding['@odata.readLink'];
    } else if (libCommon.isOnChangeset(context))	{
        return 'pending_1';
    }
    return '';
}
