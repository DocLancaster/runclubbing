/* Minimal State Layer (localStorage) */
const store = {
  read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};
const KEYS = {
  profiles: 'rc_profiles',
  certs: 'rc_certificates',
  orgDrafts: 'rc_org_drafts'
};

const rc = {
  uid: () => Math.random().toString(36).slice(2,10),
  getProfiles() { return store.read(KEYS.profiles, []); },
  saveProfiles(list) { store.write(KEYS.profiles, list); },
  getCerts() { return store.read(KEYS.certs, []); },
  saveCerts(list) { store.write(KEYS.certs, list); },
  getDrafts() { return store.read(KEYS.orgDrafts, []); },
  saveDrafts(list) { store.write(KEYS.orgDrafts, list); }
};

/* UI helpers */
const rcUI = {};

/* ---- Profile Page ---- */
(function initProfilePage(){
  const form = document.getElementById('profile-form');
  if (!form) return;

  const avatarInput = form.querySelector('input[name="avatar"]');
  const avatarPreview = document.getElementById('avatarPreview');
  const profilesList = document.getElementById('profilesList');
  const certForm = document.getElementById('cert-form');
  const certSelect = document.getElementById('certProfileSelect');

  // live avatar preview
  avatarInput.addEventListener('change', e => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => avatarPreview.src = ev.target.result;
    reader.readAsDataURL(f);
  });

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    const prof = {
      id: rc.uid(),
      name: fd.get('name').toString().trim(),
      city: fd.get('city')?.toString().trim() || '',
      avatar: avatarPreview.src || '',
      pbs: {
        k5: fd.get('pb5k') || '',
        k10: fd.get('pb10k') || '',
        hm: fd.get('pbhm') || '',
        m: fd.get('pbm') || ''
      },
      createdAt: Date.now()
    };
    const list = rc.getProfiles();
    list.push(prof);
    rc.saveProfiles(list);
    form.reset(); avatarPreview.src='';
    rcUI.renderProfiles();
    rcUI.fillCertSelect();
  });

  rcUI.renderProfiles = function() {
    const list = rc.getProfiles();
    profilesList.innerHTML = list.map(p=>`
      <a class="card" href="u.html?id=${p.id}">
        <div style="display:flex; gap:14px; align-items:center">
          <img src="${p.avatar || 'https://dummyimage.com/72x72/eeeeee/aaaaaa&text=👟'}" alt=""
               style="width:56px;height:56px;border-radius:50%;object-fit:cover;background:#eee">
          <div>
            <strong>${p.name}</strong>${p.city ? ` · <span class="muted">${p.city}</span>`:''}<br/>
            <span class="muted">Profil öffnen →</span>
          </div>
        </div>
      </a>
    `).join('') || '<p class="muted">Noch keine Profile.</p>';
  };

  rcUI.fillCertSelect = function(){
    const list = rc.getProfiles();
    certSelect.innerHTML = list.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  };

  certForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(certForm);
    const cert = {
      id: rc.uid(),
      profileId: fd.get('profileId'),
      distance: fd.get('distance'),
      time: fd.get('time'),
      race: (fd.get('race') || '').toString(),
      date: fd.get('date'),
      // Datei speichern wir im MVP nicht; nur Dateiname als Platzhalter:
      filename: fd.get('file')?.name || '',
      createdAt: Date.now()
    };
    const list = rc.getCerts(); list.push(cert); rc.saveCerts(list);
    certForm.reset();
    alert('Urkunde gespeichert (MVP). OCR kommt als Nächstes.');
  });

  // Initial render
  rcUI.renderProfiles();
  rcUI.fillCertSelect();
})();

/* ---- Stats Page ---- */
rcUI.renderStats = function(){
  const p = rc.getProfiles();
  const c = rc.getCerts();
  const races = new Set(c.map(x => (x.race||'').trim().toLowerCase()).filter(Boolean));
  const setText = (id, val)=>{ const el = document.getElementById(id); if (el) el.textContent = String(val); };
  setText('statProfiles', p.length);
  setText('statCertificates', c.length);
  setText('statRaces', races.size);
};

/* ---- Events Page ---- */
rcUI.initEventsPage = function(){
  const form = document.getElementById('org-form');
  const listEl = document.getElementById('orgDrafts');
  if (!form) return;

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    const draft = {
      id: rc.uid(),
      event: fd.get('event'), date: fd.get('date'),
      distance: fd.get('distance'),
      filter: fd.get('filter') || '',
      createdAt: Date.now()
    };
    const drafts = rc.getDrafts(); drafts.push(draft); rc.saveDrafts(drafts);
    form.reset(); render();
  });

  function render(){
    const drafts = rc.getDrafts();
    listEl.innerHTML = drafts.map(d => `
      <div class="row">
        <div><strong>${d.event}</strong> · ${d.distance} · <span class="muted">${d.date}</span><br>
        <span class="muted">${d.filter || 'kein Filter'}</span></div>
        <button class="btn" data-id="${d.id}">Löschen</button>
      </div>
    `).join('') || '<p class="muted">Noch keine Entwürfe.</p>';

    listEl.querySelectorAll('button[data-id]').forEach(b=>{
      b.addEventListener('click', ()=>{
        const id = b.getAttribute('data-id');
        const next = rc.getDrafts().filter(x=>x.id!==id);
        rc.saveDrafts(next); render();
      });
    });
  }

  render();
};

/* ---------- Helpers ---------- */
const fmt = {
  dateISO(d){ return new Date(d).toLocaleDateString('de-DE'); },
  timeToSec(t){ // "hh:mm:ss" -> Sekunden
    if(!t) return Infinity;
    const p = String(t).split(':').map(n=>parseInt(n,10));
    if(p.length===2) return p[0]*60 + p[1];
    if(p.length===3) return p[0]*3600 + p[1]*60 + p[2];
    return Infinity;
  }
};

/* Ergebnisse eines Profils */
rc.getCertsByProfile = function(profileId){
  return rc.getCerts().filter(c => c.profileId === profileId)
    .sort((a,b)=> (a.date>b.date?-1:1));
};

/* Bestzeiten aus Urkunden ableiten */
rc.computePBsFromCerts = function(certs){
  const best = { '5k': null, '10k': null, 'hm': null, 'm': null, 'other': null };
  for(const c of certs){
    const key = (c.distance||'other').toLowerCase();
    const sec = fmt.timeToSec(c.time);
    if(!best[key] || sec < fmt.timeToSec(best[key].time)) best[key] = c;
  }
  return {
    k5:    best['5k']?.time || '',
    k10:   best['10k']?.time || '',
    hm:    best['hm']?.time || '',
    m:     best['m']?.time || ''
  };
};

/* Link-Helfer (teilen/kopieren) */
rcUI.copyOrShare = async function(url){
  if (navigator.share) {
    try { await navigator.share({ url }); return; } catch{}
  }
  try { await navigator.clipboard.writeText(url); alert('Link kopiert'); }
  catch { prompt('Link kopieren:', url); }
};

/* CSV-Export */
rc.exportCSV = function(profile, certs){
  const rows = [
    ['Name','Stadt','Datum','Event','Distanz','Zeit','Datei'],
    ...certs.map(c=>[
      profile.name, profile.city||'',
      c.date, c.race||'', c.distance||'', c.time||'', c.filename||''
    ])
  ];
  const csv = rows.map(r => r.map(x=>{
    const s = String(x??'');
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  }).join(';')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `runclubbing_${profile.name.replace(/\s+/g,'_')}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
};

/* Profil-Detail Initialisierung */
rcUI.initProfileDetail = function(){
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const profile = rc.getProfiles().find(p => p.id === id);
  if(!id || !profile){
    document.getElementById('pHeader').innerHTML =
      '<p class="muted">Profil nicht gefunden. <a class="link" href="profile.html">Zurück zur Übersicht</a></p>';
    return;
  }
  const certs = rc.getCertsByProfile(id);
  const pbs = rc.computePBsFromCerts(certs);

  // Header
  const avatar = profile.avatar || 'https://dummyimage.com/96x96/eeeeee/aaaaaa&text=👟';
  const shareUrl = `${location.origin}${location.pathname.replace(/u\.html$/,'u.html')}?id=${id}`;
  document.getElementById('pHeader').innerHTML = `
    <div style="display:flex; gap:18px; align-items:center; justify-content:space-between; flex-wrap:wrap">
      <div style="display:flex; gap:14px; align-items:center">
        <img src="${avatar}" alt="" style="width:72px;height:72px;border-radius:50%;object-fit:cover;background:#eee">
        <div>
          <h1 style="margin:0">${profile.name}</h1>
          <div class="muted">${profile.city || ''}</div>
        </div>
      </div>
      <div style="display:flex; gap:10px">
        <button class="btn" id="btnShare">Link teilen</button>
        <button class="btn btn-dark" id="btnCSV">CSV export</button>
      </div>
    </div>
  `;
  document.getElementById('btnShare').addEventListener('click', ()=> rcUI.copyOrShare(shareUrl));
  document.getElementById('btnCSV').addEventListener('click', ()=> rc.exportCSV(profile, certs));

  // PBs
  const pbBox = (label,val)=>`
    <div><label class="muted">${label}</label>
      <div style="font-weight:800;font-size:1.1rem">${val||'–'}</div>
    </div>`;
  document.getElementById('pPBs').innerHTML = [
    pbBox('5 km', pbs.k5), pbBox('10 km', pbs.k10),
    pbBox('Halbmarathon', pbs.hm), pbBox('Marathon', pbs.m)
  ].join('');

  // Results table
  const tbody = document.querySelector('#pResults tbody');
  tbody.innerHTML = certs.map(c=>`
    <tr>
      <td>${c.date?fmt.dateISO(c.date):''}</td>
      <td>${c.race||''}</td>
      <td>${(c.distance||'').toUpperCase()}</td>
      <td>${c.time||''}</td>
      <td>${c.filename||''}</td>
    </tr>
  `).join('') || `<tr><td colspan="5" class="muted">Noch keine Urkunden hinterlegt.</td></tr>`;
};