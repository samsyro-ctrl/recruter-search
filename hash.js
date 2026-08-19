import bcrypt from 'bcrypt';

const passwords = {
  teodora: 'Teodora_123',
  bogdan: 'Bogdan_456',
  matyas: 'Matyas_789',
  cristian: 'Cristian_2024'
};

(async () => {
  for (const [user, pwd] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(pwd, 10);
    console.log(`${user}: ${hash}`);
  }
})();