export default function OperationsEntitySet(context) {

    let businessObject = context.binding;

    if (businessObject['@odata.type'] && businessObject['@odata.type'] === '#sap_mobile.MyWorkOrderHeader') {
		return context.binding['@odata.readLink'] + '/Operations';
	} else {
		return 'MyWorkOrderOperations';
	}
}
