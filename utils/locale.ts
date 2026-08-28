/** Shared Burmese locale helpers for all user-facing values. */

const BURMESE_LOCALE = 'my-MM';

export const formatNumber = (value: number | null | undefined, maximumFractionDigits = 2): string => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '၀';
  return new Intl.NumberFormat(BURMESE_LOCALE, { maximumFractionDigits }).format(Number(value));
};

export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '၀ ကျပ်';
  return `${new Intl.NumberFormat(BURMESE_LOCALE, { maximumFractionDigits: 0 }).format(Number(value))} ကျပ်`;
};

export const formatDate = (value: string | number | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(BURMESE_LOCALE, options ?? { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
};

export const formatDateTime = (value: string | number | Date | null | undefined): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(BURMESE_LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const translateStatus = (value: string | null | undefined): string => {
  const translations: Record<string, string> = {
    Active: 'လုပ်ဆောင်နေသည်',
    OnLeave: 'ခွင့်ယူထားသည်',
    Resigned: 'အလုပ်ထွက်ပြီး',
    Operational: 'လည်ပတ်နေသည်',
    Standby: 'အသင့်အနေအထား',
    Breakdown: 'ပျက်စီးနေသည်',
    Maintenance: 'ပြုပြင်နေသည်',
    Sold: 'ရောင်းချပြီး',
    Scrapped: 'ဖျက်သိမ်းပြီး',
    OPEN: 'ဖွင့်ထားသည်',
    Open: 'ဖွင့်ထားသည်',
    IN_PROGRESS: 'လုပ်ဆောင်နေသည်',
    WAITING_PART: 'ပစ္စည်းစောင့်ဆိုင်းနေသည်',
    CLOSED: 'ပိတ်ပြီး',
    Closed: 'ပိတ်ပြီး',
    CANCELLED: 'ပယ်ဖျက်ပြီး',
    PENDING: 'ဆိုင်းငံ့ထားသည်',
    IN_TRANSIT: 'ပို့ဆောင်နေသည်',
    DELIVERED: 'ပို့ဆောင်ပြီး',
    DELAYED: 'နောက်ကျနေသည်',
    'In Transit': 'ပို့ဆောင်နေသည်',
    Delivered: 'ပို့ဆောင်ပြီး',
    Cancelled: 'ပယ်ဖျက်ပြီး',
    'New Acquisition': 'အသစ်ဝယ်ယူခြင်း',
    'Disposal / Sale': 'ဖျက်သိမ်း / ရောင်းချခြင်း',
    'In Transit (Masih Transit)': 'ပို့ဆောင်နေသည်',
    'Arrived (Sudah Sampai)': 'ရောက်ရှိပြီး',
    COMPLETED: 'ပြီးစီးပြီး',
    Approved: 'အတည်ပြုပြီး',
    Rejected: 'ပယ်ချပြီး',
    'Super Admin': 'စနစ်အကြီးအကဲ',
    Admin: 'စီမံခန့်ခွဲသူ',
  };
  return value ? translations[value] ?? value : '—';
};

export const translateValue = (value: string | null | undefined): string => {
  const translations: Record<string, string> = {
    Engine: 'အင်ဂျင်',
    Hydraulic: 'ဟိုက်ဒရောလစ်',
    Undercarriage: 'အောက်ပိုင်းစနစ်',
    Consumable: 'သုံးစွဲပစ္စည်း',
    Electrical: 'လျှပ်စစ်',
    Corrective: 'ပြုပြင်ရန်',
    Preventive: 'ကြိုတင်ကာကွယ်ပြုပြင်ရန်',
    HIGH: 'မြင့်',
    MEDIUM: 'အလယ်အလတ်',
    CRITICAL: 'အရေးပေါ်',
    Usage: 'သုံးစွဲခြင်း',
    Purchase: 'ဝယ်ယူခြင်း',
    Cannibalize: 'အစိတ်အပိုင်းခွဲယူခြင်း',
    Return: 'ပြန်အပ်ခြင်း',
    Restock: 'စတော့ပြန်ဖြည့်ခြင်း',
    'Transfer Out': 'ပြောင်းရွှေ့ထုတ်ခြင်း',
    'Mine Site': 'သတ္တုတွင်းနေရာ',
    'Head Office': 'ရုံးချုပ်',
    'Port Facility': 'ဆိပ်ကမ်း',
    'Workshop / Plant': 'အလုပ်ရုံ / စက်ရုံ',
    Warehouse: 'ဂိုဒေါင်',
    'Camp / Mess': 'စခန်း / စားရိပ်သာ',
    'External / Vendor': 'ပြင်ပ / ရောင်းချသူ',
    'Both (Parts & Service)': 'ပစ္စည်းနှင့် ဝန်ဆောင်မှု နှစ်မျိုးလုံး',
    ACQUISITION: 'အသစ်ဝယ်ယူခြင်း',
    TRANSFER: 'ပြောင်းရွှေ့ခြင်း',
    DISPOSAL: 'ဖျက်သိမ်း / ရောင်းချခြင်း',
    'Service Workshop': 'ပြင်ပဝန်ဆောင်မှုအလုပ်ရုံ',
    Operator: 'ယာဉ်မောင်း / စက်မောင်း',
    Mechanic: 'စက်ပြင်ဆရာ',
    Staff: 'ဝန်ထမ်း',
    Manager: 'မန်နေဂျာ',
    Production: 'ထုတ်လုပ်ရေး',
    Maintenance: 'ပြုပြင်ထိန်းသိမ်းရေး',
    HSE: 'ကျန်းမာရေး၊ ဘေးကင်းရေးနှင့် ပတ်ဝန်းကျင်',
    Logistics: 'ပို့ဆောင်ရေး',
    Office: 'ရုံး',
    'Parts Vendor': 'ပစ္စည်းရောင်းချသူ',
    'Service Workshop (Bengkel Luar)': 'ပြင်ပဝန်ဆောင်မှုအလုပ်ရုံ',
  };
  return value ? translations[value] ?? value : '—';
};

export const setBurmeseDocumentLocale = (): void => {
  if (typeof document !== 'undefined') document.documentElement.lang = 'my';
};
