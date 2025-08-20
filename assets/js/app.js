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
      <div class="card">
        <div style="display:flex; gap:14px; align-items:center">
          <img src="${p.avatar || 'https://dummyimage.com/72x72/eeeeee/aaaaaa&text=👟'}" alt="" style="width:56px;height:56px;border-radius:50%;object-fit:cover;background:#eee">
          <div>
            <strong>${p.name}</strong>${p.city ? ` · <span class="muted">${p.city}</span>`:''}<br/>
            <span class="muted">PB 5k: ${p.pbs.k5||'–'} · 10k: ${p.pbs.k10||'–'} · HM: ${p.pbs.hm||'–'} · M: ${p.pbs.m||'–'}</span>
          </div>
        </div>
      </div>
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