import libCom from '../Common/Library/CommonLibrary';

export default function WorkOrderListFilterResults(context) {
    
    let result1 = context.evaluateTargetPath('#Page:WorkOrderFilterPage/#Control:SortFilter/#Value');
    let result2 = context.evaluateTargetPath('#Page:WorkOrderFilterPage/#Control:MobileStatusFilter/#Value');
    let result3 = context.evaluateTargetPath('#Page:WorkOrderFilterPage/#Control:PriorityFilter/#Value');
    let result4 = context.evaluateTargetPath('#Page:WorkOrderFilterPage/#Control:FavoriteFilter/#Value');
    let result5 = context.evaluateTargetPath('#Page:WorkOrderFilterPage/#Control:MyWorkordersFilter/#Value');
    let result6 = context.evaluateTargetPath('#Page:WorkOrderFilterPage/#Control:TypeFilter/#FilterValue');
    let assignments = context.evaluateTargetPath('#Page:WorkOrderFilterPage/#Control:AssignmentFilter/#Value');

    let filterResults = [result1, result2, result3, result4, result5, result6];
    
    if (assignments.length > 0) { //Assignee rows for supervisor selected
        libCom.setStateVariable(context, 'SupervisorAssignmentFilter', assignments); //Save for defaulting on filter page when opened
        let lines = [];
        let selected = [];
        let unassigned = '';
        let filter;

        for (let i = 0; i < assignments.length; i++) {
            let row = assignments[i];
            let target = row.ReturnValue;
            if (target === '00000000') { //Unassigned
                unassigned = "not sap.entityexists(WOPartners) or WOPartners/all(w: w/PartnerFunction ne 'VW')";
            } else {
                //lines.push("WOPartners/Employee_Nav/any(t: t/PersonnelNumber eq '" + target + "')");
                lines.push("wp/PersonnelNum eq '" + target + "'");
            }
            selected.push(target);
        }
        libCom.setStateVariable(context, 'SupervisorAssignmentFilter', selected); //Save for defaulting on filter page when opened
        let line2 = "WOPartners/any(wp : wp/PartnerFunction eq 'VW' and (";
        //Build the array of people into a single filter statement
        if (lines.length > 0) { //At least 1 person
            filter = [line2 + lines.join(' or ') + '))'];
            if (unassigned) {
                filter = ['(' + unassigned + ') or (' + filter[0] + ')']; //Handle unassigned and assigned at same time
            }
        } else { //Only unassigned
            filter = [unassigned];
        }
        let filterResult = context.createFilterCriteria(context.filterTypeEnum.Filter, undefined, undefined, filter, true);
        filterResults.push(filterResult);
    }
    return filterResults;
}
