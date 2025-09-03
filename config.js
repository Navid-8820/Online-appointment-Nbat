// Nbat Configuration File
// این فایل برای تنظیمات پروژه استفاده می‌شود

const CONFIG = {
  // Google Calendar API Configuration
  GOOGLE_CALENDAR: {
    API_URL: 'https://www.googleapis.com/calendar/v3/calendars/en.ir.official%23holiday%40group.v.calendar.google.com/events',
    API_KEY: 'YOUR_API_KEY_HERE', // کلید API گوگل خود را اینجا قرار دهید
    
    // تنظیمات تقویم
    CALENDAR_ID: 'en.ir.official%23holiday%40group.v.calendar.google.com',
    TIMEZONE: 'Asia/Tehran'
  },
  
  // تنظیمات سایت
  SITE: {
    NAME: 'Nbat',
    DESCRIPTION: 'سامانه آنلاین نوبت‌دهی',
    VERSION: '1.0.0',
    AUTHOR: 'Nbat Team'
  },
  
  // تنظیمات تقویم
  CALENDAR: {
    WORKING_HOURS: {
      START: '09:00',
      END: '20:30',
      INTERVAL: 30 // فاصله زمانی به دقیقه
    },
    
    // روزهای کاری (0 = یکشنبه، 6 = شنبه)
    WORKING_DAYS: [0, 1, 2, 3, 4, 5], // شنبه تا پنجشنبه
    
    // تعطیلات رسمی (تاریخ‌های شمسی)
    HOLIDAYS: [
      '1404/01/01', // نوروز
      '1404/01/02',
      '1404/01/03',
      '1404/01/04',
      '1404/01/12', // روز جمهوری اسلامی
      '1404/01/13', // روز طبیعت
      '1404/02/14', // رحلت امام خمینی
      '1404/02/15', // شهادت امام جعفر صادق
      '1404/03/14', // رحلت امام خمینی
      '1404/03/15', // شهادت امام جعفر صادق
      '1404/06/16', // عید قربان
      '1404/07/05', // عید غدیر
      '1404/07/27', // تاسوعا
      '1404/07/28', // عاشورا
      '1404/07/29', // اربعین حسینی
      '1404/09/27', // میلاد پیامبر
      '1404/09/28', // میلاد امام جعفر صادق
      '1404/11/22', // میلاد امام علی
      '1404/12/29'  // عید نوروز
    ]
  },
  
  // تنظیمات رنگ‌بندی
  COLORS: {
    PRIMARY: '#4f46e5',
    PRIMARY_LIGHT: '#6366f1',
    ACCENT: '#ec4899',
    ACCENT_LIGHT: '#f472b6',
    ACCENT_DARK: '#be185d',
    BACKGROUND: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    SURFACE: 'rgba(255, 255, 255, 0.1)',
    CARD: 'rgba(255, 255, 255, 0.15)',
    TEXT: '#ffffff',
    MUTED: 'rgba(255, 255, 255, 0.7)',
    BORDER: 'rgba(255, 255, 255, 0.2)',
    GLASS_SHADOW: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
    GLASS_BORDER: '1px solid rgba(255, 255, 255, 0.18)'
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else {
  window.CONFIG = CONFIG;
}
