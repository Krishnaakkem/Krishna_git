import libCommon from '../../Common/Library/CommonLibrary';

export default function MobileStatusRejected(context) {
    return libCommon.getAppParam(context, 'MOBILESTATUS', context.getGlobalDefinition('/SAPAssetManager/Globals/MobileStatus/ParameterNames/RejectedParameterName.global').getValue());    
}
