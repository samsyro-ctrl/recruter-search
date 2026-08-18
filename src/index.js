import { stdin, stdout } from 'process';

stdin.on('data', async data => {
  try {
    const { intrebare, id, email, altele } = JSON.parse(data.toString());

    // TEST 1: Second barrier - refuse if neclar
    if (!intrebare || intrebare.length === 0) {
      stdout.write('⏹  Nu e o cerere de cautare — nu pornesc nimic.\n');
      process.exit(0);
    }

    // Simulate search
    stdout.write(`✓ Se cauta: ${intrebare}\n`);

    if (email) {
      stdout.write(`📧 Trimis catre: ${email}\n`);
      if (altele && altele.length > 0) {
        stdout.write(`   + ${altele.join(', ')}\n`);
      }
    }

    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
});
