import {useEffect,useMemo,useRef} from 'react'
import {useFrame} from '@react-three/fiber'
import * as THREE from 'three'
import {onInteract} from '../hooks/useInput.js'
import {useStore} from '../state/useStore.js'
import {voyage} from '../systems/navigation.js'
import {setDynamic} from '../systems/collision.js'
import {toThree} from '../systems/shipMeta.js'

/** Mast service lift: animated car + E interaction. No-op without metadata. */
export function FoodLiftSystem({meta}){
  const lift=meta?.interiors?.foodLift
  const rootRef=useRef(null)
  const cars=useRef([])
  const layout=useMemo(()=>(lift?{
    travel:lift.travel??(lift.top-lift.bottom),
    calls:(lift.calls??[]).map(p=>toThree(...p)),
  }:null),[meta])
  useEffect(()=>{
    if(!layout)return
    const find=()=>{
      if(!window.__ship||rootRef.current===window.__ship)return
      rootRef.current=window.__ship;cars.current=[]
      rootRef.current.updateMatrixWorld(true)
      const inverse=rootRef.current.matrixWorld.clone().invert()
      rootRef.current.traverse(o=>{
        if(o.isMesh&&o.userData?.sunny_food_lift){
          const matrix=new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld)
          const box=new THREE.Box3().setFromBufferAttribute(o.geometry.attributes.position).applyMatrix4(matrix)
          cars.current.push({o,p:o.position.toArray(),box})
        }
      })
    }
    const id=setInterval(find,500);find()
    return ()=>clearInterval(id)
  },[layout])
  useEffect(()=>{
    if(!layout)return
    const interact=onInteract(()=>{
      const s=useStore.getState()
      if(s.cameraMode!=='explore'||s.flying||voyage.helm)return
      const player=window.__sunny?.position??s.position
      const near=layout.calls.some(p=>Math.hypot(player[0]-p[0],player[2]-p[2])<1.6&&Math.abs(player[1]-p[1])<.8)
      if(near){
        voyage.foodLiftTarget=voyage.foodLiftTarget>0?0:1
        s.setHudMessage(voyage.foodLiftTarget>0?'Food lift: ascending to Kitchen (F2)':'Food lift: descending to Aquarium (F1)')
        return true
      }
    },10)
    return ()=>{interact();cars.current=[];setDynamic(null,'foodLift')}
  },[layout])
  useFrame(()=>{
    if(!layout||!cars.current.length)return
    const offset=voyage.foodLift*layout.travel
    const boxes=[]
    for(const c of cars.current){
      c.o.position.set(c.p[0],c.p[1]+offset,c.p[2])
      boxes.push({name:c.o.name,min:[c.box.min.x,c.box.min.y+offset,c.box.min.z],max:[c.box.max.x,c.box.max.y+offset,c.box.max.z],isFloor:false})
    }
    setDynamic(boxes,'foodLift')
  },-1)
  return null
}
