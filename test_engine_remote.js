const http = require('http');
const data = JSON.stringify({
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  options: { searchMode: 'time', moveTimeMs: 500 }
});
console.log('Sending request...');
const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/engine/analyze',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
  timeout: 30000,
}, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => { console.log('Status:', res.statusCode); console.log('Body:', body); process.exit(0); });
});
req.on('timeout', () => { console.log('REQUEST TIMED OUT after 30s'); req.destroy(); process.exit(1); });
req.on('error', (e) => { console.log('ERROR:', e.message); process.exit(1); });
req.write(data);
req.end();
