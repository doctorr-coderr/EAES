const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const bot = new TelegramBot('8187612405:AAG_uqibq5Gd2VPN51jttSWNlYNU3md7YGw', { polling: true });

const admins = [345053113]; // Replace with your Telegram user ID(s)
const adminChatId = 345053113; // Replace this too

const waitingFor = {}; // To track what info we’re expecting from each user
const userData = {};   // To store name and regNumber per user

// STEP 1: Start Command
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "👋 Welcome! Please send your payment screenshot to continue.");
});

// STEP 2: Payment Screenshot
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const photo = msg.photo[msg.photo.length - 1]; // Best resolution
  const fileId = photo.file_id;

  await bot.sendMessage(chatId, `✅ Payment proof received!\nPlease wait while we verify and approve it.`);

  const caption = `🧾 *New Payment Screenshot*\n` +
                  `👤 ${msg.from.first_name} ${msg.from.last_name || ''}\n` +
                  `🔗 Username: @${msg.from.username || 'no_username'}\n` +
                  `🆔 User ID: ${msg.from.id}`;

  await bot.sendPhoto(adminChatId, fileId, { caption, parse_mode: 'Markdown' });
});

// STEP 3: Admin Approves User
bot.onText(/\/approve (\d+)/, async (msg, match) => {
  const adminId = msg.from.id;
  const approvedUserId = parseInt(match[1]);

  if (!admins.includes(adminId)) {
    return bot.sendMessage(msg.chat.id, "❌ You are not authorized to approve users.");
  }

  try {
    waitingFor[approvedUserId] = 'name';
    userData[approvedUserId] = {}; // Initialize empty object
    await bot.sendMessage(approvedUserId, "✅ Your payment has been approved!\nPlease enter your **full name**:");
    await bot.sendMessage(msg.chat.id, `✅ User ${approvedUserId} has been notified.`);
  } catch (error) {
    await bot.sendMessage(msg.chat.id, "⚠️ Could not message the user. Maybe they haven't started the bot?");
  }
});

// STEP 4 & 5: Ask for name, then reg number
bot.on('message', async (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;

  if (!waitingFor[userId]) return; // Only respond if user is in waiting list

  const input = msg.text.trim();

  if (waitingFor[userId] === 'name') {
    userData[userId].name = input;
    waitingFor[userId] = 'regNumber';
    return bot.sendMessage(chatId, "✅ Thanks! Now enter your **registration number**:");
  }

  if (waitingFor[userId] === 'regNumber') {
    userData[userId].regNumber = input;
    waitingFor[userId] = null;

    // Send dummy result PDF
    const pdfPath = './dummy.pdf'; // Place your dummy.pdf in the same folder

    if (fs.existsSync(pdfPath)) {
      await bot.sendDocument(chatId, pdfPath, {
        caption: `🎓 Here is your result, ${userData[userId].name}!\n📄 Reg No: ${userData[userId].regNumber}`,
      });
    } else {
      await bot.sendMessage(chatId, "❌ PDF file not found on server.");
    }
  }
});
