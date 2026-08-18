export function cuvantIntreg(text, nume) {
  const normalized = text.toLowerCase();
  const nimeNorm = nume.toLowerCase();

  if (normalized === nimeNorm) return true;

  const words = normalized.split(/\W+/);
  return words.includes(nimeNorm);
}

export function undeE(text, scara = 'judet') {
  const judete = ['Buzau', 'Vaslui', 'Neamt', 'Vrancea'];
  const orase = {
    'Buzau': ['Buzau', 'Onesti', 'Moinesti', 'Comanesti', 'Buhusi'],
    'Vaslui': ['Vaslui', 'Barlad'],
    'Neamt': ['Piatra Neamt', 'Roman'],
    'Vrancea': ['Focsani', 'Adjud']
  };

  for (const judet of judete) {
    if (cuvantIntreg(text, judet)) {
      return { nivel: 2, judet };
    }
  }

  for (const [judet, cities] of Object.entries(orase)) {
    for (const city of cities) {
      if (cuvantIntreg(text, city)) {
        return { nivel: 1, oras: city, judet };
      }
    }
  }

  return { nivel: 0, judet: null };
}

export function scaraDinText(text) {
  const loc = undeE(text);
  return loc;
}
