import libCommon from '../Common/Library/CommonLibrary';
import Constants from '../Common/Library/ConstantsLibrary';

export default function NoteUpdateNewTextString(pageClientAPI) {

    let updatedLocalNote = libCommon.getFieldValue(pageClientAPI, 'LongTextNote', '', null, true);
    let newTextString = updatedLocalNote.trim();

    if (!libCommon.getStateVariable(pageClientAPI, Constants.stripNoteNewTextKey)) {
        // Should not strip previous text
        let note = libCommon.getStateVariable(pageClientAPI, Constants.noteStateVariable);
        //SAP Note 3042530 - the check between note.NewTextString and newTextString is needed to eliminate duplicates notes in some instances 
        if (note && note.NewTextString && !(note.NewTextString === newTextString)) {
            newTextString = note.NewTextString + '\n\n' + newTextString;
            newTextString = newTextString.trim();
        }
    }

    return newTextString;
}
