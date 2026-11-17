// PM2 process file for Pure CRM.
//   pm2 start deploy/ecosystem.config.cjs && pm2 save
// MUST stay a single "fork" instance: the store is one in-memory snapshot
// persisted to Postgres — two instances would overwrite each other's writes.
module.exports = {
  apps: [
    {
      name: 'purecrm',
      cwd: '/var/www/purecrm',
      script: 'dist/server.cjs',
      exec_mode: 'fork',
      instances: 1,
      node_args: '--enable-source-maps',
      max_memory_restart: '600M',
      kill_timeout: 10000,          // lets the graceful shutdown flush the last write
      time: true,
      env: { NODE_ENV: 'production' }, // everything else comes from /var/www/purecrm/.env
    },
  ],
};
