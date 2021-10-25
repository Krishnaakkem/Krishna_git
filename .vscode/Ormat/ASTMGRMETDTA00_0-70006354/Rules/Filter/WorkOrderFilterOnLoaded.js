import filterOnLoaded from '../Filter/FilterOnLoaded';
import libCom from '../Common/Library/CommonLibrary';

export default function WorkOrderFilterOnLoaded(context) {
    
    filterOnLoaded(context); //Run the default filter on loaded
    let filter = libCom.getStateVariable(context, 'SupervisorAssignmentFilter');
    if (filter) { //Default the assigbnment filter values
        let formCellContainer = context.getControl('FormCellContainer');
        let assignControl = formCellContainer.getControl('AssignmentFilter');
        assignControl.setValue(filter);
        libCom.removeStateVariable(context, 'SupervisorAssignmentFilter');
    }
}
