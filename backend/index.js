const auth = require('./auth');
const state = require('./state');
const server = require('./server');
const ws = require('./ws');

const PORT = parseInt(process.env.PORT, 10) || 3000;

async function main() {
  if (!auth.isConfigured()) {
    console.error('FLUXI_API_KEY environment variable is required (min 32 characters)');
    process.exit(1);
  }

  await state.read();

  const srv = server.start(PORT);

  function shutdown() {
    console.log('\nShutting down...');
    ws.stop();
    srv.close(() => process.exit(0));
  }

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
