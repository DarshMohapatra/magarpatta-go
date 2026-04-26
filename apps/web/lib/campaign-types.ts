export const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  NEW_OPENING:    'Now open',
  FLASH_SALE:     'Flash sale',
  FESTIVAL:       'Festival special',
  LATE_NIGHT:     'Late-night deal',
  WEEKEND:        'Weekend deal',
  BOGO:           'Buy one, get one',
  EARLY_BIRD:     'Early-bird',
  TIFFIN_SERVICE: 'Home tiffin',
};

export const CAMPAIGN_TYPE_ACCENTS: Record<string, string> = {
  NEW_OPENING:    'forest',
  FLASH_SALE:     'terracotta',
  FESTIVAL:       'saffron',
  LATE_NIGHT:     'plum',
  WEEKEND:        'gold',
  BOGO:           'terracotta',
  EARLY_BIRD:     'saffron',
  TIFFIN_SERVICE: 'forest',
};

export const CAMPAIGN_TYPES = Object.keys(CAMPAIGN_TYPE_LABELS) as Array<keyof typeof CAMPAIGN_TYPE_LABELS>;
