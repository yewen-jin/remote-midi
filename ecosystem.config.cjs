module.exports = {
  apps: [{
    name: 'midi-relay',
    script: './server/index.js',
    cwd: '/home/yewen/remote-midi',
    env: {
      PORT: 3500,
      HOST: '0.0.0.0',
      WS_PATH: '/midi',
      PING_INTERVAL_MS: 15000,
      PING_TIMEOUT_MS: 30000,
      MAX_ROOMS: 50,
      MAX_CLIENTS_PER_ROOM: 20,
    },
  }],
};
