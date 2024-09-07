import telebot
import streamlit
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton

API_TOKEN = st.secrets["TELEGRAM_BOT_API"]
bot = telebot.TeleBot(API_TOKEN)

@bot.message_handler(commands=['start'])
def send_welcome(message):
    chat_id = message.chat.id
    response_text = f"Your chatid is ||*{chat_id}*||. Please enter this chatid code into the app to receive OTP verification code"
    bot.send_message(chat_id, response_text, parse_mode="MarkdownV2")

@bot.message_handler(commands=['create'])
def send_create_info(message):
    chat_id = message.chat.id
  
    response_text = (
        "Welcome to *AppVerify Code*, a *free* OTP verification code sending service for *individuals and businesses*.\n"
        "Instead of having to pay to use OTP verification services, you just need to register to use *AppVerify Code*'s service "
        "with a little understanding of API and you can use it."
    )

    markup = InlineKeyboardMarkup()
    register_button = InlineKeyboardButton("Register", url="https://appverifycode.glide.page/")
    markup.add(register_button)
    
    bot.send_message(chat_id, response_text, parse_mode="MarkdownV2", reply_markup=markup)

bot.infinity_polling()
