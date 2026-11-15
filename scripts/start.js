import { spawn } from 'child_process';

console.log('\x1b[36m%s\x1b[0m', '⚡ Starting AI Study Assistant (Vite frontend + Express AI proxy)...');

// Start Express proxy server (port 4000)
const server = spawn('node', ['api/server.js'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: '4000' }
});

// Start Vite dev server
const vite = spawn('npx', ['vite', '--port', '3000'], {
  stdio: 'inherit',
  shell: true
});

function cleanup() {
  console.log('\nShutting down servers...');
  server.kill();
  vite.kill();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
