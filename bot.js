const config = require('config');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const PlannerBot = require('./src/PlannerBot.js');

const adapter = new FileSync('db.json');
const db = low(adapter);
db.defaults({ counts: [], ignoreList: [] }).write();

const bot = new PlannerBot();
bot.start();

const message = [
  'Use the following URL to let the bot join your server!',
  `https://discordapp.com/oauth2/authorize?client_id=${config.get('client_id')}&scope=bot`
].join('\n');

console.log(message);
