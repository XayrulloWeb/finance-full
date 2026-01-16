const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('🔄 Connecting to Database...');
        await prisma.$connect();
        console.log('✅ Connection successful!');

        const userCount = await prisma.user.count();
        console.log(`📊 Users in DB: ${userCount}`);

        // Test a reliable query
        const settings = await prisma.userSettings.findFirst();
        console.log('⚙️ Settings check:', settings ? 'Found' : 'Not Found');

    } catch (e) {
        console.error('❌ DB Connection Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
