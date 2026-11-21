/* ── ДЕРЕВО ── */
function exTreeHTML(zone, parentId, depth){
  const st = EXPL.st(zone);
  const kids = exChildren(zone, parentId);
  let html = '';
  /* корневая кнопка */
  if(depth === 0){
    html += '<button class="tnode' + (!st.cwd ? ' act' : '') + '" data-expl="goRoot">' +
      '<span class="tn-tw leaf">' + ic('chevR') + '</span>' + ic('grid') +
      '<span class="tn-lbl">Все ' + (EXPL_CFG[zone].rootLabel || 'файлы') + '</span>' +
      '<span class="tn-cnt">' + exItems(zone, null).length + '</span></button>';
  }
  for(const f of kids){
    const open = !!st.expanded[f.id];
    const hasKids = exChildren(zone, f.id).length > 0;
    html += '<button class="tnode' + (st.cwd === f.id ? ' act' : '') + (open ? ' open' : '') + '" ' +
      'data-expl="treeGo" data-fid="' + f.id + '" style="padding-left:' + (8 + depth * 14) + 'px">' +
      '<span class="tn-tw' + (hasKids ? '' : ' leaf') + '">' + ic('chevR') + '</span>' +
      '<span style="display:flex;align-items:center;gap:6px;min-width:0;flex:1"><span class="dot" style="background:' + (f.c || '#fbbf24') + '"></span>' +
      '<span class="tn-lbl">' + esc(f.name) + '</span></span>' +
      '<span class="tn-cnt">' + exCount(zone, f.id) + '</span>' +
      '<span class="tn-x" data-expl="folderMenu" data-fid="' + f.id + '" title="Меню папки">' + ic('pen') + '</span>' +
    '</button>';
    if(open) html += exTreeHTML(zone, f.id, depth + 1);
  }
  return html;
}

