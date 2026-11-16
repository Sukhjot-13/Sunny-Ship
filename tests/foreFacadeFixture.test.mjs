/** Source R09 construction through the installed Blender runtime. */
import {spawnSync} from 'node:child_process'
const result=spawnSync('blender',['-b','--factory-startup','--python-exit-code','1','--python','tests/foreFacadeFixture.py'],{stdio:'inherit'})
if(result.error)throw result.error
process.exitCode=result.status??1
