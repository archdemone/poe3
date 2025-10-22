# PoE-like Character Creation Notes (Mechanics & UX)

- Base classes emphasize attributes (Str/Dex/Int variants). Ascendancies are subclass choices tied to the base class and provide identity-defining bonuses.
- Flow pattern (observed from community docs/videos): choose class → choose ascendancy → preview/confirm. Keyboard navigation and confirmation prompts are common.
- UX motifs: dark stone/parchment look, grid tiles with hover tooltips, disabled states until pre-reqs chosen, focus-visible, high contrast.
- No proprietary assets (logos, fonts, art). Use system fonts or OFL fonts if needed.

Sources (mechanics/flow patterns):
- Path of Exile Wiki — Ascendancy overview: `https://www.poewiki.net/wiki/Ascendancy_class`
- Path of Exile Wiki — Character classes (attributes): `https://www.poewiki.net/wiki/Character_class`
- GDC/Interviews about class identity and ascendancies (design insights): `https://www.gdcvault.com/` (search: "Path of Exile design")
- Community guides and beginner overviews (mechanics recaps): `https://www.poewiki.net/` and reputable YT explainers (e.g., ZiggyD, Engineering Eternity)

Implementation notes (ours):
- Generic class names: Sentinel (Str), Huntress (Dex). Generic ascendancies: Warden, Champion, Pathfinder, Marksman.
- Data-driven JSON for classes and ascendancies; derived stats preview shows bonuses before confirm.
- HTML overlay preferred for a11y. Babylon scene provides ambience and avatar silhouette; art can be replaced later.

Keyboard-only & confirmation:
- Class/Ascendancy tiles are focusable; arrow keys/tabbing supported; Enter activates selection.
- Confirm button opens a modal asking “Create this character?” with Cancel/Yes.
