import { db } from '../src/database/client.js';
import { hashPassword } from '../src/services/auth.service.js';

const email = process.env.SUPERADMIN_EMAIL?.toLowerCase();
const password = process.env.SUPERADMIN_PASSWORD;

if (!email || !password) {
  throw new Error('SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD are required');
}

if (password.length < 8) {
  throw new Error('SUPERADMIN_PASSWORD must be at least 8 characters');
}

try {
  let role = await db.role.findFirst({ where: { name: 'superadmin' } });
  if (!role) {
    role = await db.role.findFirst({ where: { name: 'admin' } });
  }
  if (!role) {
    role = await db.role.create({ data: { name: 'superadmin' } });
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    await db.user.update({
      where: { email },
      data: { passwordHash: await hashPassword(password), roleId: role.id, isActive: true }
    });
    console.log(`Updated superadmin account for ${email}`);
  } else {
    await db.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        roleId: role.id,
        isActive: true
      }
    });
    console.log(`Created superadmin account for ${email}`);
  }
} finally {
  await db.$disconnect();
}
