const config = require('config');
const Discord = require('discord.js');
const Util = require('./Util.js');

class PlannerBot extends Discord.Client {
  constructor() {
    super();

    this.prefix = config.get('prefix');
    this.queue = [];
    this._addEventListeners();
  }

  _addEventListeners() {
    this.on('ready', this._readyListener);
    this.on('message', this._messageListener);
  }

  _readyListener() {
    const avatar = Util.avatarExists() ? './config/avatar.png' : null;
    this.user.setAvatar(avatar);
  }

  _messageListener(message) {
    if (message.channel instanceof Discord.DMChannel) return; // Abort when DM
    if (!message.content.startsWith(this.prefix)) return; // Abort when not prefix
    if (Util.userIgnored(message.author.id)) return;

    message.content = message.content.substring(this.prefix.length);
    this.handle(message);
  }

  start() {
    this.login(config.get('token'));
  }

  handle(message) {
    const [command, ...input] = message.content.split(' ');
    switch (command) {
      case 'commands':
        // Will respond with @User and list of commands in a PRIVATE MESSAGE.
        message.author.send(Util.getListOfCommands());
        break;
      default:
        // ToDo: Unhandled Command I guess?
        break;
    }
  }

  
}

module.exports = PlannerBot;
