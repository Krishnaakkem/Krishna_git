import { OperationConstants as Constants } from './WorkOrderOperationLibrary';
import CommonLibrary from '../../Common/Library/CommonLibrary';
import libSuper from '../../Supervisor/SupervisorLibrary';

export default function WorkOrderOperationsListViewQueryOption(context) {
    let searchString = context.searchString;
    let clockedInString = context.localizeText('clocked_in').substring('Clocked In');
    let lowercaseClockedInString = context.localizeText('clocked_in_lowercase').substring('clocked in');

    if ((searchString) && (searchString === clockedInString) || (searchString === lowercaseClockedInString)) {
        let queryBuilder = context.dataQueryBuilder();
        return context.read('/SAPAssetManager/Services/AssetManager.service', 'UserTimeEntries', ['PreferenceGroup','OrderId','OperationNo','WOHeader_Nav/ObjectKey','WOOperation_Nav/ObjectKey'], '$orderby=PreferenceValue desc&$top=1&$expand=WOHeader_Nav,WOOperation_Nav').then(function(results) {
            if (results && results.length > 0) {
                let row = results.getItem(0);
                if (row.PreferenceGroup === 'CLOCK_IN') {
                    queryBuilder.expand('UserTimeEntry_Nav');
                    queryBuilder.filter(`OrderId eq '${row.OrderId}'`);
                    return queryBuilder;
                }
                return queryBuilder(''); 
            }
            return queryBuilder(''); 
        }).catch(() => {
            return queryBuilder(''); //Read failure so return a blank string
        });
    }
    let filter = '';
    let filters = [];
    let queryBuilder;
    if (searchString) {
        //Standard operation filters (required when using a dataQueryBuilder)
        filters.push(`substringof('${searchString.toLowerCase()}', tolower(OrderId))`);
        filters.push(`substringof('${searchString.toLowerCase()}', tolower(OperationNo))`);
        filters.push(`substringof('${searchString.toLowerCase()}', tolower(OperationShortText))`);
        if (libSuper.isSupervisorFeatureEnabled(context)) {
            //Supervisor assigned to filters
            filters.push(`substringof('${searchString.toLowerCase()}', tolower(Employee_Nav/LastName))`);
            filters.push(`substringof('${searchString.toLowerCase()}', tolower(Employee_Nav/FirstName))`);
        }
        filter = '(' + filters.join(' or ') + ')';
    }
    if ((CommonLibrary.isDefined(context.binding)) && CommonLibrary.isDefined(context.binding.isOperationsList)) {
        queryBuilder = Constants.FromWOrkOrderOperationListQueryOptions(context);
        if (filter) {
            queryBuilder.filter(filter);
        }
        return queryBuilder;
    } else if ((libSuper.isSupervisorFeatureEnabled(context)) && CommonLibrary.isDefined(context.binding.isSupervisorOperationsList)) {
        queryBuilder = libSuper.getFilterForOperationPendingReview(context);
        if (filter) {
            queryBuilder.filter().and(filter);
        }
        return queryBuilder;
    } else if ((libSuper.isSupervisorFeatureEnabled(context)) && CommonLibrary.isDefined(context.binding.isTechnicianOperationsList)) {
        queryBuilder = libSuper.getFilterForSubmittedOperation(context);
        if (filter) {
            queryBuilder.filter().and(filter);
        }
        return queryBuilder;
    } else {
        return Constants.OperationListQueryOptions(context);
    }
}

