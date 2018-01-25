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
        `${config.get('prefix')}plan --<title> --<description> --<max members> --<custom fields>`,
      ].join('\n'),
      MARKDOWN_ERROR: 'Error: Unable to create the Markdown Table. Data sent might be wrong encoding?'
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
      'commands              Show this message',
      'who                   Ask the bot who he is and what he do',
      'plan                  Plan an event',
      '```'
    ].join('\n');
  }

  planEvent(input, channel) {
    // If the planned event doesn't contain at least a title, description and max members
    if (input.length < 3) {
      channel.send(this.error.MISSING_PROPERTY);
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

    this.createEvent(eventData);

    try {
      channel.send(this.generateMarkdownTable(eventData));
    } catch (error) {
      channel.send(this.error.MARKDOWN_ERROR);
    }
  }

  createEvent(data) {
    //To Do: Event Saving
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
  generateMarkdownTable(eventData, dbData = false) {
    // Default Values
    var titleRow = "| Members ";
    var seperator = [];
    var dataSet = [];
    var colWidth = [7]; // 7 for 'Members'

    //Generate the Extra Fields
    var i = 0;
    var colExtraFields = eventData.extrafields.length;


    // Title Row
    while(i < colExtraFields){
      var title = eventData.extrafields[i];
      if((colWidth[i+1] && colWidth[i+1] < title.length) || !colWidth[i+1]){
        colWidth[i+1] = title.length;
      }
      var spaces = colWidth - title.length;
 
      titleRow += "| " + title + this.addSpaces(spaces) + " ";

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
    if(dbData){
      //To Do: Generate data for each row from the DB.
    }

    var d = 0;
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
      "**" + eventData.title + "**",
      eventData.description,
      "**Max amount of members is: **" + eventData.max,
      "",
      '```',
      titleRow,
      seperator,
      dataSet,
      '```',
      'To join this specific event, please join this specific ID: `' + eventData.id + '`',

    ].join('\n');

    return markdownTable;
  }

  addSpaces(i) {
    var spaces = "";
    var x = 0;
    while(x <= i){
      spaces += " ";
      x++;
    }

    return spaces;
  } 
}

module.exports = new Util();
