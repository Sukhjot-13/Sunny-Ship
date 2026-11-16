/** Authoring geometry fixture through the project's installed Blender. */
import {spawnSync} from 'node:child_process'
const result=spawnSync('blender',['-b','--factory-startup','--python-exit-code','1','--python','tests/roundHatchFixture.py'],{stdio:'inherit'})
if(result.error)throw result.error
process.exitCode=result.status??1
