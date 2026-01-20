#!/usr/bin/env node
const { execSync } = require('child_process');

const PORTS = [3000, 3001, 3002, 3003];

function killPorts() {
  console.log('🧹 Cleaning up ports:', PORTS.join(', '));
  let killed = 0;

  try {
    // Mac/Linux lsof approach
    const cmd = `lsof -t -i:${PORTS.join(',')}`;
    try {
      const pids = execSync(cmd, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim().split('\n');
      
      if (pids.length > 0 && pids[0] !== '') {
        const uniquePids = [...new Set(pids)];
        console.log(`Found processes on ports: ${uniquePids.join(', ')}`);
        execSync(`kill -9 ${uniquePids.join(' ')}`);
        console.log('✅ Killed processes.');
        killed = uniquePids.length;
      } else {
        console.log('✨ No lingering processes found on target ports.');
      }
    } catch (e) {
      // lsof returns exit 1 if no process found, which throws in execSync
      console.log('✨ No lingering processes found on target ports.');
    }
  } catch (error) {
    console.error('❌ Error killing ports:', error.message);
  }
}

if (require.main === module) {
  killPorts();
}

module.exports = killPorts;
