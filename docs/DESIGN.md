# Catan — Visual & UX Design Specification

## 1. Purpose

This document defines the visual identity, interaction model and UX direction for the Catan web game.

It should be read alongside `CLAUDE.md`.

- `CLAUDE.md` defines the technical architecture and constraints.
- `docs/DESIGN.md` defines the intended visual experience.
- `docs/design-reference-horizon-settlers.png` is the primary visual reference.

The reference image is a source of visual direction, not something to reproduce literally.

The goal is to achieve the same level of visual polish, composition and hierarchy while adapting the design to this project's actual Catan game, existing architecture and game mechanics.

---

# 2. Visual North Star

The game should feel like a **premium digital tabletop board game**.

The player should feel as though they are looking at a beautifully rendered physical Catan board sitting on a table.

The experience should feel:

- immersive
- tactile
- polished
- premium
- colourful
- readable
- responsive
- game-focused

It should NOT feel like:

- a SaaS dashboard
- an admin panel
- a generic Tailwind application
- a flat SVG prototype
- an overly futuristic HUD
- a neon gaming interface
- excessive glassmorphism
- an excessively minimal productivity application

The board is the hero.

---

# 3. Primary Visual Reference

See:

`docs/design-reference-horizon-settlers.png`

The reference establishes the intended:

- overall composition
- visual hierarchy
- camera perspective
- board prominence
- UI density
- panel treatment
- colour direction
- depth
- lighting
- game-piece presentation
- information hierarchy

Do not copy the exact artwork, branding, icons, text, player names or layout dimensions.

Instead, reproduce the underlying design principles.

---

# 4. Overall Composition

The game screen should be divided into four major visual regions:

1. Top navigation/status bar
2. Main tabletop/board area
3. Supporting side panels
4. Bottom player/action HUD

The central board should occupy the majority of the visual area.

The board should never feel like a small element surrounded by application UI.

---

# 5. Main Tabletop

The entire game viewport should feel like a tabletop environment.

The area surrounding the board should not simply be a flat CSS background.

It should visually communicate that the Catan board is sitting inside a larger environment.

The visual treatment should use:

- deep blue/teal tones
- subtle environmental texture
- subtle lighting
- restrained depth
- soft atmospheric variation
- board shadows

The exact implementation may use CSS, WebGL, textures, gradients or another appropriate approach.

The surrounding environment should remain visually secondary to the board.

---

# 6. Catan Board

The Catan board is the visual hero.

It should appear:

- large
- dimensional
- tactile
- elevated
- colourful
- physically grounded

The board should not look like a flat collection of SVG polygons.

Terrain should visually resemble physical game tiles.

The board should have:

- depth
- edge definition
- subtle shadows
- layered terrain
- clear separation between tiles
- physical-looking roads
- physical-looking settlements/cities
- physical-looking harbour pieces
- readable number tokens

The board should remain highly readable despite its visual richness.

---

# 7. Camera Perspective

The board should use a perspective similar to the primary visual reference.

The desired visual impression is:

> Looking down at a physical tabletop from a standing/seated elevated position.

It should NOT look like:

- a directly top-down board
- a flat orthographic map
- an RTS camera
- an FPS camera
- an extreme 60°+ downward camera
- a nearly edge-on view

## Target starting elevation

Begin around:

**45–50° downward elevation**

and tune visually.

This is a design target rather than a hardcoded requirement.

The board should show enough depth to make the 3D presentation obvious while still exposing the majority of the playable surface.

---

# 8. Camera Interaction

The player should be able to manipulate the board naturally.

## Pan

Click/touch drag should allow the player to move the tabletop.

The movement should feel like physically grabbing and moving the board.

## Zoom

Mouse wheel / trackpad gestures should zoom.

Zoom should be smooth and constrained.

## Horizontal rotation

The player should be able to gently orbit around the board horizontally.

This should reveal the dimensionality of the board.

The board should not spin excessively.

## Vertical rotation

Vertical orbit should be allowed only within a constrained range.

Prevent:

- directly top-down views
- extreme low angles
- edge-on views

## Camera limits

The camera should have sensible:

- minimum zoom
- maximum zoom
- horizontal orbit limits or damping
- vertical orbit limits
- pan boundaries

The player should always be able to recover the board.

---

# 9. Camera Feel

Camera movement should feel:

- smooth
- responsive
- deliberate
- physical
- predictable

Avoid:

- abrupt snapping
- excessive inertia
- FPS-style controls
- excessive acceleration
- uncontrolled spinning

The mental model should be:

**"I am manipulating a tabletop."**

not:

**"I am controlling a camera in a 3D game world."**

---

# 10. Board Rendering Technology

The existing board geometry and game logic are valuable and should not be discarded unnecessarily.

First determine whether the desired visual experience can be achieved by enhancing the existing SVG architecture.

If a genuine 3D tabletop experience requires Three.js / React Three Fiber, it is acceptable to introduce it.

However:

- do not rewrite game rules
- do not rewrite server state
- do not replace the board coordinate model unnecessarily
- do not duplicate game state
- do not introduce 3D purely for novelty

If using a 3D renderer, it should act as a presentation layer over the existing authoritative game state.

---

# 11. Terrain

Terrain should have strong visual identity.

Each terrain type should have:

- distinctive colour
- distinctive material/texture
- physical depth
- subtle lighting
- clear silhouette

The terrain should be more visually detailed than the surrounding UI.

The board should feel like the richest visual element on screen.

---

# 12. Roads

Roads should appear as physical pieces placed on the board.

They should have:

- thickness
- depth
- ownership colour
- subtle shadow
- clear orientation

Available road locations should have a restrained but obvious interaction state.

---

# 13. Settlements & Cities

Settlements and cities should appear as physical game pieces rather than flat icons.

They should have:

- dimensionality
- ownership colour
- clear silhouette
- subtle shadow
- visual distinction between settlement and city

They must remain readable at normal board zoom.

---

# 14. Number Tokens

Number tokens must remain highly legible.

The visual reference uses light physical-looking tokens with dark numerals and stronger emphasis for important numbers.

Use this principle.

Number tokens should:

- feel physically placed on tiles
- have subtle elevation
- remain readable
- provide visual emphasis for red/high-probability numbers

Do not allow terrain detail to interfere with the number.

---

# 15. Robber

The robber should appear as a physical piece on the board.

It should have:

- depth
- shadow
- strong silhouette
- clear placement on the relevant tile

When selecting a new robber location, valid hexes should become clearly interactive.

---

# 16. Harbours

Harbours should feel like part of the physical board rather than UI badges.

They should visually communicate:

- generic 3:1 trading
- specific 2:1 resource trading
- harbour location
- orientation toward the board/ocean

Use physical/dimensional presentation where practical.

---

# 17. Lighting & Depth

The board should use lighting to create depth.

Prefer:

- soft directional lighting
- ambient lighting
- subtle contact shadows
- board elevation
- piece shadows
- restrained highlights

Avoid:

- dramatic cinematic lighting that reduces readability
- glowing edges everywhere
- excessive bloom
- neon lighting

Lighting should support gameplay readability.

---

# 18. Top Bar

The top bar should be visually restrained.

It should communicate:

- game identity
- current player/turn
- round
- settings
- menu or secondary controls

It should not dominate the screen.

The reference demonstrates the desired principle:

**minimal navigation, maximum board visibility.**

---

# 19. Left Side Panel

The left panel should contain contextual gameplay/build information.

Examples include:

- available build actions
- costs
- development card purchase
- current requirements
- build availability

The panel should visually feel like a game HUD.

It should use:

- dark blue surfaces
- subtle transparency where appropriate
- thin borders
- modest corner rounding
- clear section headers
- strong iconography
- clear availability states

Avoid making it look like a generic web form.

---

# 20. Right Side Panel

The right panel should contain social/trading/game information.

Examples include:

- other players
- player status
- card counts where appropriate
- trade controls
- active trade opportunities

It should remain secondary to the board.

---

# 21. Bottom Player HUD

The player's own information should live prominently along the bottom of the game screen.

The bottom HUD should communicate:

- player identity
- player colour
- resource cards
- development cards
- dice/result information
- current primary action
- end-turn control

This area can be visually substantial because it represents the player's immediate game state.

The player's resources should feel like actual game cards/items rather than plain text counters.

---

# 22. Resource Cards

Resource cards should be visually rich.

Each resource should have:

- distinct artwork/iconography
- strong resource identity
- card-like presentation
- quantity
- subtle depth/shadow

Cards should feel tactile.

Do not represent the player's entire hand as a row of generic coloured boxes.

---

# 23. Primary Action

The most important available action should be visually obvious.

For example:

- End Turn
- Build
- Roll Dice
- Confirm Trade

Use a strong primary button treatment.

The primary action should be immediately discoverable without covering the board.

---

# 24. Player Colour System

Player colours should be consistent throughout the application.

Player colour should appear in:

- settlements
- cities
- roads
- player avatar/status
- relevant HUD elements
- ownership indicators

Do not use player colours inconsistently.

---

# 25. Information Hierarchy

The visual hierarchy should generally be:

### Level 1
Game board

### Level 2
Current action / player's own state

### Level 3
Other players / trading

### Level 4
Event log / secondary information

The board should always remain the strongest visual element.

---

# 26. UI Surface Treatment

UI panels should use a dark blue/navy visual language.

Prefer:

- deep navy surfaces
- subtle transparency
- restrained borders
- subtle shadows
- controlled corner radii
- clear separators

The UI should visually integrate with the blue tabletop environment.

Avoid:

- pure black everywhere
- white cards
- excessive blur
- excessive glassmorphism
- excessive rounded cards
- generic Tailwind dashboard styling

---

# 27. Colour

The overall environment should favour:

- deep navy
- ocean blue
- muted blue
- cool dark surfaces

The board itself should provide the majority of the brighter colours.

Terrain can therefore be:

- green
- tan
- yellow
- grey
- brown
- blue

The contrast between colourful board and restrained UI is intentional.

---

# 28. Typography

Typography should be:

- clean
- compact
- highly readable
- slightly game-oriented
- consistent

Use hierarchy rather than oversized text.

Avoid overly decorative fonts.

---

# 29. Icons

Icons should be:

- consistent
- recognisable
- compact
- visually aligned

Prefer meaningful icons over decorative icons.

Resource icons should be immediately recognisable.

---

# 30. Animation

Animations should reinforce physicality.

Good examples:

- a settlement appearing onto the board
- a road being placed
- a resource card moving slightly when gained
- subtle hover elevation
- a token reacting to interaction
- smooth camera movement

Avoid:

- constant particle effects
- unnecessary pulsing
- excessive glow
- long transitions
- animations that delay gameplay

---

# 31. Responsive Behaviour

Desktop is the primary experience.

At 1440px and 1920px widths, the board should dominate the screen.

At smaller widths:

- side panels may collapse
- secondary information may become drawers
- the bottom HUD may compress
- the board should retain priority

Do not simply shrink every UI component proportionally.

---

# 32. Performance

The game is real-time multiplayer.

Visual presentation must not compromise responsiveness.

Camera state is local presentation state.

It must NOT be part of the server-authoritative `GameState`.

Camera movement must not send network messages.

High-frequency camera updates must not cause the entire React application to rerender.

If using Three.js/React Three Fiber, keep high-frequency 3D state inside the rendering system where appropriate.

---

# 33. Architectural Constraints

All technical constraints in `CLAUDE.md` remain authoritative.

In particular:

- preserve server authority
- preserve existing game rules
- preserve multiplayer behaviour
- preserve board coordinate semantics
- preserve game action semantics
- preserve test selectors where possible

The visual redesign should not require rewriting the game engine.

---

# 34. Design Reference Rule

When making visual decisions, compare the implementation against:

`docs/design-reference-horizon-settlers.png`

Ask:

- Is the board large enough?
- Does the board dominate the screen?
- Is the perspective similar?
- Does the UI feel like a game HUD?
- Is the colour balance similar?
- Is the board significantly richer than the surrounding UI?
- Do the pieces feel physical?
- Is the UI restrained?
- Does the screen feel like a tabletop rather than a web dashboard?

Do not attempt pixel-perfect reproduction.

The reference establishes the **quality bar and design language**, not the exact implementation.

---

# 35. Definition of Done

A visual redesign is complete when the application feels like a polished commercial digital board game.

Opening a game should immediately communicate:

- a large physical-looking Catan board
- an elevated tabletop perspective
- rich terrain
- dimensional game pieces
- restrained dark-blue HUD
- clear player state
- clear current action
- polished interaction feedback

The result should feel cohesive and intentional.

The goal is not simply:

"make the existing UI prettier."

The goal is:

**transform the game from a web application containing a Catan board into a digital tabletop Catan game.**