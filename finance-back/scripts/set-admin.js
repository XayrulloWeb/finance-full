const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
    console.error('Usage: node scripts/set-admin.js <email> <password>');
    process.exit(1);
}

const ensureSettings = async (userId) => {
    await prisma.userSettings.upsert({
        where: { user_id: userId },
        update: {},
        create: { user_id: userId }
    });
};

const run = async () => {
    const existing = await prisma.user.findUnique({ where: { email } });
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    if (existing) {
        await prisma.user.update({
            where: { id: existing.id },
            data: {
                role: 'admin',
                status: 'active',
                password_hash: hash
            }
        });
        await ensureSettings(existing.id);
        console.log(`Updated admin: ${email}`);
        return;
    }

    const user = await prisma.user.create({
        data: {
            email,
            password_hash: hash,
            role: 'admin',
            status: 'active',
            settings: { create: {} }
        }
    });
    console.log(`Created admin: ${user.email}`);
};

run()
    .catch((error) => {
        console.error('Admin setup failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
