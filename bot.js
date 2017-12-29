var token = process.env.TOKEN;

var Bot = require('node-telegram-bot-api');
var bot;
const { search } = require('./database');

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
  bot.sendMessage(msg.chat.id, replyMessage(dbresult)).then(function () {
    console.log('Result send');
  });
});

function replyMessage(dbresult) {
  if(dbresult.rows.length === 0) {
    return 'Ничего не нашли';
  } else if(dbresult.rows.length === 1) {
    return JSON.stringify(dbresult.rows[0]);
  } else {
    return dbresult.rows.map((row, i) => `${i}. ${row.company_name}`).join('\n');
  }
}

module.exports = bot;
