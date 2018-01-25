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

    message.content = message.content.substring(this.prefix.length);
    this.handle(message);
  }

  start() {
    this.login(config.get('token'));
  }

  handle(message) {
    const [command, ...input] = message.content.split(' --');
    
    /* So, here are a few references:
    
    message.channel.send() : Sends to the channel the value of .send()
    message.author.send() : Sends to the author the value of .send()
    message.reply() : Replies with `@User, [value of .reply()]`
    
    */

    switch (command) {
      case 'commands':
        // Will respond with the list of commands in a PRIVATE MESSAGE.
        message.author.send(Util.getListOfCommands());
        break;
      case 'who':
        // Will respond with the list of commands in the CHANNEL.
        message.channel.send("My name is **Buck** and I like to **have intercourse with other consenting adults**.");
        break;
      case 'plan':
        // Will respond with the list of commands in the CHANNEL.
        Util.planEvent(input, message.channel);
        break;
      default:
        // Will directly reply within the channel to the user.
        message.reply("Please enter a valid command.");
        break;
    }
  }

  
}

module.exports = PlannerBot;
