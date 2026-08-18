const ALERTA_EMAIL = process.env.ALERTA_EMAIL || 'admin@example.com';
const MESAJE = {
  credit: 'E oprita dintr-un motiv care tine de noi. Reîncearcă mai târziu.',
  cheie: 'Configurație internă: cheie invalidă. Contactează admin.',
  aglomerat: 'Serviciul e ocupat. Reîncearcă în 30 secunde.',
  retea: 'Problemă de rețea. Reîncearcă.',
  altceva: 'Nu am putut procesa. Reîncearcă mai târziu.'
};

function felEroare(e) {
  const msg = e.message || '';
  if (msg.includes('credit') || msg.includes('balance')) return 'credit';
  if (msg.includes('invalid_api_key') || msg.includes('unauthorized')) return 'cheie';
  if (msg.includes('overloaded') || msg.includes('429')) return 'aglomerat';
  if (msg.includes('ERR_SOCKET') || msg.includes('ECONNREFUSED')) return 'retea';
  return 'altceva';
}

function eProblemaNoastra(e) {
  const fel = felEroare(e);
  return ['credit', 'cheie'].includes(fel);
}

const ALERTE_TRIMISE = new Map();

async function trimiteAlerta(fel, mesaj) {
  const key = `${fel}-${new Date().toDateString()}`;
  if (ALERTE_TRIMISE.has(key)) return; // Max 1 per day per type
  ALERTE_TRIMISE.set(key, true);

  console.error(`🚨 ALERTA: ${fel} — ${mesaj}`);
  // In production, trimite email la ALERTA_EMAIL
}

export async function cheama(client, cerere, unde) {
  try {
    if (unde === '/cauta') {
      const raspuns = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `Parseaza aceasta cerere de cautare: "${cerere.intrebare}"`
          }
        ]
      });
      return { tip: 'oameni', raspuns: raspuns.content[0].text };
    }

    return { tip: 'neclar' };
  } catch (e) {
    const fel = felEroare(e);
    if (eProblemaNoastra(e)) {
      await trimiteAlerta(fel, e.message);
    }
    throw {
      fel,
      mesajOmenesc: MESAJE[fel],
      original: e
    };
  }
}
