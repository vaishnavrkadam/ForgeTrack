const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const action = process.argv[2] || 'up';
const composeFile = path.resolve(__dirname, '../infra/docker/docker-compose.yml');

const candidates = [
  'C:\\Users\\Admin\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe',
  'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe',
  'docker'
];

let dockerBinary = 'docker';
for (const cand of candidates) {
  if (cand !== 'docker' && fs.existsSync(cand)) {
    dockerBinary = `"${cand}"`;
    break;
  }
}

const args = action === 'down'
  ? ['compose', '-f', `"${composeFile}"`, 'down']
  : ['compose', '-f', `"${composeFile}"`, 'up', '-d'];

const cmd = `${dockerBinary} ${args.join(' ')}`;
console.log(`Executing: ${cmd}`);

const child = spawn(cmd, { stdio: 'inherit', shell: true });
child.on('exit', (code) => {
  process.exit(code || 0);
});
