export interface IDCardDesignSettings {
  companyName: string;
  companySubTitle: string;
  logoUrl?: string;
  referenceUniformPhotoUrl: string;
  cardThemeColor: string; // e.g. '#0f172a' or '#b91c1c'
  badgeTitle: string; // e.g. 'EMPLOYEE ID BADGE'
}

export const STORAGE_KEY_IDCARD_SETTINGS = 'jpmonitor-idcard-settings';

export const DEFAULT_IDCARD_SETTINGS: IDCardDesignSettings = {
  companyName: 'Shwe Taung Nyut Co. Ltd.',
  companySubTitle: 'ရွှေတူးဖော်ရေး ERP System',
  referenceUniformPhotoUrl: '', // Default reference uniform url
  cardThemeColor: '#0f172a',
  badgeTitle: 'EMPLOYEE ID BADGE',
};

export const getIdCardDesignSettings = (): IDCardDesignSettings => {
  if (typeof window === 'undefined') return DEFAULT_IDCARD_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_IDCARD_SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_IDCARD_SETTINGS, ...parsed };
    }
  } catch {
    // Fallback to default
  }
  return DEFAULT_IDCARD_SETTINGS;
};

export const saveIdCardDesignSettings = (settings: IDCardDesignSettings): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_IDCARD_SETTINGS, JSON.stringify(settings));
};
