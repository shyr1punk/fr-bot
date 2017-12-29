var token = process.env.TOKEN;

var Bot = require('node-telegram-bot-api');
var bot;
const { search } = require('./database');
const description = require('./description');

if(process.env.NODE_ENV === 'production') {
  bot = new Bot(token);
  bot.setWebHook(process.env.HEROKU_URL + bot.token);
} else {
  bot = new Bot(token, { polling: true });
}

console.log('Bot server started in the ' + process.env.NODE_ENV + ' mode');

bot.onText(/^/, async function (msg) {
  var name = msg.from.first_name;
  bot.sendMessage(msg.chat.id, 'Ищем...').then(function () {
    console.log('Ищем...');
  });
  const dbresult = await search(msg.text.toUpperCase());
  replyMessage(dbresult).forEach(message => {
    bot.sendMessage(msg.chat.id, message).then(function () {
      console.log('Result send');
    });
  })

});

function replyMessage(dbresult) {
  if(dbresult.rows.length === 0) {
    return 'Ничего не нашли';
  } else if(dbresult.rows.length === 1) {
    return companyReport(dbresult.rows[0]);
  } else {
    return dbresult.rows.map((row, i) => `${i}. ${row.company_name}`).join('\n');
  }
}

function companyReport(data) {
  const lines = Object.keys(data)
    .filter(key => data[key] !== '0')
    .map(key => `${description[key]}: ${data[key]}`);

  const messages = [];
  let currentMessage = '';

  lines.forEach(line => {
    if((currentMessage + '\n' + line).length > 4096) {
      messages.push(currentMessage);
      currentMessage = '';
    }
    currentMessage = currentMessage + '\n' + line;
  });
  messages.push(currentMessage);

  return messages;
}

module.exports = bot;
