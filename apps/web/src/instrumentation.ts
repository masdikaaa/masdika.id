export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { prisma } = await import('./lib/prisma');
    try {
      await prisma.$connect();
      console.log('\n======================================================');
      console.log('✅ [System] Database is successfully connected!');
      console.log('======================================================\n');
    } catch (error) {
      console.error('\n======================================================');
      console.error('❌ [System] Failed to connect to Database!');
      console.error(error);
      console.error('======================================================\n');
    }
  }
}
