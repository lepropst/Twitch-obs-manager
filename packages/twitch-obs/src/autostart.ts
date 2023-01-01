import os from 'os';
import fs from 'fs';
import util from 'util';
import * as proc from 'process';

const writeFile = util.promisify(fs.writeFile);

function getTimeNow() {
  const now = new Date();
  const options = {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return now.toLocaleDateString('en-US');
}

function getStamp() {
  const stamp: {
    time?: any;
    pid?: any;
    platform?: any;
    uptime?: any;
    memory?: any;
    hostname?: any;
  } = {};
  stamp.time = getTimeNow();
  stamp.pid = proc.pid ? proc.pid : 0;
  stamp.platform = proc.platform;
  stamp.uptime = proc.uptime();
  stamp.memory = proc.memoryUsage();
  stamp.hostname = os.hostname();
  // stamp.version = os.version()
  return JSON.stringify(stamp, null, '\t');
}

async function triggerRestart(file = process.env['RESTART_FILE']) {
  if (file) {
    return writeFile(file, getStamp());
  }
}

export { triggerRestart };
