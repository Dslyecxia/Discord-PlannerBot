const config = require('config');
const fs = require('fs');
const https = require('https');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('db.json');

class Util {
  constructor() {
    this.db = low(adapter);
    this.error = {
      MISSING_PROPERTY: [
        'Error: Missing values for Event Creation: Use the following command: ',
        '```',
        `${config.get('prefix')}plan --<title> --<description> --<max members> --<custom fields>`,
        '```'
      ].join('\n'),
      MISSING_PROPERTY_JOIN: [
        'Error: Missing values for Event Creation: Use the following command: ',
        '```',
        `${config.get('prefix')}join --<event Id> --<custom fields X>`,
        '```'
      ].join('\n'),
      MISSING_EVENT: [
        'Error: No given event! Use the following command: ',
        '```',
        `${config.get('prefix')}close --<Event Id>`,
        '```'
      ].join('\n'),
      MARKDOWN_ERROR: 'Error: Unable to create the Markdown Table. Data sent might be wrong encoding?',
      EVENT_NOT_FOUND: 'Error: Event not found!',
      USER_ALREADY_REGISTERED: 'Error: You are already registered to this event!',
      TOO_MANY_USERS: 'Error: The event is already full. Sorry :( !'
    };

    this.warning = {
      EVENT_REMOVED: 'Event has been removed!',
      LEFT_EVENT: 'You have left the event!',
      KICK_EVENT: 'User was kicked from event!'
    };
  }

  avatarExists() {
    return fs.existsSync('./config/avatar.png');
  }

  getListOfCommands() {
    return [
      '```',
      `Use the prefix "${config.get('prefix')}" with the following commands:`,
      '',
      'commands              Send a private message to yourself containing these commands',
      '',
      'plan                  Plan an event, including the Title, the Description, the amount of Members',
      '                      and OPTIONAL Custom Fields',
      `                      Ex: ${config.get('prefix')}plan --Title of Event --Description of Event`,
      '                          --10 --Custom Field 1 --Custom Field 2',
      '',
      'close                 Close an event using an event ID',
      `                      Ex: ${config.get('prefix')}close --12345678`,
      '',
      'join                  Join an event using an event ID and the optional fields',
      `                      Ex: ${config.get('prefix')}join --12345678 --Custom Field Answer 1 `,
      '                      --Custom Field Answer 2',
      '',
      'leave                 Leave an event',
      `                      Ex: ${config.get('prefix')}leave --12345678`,
      '',
      'kick                  Kick a user from an event you hosted using the member name',
      `                      Ex: ${config.get('prefix')}kick --12345678 --Dslyecxia`,
      ' ',
      '```'
    ].join('\n');
  }

  helloWorld(message) {
    var sayHi = [
      '**Welcome to the Event Planning Channel**',
      'This bot was made by `https://twitter.com/Dslyecxia`',
      'To view the command list, use the following command: `' + config.get('prefix') + 'commands`',
      'Messages here **SHOULD** get deleted automatically by the bot once processed if they are commands. I recommend keeping the channel clear of any other messages.',
      ' '
    ].join('\n');

    message.channel.send(sayHi);
  }

  deleteUserMessage(message){
    message.delete()
  }

  planEvent(input, message) {
    // If the planned event doesn't contain at least a title, description and max members
    if (input.length < 3) {
      message.author.send(this.error.MISSING_PROPERTY);
      return;
    }

    var customFields = [];
    var i = 3;
    while(i < input.length){
      customFields.push(input[i]);
      i++;
    }

    var eventData = {
      title: input[0],
      description: input[1],
      max: input[2],
      id: this.guidGenerator(),
      extrafields: customFields
    }

    this.createEvent(eventData, message);

    try {
      message.channel.send(this.generateMarkdownTable(eventData)).then((msg)=>{
        this.db.get('events').find({id: eventData.id}).assign({postId: msg.id}).write();
      });
    } catch (error) {
      message.author.send(this.error.MARKDOWN_ERROR);
    }
  }

  reloadEvent(eventData, message) {
    var customFields = [];
    var i = 0;
    while(i < eventData.fields.length){
      customFields.push(eventData.fields[i]);
      i++;
    }

    var data = {
      title: eventData.title,
      description: eventData.description,
      max: eventData.max,
      id: eventData.id,
      extrafields: customFields
    }

    message.channel.fetchMessage(eventData.postId)
    .then(message => {
      message.edit(this.generateMarkdownTable(data, message));
    }).catch(console.error);
  }

  createEvent(data, message) {
    var fields = [];
    data.extrafields.forEach((field) => {
      fields.push(field);
    });
    this.db.get('events').push({ id: data.id, postId: null, authorId: message.author.id, title: data.title, description: data.description, max: data.max, fields: fields}).write();
  }

  closeEvent(eventId, message) {
    if(eventId[0]){
      if(this.db.get('events').find({ id: eventId[0] }).size()){
        var targetEvent = this.db.get('events').find({ id: eventId[0] }).value();
        message.channel.fetchMessage(targetEvent.postId)
        .then(message => {
          message.delete();
          this.db.get('events').remove({ id: eventId[0] }).write();
          this.db.get('users').remove({ event: eventId[0] }).write();
        }).catch(console.error);
        message.author.send(this.warning.EVENT_REMOVED);
      } else {
        message.author.send(this.error.EVENT_NOT_FOUND);
      }
    } else {
      message.author.send(this.error.MISSING_EVENT);
    }
  }

  joinEvent(userData, message) {
    if (userData.length < 1) {
      channel.send(this.error.MISSING_PROPERTY_JOIN);
      return;
    }

    var eventId = userData[0];
    var eventData = this.db.get('events').find({ id: eventId }).value();

    if(eventData) {
      var isAlreadyRegistered = (this.db.get('users').find({ event: eventData.id, user: message.author.id}).value()) ? true : false;
      var isAlreadyFull = (this.db.get('users').filter({ event: eventData.id}).size().value() >= eventData.max) ? true : false;
      var fieldLength = eventData.fields.length;

      if (userData.length < fieldLength + 1) {
        message.author.send(this.error.MISSING_PROPERTY_JOIN);
        return;
      }

      if (isAlreadyRegistered) {
        message.author.send(this.error.USER_ALREADY_REGISTERED);
        return;
      }

      if (isAlreadyFull) {
        message.author.send(this.error.TOO_MANY_USERS);
        this.reloadEvent(eventData, message);
        return;
      }

      var fields = [];
      var d = 1;
      while(d <= eventData.fields.length){
        fields.push(userData[d]);
        d++;
      }

      this.db.get('users').push({ event: eventId, user: message.author.id, username: message.author.username, fields: fields}).write();
      this.reloadEvent(eventData, message);

    } else {
      message.author.send(this.error.EVENT_NOT_FOUND);
    }
  }

  leaveEvent(eventId, message) {
    if(eventId[0]){
      if(this.db.get('users').find({ user: message.author.id, event: eventId[0] }).size().value()){
        this.db.get('users').remove({ user: message.author.id, event: eventId[0] }).write();
        var eventData = this.db.get('events').find({ id: eventId[0] }).value();
        this.reloadEvent(eventData, message);
        message.author.send(this.warning.LEFT_EVENT);
      } else {
        message.author.send(this.error.EVENT_NOT_FOUND);
      }
    } else {
      message.author.send(this.error.MISSING_EVENT);
    }
  }

  kickFromEvent(eventId, message) {
    if(eventId[0] && eventId[1]){
      var eventID = eventId[0];
      var target = eventId[1];
      var messageAuthor = message.author.id;
      var eventExists = this.db.get('events').find({ authorId: messageAuthor, id: eventID }).size().value();

      if(eventExists){
        this.db.get('users').remove({ username: target, event: eventID }).write();
        var eventData = this.db.get('events').find({ id: eventID }).value();
        this.reloadEvent(eventData, message);
        message.author.send(this.warning.KICK_EVENT);
      } else {
        message.author.send(this.error.EVENT_NOT_FOUND);
      }
    } else {
      message.author.send(this.error.MISSING_EVENT);
    }
  }

  guidGenerator() {
    var S4 = function() {
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    return (S4()+S4());
}

  // Generate a nifty table
  // Every element should have one space before and after it
  // The biggest element in a column needs to determine the width of the column
  // if an element is 10 characters long, then the width of the column will be 12, disregarding the "|"" element
  generateMarkdownTable(eventData, message = false) {
    // Default Values
    var titleRow = "";
    var seperator = [];
    var dataSet = [];
    var colWidth = this.determineColWidth(eventData, message);
    var stringifiedFields = "";

    // Title Row
    var i = 0;
    var colExtraFields = eventData.extrafields;
    var colExtraFieldsLength = colExtraFields.length;

    titleRow += "| Members" + this.addSpaces(colWidth[0]-7) + " ";

    while(i < colExtraFieldsLength){
      var title = eventData.extrafields[i];
      var spaces = colWidth[i+1] - title.length;
      titleRow += "| " + title + this.addSpaces(spaces) + " ";
      stringifiedFields += ` --<Your "` + colExtraFields[i] + `" Answer>`;
      i++;
    }

    titleRow += "|";

    // Seperator
    colWidth.forEach((width) => {
      var row = "|";
      var x = 0;

      while(x < width+2){
        row += "-";
        x++;
      }
      seperator.push(row);
    });

    seperator = seperator.join('') + "|";

    // DataSet
    var d = 0;

    if(message){
      var users = this.db.get('users').filter({ event: eventData.id}).value();
      if(users.length >= 1){
        while(d < users.length){
          var curUser = users[d];
          var dataSetRow = [];
          var f = 1;

          var userSpaces = colWidth[0] - curUser.username.length;
          dataSetRow[0] = "| " + curUser.username + this.addSpaces(userSpaces) + " ";

          while(f <= curUser.fields.length){
            var spaces = colWidth[f] - curUser.fields[f-1].length;
            dataSetRow[f] = "| " + curUser.fields[f-1] + this.addSpaces(spaces) + " ";
            f++;
          }

          dataSet.push(dataSetRow.join('')+'|');

          d++;
        }
      }
    }

    while(d < eventData.max){
      var dataSetRow = [];
      colWidth.forEach((width) => {
        var row = "|";
        var x = 0;

        while(x < width+2){
          row += " ";
          x++;
        }
        dataSetRow.push(row);
      })

      dataSet.push(dataSetRow.join('')+'|');
      d++;
    }

    dataSet = dataSet.join('\n');

    // Generate the whole Message
    var markdownTable =  [
      "~~                                  ~~",
      "**" + eventData.title + "**",
      eventData.description,
      "**Max amount of members is: **" + eventData.max,
      " ",
      '```',
      titleRow,
      seperator,
      dataSet,
      '```',
      '**To join this specific event, please join this specific ID:** `' + config.get('prefix') + 'join --' + eventData.id + stringifiedFields + '`',

    ].join('\n');

    return markdownTable;
  }

  addSpaces(i) {
    var spaces = "";
    var x = 0;
    while(x < i){
      spaces += " ";
      x++;
    }

    return spaces;
  }

  determineColWidth(event, message){
    var colWidth = [];
    var fieldLength = event.extrafields.length;

    // Title Width to start
    colWidth[0] = 7; // Members is 7 characters
    var t = 1;
    while(t <= fieldLength){
      var titleLength = event.extrafields[t-1].length;
      colWidth[t] = event.extrafields[t-1].length;
      t++;
    }

    // Dataset Width Adjustement
    if(message){
      var users = this.db.get('users').filter({ event: event.id}).value();
      if(users.length >= 1){
        var x = 0;
        while(x < users.length){
          var curUser = users[x];
          var dataSetRow = [];
          var f = 1;

          colWidth = this.adjustWidth(colWidth, curUser);
          x++;
        }
      }
    }

    return colWidth;

  }

  adjustWidth(oriVal, userData){
    var newVal = [];

    newVal[0] = (userData.username.length > oriVal[0]) ? userData.username.length : oriVal[0];
    var f = 1;
    while(f <= userData.fields.length){
      newVal[f] = (userData.fields[f-1].length > oriVal[f]) ? userData.fields[f-1].length : oriVal[f];
      f++;
    }

    return newVal;
  }
}

module.exports = new Util();
