export default function FunctionalLocationQueryOptions(context) {
    let binding = context.getPageProxy().binding;
    if (binding && binding['@odata.type'] === '#sap_mobile.MyWorkOrderHeader') {
        return "$expand=WorkCenter_Main_Nav&$filter=(WorkOrderHeader/any( wo: wo/OrderId eq '{{#Property:OrderId}}' ) or WorkOrderOperation/WOHeader/any(wo: wo/OrderId eq '{{#Property:OrderId}}' ) or WorkOrderSubOperation/WorkOrderOperation/WOHeader/any( wo: wo/OrderId eq '{{#Property:OrderId}}'))&$expand=WorkOrderHeader";
    } 
    
    let searchString = context.searchString;
    if (searchString) {
        let qob = context.dataQueryBuilder();
        qob.expand('WorkCenter_Main_Nav').orderBy('FuncLocId');
        let filters = [
            `substringof('${searchString.toLowerCase()}', tolower(FuncLocDesc))`,
            `substringof('${searchString.toLowerCase()}', tolower(WorkCenter_Main_Nav/PlantId))`,
            `substringof('${searchString.toLowerCase()}', tolower(WorkCenter_Main_Nav/WorkCenterDescr))`,
            `substringof('${searchString.toLowerCase()}', tolower(FuncLocId))`,
            `substringof('${searchString.toLowerCase()}', tolower(WorkCenter_Main_Nav/WorkCenterName))`,
            `substringof('${searchString.toLowerCase()}', tolower(WorkCenter_Main_Nav/ExternalWorkCenterId))`,
        ];
        qob.filter(filters.join(' or '));
        return qob;
    } else {
        return '$expand=WorkCenter_Main_Nav';
    }
}
