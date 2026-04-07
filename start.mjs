import { networkInterfaces } from 'os';
import { spawn } from 'child_process';
import qrcode from 'qrcode-terminal';

const nets = networkInterfaces();
let localIp = 'localhost';

for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4;
    if (net.family === familyV4Value && !net.internal && !name.toLowerCase().includes('veth') && !name.toLowerCase().includes('wsl')) {
      localIp = net.address;
      break;
    }
  }
}

const targetUrl = `http://${localIp}:5173`;

console.log('\n======================================================');
console.log('📱 Scan this QR code to operate from your mobile app:');
console.log(`   URL: ${targetUrl}`);
console.log('======================================================\n');
console.log('⚠️  Troubleshooting: If the QR code does not load on your phone:');
console.log('1. Ensure your phone is connected to the exact same Wi-Fi network.');
console.log('2. Ensure Windows Firewall is not blocking Node.js on port 5173.\n');

qrcode.generate(targetUrl, { small: true }, (qrcodeStr) => {
    console.log(qrcodeStr);
    console.log(`\n🚀 Starting "BridgeBox Voice"... (Browser will open automatically)\n`);
    spawn('npx', ['concurrently', '"vite --host --open"', '"node hot-reload-server.js"'], {
        stdio: 'inherit',
        shell: true
    });
});
