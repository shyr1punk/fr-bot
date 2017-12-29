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
  const dbresult = await search(msg.text.toUpperCase());
  bot.sendMessage(msg.chat.id, dbresult + ', ' + name + '!').then(function () {
    console.log('Result send');
  });
});

module.exports = bot;
