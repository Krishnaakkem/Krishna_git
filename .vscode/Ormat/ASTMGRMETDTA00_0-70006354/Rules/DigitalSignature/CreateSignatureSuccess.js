/**
* Describe this function...
* @param {IClientAPI} context
*/

import Logger from '../Log/Logger';
import libCommon from '../Common/Library/CommonLibrary';

export default function CreateSignatureSuccess(context) {
    var data = context.actionResults.result.data;
    let response = JSON.parse(data);
    libCommon.setStateVariable(context, 'TOTPReadLink',response['@odata.readLink']);
    libCommon.setStateVariable(context,'TOTPKeyURI', response.KeyURI);
    libCommon.setStateVariable(context, 'TOTPDeviceId', response.DeviceId);
    Logger.info(context.getGlobalDefinition('/SAPAssetManager/Globals/Logs/CategoryDigitalSignature/DigitalSignature.global').getValue(), 'DigitalSignatureProcessID = ' + data);
}
