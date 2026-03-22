import type { FlowshotConfig } from './types'

export function generateTemplate(
  config: FlowshotConfig,
  imageMap: Record<string, string>
): string {
  // Serialize config and imageMap into the HTML
  const configJSON = JSON.stringify(config)
  const imageMapJSON = JSON.stringify(imageMap)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flowshot Report</title>
  <style>
    :root {
      --bg: #f0f2f5; --text: #e6edf3; --text-secondary: #b1bac4;
      --text-muted: #7d8590; --text-faint: #484f58; --surface: #161b22;
      --border: #30363d; --accent: #58a6ff;
      --accent-glow: rgba(88,166,255,0.4); --sidebar-hover: #1c2128;
      --sidebar-active: #1a2332; --badge-bg: #21262d; --badge-text: #8b949e;
      --card-shadow: 0 2px 16px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06);
      --card-hover-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(88,166,255,0.4);
      --arrow-fill: #8b949e; --lightbox-bg: rgba(0,0,0,0.92);
      --img-error-bg: #21262d;
    }
    [data-theme="dark"] {
      --bg: #0d1117; --text: #e6edf3; --text-secondary: #b1bac4;
      --text-muted: #7d8590; --text-faint: #484f58; --surface: #161b22;
      --border: #30363d; --accent: #58a6ff;
      --accent-glow: rgba(88,166,255,0.4); --sidebar-hover: #1c2128;
      --sidebar-active: #1a2332; --badge-bg: #21262d; --badge-text: #8b949e;
      --card-shadow: 0 2px 16px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06);
      --card-hover-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(88,166,255,0.4);
      --arrow-fill: #8b949e; --lightbox-bg: rgba(0,0,0,0.92);
      --img-error-bg: #21262d;
    }
    [data-theme="light"] {
      --bg: #f0f2f5; --text: #1a1a2e; --text-secondary: #555;
      --text-muted: #888; --text-faint: #aaa; --surface: #fff;
      --border: #e0e0e0; --accent: #4a90d9;
      --accent-glow: rgba(74,144,217,0.4); --sidebar-hover: #f5f7fa;
      --sidebar-active: #eef4fb; --badge-bg: #e8ecf1; --badge-text: #666;
      --card-shadow: 0 2px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04);
      --card-hover-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(74,144,217,0.3);
      --arrow-fill: #1a1a2e; --lightbox-bg: rgba(0,0,0,0.85);
      --img-error-bg: #f0f0f0;
    }
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg); color: var(--text); min-height: 100vh;
      transition: background 0.3s, color 0.3s;
    }
    .topbar {
      position: sticky; top:0; z-index:100; background: var(--surface);
      border-bottom: 1px solid var(--border); padding: 12px 32px;
      display: flex; align-items: center; justify-content: space-between;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06); transition: background 0.3s;
    }
    .topbar h1 { font-size:18px; font-weight:700; }
    .topbar h1 span { color: var(--accent); }
    .controls { display:flex; gap:8px; align-items:center; }
    .toggle-btn {
      padding: 6px 16px; border: 2px solid var(--border); border-radius: 8px;
      background: var(--surface); font-size:13px; font-weight:600;
      cursor:pointer; transition: all 0.2s; color: var(--text-muted);
    }
    .toggle-btn.active { border-color: var(--accent); background: var(--accent); color:#fff; }
    .toggle-btn:hover:not(.active) { border-color: var(--accent); color: var(--accent); }
    .theme-btn {
      padding:6px 12px; border:2px solid var(--border); border-radius:8px;
      background: var(--surface); font-size:16px; cursor:pointer;
      transition: all 0.2s; line-height:1; margin-left:8px;
    }
    .theme-btn:hover { border-color: var(--accent); }
    .sep { color: var(--border); margin:0 4px; }
    .stats { font-size:13px; color: var(--text-muted); margin-left:16px; }

    .layout { display:flex; min-height: calc(100vh - 53px); }

    .sidebar {
      width:240px; background: var(--surface); border-right:1px solid var(--border);
      padding:20px 0; flex-shrink:0; overflow-y:auto; transition: background 0.3s;
    }
    .sidebar h3 {
      font-size:11px; text-transform:uppercase; letter-spacing:1px;
      color: var(--text-muted); padding:0 20px; margin-bottom:12px;
    }
    .flow-link {
      display:flex; align-items:center; justify-content:space-between;
      padding:10px 20px; cursor:pointer; transition: background 0.15s;
      border-left:3px solid transparent; text-decoration:none; color:inherit;
    }
    .flow-link:hover { background: var(--sidebar-hover); }
    .flow-link.active { background: var(--sidebar-active); border-left-color: var(--accent); }
    .flow-link .flow-name { font-size:14px; font-weight:500; }
    .flow-link .flow-count {
      font-size:12px; background: var(--badge-bg); color: var(--badge-text);
      padding:2px 8px; border-radius:10px; font-weight:600;
    }
    .flow-link.active .flow-count { background: var(--accent); color:#fff; }

    .main { flex:1; overflow-x:auto; overflow-y:auto; padding:32px; }

    .flow-section { margin-bottom:48px; }
    .flow-header { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
    .flow-header h2 { font-size:16px; font-weight:700; }
    .flow-badge {
      font-size:12px; background: var(--accent); color:#fff;
      padding:3px 10px; border-radius:12px; font-weight:600;
    }
    .flow-desc { font-size:13px; color: var(--text-muted); margin-left:auto; }

    .flow-row { display:flex; align-items:center; gap:0; overflow-x:auto; padding:20px 16px; }

    .screen-card {
      flex-shrink:0; display:flex; flex-direction:column; align-items:center; gap:10px;
    }
    .screen-frame {
      background: var(--surface); border-radius:16px; box-shadow: var(--card-shadow);
      padding:8px; transition: transform 0.2s, box-shadow 0.2s; cursor:pointer;
      position:relative;
    }
    .screen-frame:hover {
      transform: translateY(-4px); box-shadow: var(--card-hover-shadow);
    }
    .screen-frame img { border-radius:10px; display:block; }
    .screen-frame img.desktop { width:320px; height:auto; }
    .screen-frame img.mobile { width:180px; height:auto; }
    .screen-label {
      font-size:12px; font-weight:600; color: var(--text-secondary);
      text-align:center; max-width:200px;
    }
    .screen-path {
      font-size:11px; color: var(--text-faint);
      font-family: 'SF Mono', Monaco, monospace;
    }
    .screen-step {
      position:absolute; top:-12px; left:-12px; width:24px; height:24px;
      background: var(--accent); color:#fff; border-radius:50%;
      font-size:12px; font-weight:700; display:flex; align-items:center;
      justify-content:center; box-shadow: 0 2px 6px var(--accent-glow);
    }

    .arrow {
      flex-shrink:0; display:flex; align-items:center; justify-content:center;
      width:64px; padding:0 4px;
    }
    .arrow svg { width:56px; height:32px; }

    .component-row { display:flex; gap:32px; flex-wrap:wrap; padding:20px 0; }
    .component-card {
      flex-shrink:0; display:flex; flex-direction:column; align-items:center; gap:10px;
    }
    .component-frame {
      background: var(--surface); border-radius:12px; box-shadow: var(--card-shadow);
      padding:8px; cursor:pointer;
    }
    .component-frame img { border-radius:8px; display:block; max-width:500px; height:auto; }

    /* Diff mode */
    .screen-frame.has-diff { box-shadow: 0 0 0 3px #f85149, var(--card-shadow); }
    .screen-frame.no-diff { box-shadow: 0 0 0 3px #3fb950, var(--card-shadow); }
    .diff-badge {
      position:absolute; top:-8px; right:-8px; padding:2px 8px; border-radius:8px;
      font-size:10px; font-weight:700; text-transform:uppercase; z-index:2;
    }
    .diff-badge.changed { background:#f85149; color:#fff; }
    .diff-badge.ok { background:#3fb950; color:#fff; }

    .compare-container {
      position:relative; overflow:hidden; border-radius:10px;
      user-select:none; touch-action:none;
    }
    .compare-container img { display:block; pointer-events:none; }
    .compare-actual { position:absolute; top:0; left:0; overflow:hidden; }
    .compare-actual img { display:block; }
    .compare-slider {
      position:absolute; top:0; bottom:0; width:3px;
      background: var(--accent); cursor:ew-resize; z-index:3;
    }
    .compare-slider::after {
      content:''; position:absolute; top:50%; left:50%;
      transform:translate(-50%,-50%); width:28px; height:28px;
      background: var(--accent); border-radius:50%; border:2px solid #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .compare-slider::before {
      content:'\\25C0 \\25B6'; position:absolute; top:50%; left:50%;
      transform:translate(-50%,-50%); color:#fff; font-size:8px; z-index:4;
      white-space:nowrap; letter-spacing:2px;
    }
    .compare-labels {
      position:absolute; bottom:8px; left:0; right:0;
      display:flex; justify-content:space-between; padding:0 8px;
      z-index:2; pointer-events:none;
    }
    .compare-labels span {
      font-size:10px; font-weight:700; padding:2px 8px; border-radius:4px;
      text-transform:uppercase;
    }
    .compare-labels .lbl-expected { background:rgba(63,185,80,0.85); color:#fff; }
    .compare-labels .lbl-actual { background:rgba(248,81,73,0.85); color:#fff; }
    .fullscreen-btn {
      position:absolute; top:8px; right:8px; width:32px; height:32px;
      background:rgba(0,0,0,0.6); color:#fff; border:none; border-radius:6px;
      font-size:16px; cursor:pointer; z-index:5;
      display:flex; align-items:center; justify-content:center; transition:background 0.2s;
    }
    .fullscreen-btn:hover { background:var(--accent); }

    .diff-summary {
      background: var(--surface); border:1px solid var(--border);
      border-radius:10px; padding:12px 20px; margin-bottom:24px;
      display:flex; align-items:center; gap:20px; font-size:13px;
    }
    .diff-stat { display:flex; align-items:center; gap:6px; }
    .diff-stat-dot { width:10px; height:10px; border-radius:50%; }
    .diff-stat-dot.red { background:#f85149; }
    .diff-stat-dot.green { background:#3fb950; }

    /* Lightbox */
    .lightbox {
      display:none; position:fixed; inset:0; background: var(--lightbox-bg);
      z-index:1000; align-items:center; justify-content:center; cursor:zoom-out;
    }
    .lightbox.open { display:flex; }
    .lightbox img { max-width:90vw; max-height:90vh; border-radius:12px; }
    .lightbox-compare {
      position:relative; overflow:hidden; border-radius:12px;
      box-shadow:0 4px 32px rgba(0,0,0,0.4); user-select:none; touch-action:none; cursor:default;
    }
    .lightbox-compare img {
      display:block; max-height:85vh; width:auto; pointer-events:none;
      box-shadow:none; border-radius:0;
    }
    .lightbox-compare .compare-actual { position:absolute; top:0; left:0; overflow:hidden; }
    .lightbox-compare .compare-slider {
      position:absolute; top:0; bottom:0; width:3px;
      background:var(--accent); cursor:ew-resize; z-index:3;
    }
    .lightbox-compare .compare-slider::after {
      content:''; position:absolute; top:50%; left:50%;
      transform:translate(-50%,-50%); width:36px; height:36px;
      background:var(--accent); border-radius:50%; border:3px solid #fff;
      box-shadow:0 2px 12px rgba(0,0,0,0.4);
    }
    .lightbox-compare .compare-slider::before {
      content:'\\25C0 \\25B6'; position:absolute; top:50%; left:50%;
      transform:translate(-50%,-50%); color:#fff; font-size:10px; z-index:4;
      white-space:nowrap; letter-spacing:2px;
    }
    .lightbox-compare .compare-labels {
      position:absolute; bottom:12px; left:0; right:0;
      display:flex; justify-content:space-between; padding:0 16px;
      z-index:2; pointer-events:none;
    }
    .lightbox-compare .compare-labels span {
      font-size:13px; font-weight:700; padding:4px 12px; border-radius:6px;
      text-transform:uppercase;
    }
    .lightbox-label {
      position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
      color:#fff; font-size:14px; font-weight:600;
      background:rgba(0,0,0,0.6); padding:8px 20px; border-radius:8px;
    }
    .lightbox-controls {
      position:fixed; top:24px; left:50%; transform:translateX(-50%);
      display:flex; gap:8px; z-index:1001;
    }
    .lightbox-controls button {
      padding:6px 14px; border:2px solid rgba(255,255,255,0.3); border-radius:8px;
      background:rgba(0,0,0,0.6); color:#fff; font-size:12px; font-weight:600;
      cursor:pointer; transition: all 0.2s;
    }
    .lightbox-controls button.active { border-color: var(--accent); background: var(--accent); }

    .flow-section.hidden { display:none; }
    @media (max-width:768px) {
      .sidebar { display:none; } .main { padding:16px; }
      .screen-frame img.desktop { width:240px; }
      .screen-frame img.mobile { width:140px; }
    }
  </style>
</head>
<body>
  <div class="topbar">
    <h1><span>Flowshot</span> Report</h1>
    <div class="controls" id="view-controls"></div>
  </div>
  <div class="layout">
    <nav class="sidebar"><h3>Flows</h3><div id="sidebar-links"></div></nav>
    <div class="main" id="main"></div>
  </div>
  <div class="lightbox" id="lightbox" onclick="closeLightbox()">
    <div class="lightbox-controls" id="lightbox-controls" style="display:none" onclick="event.stopPropagation()"></div>
    <img id="lightbox-img" src="" alt="">
    <div class="lightbox-compare" id="lightbox-compare" style="display:none" onclick="event.stopPropagation()"></div>
    <div class="lightbox-label" id="lightbox-label"></div>
  </div>

  <script>
    const CONFIG = ${configJSON};
    const IMAGES = ${imageMapJSON};

    let currentView = CONFIG.views[0] || 'mobile';
    let activeFlow = null;
    let diffMode = false;

    function img(type, screen, view) {
      return IMAGES[type + ':' + screen + ':' + view] || '';
    }

    function hasDiff(screen, view) {
      return !!img('actual', screen, view);
    }

    function arrowSVG() {
      return '<svg viewBox="0 0 56 32" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M0 14h40l-1 0 0 0L32 8l2.5-2.5L46 16 34.5 26.5 32 24l7-6H0z" fill="var(--arrow-fill)"/></svg>';
    }

    function render() {
      // View controls
      var vc = '';
      CONFIG.views.forEach(function(v) {
        vc += '<button class="toggle-btn' + (v === currentView ? ' active' : '') +
          '" data-view="' + v + '" onclick="switchView(\\'' + v + '\\')">' +
          v.charAt(0).toUpperCase() + v.slice(1) + '</button>';
      });
      vc += '<span class="sep">|</span>';
      vc += '<button class="toggle-btn' + (diffMode ? ' active' : '') +
        '" id="diff-toggle" onclick="toggleDiffMode()">Diff</button>';
      vc += '<span class="stats" id="stats"></span>';
      vc += '<button class="theme-btn" id="theme-toggle" onclick="toggleTheme()"></button>';
      document.getElementById('view-controls').innerHTML = vc;
      applyTheme(getTheme());

      // Sidebar
      var sb = '<a class="flow-link' + (activeFlow === null ? ' active' : '') +
        '" onclick="filterFlow(null)"><span class="flow-name">All Flows</span>' +
        '<span class="flow-count">' + CONFIG.flows.length + '</span></a>';
      CONFIG.flows.forEach(function(f, fi) {
        var warn = diffMode && f.steps.some(function(s) { return hasDiff(s.screen, currentView); });
        sb += '<a class="flow-link' + (activeFlow === fi ? ' active' : '') +
          '" onclick="filterFlow(' + fi + ')"><span class="flow-name">' +
          (warn ? '\\u26A0 ' : '') + f.name + '</span>' +
          '<span class="flow-count">' + f.steps.length + '</span></a>';
      });
      document.getElementById('sidebar-links').innerHTML = sb;

      // Main
      var html = '';

      if (diffMode) {
        var changed = 0, total = 0, seen = {};
        CONFIG.flows.forEach(function(f) {
          f.steps.forEach(function(s) {
            var k = s.screen + ':' + currentView;
            if (!seen[k]) { seen[k] = true; total++; if (hasDiff(s.screen, currentView)) changed++; }
          });
        });
        html += '<div class="diff-summary"><strong>Diff Mode</strong>' +
          '<div class="diff-stat"><span class="diff-stat-dot red"></span> ' + changed + ' changed</div>' +
          '<div class="diff-stat"><span class="diff-stat-dot green"></span> ' + (total - changed) + ' unchanged</div>' +
          '<div style="margin-left:auto;color:var(--text-muted);font-size:12px">' +
          'Drag slider to compare expected vs actual</div></div>';
      }

      CONFIG.flows.forEach(function(flow, fi) {
        var hidden = activeFlow !== null && activeFlow !== fi ? ' hidden' : '';
        var desc = flow.steps.map(function(s) { return s.label; }).join(' \\u2192 ');
        html += '<div class="flow-section' + hidden + '" id="flow-' + fi + '">' +
          '<div class="flow-header"><h2>' + flow.name + '</h2>' +
          '<span class="flow-badge">' + flow.steps.length + ' screens</span>' +
          '<span class="flow-desc">' + desc + '</span></div><div class="flow-row">';

        flow.steps.forEach(function(step, si) {
          var src = img('expected', step.screen, currentView);
          var isDiff = diffMode && hasDiff(step.screen, currentView);
          var frameClass = diffMode ? (isDiff ? 'has-diff' : 'no-diff') : '';
          var w = currentView === 'mobile' ? 180 : 320;

          html += '<div class="screen-card"><div class="screen-frame ' + frameClass + '">';
          html += '<span class="screen-step">' + (si + 1) + '</span>';

          if (diffMode) {
            html += '<span class="diff-badge ' + (isDiff ? 'changed' : 'ok') + '">' +
              (isDiff ? 'CHANGED' : 'OK') + '</span>';
          }

          if (isDiff) {
            var actSrc = img('actual', step.screen, currentView);
            html += '<div class="compare-container" style="width:' + w + 'px">' +
              '<button class="fullscreen-btn" onclick="event.stopPropagation();openLightbox(\\'' + step.screen + '\\',\\'' + currentView + '\\',\\'' + step.label + '\\')" title="Fullscreen compare">&#x26F6;</button>' +
              '<img src="' + src + '" alt="Expected" class="' + currentView + '" style="width:' + w + 'px">' +
              '<div class="compare-actual" style="width:' + (w/2) + 'px">' +
              '<img src="' + actSrc + '" alt="Actual" class="' + currentView + '" style="width:' + w + 'px">' +
              '</div><div class="compare-slider" style="left:' + (w/2) + 'px"></div>' +
              '<div class="compare-labels"><span class="lbl-expected">Expected</span>' +
              '<span class="lbl-actual">Actual</span></div></div>';
          } else {
            html += '<img src="' + src + '" alt="' + step.label + '" class="' + currentView + '"' +
              ' onclick="openLightbox(\\'' + step.screen + '\\',\\'' + currentView + '\\',\\'' + step.label + '\\')"' +
              ' onerror="this.style.background=\\'var(--img-error-bg)\\';this.style.minHeight=\\'200px\\'">';
          }

          html += '</div><div class="screen-label">' + step.label + '</div>';
          if (step.path) html += '<div class="screen-path">' + step.path + '</div>';
          html += '</div>';

          if (si < flow.steps.length - 1) {
            html += '<div class="arrow">' + arrowSVG() + '</div>';
          }
        });

        html += '</div></div>';
      });

      // Components
      if (CONFIG.components && CONFIG.components.length && activeFlow === null) {
        html += '<div class="flow-section"><div class="flow-header"><h2>Shared Components</h2>' +
          '<span class="flow-badge">' + CONFIG.components.length + '</span></div>' +
          '<div class="component-row">';
        CONFIG.components.forEach(function(comp) {
          var src = img('expected', comp.screen, 'component');
          html += '<div class="component-card"><div class="component-frame"' +
            ' onclick="openLightbox(\\'' + comp.screen + '\\',\\'component\\',\\'' + comp.label + '\\')">' +
            '<img src="' + src + '" alt="' + comp.label + '"' +
            ' onerror="this.style.background=\\'var(--img-error-bg)\\';this.style.minHeight=\\'80px\\'">' +
            '</div><div class="screen-label">' + comp.label + '</div></div>';
        });
        html += '</div></div>';
      }

      document.getElementById('main').innerHTML = html;

      var unique = {};
      CONFIG.flows.forEach(function(f) { f.steps.forEach(function(s) { unique[s.screen] = true; }); });
      var extra = diffMode ? ' / diff mode' : '';
      document.getElementById('stats').textContent =
        CONFIG.flows.length + ' flows / ' + Object.keys(unique).length + ' screens / ' + currentView + extra;

      if (diffMode) initSliders();
    }

    function initSliders() {
      document.querySelectorAll('.compare-container').forEach(function(c) {
        var slider = c.querySelector('.compare-slider');
        var clip = c.querySelector('.compare-actual');
        var w = c.offsetWidth;
        var dragging = false;
        function update(x) {
          var r = c.getBoundingClientRect();
          var p = Math.max(0, Math.min(w, x - r.left));
          slider.style.left = p + 'px';
          clip.style.width = p + 'px';
        }
        slider.addEventListener('mousedown', function(e) { dragging = true; e.preventDefault(); });
        slider.addEventListener('touchstart', function(e) { dragging = true; e.preventDefault(); });
        document.addEventListener('mousemove', function(e) { if (dragging) update(e.clientX); });
        document.addEventListener('touchmove', function(e) { if (dragging) update(e.touches[0].clientX); });
        document.addEventListener('mouseup', function() { dragging = false; });
        document.addEventListener('touchend', function() { dragging = false; });
        c.addEventListener('click', function(e) { update(e.clientX); });
      });
    }

    function switchView(v) { currentView = v; render(); }
    function toggleDiffMode() { diffMode = !diffMode; render(); }
    function filterFlow(i) {
      activeFlow = i; render();
      if (i !== null) {
        var el = document.getElementById('flow-' + i);
        if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
      }
    }

    var lbMeta = {};
    function openLightbox(screen, view, label) {
      lbMeta = { screen: screen, view: view, label: label };
      var lb = document.getElementById('lightbox');
      var controls = document.getElementById('lightbox-controls');
      var lbImg = document.getElementById('lightbox-img');
      var lbCompare = document.getElementById('lightbox-compare');
      var isDiff = diffMode && hasDiff(screen, view);
      if (isDiff) {
        controls.style.display = 'flex';
        controls.innerHTML = ['compare','expected','actual','diff'].map(function(t) {
          return '<button onclick="lightboxView(\\'' + t + '\\')">' +
            t.charAt(0).toUpperCase() + t.slice(1) + '</button>';
        }).join('');
        lightboxView('compare');
      } else {
        controls.style.display = 'none';
        lbCompare.style.display = 'none';
        lbImg.style.display = '';
        lbImg.src = img('expected', screen, view);
        document.getElementById('lightbox-label').textContent = label + ' (' + view + ')';
      }
      lb.classList.add('open');
    }
    function lightboxView(type) {
      var lbImg = document.getElementById('lightbox-img');
      var lbCompare = document.getElementById('lightbox-compare');
      document.querySelectorAll('#lightbox-controls button').forEach(function(b) {
        b.classList.toggle('active', b.textContent.toLowerCase() === type);
      });
      if (type === 'compare') {
        lbImg.style.display = 'none';
        lbCompare.style.display = '';
        var expSrc = img('expected', lbMeta.screen, lbMeta.view);
        var actSrc = img('actual', lbMeta.screen, lbMeta.view);
        lbCompare.innerHTML = '<img src="' + expSrc + '" alt="Expected" id="lb-compare-base">' +
          '<div class="compare-actual" id="lb-compare-clip"><img src="' + actSrc + '" alt="Actual"></div>' +
          '<div class="compare-slider" id="lb-compare-slider"></div>' +
          '<div class="compare-labels"><span class="lbl-expected">Expected</span><span class="lbl-actual">Actual</span></div>';
        document.getElementById('lightbox-label').textContent = lbMeta.label + ' \\u2014 compare (' + lbMeta.view + ')';
        var baseImg = document.getElementById('lb-compare-base');
        baseImg.onload = function() {
          var w = baseImg.offsetWidth;
          var clip = document.getElementById('lb-compare-clip');
          var slider = document.getElementById('lb-compare-slider');
          clip.style.width = (w/2) + 'px';
          clip.querySelector('img').style.width = w + 'px';
          slider.style.left = (w/2) + 'px';
          initLightboxSlider();
        };
      } else {
        lbImg.style.display = '';
        lbCompare.style.display = 'none';
        lbImg.src = img(type, lbMeta.screen, lbMeta.view);
        document.getElementById('lightbox-label').textContent =
          lbMeta.label + ' \\u2014 ' + type + ' (' + lbMeta.view + ')';
      }
    }
    function initLightboxSlider() {
      var container = document.getElementById('lightbox-compare');
      var slider = document.getElementById('lb-compare-slider');
      var clip = document.getElementById('lb-compare-clip');
      if (!container || !slider || !clip) return;
      var baseImg = document.getElementById('lb-compare-base');
      var w = baseImg.offsetWidth;
      var dragging = false;
      function update(x) {
        var rect = container.getBoundingClientRect();
        var pos = Math.max(0, Math.min(w, x - rect.left));
        slider.style.left = pos + 'px';
        clip.style.width = pos + 'px';
      }
      slider.onmousedown = function(e) { dragging = true; e.preventDefault(); e.stopPropagation(); };
      slider.ontouchstart = function(e) { dragging = true; e.preventDefault(); e.stopPropagation(); };
      document.addEventListener('mousemove', function(e) { if (dragging) { update(e.clientX); e.stopPropagation(); } });
      document.addEventListener('touchmove', function(e) { if (dragging) { update(e.touches[0].clientX); e.stopPropagation(); } });
      document.addEventListener('mouseup', function() { dragging = false; });
      document.addEventListener('touchend', function() { dragging = false; });
      container.onclick = function(e) { update(e.clientX); e.stopPropagation(); };
    }
    function closeLightbox() {
      document.getElementById('lightbox').classList.remove('open');
      document.getElementById('lightbox-compare').innerHTML = '';
    }
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeLightbox(); });

    function getTheme() { return localStorage.getItem('flowshot-theme') || 'dark'; }
    function applyTheme(t) {
      document.documentElement.setAttribute('data-theme', t);
      var btn = document.getElementById('theme-toggle');
      if (btn) btn.textContent = t === 'dark' ? '\\u2600\\uFE0F' : '\\uD83C\\uDF19';
    }
    function toggleTheme() {
      var n = getTheme() === 'dark' ? 'light' : 'dark';
      localStorage.setItem('flowshot-theme', n); applyTheme(n);
    }

    applyTheme(getTheme());
    render();
  </script>
</body>
</html>`
}
