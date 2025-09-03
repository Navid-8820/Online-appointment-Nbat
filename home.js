// --- LocalStorage Keys ---
const KEYS = {
  posts: 'clinic_posts',
  discounts: 'clinic_discounts',
  offers: 'clinic_offers',
  slots: 'clinic_slots',
  bookings: 'clinic_bookings',
};

// --- Utils ---
const $ = (q, ctx=document) => ctx.querySelector(q);
const $$ = (q, ctx=document) => Array.from(ctx.querySelectorAll(q));

function read(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : (fallback ?? []);
  }catch(e){ return fallback ?? []; }
}
function write(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}
function uid(){ return 'id_' + Math.random().toString(36).slice(2,9); }
function normalizeDigits(str=''){
  return (str+'')
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}
function isValidJalaliDate(str){
  str = normalizeDigits(str).trim();
  if(!/^(13|14)\d{2}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/.test(str)) return false;
  return true;
}

// --- Persian Calendar Functions ---
const persianMonths = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  let gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + parseInt((gy2 + 3) / 4) - parseInt((gy2 + 99) / 100) + 
             parseInt((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * parseInt(days / 12053);
  days %= 12053;
  jy += 4 * parseInt(days / 1461);
  days %= 1461;
  jy += parseInt((days - 1) / 365);
  if (days > 365) days = (days - 1) % 365;
  let jm = (days < 186) ? 1 + parseInt(days / 31) : 7 + parseInt((days - 186) / 30);
  let jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return [jy, jm, jd];
}

function formatJalaliDate(year, month, day) {
  return `${year}/${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;
}

// --- Calendar State ---
let currentDate = new Date();
let selectedDate = null;
let selectedTime = null;

// --- Calendar Rendering ---
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Get Persian date
  const [py, pm, pd] = gregorianToJalali(year, month + 1, 1);
  const persianMonthName = persianMonths[pm - 1];
  
  // Update header
  $('#currentMonth').textContent = `${persianMonthName} ${py}`;
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  const calendarDays = $('#calendarDays');
  calendarDays.innerHTML = '';
  
  // Get existing slots for highlighting
  const slots = read(KEYS.slots, []);
  const bookings = read(KEYS.bookings, []);
  
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    const [py, pm, pd] = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const jalaliDate = formatJalaliDate(py, pm, pd);
    
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    dayElement.textContent = pd;
    
    // Check if it's current month
    if (date.getMonth() !== month) {
      dayElement.classList.add('other-month');
    }
    
    // Check if it's today
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      dayElement.classList.add('today');
    }
    
    // Check if it has slots
    const daySlots = slots.filter(s => s.date_jalali === jalaliDate && !s.booked);
    const dayBookings = bookings.filter(b => b.date_jalali === jalaliDate);
    
    if (daySlots.length > 0) {
      dayElement.classList.add('has-slots');
    }
    if (dayBookings.length > 0) {
      dayElement.classList.add('has-bookings');
    }
    
    // Check if it's selected
    if (selectedDate === jalaliDate) {
      dayElement.classList.add('selected');
    }
    
    dayElement.addEventListener('click', () => selectDate(jalaliDate));
    calendarDays.appendChild(dayElement);
  }
}

function selectDate(jalaliDate) {
  selectedDate = jalaliDate;
  selectedTime = null; // Reset time when date changes
  $('#selectedDate').textContent = jalaliDate;
  renderCalendar();
  renderTimeSlots();
}

// --- Time Slots Rendering ---
function renderTimeSlots() {
  const timeSlots = document.querySelectorAll('.time-slot');
  timeSlots.forEach(slot => {
    slot.classList.remove('selected', 'booked');
    
    // Check if this time is booked for selected date
    if (selectedDate) {
      const bookings = read(KEYS.bookings, []);
      const isBooked = bookings.some(booking => 
        booking.date === selectedDate && booking.time === slot.dataset.time
      );
      if (isBooked) {
        slot.classList.add('booked');
      }
    }
    
    // Check if this time is selected
    if (selectedTime === slot.dataset.time) {
      slot.classList.add('selected');
    }
    
    slot.addEventListener('click', () => {
      if (!slot.classList.contains('booked')) {
        selectedTime = slot.dataset.time;
        renderTimeSlots();
      }
    });
  });
}

// --- Render Posts/Offers/Discounts ---
function renderList(containerId, items, type){
  const el = $('#'+containerId);
  if(!items || items.length===0){
    el.classList.add('empty-state');
    el.textContent = type==='post' ? 'در حال حاضر پستی ثبت نشده است.' :
                      (type==='offer' ? 'فعلا آفر فعالی ثبت نشده.' : 'فعلا تخفیفی ثبت نشده.');
    return;
  }
  el.classList.remove('empty-state');
      el.innerHTML = items.map(item => {
      if(type==='post'){
        let mediaContent = '';
        if(item.image) {
          mediaContent += `<img src="${item.image}" alt="عکس پست" style="max-width:100%;border-radius:0.5rem;margin:0.5rem 0;" />`;
        }
        const colorStyle = item.color ? `background: ${item.color}; color: #1f2937;` : '';
        return `<article class="card" style="${colorStyle}">
          <h3 style="margin:.25rem 0">${item.title}</h3>
          <p style="color:#cbd5e1;line-height:1.7">${item.body ?? ''}</p>
          ${mediaContent}
          <small style="color:#94a3b8">${item.createdAt ?? ''}</small>
        </article>`;
      }
      if(type==='offer'){
        let mediaContent = '';
        if(item.image) {
          mediaContent += `<img src="${item.image}" alt="عکس آفر" style="max-width:100px;max-height:100px;border-radius:0.5rem;margin:0.5rem 0;" />`;
        }
        const colorStyle = item.color ? `background: ${item.color}; color: #1f2937;` : '';
        return `<div class="slot-item" style="${colorStyle}"><strong>${item.title}</strong><span style="color:#94a3b8">${item.desc ?? ''}</span>${mediaContent}</div>`;
      }
      if(type==='discount'){
        const pct = item.percent != null ? `(${item.percent}٪)` : '';
        let mediaContent = '';
        if(item.image) {
          mediaContent = `<img src="${item.image}" alt="عکس تخفیف" style="max-width:100px;max-height:100px;border-radius:0.5rem;margin:0.5rem 0;" />`;
        }
        const colorStyle = item.color ? `background: ${item.color}; color: #1f2937;` : '';
        return `<div class="slot-item" style="${colorStyle}"><strong>${item.title} ${pct}</strong><span style="color:#94a3b8">${item.desc ?? ''}</span>${mediaContent}</div>`;
      }
    }).join('');
}

// --- Slots ---
function listAvailableSlotsForDate(jalaliDate){
  const slots = read(KEYS.slots, []);
  return slots.filter(s => s.date_jalali === jalaliDate && !s.booked);
}
function renderAvailableSlots(jalaliDate){
  const container = $('#availableSlots');
  container.innerHTML = '';
  if(!isValidJalaliDate(jalaliDate)){
    container.textContent = 'فرمت تاریخ صحیح نیست. نمونه صحیح: 1404/06/10';
    return;
  }
  const free = listAvailableSlotsForDate(jalaliDate);
  if(free.length === 0){
    container.textContent = 'برای این تاریخ، ساعتی آزاد ثبت نشده است.';
    return;
  }
  const groupName = 'slotChoice';
  container.innerHTML = free.map(s => {
    return `<label class="slot-item">
      <input type="radio" name="${groupName}" value="${s.id}" />
      <span>${s.time} — ${s.date_jalali}</span>
    </label>`;
  }).join('');
}

// --- Alerts ---
function pushAlert(type, msg){
  const box = $('#alerts');
  const div = document.createElement('div');
  div.className = `alert ${type}`;
  div.textContent = msg;
  box.appendChild(div);
  setTimeout(()=>div.remove(), 6000);
}

// --- Form Submit ---
function handleSubmit(e){
  e.preventDefault();
  
  const firstName = $('#firstName').value.trim();
  const lastName = $('#lastName').value.trim();
  const gender = $('#gender').value;
  const service = $('#service').value.trim();
  const insurance = $('#insurance').value.trim();
  const age = $('#age').value.trim();
  const phone = $('#phone').value.trim();
  const notes = $('#notes').value.trim();

  if(!selectedDate){ pushAlert('error', 'لطفاً تاریخ را انتخاب کنید.'); return; }
  if(!selectedTime){ pushAlert('error', 'لطفاً ساعت را انتخاب کنید.'); return; }

  if(!firstName || !lastName || !gender || !service || !age || !phone){
    pushAlert('error', 'لطفاً تمام فیلدهای ضروری را پر کنید.');
    return;
  }

  const booking = {
    id: uid(),
    firstName,
    lastName,
    gender,
    service,
    insurance,
    age: Number(age),
    phone,
    notes,
    date: selectedDate,
    time: selectedTime,
    createdAt: new Date().toLocaleString('fa-IR')
  };

  const bookings = read(KEYS.bookings, []);
  bookings.unshift(booking);
  write(KEYS.bookings, bookings);

  // Show modern success message
  showBookingConfirmation(booking);
  
  // Reset form
  e.target.reset();
  selectedDate = null; 
  selectedTime = null;
  $('#selectedDate').textContent = '-';
  

  
  renderCalendar();
  renderTimeSlots();
}

// --- Booking Confirmation Modal ---
function showBookingConfirmation(booking) {
  const modal = document.createElement('div');
  modal.className = 'booking-modal';
  modal.innerHTML = `
    <div class="booking-modal-content">
      <div class="booking-modal-header">
        <h3>✅ نوبت شما با موفقیت ثبت شد!</h3>
        <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="booking-modal-body">
        <div class="booking-info">
          <div class="info-row">
            <span class="info-label">نام و نام خانوادگی:</span>
            <span class="info-value">${booking.firstName} ${booking.lastName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">تاریخ و ساعت:</span>
            <span class="info-value highlight">${booking.date} - ${booking.time}</span>
          </div>
          <div class="info-row">
            <span class="info-label">نوع خدمات:</span>
            <span class="info-value">${booking.service}</span>
          </div>
          <div class="info-row">
            <span class="info-label">شماره تماس:</span>
            <span class="info-value">${booking.phone}</span>
          </div>
          <div class="info-row">
            <span class="info-label">جنسیت:</span>
            <span class="info-value">${booking.gender}</span>
          </div>
          <div class="info-row">
            <span class="info-label">سن:</span>
            <span class="info-value">${booking.age} سال</span>
          </div>
          ${booking.insurance ? `
          <div class="info-row">
            <span class="info-label">نوع بیمه:</span>
            <span class="info-value">${booking.insurance}</span>
          </div>
          ` : ''}
          ${booking.notes ? `
          <div class="info-row">
            <span class="info-label">توضیحات:</span>
            <span class="info-value">${booking.notes}</span>
          </div>
          ` : ''}
        </div>
        <div class="booking-message">
          <p>📞 لطفاً 30 دقیقه قبل از زمان تعیین شده در محل حاضر باشید.</p>
          <p>📱 در صورت نیاز به تغییر یا لغو، با ما تماس بگیرید.</p>
        </div>
      </div>
      <div class="booking-modal-footer">
        <button class="btn primary" onclick="this.parentElement.parentElement.parentElement.remove()">باشه، متوجه شدم</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}



// --- Enhanced Gender Select ---
function initGenderSelect() {
  const genderSelect = $('#gender');
  if (genderSelect) {
    console.log('Gender select initialized successfully');
    
    // Add some visual feedback
    genderSelect.addEventListener('change', (e) => {
      console.log('Gender selected:', e.target.value);
    });
  }
}

// --- Phone Number Validation ---
function initPhoneValidation() {
  const phoneInput = $('#phone');
  if (phoneInput) {
    // فقط اجازه ورود اعداد
    phoneInput.addEventListener('input', (e) => {
      // حذف همه کاراکترهای غیر عددی
      let value = e.target.value.replace(/[^0-9۰-۹]/g, '');
      
      // تبدیل اعداد فارسی به انگلیسی
      value = normalizeDigits(value);
      
      // محدود کردن به 11 رقم
      if (value.length > 11) {
        value = value.slice(0, 11);
      }
      
      e.target.value = value;
    });
    
    // validation در هنگام blur
    phoneInput.addEventListener('blur', (e) => {
      const value = e.target.value;
      if (value.length > 0 && value.length !== 11) {
        pushAlert('error', 'شماره تلفن باید دقیقاً 11 رقم باشد.');
      }
    });
    
    console.log('Phone validation initialized');
  }
}

// --- Init ---
function init(){
  // Initialize gender select
  initGenderSelect();
  
  // Initialize phone validation
  initPhoneValidation();
  
  // Calendar navigation
  $('#prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  
  $('#nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });
  
  // hydrate content
  renderList('post-list', read(KEYS.posts, []), 'post');
  renderList('offer-list', read(KEYS.offers, []), 'offer');
  renderList('discount-list', read(KEYS.discounts, []), 'discount');

  // Initialize calendar
  renderCalendar();
  renderTimeSlots();

  $('#booking-form').addEventListener('submit', handleSubmit);
}
document.addEventListener('DOMContentLoaded', init);
