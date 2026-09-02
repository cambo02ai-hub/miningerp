# Telegram Alert & Notification Workflow Implementation & Guide
# Telegram Noti ပို့ပေးမည့် Workflow နှင့် အသုံးပြုနည်း လမ်းညွှန်

## 1. Overview / နိဒါန်း
This document details the Telegram Notification Workflow implemented in the JpMonitor system. It provides real-time automated alerts for critical operational events:
1. **Low Stock Alerts (အနည်းဆုံး စတော့အောက် လျော့နည်းပါက သတိပေးချက်)**: Automatically triggered when inventory (`SparePart`) falls to or below its minimum stock level (`minStockLevel`).
2. **Critical HSE Incident Alerts (အရေးကြီး အခင်းဖြစ်ပွားမှု သတိပေးချက်)**: Automatically triggered when safety incidents with `HIGH`, `CRITICAL`, `FATALITY`, or `MAJOR` severity are logged.
3. **Admin Broadcast Notifications (အဒ်မင်၏ သတင်းအချက်အလက် စာတိုများ)**: Admin can dispatch info and custom broadcast messages to the Telegram group or channel via REST API.

---

## 2. Setting Up Telegram Bot & Chat ID / Telegram Bot နှင့် Chat ID ပြင်ဆင်ပုံ

### Step 1: Create a Telegram Bot via @BotFather
1. Open Telegram and search for `@BotFather`.
2. Send `/newbot` command and follow instructions to name your bot.
3. Save the HTTP API Token provided by BotFather (e.g., `7123456789:AAFg...`). This will be set as `TELEGRAM_BOT_TOKEN`.

### Step 2: Get Admin Chat ID / Chat ID ရယူခြင်း
1. Create an Admin Telegram Group / Channel or use a direct chat with your bot.
2. Add the created bot into your Admin Group and make it an Administrator.
3. Send a test message in the group (e.g., "Hello Bot").
4. Open your browser and visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
5. Look for `"chat":{"id": -100xxxxxxxxxx}`. Copy this numeric chat ID (including the minus sign if negative). This will be set as `TELEGRAM_CHAT_ID`.

---

## 3. System Configuration / စနစ်၏ Configuration မ်ား

Add or update the following environment variables in `.env` or Railway settings:

```env
# Telegram Bot Alerts
TELEGRAM_BOT_TOKEN=7123456789:AAFg...
TELEGRAM_CHAT_ID=-1001234567890
TELEGRAM_NOTIFICATIONS_ENABLED=true
```

In `application.yml`:
```yaml
telegram:
  bot:
    token: ${TELEGRAM_BOT_TOKEN:}
    chat-id: ${TELEGRAM_CHAT_ID:}
    enabled: ${TELEGRAM_NOTIFICATIONS_ENABLED:true}
```

---

## 4. Trigger Workflows / အလိုအလျောက် ပေးပို့ပေးမည့် Workflow များ

### Workflow A: Low Stock Alert (စတော့အနည်းဆုံးအောက် လျော့နည်းခြင်း)
- **Trigger**: Executed in `InventoryServiceImpl` whenever a SparePart is created, updated, or consumed via inventory usage transaction (`createTransaction`).
- **Condition**: `part.getCurrentStock() <= part.getMinStockLevel()`.
- **Sample Telegram Message Format**:
```html
⚠️ <b>LOW STOCK ALERT - အနည်းဆုံး စတော့အောက် လျော့နည်းနေသည်</b> ⚠️

<b>Part Name:</b> Hydraulic Oil Filter
<b>Part Code / No:</b> HOF-9082
<b>Brand / Category:</b> Komatsu / Spare Parts
<b>Current Stock:</b> 🔴 <b>2 PCS</b>
<b>Min Required Stock:</b> 10
<b>Rack / Location:</b> Rack-B2
<b>Trigger Context:</b> Inventory Transaction (USAGE)

ℹ️ <i>ကျေးဇူးပြု၍ Reorder ပြုလုပ်ရန် စတော့ဂိုဒေါင် တာဝန်ရှိသူအား အကြောင်းကြားပါ။</i>
```

### Workflow B: Critical HSE Incident Alert (အရေးကြီး ဘေးအန္တရာယ်ကင်းရှင်းရေး သတိပေးချက်)
- **Trigger**: Executed in `IncidentServiceImpl` when a new incident record is submitted.
- **Condition**: `incident.getSeverity()` is `HIGH`, `CRITICAL`, `FATALITY`, or `MAJOR`.
- **Sample Telegram Message Format**:
```html
🚨 <b>CRITICAL HSE INCIDENT ALERT - အရေးကြီး အခင်းဖြစ်ပွားမှု သတိပေးချက်</b> 🚨

<b>Incident Type:</b> VEHICLE_ACCIDENT
<b>Severity Level:</b> 🔴 <b>CRITICAL</b>
<b>Date / Time:</b> 2026-09-02 14:30
<b>Location:</b> Mining Pit 1
<b>Detail Location:</b> Bench 3 East Ramp
<b>Description:</b> Haul Truck HT-05 slipped on slippery incline ramp during rain.
<b>Immediate Action:</b> Site supervisor stopped traffic and deployed recovery crane.

⚠️ <i>အရေးပေါ် တုံ့ပြန်ရေးအဖွဲ့မှ လိုအပ်သော အရေးယူ ဆောင်ရွက်ချက်များ ဆောင်ရွက်ပေးပါရန်။</i>
```

---

## 5. Admin Broadcast API / အဒ်မင်၏ သတင်းအချက်အလက် စာတိုပေးပို့ရေး API

Admin user can manually dispatch custom info alerts or critical system announcements to the Telegram chat.

- **Endpoint**: `POST /api/v1/notifications/telegram/send`
- **Authorization**: Bearer Token with `ROLE_ADMIN`
- **Request Body**:
```json
{
  "prefixHeader": "📢 SYSTEM ANNOUNCEMENT / စနစ် သတိပေးချက်",
  "message": "Monthly stock audit will commence today at 17:00 PM MMT. Please verify all pending transactions."
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Telegram notification delivered successfully"
}
```

---

## 6. Security & Error Resiliency / လုံခြုံရေးနှင့် သတိပြုရန်အချက်များ
1. **Asynchronous Execution**: Notifications are dispatched asynchronously (`@Async`) so network latency or API timeouts with Telegram will never delay or fail core business transactions.
2. **Token Protection**: Bot token and Chat ID are kept strictly in server environment variables and never exposed to client-side code.
3. **HTML Sanitization**: All variable values embedded into Telegram HTML templates are escaped to prevent HTML formatting syntax injection.
