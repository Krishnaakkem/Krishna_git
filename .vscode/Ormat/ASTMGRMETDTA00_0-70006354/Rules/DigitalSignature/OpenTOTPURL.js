import libcomm from '../Common/Library/CommonLibrary';
export default function OpenTOTPURL(context) {
    return context.nativescript.utilsModule.openUrl(libcomm.getStateVariable(context, 'TOTPKeyURI'));
    //return context.nativescript.utilsModule.openUrl('otpauth://totp/SAP%3ANUNEZTREJO%40QKJ.910?secret=XLQPYR2JKQOVVH2CIIIH67QJYTSPBQCR&issuer=SAP&algorithm=SHA1&digits=6&period=30');
}
