# Multi-Store & Inventory Workflow Guidebook (Myanmar Language)
## အဆင့်မြင့် Multi-Store နှင့် စတော့စီမံခန့်ခွဲမှု လုပ်ငန်းစဉ် လမ်းညွှန်ချက်

**PDF File Location:** `Multi_Store_and_Inventory_Workflow_Guidebook_MM.pdf` (Repository Root Directory)

---

### ၁။ နိဒါန်းနှင့် စနစ်၏ ရည်ရွယ်ချက် (Executive Summary)

ဤလမ်းညွှန်စာအုပ်သည် ရွှေတူးဖော်ရေးနှင့် စက်ယန္တရားများအတွက် Multi-Store (စတို တည်နေရာမျိုးစုံ) နှင့် Inventory (အပိုပစ္စည်းစတော့) စီမံခန့်ခွဲမှုကို **Super Admin (စနစ်အကြီးအကဲ/ပိုင်ရှင်)**၊ **Manager (စတော့မန်နေဂျာ)** နှင့် **Store Employees (စတိုဝန်ထမ်းများ)** တို့ အဆင့်ဆင့် စနစ်တကျ ပူးပေါင်းဆောင်ရွက်နိုင်ရန် ရေးဆွဲထားခြင်း ဖြစ်သည်။

Multi-Store စနစ်၏ အဓိက ရည်ရွယ်ချက်မှာ ဗဟိုစတို (Yangon Central Warehouse)၊ လုပ်ငန်းခွင်စတိုများ (Site Mine Stores) နှင့် ပြုပြင်ထိန်းသိမ်းရေးစတိုများ (Workshop Stores) အကြား ပစ္စည်းလွှဲပြောင်းမှု၊ စတော့လက်ကျန် စစ်ဆေးမှုနှင့် ပစ္စည်းထုတ်ပေးမှုများကို တိကျမှန်ကန်စွာ မှတ်တမ်းတင်နိုင်ရန် ဖြစ်သည်။

---

### ၂။ ရာထူးအဆင့်ဆင့်အလိုက် တာဝန်နှင့် ခွင့်ပြုချက်များ (Role Hierarchy & Access Matrix)

#### ၁. Super Admin (Owner / စနစ်အကြီးအကဲ)
- **User & Role Management:** အသုံးပြုသူ အကောင့်များနှင့် ခွင့်ပြုချက် (Permission) များ သတ်မှတ်ခြင်း။
- **Multi-Store Structure:** စတို တည်နေရာများ (Locations) အသစ် ဖန်တီးခြင်း/ပြင်ဆင်ခြင်း။
- **Audit & Financial Control:** စတော့တန်ဖိုး စုစုပေါင်း (Valuation) နှင့် အပြောင်းအလဲ မှတ်တမ်းများ (Audit Logs) ကို စစ်ဆေးခြင်း။
- **Global Approval:** အထူးစတော့ ပြင်ဆင်မှုများနှင့် ဖျက်သိမ်းမှုများကို အတည်ပြုခြင်း။

#### ၂. Store Manager (စတော့မန်နေဂျာ / မန်နေဂျာ)
- **Master Spare Parts Catalog:** ပစ္စည်းအသစ်ထည့်ခြင်း၊ SKU/Part No.၊ Category နှင့် မရှိမဖြစ် စတော့အနည်းဆုံးပမာဏ (Min Stock Level) သတ်မှတ်ခြင်း။
- **Goods Shipment (Surat Jalan):** စတိုတစ်ခုမှ တစ်ခုသို့ ပစ္စည်းလွှဲပြောင်းရန် ပို့ဆောင်မိန့် ဖန်တီးခြင်း။
- **Supplier Purchase Management:** ရောင်းချသူများထံမှ ဝယ်ယူမှုများကို စီမံခြင်းနှင့် စတော့ဖြည့်သွင်းခြင်း။
- **Reorder Approvals:** Low Stock Warning များ စစ်ဆေးပြီး ပစ္စည်းမှာယူရန် အတည်ပြုခြင်း။

#### ၃. Store Employee / Operator (စတိုဝန်ထမ်းများနှင့် လုပ်ငန်းဆောင်ရွက်သူများ)
- **Store Issue (ထုတ်ပေးခြင်း):** စက်ယန္တရား သို့မဟုတ် ပြုပြင်ရေး အင်ဂျင်နီယာများထံ သို့ ပစ္စည်း ထုတ်ပေးခြင်း (Outbound Issue)။
- **Shipment Receiving (လက်ခံခြင်း):** လွှဲပြောင်းရောက်ရှိလာသော ပစ္စည်းများကို စစ်ဆေး၍ လက်ခံခြင်း (Inbound Receiving)။
- **Daily Stock Count:** လက်ရှိ စတိုအတွင်း စတော့လက်ကျန်များ စစ်ဆေးခြင်း။
- **Usage Logging:** ထုတ်ပေးလိုက်သော ပစ္စည်း၏ ယာဉ်/စက် လက္ခဏာရပ်များနှင့် မှတ်တမ်းများ ထည့်သွင်းခြင်း။

---

### ၃။ Multi-Store & Inventory လုပ်ငန်းစဉ် အဆင့်ဆင့် (Step-by-Step Operational Workflow)

#### အဆင့် ၁: စတို တည်နေရာများ သတ်မှတ်ခြင်း (Store Location Setup)
- **တာဝန်ရှိသူ:** Super Admin (Owner)
- **လုပ်ဆောင်ချက်:** `Location Management` မီနူးသို့ သွားရောက်၍ စတို တည်နေရာအသစ်များ ဖန်တီးပါ။
- **နမူနာ တည်နေရာများ:**
  - **Central Store:** ရန်ကုန် ဗဟိုစတို (Source Main Store)
  - **Site Store 1:** ရွှေတူးဖော်ရေး စိုက်ခင်း ၁ စတို (Mine Site Store)
  - **Workshop Store:** စက်ပြင် အလုပ်ရုံ စတို (Heavy Equipment Workshop)

#### အဆင့် ၂: ပစ္စည်း မာစတာ စာရင်း ထည့်သွင်းခြင်း (Master Parts Catalog Creation)
- **တာဝန်ရှိသူ:** Store Manager / Stock Manager
- **လုပ်ဆောင်ချက်:** `Store (Admin/Manager)` သို့မဟုတ် `Spare Parts Catalog` မီနူးတွင် `Add New Spare Part` ကို နှိပ်ပါ။
- **ဖြည့်သွင်းရမည့် အချက်အလက်များ:**
  - **Part Number:** ဥပမာ - `CAT-FLT-2026` (တမူထူးခြားသော SKU)
  - **Name & Category:** `Hydraulic Oil Filter` / Category: `Engine Parts`
  - **Min Stock Level:** အနည်းဆုံး ရှိရမည့် ပမာဏ (ဥပမာ - `10 Pcs`)
  - **Average Cost & Location:** ပျမ်းမျှတန်ဖိုးနှင့် ပစ္စည်း ထားရှိသည့် အဓိက စတို။

#### အဆင့် ၃: Multi-Store ပစ္စည်း လွှဲပြောင်းခြင်း (Multi-Store Transfer & Delivery Order)
- **တာဝန်ရှိသူ:** Store Manager
- **လုပ်ဆောင်ချက်:** ဗဟိုစတိုမှ လုပ်ငန်းခွင်စတိုသို့ ပစ္စည်းလွှဲပြောင်းရန် `Goods Shipments (Surat Jalan)` မုဒ်ကို အသုံးပြုပါ။
- **လုပ်ငန်းစဉ် အဆင့်များ:**
  1. `New Delivery Order` ကို နှိပ်၍ Delivery Order Number (DO No.) ထုတ်ယူပါ။
  2. **Source Location:** `Central Store` နှင့် **Target Location:** `Site Store 1` ကို ရွေးချယ်ပါ။
  3. ယာဉ်မောင်းအမည် (Driver Name)၊ ယာဉ်အမှတ် (Vehicle/Police No.) နှင့် လွှဲပြောင်းမည့် ပစ္စည်း အရေအတွက်များကို ဖြည့်သွင်းပါ။
  4. လွှဲပြောင်းမှု အခြေအနေကို `PENDING` မှ `IN_TRANSIT` သို့ ပြောင်းလဲပါ။

#### အဆင့် ၄: စတို ပစ္စည်း လက်ခံခြင်းနှင့် ထုတ်ပေးခြင်း (Receiving & Store Issue)
- **တာဝန်ရှိသူ:** Store Employee / Operator
- **စတို ပစ္စည်း လက်ခံခြင်း (Inbound Receiving):** လုပ်ငန်းခွင် စတိုဝန်ထမ်းသည် ရောက်ရှိလာသော Shipment ကို စစ်ဆေး၍ `COMPLETED` အဖြစ် အတည်ပြုလိုက်ပါက Target Store အတွင်းသို့ စတော့ ပမာဏ အလိုအလျောက် တိုးလာပါမည်။
- **စတို ပစ္စည်း ထုတ်ပေးခြင်း (Outbound Issue):** `Store ဝန်ထမ်း မုဒ် (Store Employee View)` တွင် ပြုပြင်ထိန်းသိမ်းမည့် ယာဉ်/စက် (Equipment Code - ဥပမာ `EXC-001`) ကို ရွေးချယ်ပြီး လိုအပ်သော အပိုပစ္စည်း အရေအတွက် ထည့်သွင်း၍ `Confirm Store Issue` ကို နှိပ်ပါ။

---

### ၄။ လုပ်ငန်းဆောင်ရွက်မှု ခွင့်ပြုချက် လုပ်ငန်းဇယား (Permissions Control Matrix)

| လုပ်ငန်းစဉ် (Action / Module) | Super Admin | Store Manager | Store Employee |
| :--- | :---: | :---: | :---: |
| **Store Location Setup** (စတိုတည်နေရာ သတ်မှတ်ခြင်း) | ✓ ခွင့်ပြုသည် | ✗ မရပါ | ✗ မရပါ |
| **Create Master Spare Part** (ပစ္စည်းအသစ် ထည့်သွင်းခြင်း) | ✓ ခွင့်ပြုသည် | ✓ ခွင့်ပြုသည် | ✗ မရပါ |
| **Multi-Store Transfer (DO / Surat Jalan)** | ✓ ခွင့်ပြုသည် | ✓ ခွင့်ပြုသည် | ✗ ဖန်တီးခွင့်မရှိပါ |
| **Confirm Inbound Shipment** (လွှဲပြောင်းပစ္စည်း လက်ခံခြင်း) | ✓ ခွင့်ပြုသည် | ✓ ခွင့်ပြုသည် | ✓ ခွင့်ပြုသည် |
| **Issue Parts to Equipment** (အလုပ်ရုံ သို့ ပစ္စည်းထုတ်ပေးခြင်း) | ✓ ခွင့်ပြုသည် | ✓ ခွင့်ပြုသည် | ✓ ခွင့်ပြုသည် |
| **Inventory Valuation & Audit Logs** (စတော့တန်ဖိုး စစ်ဆေးခြင်း) | ✓ ခွင့်ပြုသည် | ✓ ကြည့်ရှုခွင့်ရှိသည် | ✗ မရပါ |

---

### ၅။ အကောင်းဆုံး စတိုစီမံခန့်ခွဲမှု စည်းမျဉ်းများ (Best Practices & Control Rules)

1. **Low Stock Warnings (စတော့နည်းပါးမှု သတိပေးချက်):** စတော့ အရေအတွက်သည် သတ်မှတ်ထားသော `Min Stock Level` ထက် လျော့နည်းသွားပါက စနစ်မှ သတိပေးချက် (Alert Badge) ပြသမည်ဖြစ်ရာ Store Manager မှ ချက်ချင်း Reorder Order တင်ရမည်။
2. **Real-time Stock Audit Trail:** ပစ္စည်း အဝင်/အထွက်/အလွှဲအပြောင်း မှတ်တမ်း အားလုံးကို မည်သူ၊ မည်သည့်အချိန်၊ မည်သည့်စတိုတွင် လုပ်ဆောင်ခဲ့သည်ကို `Audit Log View` တွင် ပြန်လည် စစ်ဆေးနိုင်သည်။
3. **Equipment Cost Tracking:** အပိုပစ္စည်းများ ထုတ်ပေးစဉ် သက်ဆိုင်ရာ ယာဉ်/စက် (Equipment Code) ကို မဖြစ်မနေ ထည့်သွင်းခြင်းဖြင့် စက်ယန္တရား တစ်စီးစီ၏ ပြုပြင်ထိန်းသိမ်းရေး စရိတ်ကို တိကျစွာ တွက်ချက်နိုင်သည်။
