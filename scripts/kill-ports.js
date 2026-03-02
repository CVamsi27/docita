#!/usr/bin/env node
const { execSync } = require('child_process');

const PORTS = [3000, 3001, 3002, 3003];

function killPorts() {

  let killed = 0;

  try {

    const cmd = `lsof -t -i:${PORTS.join(',')}`;
    try {
      const pids = execSync(cmd, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim().split('\n');
      
      if (pids.length > 0 && pids[0] !== '') {
        const uniquePids = [...new Set(pids)];

        execSync(`kill -9 ${uniquePids.join(' ')}`);

        killed = uniquePids.length;
      } else {

      }
    } catch (e) {

    }
  } catch (error) {

  }
}

if (require.main === module) {
  killPorts();
}

module.exports = killPorts;
