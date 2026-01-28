const fs = require('fs');
const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const cmd = 'curl -s http://localhost:8085/instance/connect/moveis-pro -H "apikey: moveis-pro-secret-key-2024" 2>&1';
  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = '';
    stream.on('data', d => out += d.toString());
    stream.stderr.on('data', d => out += d.toString());
    stream.on('close', () => {
      try {
        const data = JSON.parse(out);
        if (data.base64) {
          const base64Data = data.base64.replace(/^data:image\/png;base64,/, '');
          fs.writeFileSync('qrcode_whatsapp.png', Buffer.from(base64Data, 'base64'));
          console.log('QR Code saved to qrcode_whatsapp.png');
          console.log('Open the file and scan with WhatsApp!');
        } else {
          console.log('Response:', JSON.stringify(data, null, 2));
        }
      } catch (e) {
        console.log('Raw response:', out);
      }
      conn.end();
    });
  });
}).connect({ host: '145.223.31.180', port: 22, username: 'root', password: '238554A@a238554A@a' });
