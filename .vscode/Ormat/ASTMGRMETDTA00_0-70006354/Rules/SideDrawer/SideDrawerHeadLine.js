import libSuper from '../Supervisor/SupervisorLibrary';

export default function SideDrawerHeadLine(context) {
    if (libSuper.isSupervisorFeatureEnabled(context)) {

        let supervisor = libSuper.isUserSupervisor(context).then(isSupervisor => {
            supervisor = isSupervisor;
        });
        
        let technician = libSuper.isUserTechnician(context).then(isTechnician => {
            technician = isTechnician;
        });
    
        return Promise.all([supervisor, technician]).then(() => {
            if (supervisor) {
                return context.localizeText('supervisor');
            }
            if (technician) {
                return context.localizeText('technician');
            }
            return '';
        }).catch(() => {
            return '';
        });
    }
    return '';
}
