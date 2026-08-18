export function genereazaPagina() {
  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Recruter — Căutare Constructori</title>
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
    .istoric-item { background: white; padding: 12px; margin-bottom: 8px; border-radius: 4px; cursor: pointer; border-left: 3px solid #ccc; }
    .istoric-item:hover { background: #fafafa; }
    .istoric-item .titlu { font-weight: 500; font-size: 14px; }
    .istoric-item .descriere { font-size: 12px; color: #999; margin-top: 4px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }

    .btn-cautare { width: 100%; padding: 12px; margin-top: 12px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
    .btn-cautare:hover { background: #1976D2; }
    .btn-cautare:disabled { background: #ccc; cursor: not-allowed; }

    @media (max-width: 600px) {
      .search-panel { position: static; }
      .container { padding: 8px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="search-panel">
      <input type="text" id="intrebare" placeholder="Caut un installer de gaze în Buzău..." autocomplete="off">

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

      <div id="zona-cautare" class="zona-info" style="display: none;">
        <strong>🔍 Caut în:</strong>
        <div id="zona-levels"></div>
        <label style="margin-top: 8px;">
          <input type="checkbox" id="doar-locatia"> Numai locația specificată
        </label>
      </div>

      <button id="btn-cautare" class="btn-cautare">Caută</button>
    </div>

    <div id="rezultate" class="rezultate"></div>
    <div id="istoria" class="istoria"></div>
  </div>

  <script>
    // TEST 4: History readonly + checksums
    const savedAddresses = JSON.parse(localStorage.getItem('savedEmails') || '[]');

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

    async function loadRezultate(id) {
      try {
        const res = await fetch(\`/rezultate?q=\${id}\`);
        const firme = await res.json();

        const container = document.getElementById('rezultate');
        container.innerHTML = firme.map(f =>
          \`<div class="rezultat" readonly>
             <h4>\${escapeHtml(f.nume)}</h4>
             <p>\${escapeHtml(f.descriere)}</p>
             <p><small>\${escapeHtml(f.oras)}, \${escapeHtml(f.judet)} — Nivel: \${f.nivel_loc}</small></p>
           </div>\`
        ).join('');
      } catch (e) {
        console.error(e);
      }
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  </script>
</body>
</html>`;
}
