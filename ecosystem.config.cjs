module.exports = {
  apps: [
    {
      name: "valorant-tracker-bot",

      script: "npm",
      args: "start",

      cwd: __dirname,

      autorestart: true,
      watch: false,

      restart_delay: 5000,
      max_restarts: 10,

      env: {
        NODE_ENV: "production",
      },

      time: true,
    },
  ],
};