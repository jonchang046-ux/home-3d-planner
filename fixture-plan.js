// Symbols use a normalized footprint; the plan scales these with real dimensions.
export function fixtureSymbol(f){
 const rect='<rect x="-.42" y="-.42" width=".84" height=".84" rx=".04"/>';
 const basin='<ellipse cx="0" cy="0" rx=".32" ry=".29"/><path d="M 0 -.38 V -.18"/>';
 const symbols={
  toilet:'<rect x="-.4" y="-.44" width=".8" height=".24" rx=".04"/><ellipse cx="0" cy=".13" rx=".3" ry=".3"/><ellipse cx="0" cy=".13" rx=".19" ry=".2"/>',
  basin, bathVanity:rect+basin, kitchenSink:rect+basin,
  modularWardrobe:rect+'<path d="M -.17 -.42 V .42 M .17 -.42 V .42 M -.42 .3 H .42"/>',
  countertop:rect+(f.kitchen?.sink?basin:'<path d="M -.42 .3 H .42 M 0 .3 V .42"/>'),
  hob:rect+'<circle cx="-.23" cy="0" r=".15"/><circle cx=".23" cy="0" r=".15"/>'+(f.kitchen?.burners===3?'<circle cx="0" cy="-.25" r=".1"/>':''),
  hood:rect+'<path d="M -.3 -.2 H .3 M -.3 0 H .3 M -.3 .2 H .3"/>',
  mirror:rect+'<path d="M -.3 .3 L .3 -.3"/>',
  shower:'<path d="M 0 .4 V -.25 M -.25 -.25 H .25 M -.2 -.12 V 0 M 0 -.12 V 0 M .2 -.12 V 0"/>',
  showerScreen:'<path d="M -.48 0 H .48"/>',wallCabinet:rect+'<path d="M 0 -.42 V .42"/>'
 };return symbols[f.type]??'';
}
