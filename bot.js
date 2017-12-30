const token = process.env.TOKEN;

const Bot = require('node-telegram-bot-api');

let bot;
const { searchByName, searchByINN, searchByOKPO } = require('./database');
const description = require('./description');

if (process.env.NODE_ENV === 'production') {
  bot = new Bot(token);
  bot.setWebHook(process.env.HEROKU_URL + bot.token);
} else {
  bot = new Bot(token, { polling: true });
}

console.log('Bot server started in the ' + process.env.NODE_ENV + ' mode');

bot.onText(/^/, msg => {
  console.log('Получили сообщение: ', msg.text);

  if (/^\d{8}$/.test(msg.text)) {
    handleOKPO(msg);
  } else if (/^\d{10}$/.test(msg.text)) {
    handleINN(msg);
  } else {
    handleCompanyName(msg);
  }
});

async function handleOKPO(msg) {
  console.log('Поиск по ОКПО');

  bot.sendMessage(msg.chat.id, 'Ищем по коду ОКПО: ' + msg.text).then(() => {
    console.log('Ищем по коду ОКПО: ' + msg.text);
  });

  const { err, res } = await searchByOKPO(msg.text);
  if (res) {
    replyMessage(msg.chat.id, res);
  } else if (err) {
    console.log('Error: ', err);
    bot.sendMessage(msg.chat.id, err.toString()).then(() => {
      console.log('Result send');
    });
  }
}

async function handleINN(msg) {
  console.log('Поиск по ИНН');

  bot.sendMessage(msg.chat.id, 'Ищем по коду ИНН: ' + msg.text).then(() => {
    console.log('Ищем по коду ИНН: ' + msg.text);
  });

  const { err, res } = await searchByINN(msg.text);
  if (res) {
    replyMessage(msg.chat.id, res);
  } else if (err) {
    console.log('Error: ', err);
    bot.sendMessage(msg.chat.id, err.toString()).then(() => {
      console.log('Result send');
    });
  }
}

async function handleCompanyName(msg) {
  bot.sendMessage(msg.chat.id, 'Ищем по названию организации: ' + msg.text).then(() => {
    console.log('Ищем по названию организации: ' + msg.text);
  });
  const { err, res } = await searchByName(msg.text.toUpperCase());
  if (res) {
    replyMessage(msg.chat.id, res);
  } else if (err) {
    console.log('Error: ', err);
    bot.sendMessage(msg.chat.id, err.toString()).then(() => {
      console.log('Result send');
    });
  }
}

function replyMessage(chatId, res) {
  if (res.rows.length === 0) {
    console.log('Ничего не нашли');
    bot.sendMessage(chatId, 'Ничего не нашли').then(() => {
      console.log('Отправили сообщение: Ничего не нашли');
    });
  } else if (res.rows.length === 1) {
    console.log('Нашли одну компанию: ' + res.rows[0].company_name);
    const messages = companyReport(res.rows[0]);
    messages.forEach(message => {
      bot.sendMessage(chatId, message).then(() => {
        console.log('Отправили данные по компании ' + res.rows[0].company_name);
      });
    });
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
    if ((currentMessage + '\n' + line).length > 4096) {
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
