/** Nodes whose local transforms or visibility are driven by the helm and Dock. */
export function isNavigationNode({name,userData:tags}){
 return !!(tags.sunny_dock_channel||tags.sunny_dock_shutter||tags.sunny_mane||tags.sunny_jaw||
  tags.sunny_paddle||tags.sunny_rudder||/Sunny_(?:Helm_(?:wheel|spoke|grip)|SoldierDock_|LogPose_needle)/.test(name))
}

export function isMovingShipNode(node){
 const tags=node.userData
 return !!(tags.sunny_door||tags.sunny_hatch||tags.sunny_food_lift||isNavigationNode(node))
}
