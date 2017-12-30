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
  bot.sendMessage(msg.chat.id, 'Ищем...').then(() => {
    console.log('Ищем...');
  });
  const {err, res} = await search(msg.text.toUpperCase());
  if(res) {
    replyMessage(msg.chat.id, res);
  } else if(err) {
    console.log('Error: ', err);
    bot.sendMessage(msg.chat.id, err.toString()).then(() => {
      console.log('Result send');
    });
  }

});

function replyMessage(chatId, res) {
  if(res.rows.length === 0) {
    console.log('Ничего не нашли');
    bot.sendMessage(chatId, 'Ничего не нашли').then(() => {
      console.log('Отправили сообщение: Ничего не нашли');
    });
  } else if(res.rows.length === 1) {
    console.log('Нашли одну компанию: ' + res.rows[0].company_name);
    const messages = companyReport(res.rows[0]);
    messages.forEach((message) => {
      bot.sendMessage(chatId, message).then(() => {
        console.log('Отправили данные по компании ' + res.rows[0].company_name);
      });
    })
  } else {
    // TODO: может быть большое сообщение
    const companyList = res.rows.map((row, i) => `${i}. ${row.company_name}`).join('\n');
    console.log('Нашли несколько компаний: \n' + companyList);
    bot.sendMessage(chatId, companyList).then(() => {
      console.log('Отправили сообщение: Нашли Нашли несколько компаний');
    });
  }
}

function companyReport(companyData) {
  const lines = Object.keys(companyData)
    .filter(key => companyData[key] !== '0')
    .map(key => `${description[key]}: ${companyData[key]}`);

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
  console.log(messages);
  return messages;
}

module.exports = bot;
