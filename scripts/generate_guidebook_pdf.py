import os
from playwright.sync_api import sync_playwright

html_content = """<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="utf-8">
<title>Multi-Store & Inventory Workflow Guidebook (Myanmar)</title>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Myanmar:wght@300;400;500;600;700&display=swap');

  @page {
    size: A4;
    margin: 20mm 15mm 20mm 15mm;
    @bottom-right {
      content: counter(page);
    }
  }

  body {
    font-family: 'Noto Sans Myanmar', sans-serif;
    color: #1e293b;
    line-height: 1.6;
    font-size: 11pt;
    margin: 0;
    padding: 0;
  }

  /* Cover / Header Section */
  .header-bg {
    background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
    color: #ffffff;
    padding: 30px;
    border-radius: 12px;
    margin-bottom: 30px;
  }

  .header-title {
    font-size: 22pt;
    font-weight: 700;
    margin: 0 0 10px 0;
    color: #f59e0b;
  }

  .header-subtitle {
    font-size: 13pt;
    font-weight: 400;
    color: #e2e8f0;
    margin: 0;
  }

  .badge-container {
    margin-top: 15px;
  }

  .badge {
    display: inline-block;
    background: rgba(255, 255, 255, 0.15);
    color: #ffffff;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 9pt;
    margin-right: 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  /* Section Styling */
  h2 {
    color: #1e3a8a;
    font-size: 15pt;
    font-weight: 700;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 6px;
    margin-top: 30px;
    margin-bottom: 15px;
    page-break-after: avoid;
  }

  h3 {
    color: #0f172a;
    font-size: 12pt;
    font-weight: 600;
    margin-top: 20px;
    margin-bottom: 10px;
    page-break-after: avoid;
  }

  p {
    margin-top: 0;
    margin-bottom: 12px;
    text-align: justify;
  }

  /* Role Cards Grid */
  .role-grid {
    display: table;
    width: 100%;
    margin-bottom: 20px;
  }

  .role-card {
    display: table-cell;
    width: 32%;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 12px;
    vertical-align: top;
    box-sizing: border-box;
  }

  .role-card-margin {
    display: table-cell;
    width: 2%;
  }

  .role-title {
    font-weight: 700;
    font-size: 11pt;
    padding-bottom: 6px;
    margin-bottom: 8px;
    border-bottom: 2px solid;
  }

  .role-admin { color: #dc2626; border-color: #dc2626; }
  .role-manager { color: #2563eb; border-color: #2563eb; }
  .role-employee { color: #059669; border-color: #059669; }

  ul, ol {
    margin-top: 0;
    margin-bottom: 12px;
    padding-left: 20px;
  }

  li {
    margin-bottom: 6px;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
    margin-bottom: 20px;
    font-size: 10pt;
  }

  th {
    background-color: #1e3a8a;
    color: white;
    text-align: left;
    padding: 10px;
    font-weight: 600;
  }

  td {
    padding: 10px;
    border-bottom: 1px solid #e2e8f0;
  }

  tr:nth-child(even) {
    background-color: #f8fafc;
  }

  /* Workflow Box */
  .workflow-box {
    background-color: #eff6ff;
    border-left: 4px solid #2563eb;
    padding: 15px;
    border-radius: 0 8px 8px 0;
    margin-bottom: 20px;
  }

  .workflow-step-num {
    display: inline-block;
    background: #2563eb;
    color: white;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    text-align: center;
    line-height: 22px;
    font-size: 9pt;
    font-weight: bold;
    margin-right: 8px;
  }

  .page-break {
    page-break-before: always;
  }

  .footer-note {
    margin-top: 40px;
    padding-top: 15px;
    border-top: 1px solid #cbd5e1;
    font-size: 9pt;
    color: #64748b;
    text-align: center;
  }
</style>
</head>
<body>

  <!-- Header Banner -->
  <div class="header-bg">
    <div class="header-title">Multi-Store & Inventory Workflow Guidebook</div>
    <div class="header-subtitle">အဆင့်မြင့် Multi-Store နှင့် စတော့စီမံခန့်ခွဲမှု လုပ်ငန်းစဉ် လမ်းညွှန်ချက် (မြန်မာဘာသာ)</div>
    <div class="badge-container">
      <span class="badge">Super Admin / Owner</span>
      <span class="badge">Store Manager</span>
      <span class="badge">Store Employee</span>
      <span class="badge">Gold Mining ERP System</span>
    </div>
  </div>

  <!-- Executive Summary -->
  <h2>၁။ နိဒါန်းနှင့် စနစ်၏ ရည်ရွယ်ချက် (Executive Summary)</h2>
  <p>
    ဤလမ်းညွှန်စာအုပ်သည် ရွှေတူးဖော်ရေးနှင့် စက်ယန္တရားများအတွက် Multi-Store (စတို တည်နေရာမျိုးစုံ) နှင့် Inventory (အပိုပစ္စည်းစတော့) စီမံခန့်ခွဲမှုကို Super Admin (စနစ်အကြီးအကဲ/ပိုင်ရှင်)၊ Manager (စတော့မန်နေဂျာ) နှင့် Store Employees (စတိုဝန်ထမ်းများ) တို့ အဆင့်ဆင့် စနစ်တကျ ပူးပေါင်းဆောင်ရွက်နိုင်ရန် ရေးဆွဲထားခြင်း ဖြစ်သည်။
  </p>
  <p>
    Multi-Store စနစ်၏ အဓိက ရည်ရွယ်ချက်မှာ ဗဟိုစတို (Yangon Central Warehouse)၊ လုပ်ငန်းခွင်စတိုများ (Site Mine Stores) နှင့် ပြုပြင်ထိန်းသိမ်းရေးစတိုများ (Workshop Stores) အကြား ပစ္စည်းလွှဲပြောင်းမှု၊ စတော့လက်ကျန် စစ်ဆေးမှုနှင့် ပစ္စည်းထုတ်ပေးမှုများကို တိကျမှန်ကန်စွာ မှတ်တမ်းတင်နိုင်ရန် ဖြစ်သည်။
  </p>

  <!-- Role Responsibilities -->
  <h2>၂။ ရာထူးအဆင့်ဆင့်အလိုက် တာဝန်နှင့် ခွင့်ပြုချက်များ (Role Hierarchy & Access Matrix)</h2>

  <div class="role-grid">
    <div class="role-card">
      <div class="role-title role-admin">၁။ Super Admin (Owner)</div>
      <ul>
        <li><strong>User & Role Management:</strong> အသုံးပြုသူ အကောင့်များနှင့် ခွင့်ပြုချက် (Permission) များ သတ်မှတ်ခြင်း။</li>
        <li><strong>Multi-Store Structure:</strong> စတို တည်နေရာများ (Locations) အသစ် ဖန်တီးခြင်း/ပြင်ဆင်ခြင်း။</li>
        <li><strong>Audit & Financial Control:</strong> စတော့တန်ဖိုး စုစုပေါင်း (Valuation) နှင့် အပြောင်းအလဲ မှတ်တမ်းများ (Audit Logs) ကို စစ်ဆေးခြင်း။</li>
        <li><strong>Global Approval:</strong> အထူးစတော့ ပြင်ဆင်မှုများနှင့် ဖျက်သိမ်းမှုများကို အတည်ပြုခြင်း။</li>
      </ul>
    </div>

    <div class="role-card-margin"></div>

    <div class="role-card">
      <div class="role-title role-manager">၂။ Store Manager</div>
      <ul>
        <li><strong>Master Spare Parts Catalog:</strong> ပစ္စည်းအသစ်ထည့်ခြင်း၊ SKU/Part No.၊ Category နှင့် မရှိမဖြစ် စတော့အနည်းဆုံးပမာဏ (Min Stock Level) သတ်မှတ်ခြင်း။</li>
        <li><strong>Goods Shipment (Surat Jalan):</strong> စတိုတစ်ခုမှ တစ်ခုသို့ ပစ္စည်းလွှဲပြောင်းရန် ပို့ဆောင်မိန့် ဖန်တီးခြင်း။</li>
        <li><strong>Supplier Purchase Management:</strong> ရောင်းချသူများထံမှ ဝယ်ယူမှုများကို စီမံခြင်းနှင့် စတော့ဖြည့်သွင်းခြင်း။</li>
        <li><strong>Reorder Approvals:</strong> Low Stock Warning များ စစ်ဆေးပြီး ပစ္စည်းမှာယူရန် အတည်ပြုခြင်း။</li>
      </ul>
    </div>

    <div class="role-card-margin"></div>

    <div class="role-card">
      <div class="role-title role-employee">၃။ Store Employee / Operator</div>
      <ul>
        <li><strong>Store Issue (ထုတ်ပေးခြင်း):</strong> စက်ယန္တရား သို့မဟုတ် ပြုပြင်ရေး အင်ဂျင်နီယာများထံ သို့ ပစ္စည်း ထုတ်ပေးခြင်း (Outbound Issue)။</li>
        <li><strong>Shipment Receiving (လက်ခံခြင်း):</strong> လွှဲပြောင်းရောက်ရှိလာသော ပစ္စည်းများကို စစ်ဆေး၍ လက်ခံခြင်း (Inbound Receiving)။</li>
        <li><strong>Daily Stock Count:</strong> လက်ရှိ စတိုအတွင်း စတော့လက်ကျန်များ စစ်ဆေးခြင်း။</li>
        <li><strong>Usage Logging:</strong> ထုတ်ပေးလိုက်သော ပစ္စည်း၏ ယာဉ်/စက် လက္ခဏာရပ်များနှင့် မှတ်တမ်းများ ထည့်သွင်းခြင်း။</li>
      </ul>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- Detailed Step-by-Step Workflow -->
  <h2>၃။ Multi-Store & Inventory လုပ်ငန်းစဉ် အဆင့်ဆင့် (Step-by-Step Operational Workflow)</h2>

  <!-- Step 1 -->
  <div class="workflow-box">
    <h3><span class="workflow-step-num">၁</span> အဆင့် ၁: စတို တည်နေရာများ သတ်မှတ်ခြင်း (Store Location Setup)</h3>
    <p><strong>တာဝန်ရှိသူ:</strong> Super Admin (Owner)</p>
    <ul>
      <li><strong>လုပ်ဆောင်ချက်:</strong> <code>Location Management</code> မီနူးသို့ သွားရောက်၍ စတို တည်နေရာအသစ်များ ဖန်တီးပါ။</li>
      <li><strong>နမူနာ တည်နေရာများ:</strong>
        <ul>
          <li><strong>Central Store:</strong> ရန်ကုန် ဗဟိုစတို (Source Main Store)</li>
          <li><strong>Site Store 1:</strong> ရွှေတူးဖော်ရေး စိုက်ခင်း ၁ စတို (Mine Site Store)</li>
          <li><strong>Workshop Store:</strong> စက်ပြင် အလုပ်ရုံ စတို (Heavy Equipment Workshop)</li>
        </ul>
      </li>
    </ul>
  </div>

  <!-- Step 2 -->
  <div class="workflow-box">
    <h3><span class="workflow-step-num">၂</span> အဆင့် ၂: ပစ္စည်း မာစတာ စာရင်း ထည့်သွင်းခြင်း (Master Parts Catalog Creation)</h3>
    <p><strong>တာဝန်ရှိသူ:</strong> Store Manager / Stock Manager</p>
    <ul>
      <li><strong>လုပ်ဆောင်ချက်:</strong> <code>Store (Admin/Manager)</code> သို့မဟုတ် <code>Spare Parts Catalog</code> မီနူးတွင် <code>Add New Spare Part</code> ကို နှိပ်ပါ။</li>
      <li><strong>ဖြည့်သွင်းရမည့် အချက်အလက်များ:</strong>
        <ul>
          <li><strong>Part Number:</strong> ဥပမာ - <code>CAT-FLT-2026</code> (တမူထူးခြားသော SKU)</li>
          <li><strong>Name & Category:</strong> <code>Hydraulic Oil Filter</code> / Category: <code>Engine Parts</code></li>
          <li><strong>Min Stock Level:</strong> အနည်းဆုံး ရှိရမည့် ပမာဏ (ဥပမာ - <code>10 Pcs</code>)</li>
          <li><strong>Average Cost & Location:</strong> ပျမ်းမျှတန်ဖိုးနှင့် ပစ္စည်း ထားရှိသည့် အဓိက စတို။</li>
        </ul>
      </li>
    </ul>
  </div>

  <!-- Step 3 -->
  <div class="workflow-box">
    <h3><span class="workflow-step-num">၃</span> အဆင့် ၃: Multi-Store ပစ္စည်း လွှဲပြောင်းခြင်း (Multi-Store Transfer & Delivery Order)</h3>
    <p><strong>တာဝန်ရှိသူ:</strong> Store Manager</p>
    <ul>
      <li><strong>လုပ်ဆောင်ချက်:</strong> ဗဟိုစတိုမှ လုပ်ငန်းခွင်စတိုသို့ ပစ္စည်းလွှဲပြောင်းရန် <code>Goods Shipments (Surat Jalan)</code> မုဒ်ကို အသုံးပြုပါ။</li>
      <li><strong>လုပ်ငန်းစဉ် အဆင့်များ:</strong>
        <ol>
          <li><code>New Delivery Order</code> ကို နှိပ်၍ Delivery Order Number (DO No.) ထုတ်ယူပါ။</li>
          <li><strong>Source Location:</strong> <code>Central Store</code> နှင့် <strong>Target Location:</strong> <code>Site Store 1</code> ကို ရွေးချယ်ပါ။</li>
          <li>ယာဉ်မောင်းအမည် (Driver Name)၊ ယာဉ်အမှတ် (Vehicle/Police No.) နှင့် လွှဲပြောင်းမည့် ပစ္စည်း အရေအတွက်များကို ဖြည့်သွင်းပါ။</li>
          <li>လွှဲပြောင်းမှု အခြေအနေကို <code>PENDING</code> မှ <code>IN_TRANSIT</code> သို့ ပြောင်းလဲပါ။</li>
        </ol>
      </li>
    </ul>
  </div>

  <!-- Step 4 -->
  <div class="workflow-box">
    <h3><span class="workflow-step-num">၄</span> အဆင့် ၄: စတို ပစ္စည်း လက်ခံခြင်းနှင့် ထုတ်ပေးခြင်း (Receiving & Store Issue)</h3>
    <p><strong>တာဝန်ရှိသူ:</strong> Store Employee / Operator</p>
    <ul>
      <li><strong>စတို ပစ္စည်း လက်ခံခြင်း (Inbound Receiving):</strong>
        <ul>
          <li>လုပ်ငန်းခွင် စတိုဝန်ထမ်းသည် ရောက်ရှိလာသော Shipment ကို စစ်ဆေး၍ <code>COMPLETED</code> အဖြစ် အတည်ပြုလိုက်ပါက Target Store အတွင်းသို့ စတော့ ပမာဏ အလိုအလျောက် တိုးလာပါမည်။</li>
        </ul>
      </li>
      <li><strong>စတို ပစ္စည်း ထုတ်ပေးခြင်း (Outbound Issue):</strong>
        <ul>
          <li><code>Store ဝန်ထမ်း မုဒ် (Store Employee View)</code> တွင် ပြုပြင်ထိန်းသိမ်းမည့် ယာဉ်/စက် (Equipment Code - ဥပမာ <code>EXC-001</code>) ကို ရွေးချယ်ပါ။</li>
          <li>လိုအပ်သော အပိုပစ္စည်း အရေအတွက် ထည့်သွင်း၍ <code>Confirm Store Issue</code> ကို နှိပ်ပါ။ စတော့ အရေအတွက် လျော့နည်းသွားမည် ဖြစ်ပြီး ထုတ်ပေးမှု မှတ်တမ်း ကျန်ရှိမည် ဖြစ်သည်။</li>
        </ul>
      </li>
    </ul>
  </div>

  <div class="page-break"></div>

  <!-- Permissions & Action Control Table -->
  <h2>၄။ လုပ်ငန်းဆောင်ရွက်မှု ခွင့်ပြုချက် လုပ်ငန်းဇယား (Permissions Control Matrix)</h2>

  <table>
    <thead>
      <tr>
        <th>လုပ်ငန်းစဉ် (Action / Module)</th>
        <th>Super Admin</th>
        <th>Store Manager</th>
        <th>Store Employee</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Store Location Setup</strong> (စတိုတည်နေရာ သတ်မှတ်ခြင်း)</td>
        <td>✓ ခွင့်ပြုသည်</td>
        <td>✗ မရပါ</td>
        <td>✗ မရပါ</td>
      </tr>
      <tr>
        <td><strong>Create Master Spare Part</strong> (ပစ္စည်းအသစ် ထည့်သွင်းခြင်း)</td>
        <td>✓ ခွင့်ပြုသည်</td>
        <td>✓ ခွင့်ပြုသည်</td>
        <td>✗ မရပါ</td>
      </tr>
      <tr>
        <td><strong>Multi-Store Transfer (DO / Surat Jalan)</strong></td>
        <td>✓ ခွင့်ပြုသည်</td>
        <td>✓ ခွင့်ပြုသည်</td>
        <td>✗ ဖန်တီးခွင့်မရှိပါ</td>
      </tr>
      <tr>
        <td><strong>Confirm Inbound Shipment</strong> (လွှဲပြောင်းပစ္စည်း လက်ခံခြင်း)</td>
        <td>✓ ခွင့်ပြုသည်</td>
        <td>✓ ခွင့်ပြုသည်</td>
        <td>✓ ခွင့်ပြုသည်</td>
      </tr>
      <tr>
        <td><strong>Issue Parts to Equipment</strong> (အလုပ်ရုံ သို့ ပစ္စည်းထုတ်ပေးခြင်း)</td>
        <td>✓ ခွင့်ပြုသည်</td>
        <td>✓ ခွင့်ပြုသည်</td>
        <td>✓ ခွင့်ပြုသည်</td>
      </tr>
      <tr>
        <td><strong>Inventory Valuation & Audit Logs</strong> (စတော့တန်ဖိုး စစ်ဆေးခြင်း)</td>
        <td>✓ ခွင့်ပြုသည်</td>
        <td>✓ ကြည့်ရှုခွင့်ရှိသည်</td>
        <td>✗ မရပါ</td>
      </tr>
    </tbody>
  </table>

  <!-- Best Practices & Controls -->
  <h2>၅။ အကောင်းဆုံး စတိုစီမံခန့်ခွဲမှု စည်းမျဉ်းများ (Best Practices & Control Rules)</h2>

  <ol>
    <li>
      <strong>Low Stock Warnings (စတော့နည်းပါးမှု သတိပေးချက်):</strong>
      စတော့ အရေအတွက်သည် သတ်မှတ်ထားသော <code>Min Stock Level</code> ထက် လျော့နည်းသွားပါက စနစ်မှ သတိပေးချက် (Alert Badge) ပြသမည်ဖြစ်ရာ Store Manager မှ ချက်ချင်း Reorder Order တင်ရမည်။
    </li>
    <li>
      <strong>Real-time Stock Audit Trail:</strong>
      ပစ္စည်း အဝင်/အထွက်/အလွှဲအပြောင်း မှတ်တမ်း အားလုံးကို မည်သူ၊ မည်သည့်အချိန်၊ မည်သည့်စတိုတွင် လုပ်ဆောင်ခဲ့သည်ကို <code>Audit Log View</code> တွင် ပြန်လည် စစ်ဆေးနိုင်သည်။
    </li>
    <li>
      <strong>Equipment Cost Tracking:</strong>
      အပိုပစ္စည်းများ ထုတ်ပေးစဉ် သက်ဆိုင်ရာ ယာဉ်/စက် (Equipment Code) ကို မဖြစ်မနေ ထည့်သွင်းခြင်းဖြင့် စက်ယန္တရား တစ်စီးစီ၏ ပြုပြင်ထိန်းသိမ်းရေး စရိတ်ကို တိကျစွာ တွက်ချက်နိုင်သည်။
    </li>
  </ol>

  <!-- Footer Notice -->
  <div class="footer-note">
    <strong>Gold Mining Enterprise Resource Planning (ERP) System</strong><br>
    Multi-Store & Inventory Workflow Standard Operating Procedure (SOP) | Version 2.0 | Confidential & Proprietary
  </div>

</body>
</html>
"""

def generate_pdf():
    pdf_path = "Multi_Store_and_Inventory_Workflow_Guidebook_MM.pdf"
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_content(html_content)
        page.pdf(path=pdf_path, format="A4", print_background=True)
        browser.close()
    print(f"Guidebook generated successfully at: {os.path.abspath(pdf_path)}")

if __name__ == "__main__":
    generate_pdf()
