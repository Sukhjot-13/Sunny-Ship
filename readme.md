I am building a long-term personal interactive 3D version of the Thousand Sunny from One Piece.

The goal is NOT simply to display a 3D model in a model viewer. I want to gradually turn the Thousand Sunny into a detailed, realistic-looking, explorable and interactive 3D environment that I can continue improving over time.

The primary experience should run in a normal desktop web browser.

## CORE TECHNOLOGY

Use:

- Blender for editing and improving the actual 3D ship
- Three.js
- React Three Fiber
- @react-three/drei
- React
- appropriate physics/collision libraries when useful
- GLB/glTF as the preferred web asset format

Blender should act as the master 3D asset environment.

Three.js / React Three Fiber should act as the interactive browser experience.

The basic workflow should therefore be:

Existing Thousand Sunny model
→ Blender
→ clean/improve/separate/detail the model
→ create/improve materials and textures
→ export optimized GLB/glTF
→ load into React Three Fiber / Three.js
→ add walking, physics, interactions, environment and effects
→ continue improving the Blender master over time

Do NOT unnecessarily rebuild the entire ship from scratch if existing geometry can be improved.

The project should be developed progressively.

---

# OVERALL VISION

Eventually I want this to feel closer to a small interactive 3D world/game than a normal website.

I should eventually be able to:

- walk around the Thousand Sunny
- explore the deck
- enter interior rooms
- climb stairs
- potentially climb ladders/masts
- look around in first person
- inspect the entire ship from outside
- interact with objects
- open doors
- use the helm
- interact with cannons
- explore different areas of the ship
- experience the Sunny sailing on an ocean
- experience changing weather and lighting
- hear environmental and ship sounds
- see animations and moving ship components

The project can become increasingly detailed over time.

Do not try to build everything simultaneously.

---

# MODEL DEVELOPMENT STRATEGY

The existing model should serve as the foundation.

Use Blender to gradually improve it.

Do not destroy useful existing geometry simply because some areas are imperfect.

Instead, improve the ship component by component.

For example:

- improve the hull
- improve the lion figurehead
- improve railings
- improve stairs
- improve windows
- improve ropes and rigging
- improve masts
- improve sails
- improve the helm
- improve cannons
- improve doors
- improve deck objects
- add missing decorations
- add smaller details
- improve geometry where close-up viewing exposes weaknesses

If a particular existing component is poor, it can be replaced individually rather than rebuilding the entire ship.

Keep the Blender project organized with sensible object names and hierarchy.

For example:

Thousand_Sunny

- Exterior
  - Hull
  - Figurehead
  - Deck
  - Railings
  - Masts
  - Sails
  - Rigging
  - Helm
  - Cannons
  - Doors
  - Windows
  - Decorations
- Interior
  - Kitchen
  - Aquarium Bar
  - Bedrooms
  - Library
  - Workshop
  - Sick Bay
  - Storage
  - Corridors
  - Other Rooms
- Interactive Objects
- Collision Meshes
- LOD / Optimized Meshes

The exact hierarchy can evolve as necessary.

---

# REALISM / VISUAL IMPROVEMENT

A major long-term goal is to make the current model look considerably more realistic and polished.

Do not confuse realism with simply making everything extremely shiny or adding excessive effects.

Improve materials properly.

Eventually create good PBR materials using:

- Base Color
- Roughness
- Normal maps
- Metallic maps where appropriate
- Ambient occlusion where useful
- displacement/height selectively where useful

Important surfaces should eventually receive better materials.

Examples:

### Wood

Create convincing wood materials for:

- deck planks
- hull
- railings
- doors
- furniture
- other wooden structures

Wood should have appropriate:

- grain
- roughness variation
- subtle imperfections
- normal detail
- believable scale

### Sails

Improve sails with:

- cloth appearance
- subtle surface variation
- appropriate roughness
- thickness where necessary
- better shading
- later possibly wind movement

### Metal

Cannons, fittings, hinges and other metal pieces should have appropriate metallic properties and roughness rather than simply being gray.

### Glass

Windows should use convincing transparent/glass materials.

### Grass

The Sunny's grass areas should look like believable grass instead of a simple flat green surface.

### Painted surfaces

Paint should have subtle roughness and material variation rather than appearing like perfectly flat digital colors.

Do not unnecessarily make the ship dirty or heavily weathered.

The Thousand Sunny should still retain its recognizable bright One Piece appearance.

The goal is:

stylized Thousand Sunny design

- much more convincing materials, lighting and environmental realism.

  ***

# TEXTURE STRATEGY

Eventually replace weak/basic/missing materials with proper textures.

Textures should be high quality but sensible for web use.

Use texture resolution based on importance.

For example:

Hero / close-up objects:
2K–4K where justified

Medium objects:
1K–2K

Small objects:
512–1K

Do not use 8K textures everywhere.

Use compressed GPU-friendly textures such as KTX2/Basis where appropriate for the final web build.

Maintain higher-quality source textures separately when useful.

---

# INTERIORS

Eventually build the important Thousand Sunny interior areas.

These can be created gradually rather than all at once.

Potential areas include:

- Aquarium Bar
- kitchen
- dining areas
- men's quarters
- women's quarters
- library
- infirmary / sick bay
- Franky's workshop
- storage areas
- hallways
- bathrooms
- observation areas
- Soldier Dock System areas
- other canonical Sunny rooms

Try to stay visually faithful to the Thousand Sunny where references exist.

Where exact geometry is unavailable, build something consistent with the ship's established design rather than creating random modern interiors.

Interiors should eventually contain furniture, props, lighting and interactive elements.

---

# PLAYER EXPLORATION

The web experience should support first-person exploration.

Target controls:

- WASD = move
- Mouse = look
- Shift = run
- Space = jump
- E = interact
- Esc = release pointer
- V = switch between Explore and Inspect mode if appropriate

Movement should feel smooth and game-like.

The player should have:

- gravity
- collisions
- ground detection
- sensible walking speed
- running
- jumping
- stairs support
- prevention from walking through walls and major objects
- prevention from falling through floors/decks

Use simplified collision geometry where beneficial.

Do NOT automatically use every detailed visual polygon as a physics collider.

---

# CAMERA MODES

Eventually support at least two major camera modes.

## Explore Mode

First-person exploration from the player's perspective.

Used for walking around the ship and interiors.

## Inspect Mode

Orbit around the Thousand Sunny from outside.

Allow:

- rotation
- zoom
- pan where useful
- close inspection of the ship

Switching between modes should be smooth.

Potentially add cinematic camera modes later.

---

# OCEAN

Eventually create a convincing ocean environment.

Do not start with extremely expensive fluid simulation.

Use a performant real-time ocean approach suitable for WebGL/WebGPU/Three.js.

Eventually consider:

- animated waves
- reflections
- foam
- wake
- ship displacement
- rocking motion
- water interaction
- distant waves
- underwater color
- ocean spray

Visual quality should be balanced with browser performance.

---

# SHIP MOVEMENT

Eventually allow the Sunny itself to sail.

Possible features:

- helm interaction
- forward movement
- turning
- acceleration/deceleration
- sails reacting to wind
- rocking according to waves
- wake behind the ship
- ocean spray
- anchor interaction
- ship sounds

The player should ideally eventually be capable of walking around the Sunny while the ship is moving.

---

# INTERACTIVITY

Add interaction systems gradually.

Potential interactions include:

- opening/closing doors
- opening cabinets
- sitting
- interacting with the helm
- cannons
- anchors
- lights
- switches
- ladders
- telescopes
- storage
- furniture
- instruments
- kitchen equipment
- aquarium elements
- Soldier Dock System
- Coup de Burst
- other Sunny-specific mechanisms

Use a reusable interaction system rather than writing completely separate logic for every object.

For example:

InteractiveObject

- hover indication
- interaction prompt
- E key activation
- animation
- sound
- state

---

# ANIMATION

Eventually animate relevant ship elements.

Possible animations:

- sails moving
- ropes reacting subtly
- flags moving
- doors opening
- helm rotating
- cannons moving/firing
- anchor deploying
- ship rocking
- ocean motion
- mechanisms
- Coup de Burst
- Soldier Dock System
- environmental props

Where appropriate, animations should be authored in Blender and exported through glTF.

Other procedural/environmental animation can be handled directly in Three.js.

---

# LIGHTING

Lighting should become an important part of realism.

Eventually support:

- sunlight
- proper shadows
- ambient/environment lighting
- interior lights
- physically sensible exposure
- tone mapping
- sunset
- nighttime
- moonlight
- dynamic lights
- emissive lamps

Avoid simply adding excessive post-processing.

Lighting should support the materials rather than hide bad materials.

---

# DAY/NIGHT SYSTEM

Eventually implement a controllable or dynamic day/night cycle.

Potential states:

- morning
- midday
- golden hour
- sunset
- night
- moonlit night

The environment, sky, ocean, lights and ship materials should react appropriately.

---

# WEATHER

Weather can be added later.

Potential weather:

- clear
- cloudy
- fog
- rain
- heavy rain
- storms
- lightning
- stronger waves
- wind

Weather should affect the ocean and atmosphere where practical.

---

# AUDIO

Eventually add environmental audio.

Examples:

- ocean waves
- wind
- wood creaking
- sails
- footsteps
- doors
- cannons
- mechanisms
- rain
- thunder
- interior ambience

Use positional/spatial audio where beneficial.

---

# PERFORMANCE

Even though this is a personal project, it should still run well in a modern desktop browser.

Do not sacrifice visual quality unnecessarily, but optimize intelligently.

Potential techniques:

- GLB/glTF
- Meshopt compression
- Draco where useful
- KTX2/Basis texture compression
- LOD systems
- instancing
- frustum culling
- sensible draw-call management
- optimized shadows
- simplified collision meshes
- lazy loading
- section-based loading
- interior loading when necessary
- texture streaming/loading strategies
- baked lighting where appropriate

Do not aggressively destroy the master Blender model to make the web version smaller.

Maintain:

MASTER QUALITY ASSETS

separately from:

WEB OPTIMIZED ASSETS

---

# MODULAR LOADING

As the Sunny becomes more detailed, do not necessarily load everything immediately.

Potential architecture:

Initial load:

- exterior Sunny
- deck
- basic ocean
- player

Load later/on demand:

- kitchen
- bedrooms
- workshop
- aquarium
- detailed interior props
- special effects
- additional islands/environment

This will allow us to make the world much more detailed without requiring the browser to load everything at startup.

---

# CODE ARCHITECTURE

Do not build the entire project inside one huge React component.

Keep systems modular.

Possible structure:

- Ship
- Player
- Physics
- Collision
- InteractionSystem
- CameraSystem
- Ocean
- Environment
- Lighting
- Weather
- Audio
- InteriorLoader
- AnimationController
- UI

Each major system should be maintainable and extendable.

This is intended to become a long-term project.

---

# DEVELOPMENT PHILOSOPHY

Build this incrementally.

At every stage:

1. Make the feature work.
2. Make it reliable.
3. Improve the visual quality.
4. Optimize if necessary.
5. Move to the next feature.

Do not attempt to implement every possible feature at once.

The project should progressively evolve from:

3D Sunny model

→ walkable deck

→ polished deck

→ improved materials

→ realistic lighting

→ ocean environment

→ detailed exterior

→ interiors

→ interactions

→ ship systems

→ animations

→ sailing

→ weather/day-night

→ increasingly complete interactive Thousand Sunny world.

The long-term objective is to create my own highly detailed, enjoyable, continually improvable **interactive Thousand Sunny experience**, with Blender providing the editable master ship and Three.js / React Three Fiber providing the browser-based interactive world.
