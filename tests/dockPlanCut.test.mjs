/** Run the authoring primitive fixture using the same Blender as the asset build. */
import {spawnSync} from 'node:child_process'
const result=spawnSync('blender',['-b','--factory-startup','--python-exit-code','1','--python','tests/dockPlanCut.py'],{stdio:'inherit'})
if(result.error)throw result.error
if(result.status!==0)process.exit(result.status??1)
