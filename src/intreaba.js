export const SCHEMA = {
  type: 'object',
  properties: {
    tip: {
      type: 'string',
      enum: ['oameni', 'firme', 'neclar'],
      description: 'Tip de cautare: oameni sau firme'
    },
    clarificare: {
      type: 'object',
      properties: {
        nevoie: { type: 'boolean', description: 'True daca trebuie clarificare' },
        intrebare: { type: 'string', description: 'Intrebarea pentru utilizator' },
        optiuni: { type: 'array', items: { type: 'string' }, description: 'Optiuni de raspuns' }
      }
    },
    titlu: {
      type: 'string',
      description: '3-6 cuvinte scurt titlu al cautarii'
    }
  },
  required: ['tip']
};

export const PROMPT = \`Tu esti un motor de cautare pentru constructii in Romania.

Utilizatorul cauta ORICE legat de proiecte: cv-uri, forta de munca, servicii, utilaje, echipamente. De exemplu: "o echipa care sa execute lucrari de pavaj la Voineasa, Valcea".

Parseaza cererea si raspunde cu:
1. tip: "oameni" (cauta forta de munca/cv-uri), "firme" (cauta companii), "neclar" (imposibil sa intelegi)
2. clarificare: daca sunt termeni generici cum ar fi "installer" - intreaba "Ce fel de installer?". NU intreaba pentru cereri deja precise.
3. titlu: scurt (3-6 cuvinte)

Reguli:
- O nevoie adevarata de munca ramane 'firme' sau 'oameni' oricat de saraca ar fi scrisa.
- Mesajul de clarificare trebuie sa explice BENEFICIILE utilizatorului, nu limitarile sistemului.
- Daca textul e clar spam/caractere random, raspunde cu tip='neclar' si clarificare.intrebare explicand de ce.\`;

export function createPrompt(intrebare) {
  return \`\${PROMPT}\n\nCererea utilizatorului: "\${intrebare}"\`;
}
