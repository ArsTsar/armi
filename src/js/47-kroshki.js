/* ── КРОШКИ ── */
function exCrumbsHTML(zone){
  const st = EXPL.st(zone);
  const cfg = EXPL_CFG[zone];
  const path = exPath(zone, st.cwd);
  let html = '<button class="crumb' + (!st.cwd ? ' cur' : '') + '" data-expl="goRoot">' + ic(cfg.icon) + esc(cfg.title) + '</button>';
  for(const f of path){
    html += '<span style="color:var(--t4)">›</span>' +
      '<button class="crumb' + (f.id === st.cwd ? ' cur' : '') + '" data-expl="treeGo" data-fid="' + f.id + '">' + esc(f.name) + '</button>';
  }
  return '<div class="expl-crumb">' + html + '</div>';
}

