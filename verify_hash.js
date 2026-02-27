import bcrypt from 'bcryptjs';

const hash = '$2b$10$v9o0o9nVhHZJkvkyw43Zs.IqBhKeM9NWf2lA/b3GlInrevzdsU5kO';
const passwords = ['DEMO1234', 'demo1234'];

async function verify() {
  for (const password of passwords) {
    const match = await bcrypt.compare(password, hash);
    console.log(`Password: ${password}, Match: ${match}`);
  }
}

verify();
