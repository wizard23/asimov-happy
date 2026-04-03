# Inline Help UX Glossary

Use these terms when referring to inline help window UI and behavior.

## Structure
- **Inline Help Root**: `#inline-help-root` — full-screen overlay container that hosts all help windows.
- **Window Container**: `.inline-help-window` — the draggable, resizable window.
- **Header / Drag Handle**: `.inline-help-header` — top bar used for dragging and window controls.
- **Title**: `.inline-help-title` — window title text.
- **Header Actions**: `.inline-help-actions` — group of control buttons.
- **Minimize Button**: button inside `.inline-help-actions` (label `_`).
- **Maximize Button**: button inside `.inline-help-actions` (label `[]`).
- **Close Button**: button inside `.inline-help-actions` (label `x`).
- **Body**: `.inline-help-body` — container for content area.
- **Content Scroll Area**: `.inline-help-content` — the scrollable markdown content.

## States
- **Active Window**: the window that most recently received focus (highest z-index).
- **Minimized**: window body hidden, header remains visible.
- **Maximized**: window fills the viewport.
- **Snapped**: window docked to a screen edge (left/right/top/bottom), arranged with other snapped windows on that edge.

## Behaviors
- **Drag**: moving a window by grabbing the header.
- **Snap**: docking a window by dragging to a screen edge or using shortcuts.
- **Stacking**: z-index ordering so the active window appears above others.
- **Persistence**: saved position, size, snap state, and scroll position restored on next open.
