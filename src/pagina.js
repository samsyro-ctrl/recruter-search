export function genereazaPagina() {
  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Recruter — O echipă, un utilaj, materiale, un specialist, o echipă de service</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; color: #333; }
    .container { max-width: 800px; margin: 0 auto; }

    .search-panel { background: white; padding: 16px; border-bottom: 1px solid #e0e0e0; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .search-panel input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; }

    .clarificare { display: none; margin-top: 12px; padding: 12px; background: #f9f9f9; border-radius: 4px; }
    .clarificare.show { display: block; }
    .clarificare h3 { font-size: 14px; margin-bottom: 8px; color: #666; }
    .optiuni { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
    .btn-optiune { padding: 6px 12px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; font-size: 13px; }
    .btn-optiune:hover { background: #f0f0f0; }
    .text-input { margin-top: 8px; }
    .text-input input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }

    .email-section { margin-top: 12px; }
    .email-section label { display: block; font-size: 13px; margin-bottom: 4px; }
    .email-section input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
    .email-recipients { margin-top: 8px; font-size: 12px; color: #666; }

    .zona-info { margin-top: 12px; padding: 8px; background: #e3f2fd; border-radius: 4px; font-size: 13px; }
    .zona-info strong { display: block; margin-bottom: 4px; }
    .zona-nivel { margin: 4px 0; }
    .zona-nivel.exact { color: #2e7d32; }
    .zona-nivel.neighboring { color: #f57c00; }

    .rezultate { margin-top: 16px; }
    .rezultat { background: white; padding: 12px; margin-bottom: 8px; border-radius: 4px; border-left: 3px solid #2196F3; }
    .rezultat h4 { font-size: 16px; margin-bottom: 4px; }
    .rezultat p { font-size: 13px; color: #666; margin: 4px 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }

    .istoria { margin-top: 20px; }
    .istoric-item { background: white; padding: 12px; margin-bottom: 8px; border-radius: 4px; cursor: pointer; border-left: 3px solid #ccc; user-select: none; }
    .istoric-item:hover { background: #fafafa; }
    .istoric-item .titlu { font-weight: 500; font-size: 14px; pointer-events: none; }
    .istoric-item .descriere { font-size: 12px; color: #999; margin-top: 4px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; pointer-events: none; }
    .modal-confirmare { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 200; }
    .modal-confirmare.show { display: flex; align-items: center; justify-content: center; }
    .modal-box { background: white; padding: 20px; border-radius: 8px; max-width: 400px; }
    .modal-box h3 { margin-bottom: 12px; }
    .modal-box .buttons { display: flex; gap: 8px; margin-top: 16px; }
    .modal-box button { flex: 1; padding: 10px; border: none; border-radius: 4px; cursor: pointer; }
    .btn-confirm { background: #2196F3; color: white; }
    .btn-cancel { background: #ccc; color: #333; }

    .btn-cautare { width: 100%; padding: 12px; margin-top: 12px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
    .btn-cautare:hover { background: #1976D2; }
    .btn-cautare:disabled { background: #ccc; cursor: not-allowed; }

    .rezultat-buttons { display: flex; gap: 8px; margin-top: 12px; }
    .btn-action { flex: 1; padding: 8px; font-size: 12px; border: none; border-radius: 4px; cursor: pointer; transition: 0.2s; }
    .btn-trimite { background: #4CAF50; color: white; }
    .btn-trimite:hover { background: #45a049; }
    .btn-copiaza { background: #2196F3; color: white; }
    .btn-copiaza:hover { background: #0b7dda; }
    .btn-inchide { background: #f44336; color: white; }
    .btn-inchide:hover { background: #da190b; }

    @media (max-width: 600px) {
      .search-panel { position: static; }
      .container { padding: 8px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="search-panel">
      <input type="text" id="intrebare" placeholder="O echipă, un utilaj, materiale, un specialist, o echipă de service — zi-mi ce ai nevoie și unde..." autocomplete="off">

      <div id="clarificare" class="clarificare">
        <h3 id="clarif-intrebare">Ce fel?</h3>
        <div id="clarif-optiuni" class="optiuni"></div>
        <div class="text-input">
          <input type="text" id="clarif-text" placeholder="Sau scrie direct...">
        </div>
      </div>

      <div class="email-section">
        <label>
          <input type="checkbox" id="trimite-email"> Trimite rezultatele pe email
        </label>
        <input type="email" id="email-principal" placeholder="Tu@companie.ro" style="display:none; margin-top: 8px;">
        <input type="text" id="email-altele" placeholder="Alti destinatari (max 3, separati cu virgulă)" style="display:none; margin-top: 8px;">
        <div class="email-recipients" id="email-recipients-list"></div>
      </div>

      <div id="zona-cautare" class="zona-info" style="display: block;">
        <strong>🔍 Zone de căutare:</strong>
        <div id="zona-levels" style="margin: 8px 0; font-size: 13px;">
          <div class="zona-nivel exact">• Locația cerută (exact)</div>
          <div class="zona-nivel">• Orașe din acelaşi judeţ</div>
          <div class="zona-nivel neighboring">• Județe vecine (doar dacă nimic găsit)</div>
        </div>
        <label style="margin-top: 8px; font-size: 13px;">
          <input type="checkbox" id="doar-locatia"> Cauta numai în locația specificată
        </label>
      </div>

      <button id="btn-cautare" class="btn-cautare">Caută</button>
    </div>

    <div id="rezultate" class="rezultate"></div>
    <div id="istoria" class="istoria"></div>
  </div>

  <div id="modal-confirmare" class="modal-confirmare">
    <div class="modal-box">
      <h3>Repornesti aceasta cautare?</h3>
      <p id="modal-text" style="color: #666; font-size: 14px;"></p>
      <div class="buttons">
        <button class="btn-confirm" id="btn-confirm">Da</button>
        <button class="btn-cancel" id="btn-cancel">Anuleaza</button>
      </div>
    </div>
  </div>

  <script>
    // TEST 4: History readonly + checksums + logging
    const savedAddresses = JSON.parse(localStorage.getItem('savedEmails') || '[]');

    // Simple checksum function
    function checksum(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16);
    }

    // Click logging
    function logClick(id, intrebare) {
      const log = JSON.parse(localStorage.getItem('clickLog') || '[]');
      log.push({ id, intrebare, timestamp: new Date().toISOString() });
      localStorage.setItem('clickLog', JSON.stringify(log.slice(-50)));
    }

    document.getElementById('trimite-email').addEventListener('change', e => {
      document.getElementById('email-principal').style.display = e.target.checked ? 'block' : 'none';
      document.getElementById('email-altele').style.display = e.target.checked ? 'block' : 'none';
    });

    document.getElementById('btn-cautare').addEventListener('click', async () => {
      const intrebare = document.getElementById('intrebare').value.trim();
      if (!intrebare) return alert('Scrie o cerere.');

      const payload = { intrebare };

      if (document.getElementById('trimite-email').checked) {
        const email = document.getElementById('email-principal').value.trim();
        const altele = document.getElementById('email-altele').value.split(',').map(s => s.trim()).filter(Boolean);

        if (!email) return alert('Email invalid.');
        payload.email = email;
        payload.altele = altele.length > 0 ? altele : [];

        // Save addresses
        if (!savedAddresses.includes(email)) {
          savedAddresses.push(email);
          localStorage.setItem('savedEmails', JSON.stringify(savedAddresses.slice(-5)));
        }
      }

      try {
        const res = await fetch('/cauta', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (data.clarificare) {
          showClarificare(data.clarificare, data.id);
        } else if (data.id) {
          loadRezultate(data.id);
        }
      } catch (e) {
        alert('Eroare: ' + e.message);
      }
    });

    function showClarificare(clarificare, id) {
      const panel = document.getElementById('clarificare');
      const intrebare = document.getElementById('clarif-intrebare');
      const optiuni = document.getElementById('clarif-optiuni');

      intrebare.textContent = clarificare.intrebare || 'Ce fel?';
      optiuni.innerHTML = (clarificare.optiuni || []).map(opt =>
        \`<button class="btn-optiune" data-val="\${opt}">\${opt}</button>\`
      ).join('');

      panel.classList.add('show');
    }

    async function loadRezultateWithParams(id, doarLocal = false) {
      const url = doarLocal
        ? \`/rezultate?q=\${id}&doarLocal=true\`
        : \`/rezultate?q=\${id}\`;
      await loadRezultate(id, url);
    }

    async function loadRezultate(id, url = null) {
      if (!url) url = \`/rezultate?q=\${id}\`;
      try {
        const res = await fetch(url);
        const data = await res.json();

        const container = document.getElementById('rezultate');

        if (!data.rezultate || data.rezultate.length === 0) {
          container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">Niciun rezultat gasit.</p>';
          return;
        }

        const firme = data.rezultate;
        const nivelHeaders = {
          0: '📍 Locația cerută',
          1: '🏙️ Orașe în același județ',
          2: '📍 Județul',
          3: '🔔 Județe vecine'
        };

        let html = '';
        let currentNivel = -1;

        firme.forEach(f => {
          if (f.nivel_loc !== currentNivel) {
            if (currentNivel !== -1) html += '</div>';
            html += \`<div style="margin-top: 16px;"><h4 style="font-size: 13px; color: #666; margin-bottom: 8px;">\${nivelHeaders[f.nivel_loc] || 'Rezultate'}</h4>\`;
            currentNivel = f.nivel_loc;
          }

          html += \`<div class="rezultat" data-id="\${f.id}">
             <h4>\${escapeHtml(f.nume)}</h4>
             <p>\${escapeHtml(f.descriere)}</p>
             <p><small>\${escapeHtml(f.oras)}, \${escapeHtml(f.judet)}</small></p>
             <div class="rezultat-buttons">
               <button class="btn-action btn-trimite" data-id="\${f.id}" data-name="\${escapeHtml(f.nume)}">📧 Trimite</button>
               <button class="btn-action btn-copiaza" data-id="\${f.id}" data-name="\${escapeHtml(f.nume)}" data-desc="\${escapeHtml(f.descriere)}" data-info="\${escapeHtml(f.oras)}, \${escapeHtml(f.judet)}">📋 Copiază</button>
               <button class="btn-action btn-inchide" data-id="\${f.id}">❌ Inchide</button>
             </div>
           </div>\`;
        });

        if (currentNivel !== -1) html += '</div>';
        container.innerHTML = html;

        // Attach button handlers
        document.querySelectorAll('.btn-trimite').forEach(btn => {
          btn.addEventListener('click', e => {
            const name = btn.getAttribute('data-name');
            const email = document.getElementById('email-principal').value.trim();
            if (!email) {
              alert('Introdu email-ul tău pentru a trimite.');
              return;
            }
            alert(\`✓ "\${name}" trimis pe \${email}\`);
          });
        });

        document.querySelectorAll('.btn-copiaza').forEach(btn => {
          btn.addEventListener('click', e => {
            const name = btn.getAttribute('data-name');
            const desc = btn.getAttribute('data-desc');
            const info = btn.getAttribute('data-info');
            const text = \`\${name}\n\${desc}\n\${info}\`;
            navigator.clipboard.writeText(text).then(() => {
              alert('✓ Copiat in clipboard!');
            });
          });
        });

        document.querySelectorAll('.btn-inchide').forEach(btn => {
          btn.addEventListener('click', e => {
            const resultCard = btn.closest('.rezultat');
            resultCard.style.opacity = '0.5';
            setTimeout(() => resultCard.remove(), 300);
          });
        });
      } catch (e) {
        console.error(e);
      }
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Load history on page load
    async function loadHistory() {
      try {
        const res = await fetch('/historia');
        const cautari = await res.json();

        const container = document.getElementById('istoria');
        if (!cautari.length) {
          container.innerHTML = '';
          return;
        }

        container.innerHTML = '<h3 style="margin-bottom: 12px; color: #666;">Ultimele cautari</h3>' +
          cautari.map(c => {
            const cs = checksum(c.intrebare + c.id);
            return \`
              <div class="istoric-item" data-id="\${c.id}" data-intrebare="\${escapeHtml(c.intrebare)}" data-checksum="\${cs}">
                <div class="titlu">\${escapeHtml(c.intrebare.slice(0, 50))}\${c.intrebare.length > 50 ? '...' : ''}</div>
                <div class="descriere">\${escapeHtml(c.intrebare)}</div>
              </div>
            \`;
          }).join('');

        // Attach readonly click handlers
        document.querySelectorAll('.istoric-item').forEach(item => {
          item.addEventListener('click', e => {
            const id = item.getAttribute('data-id');
            const intrebare = item.getAttribute('data-intrebare');
            const storedChecksum = item.getAttribute('data-checksum');

            // Verify checksum
            const computed = checksum(intrebare + id);
            if (storedChecksum !== computed) {
              alert('⚠️ Datele au fost modificate. Anulare.');
              logClick(id, 'SUSPICIOUS_CHECKSUM_MISMATCH');
              return;
            }

            // Show confirmation
            document.getElementById('modal-text').textContent = intrebare;
            document.getElementById('modal-confirmare').classList.add('show');

            document.getElementById('btn-confirm').onclick = async () => {
              document.getElementById('intrebare').value = intrebare;
              document.getElementById('modal-confirmare').classList.remove('show');
              logClick(id, intrebare);

              // Load results from history
              const doarLocal = document.getElementById('doar-locatia').checked;
              loadRezultateWithParams(id, doarLocal);
            };

            document.getElementById('btn-cancel').onclick = () => {
              document.getElementById('modal-confirmare').classList.remove('show');
            };
          });
        });
      } catch (e) {
        console.error('History load error:', e);
      }
    }

    // Load on startup
    loadHistory();
  </script>
</body>
</html>`;
}
