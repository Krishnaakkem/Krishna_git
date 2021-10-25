import libCommon from '../Common/Library/CommonLibrary';
import GenerateNotificationID from './GenerateNotificationID';
import libNotif from './NotificationLibrary';

export default function ChangesetSwitchNotificationID(context) {
    if (context.binding && context.binding.NotificationNumber && !libNotif.getAddFromMapFlag(context) && !libNotif.getAddFromJobFlag(context)) {
        libCommon.setStateVariable(context, 'LocalId', context.binding.NotificationNumber);
        return context.binding.NotificationNumber;
    } else if (libCommon.isOnChangeset(context)) {
        return GenerateNotificationID(context);
    }
    return null;
}
