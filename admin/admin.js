// --- LocalStorage Keys ---
const KEYS = {
  posts: 'clinic_posts',
  discounts: 'clinic_discounts',
  offers: 'clinic_offers',
  slots: 'clinic_slots',
  bookings: 'clinic_bookings',
};

// --- Google Calendar API Configuration ---
const GOOGLE_CALENDAR_API_URL = CONFIG.GOOGLE_CALENDAR.API_URL;
const API_KEY = CONFIG.GOOGLE_CALENDAR.API_KEY;

// --- Utils ---
const $ = (q, ctx=document) => ctx.querySelector(q);
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
function isValidTimeHHMM(str){
  str = normalizeDigits(str).trim();
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(str);
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

function jalaliToGregorian(jy, jm, jd) {
  let gy = (jy <= 979) ? 621 : 1600;
  jy -= (jy <= 979) ? 0 : 979;
  let days = (365 * jy) + parseInt(jy / 33) * 8 + parseInt(((jy % 33) + 3) / 4) + 78 + jd + 
             ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * parseInt(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * parseInt(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * parseInt(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += parseInt((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  let gm;
  const sal_a = [0, 31, ((gy % 4 == 0 && gy % 100 != 0) || (gy % 400 == 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
  return [gy, gm, gd];
}

function formatJalaliDate(year, month, day) {
  return `${year}/${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;
}

// --- Calendar State ---
let currentDate = new Date();
let selectedDate = null;
let selectedTimes = new Set();

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
    const daySlots = slots.filter(s => s.date_jalali === jalaliDate);
    const dayBookings = bookings.filter(b => b.date_jalali === jalaliDate);
    
    if (daySlots.length > 0) {
      dayElement.classList.add('has-slots');
    }
    if (dayBookings.length > 0) {
      dayElement.classList.add('has-bookings');
      
      // Check if there are new bookings (created in the last 5 minutes)
      const now = new Date();
      const hasNewBookings = dayBookings.some(b => {
        const bookingTime = new Date(b.createdAt);
        return (now - bookingTime) < 5 * 60 * 1000; // 5 minutes
      });
      
      if (hasNewBookings) {
        dayElement.classList.add('has-new-bookings');
      }
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
  selectedTimes.clear();
  
  $('#selectedDate').textContent = jalaliDate;
  renderCalendar();
  renderTimeSlots();
  updateAddButton();
}

function renderTimeSlots() {
  const timeSlots = $$('.time-slot');
  const slots = read(KEYS.slots, []);
  const bookings = read(KEYS.bookings, []);
  const daySlots = slots.filter(s => s.date_jalali === selectedDate);
  const dayBookings = bookings.filter(b => b.date_jalali === selectedDate);
  
  timeSlots.forEach(slot => {
    const time = slot.dataset.time;
    const existingSlot = daySlots.find(s => s.time === time);
    const booking = dayBookings.find(b => b.time === time);
    
    slot.classList.remove('selected', 'booked', 'new-booking');
    
    if (existingSlot) {
      if (existingSlot.booked) {
        slot.classList.add('booked');
        
        // Check if this is a new booking (created in the last 5 minutes)
        if (booking) {
          const bookingTime = new Date(booking.createdAt);
          const now = new Date();
          const isNew = (now - bookingTime) < 5 * 60 * 1000; // 5 minutes
          
          if (isNew) {
            slot.classList.add('new-booking');
          }
        }
      } else {
        slot.classList.add('selected');
        selectedTimes.add(time);
      }
    }
    
    slot.addEventListener('click', () => toggleTimeSlot(slot, time));
  });
}

function toggleTimeSlot(slotElement, time) {
  if (slotElement.classList.contains('booked')) return;
  
  if (slotElement.classList.contains('selected')) {
    slotElement.classList.remove('selected');
    selectedTimes.delete(time);
  } else {
    slotElement.classList.add('selected');
    selectedTimes.add(time);
  }
  
  updateAddButton();
}

function updateAddButton() {
  const addButton = $('#addSelectedTimes');
  addButton.disabled = selectedTimes.size === 0;
}

// --- Google Calendar Integration ---
async function fetchHolidays() {
  try {
    const timeMin = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
    const timeMax = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();
    
    const url = `${GOOGLE_CALENDAR_API_URL}?key=${API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    return data.items || [];
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return [];
  }
}

// --- Slots Management ---
function addSelectedSlots() {
  if (!selectedDate || selectedTimes.size === 0) return;
  
  const slots = read(KEYS.slots, []);
  let addedCount = 0;
  
  selectedTimes.forEach(time => {
    // Check if slot already exists
    const exists = slots.some(s => s.date_jalali === selectedDate && s.time === time);
    if (!exists) {
      slots.push({ 
        id: uid(), 
        date_jalali: selectedDate, 
        time: time, 
        booked: false 
      });
      addedCount++;
    }
  });
  
  if (addedCount > 0) {
    write(KEYS.slots, slots);
    renderCalendar();
    renderTimeSlots();
    selectedTimes.clear();
    updateAddButton();
    alert(`${addedCount} ساعت جدید اضافه شد.`);
  }
}

function removeSlot(id){
  let slots = read(KEYS.slots, []);
  const slot = slots.find(s=>s.id===id);
  if(slot && slot.booked){
    alert('امکان حذف زمان رزروشده وجود ندارد. ابتدا رزرو مربوطه را لغو کنید.');
    return;
  }
  slots = slots.filter(s => s.id !== id);
  write(KEYS.slots, slots);
  renderCalendar();
  renderTimeSlots();
}
function unbookSlot(id){
  const slots = read(KEYS.slots, []);
  const bookings = read(KEYS.bookings, []);
  const s = slots.find(x=>x.id===id);
  if(!s || !s.booked){ return; }
  // remove booking
  const idxB = bookings.findIndex(b => b.slotId === id);
  if(idxB>=0) bookings.splice(idxB,1);
  s.booked = false;
  delete s.bookingId;
  write(KEYS.bookings, bookings);
  write(KEYS.slots, slots);
  renderCalendar();
  renderTimeSlots();
  renderBookings();
}

// --- Bookings ---
function renderBookings(){
  const bookings = read(KEYS.bookings, [])
    .sort((a,b)=> (a.date_jalali+a.time).localeCompare(b.date_jalali+b.time));
  const box = $('#bookingList');
  if(bookings.length===0){ box.className='list empty-state'; box.textContent='رزروی ثبت نشده.'; return; }
  box.className='list';
  box.innerHTML = bookings.map(b=>{
    // Check if this is a new booking (created in the last 5 minutes)
    const bookingTime = new Date(b.createdAt);
    const now = new Date();
    const isNew = (now - bookingTime) < 5 * 60 * 1000; // 5 minutes
    
    const newBookingClass = isNew ? 'new-booking' : '';
    const highlightStyle = isNew ? 'background: linear-gradient(135deg, #10b981, #34d399); color: white; border: 2px solid #059669;' : '';
    
    return `<div class="item ${newBookingClass}" style="${highlightStyle}">
      <div>
        <div><strong>${b.lastName} ${b.firstName}</strong> — ${b.gender} — ${b.phone}</div>
        <div>خدمت: ${b.service} | بیمه: ${b.insurance || '—'} | سن: ${b.age}</div>
        <div>تاریخ/ساعت: <strong>${b.date_jalali}</strong> — <strong>${b.time}</strong></div>
        <div style="color:${isNew ? '#e0f2fe' : '#94a3b8'}">ثبت: ${b.createdAt}</div>
      </div>
      <div class="actions">
        <button class="btn secondary" onclick="deleteBooking('${b.id}')">حذف رزرو</button>
      </div>
    </div>`;
  }).join('');
}
function deleteBooking(id){
  let bookings = read(KEYS.bookings, []);
  const booking = bookings.find(b=>b.id===id);
  if(!booking) return;
  // free slot
  const slots = read(KEYS.slots, []);
  const s = slots.find(x=>x.id===booking.slotId);
  if(s){ s.booked=false; delete s.bookingId; write(KEYS.slots, slots); }
  bookings = bookings.filter(b=>b.id!==id);
  write(KEYS.bookings, bookings);
  renderBookings();
  renderCalendar();
  renderTimeSlots();
}

// --- Posts/Discounts/Offers ---
function addPost(title, body, imageFile, color){
  const posts = read(KEYS.posts, []);
  const post = { 
    id: uid(), 
    title, 
    body, 
    color: color === '#fecaca' ? null : color,
    createdAt: new Date().toLocaleString('fa-IR') 
  };
  
  // Handle image file
  if (imageFile) {
    const reader = new FileReader();
    reader.onload = function(e) {
      post.image = e.target.result;
      posts.unshift(post);
      write(KEYS.posts, posts);
      renderPosts();
    };
    reader.readAsDataURL(imageFile);
  } else {
    posts.unshift(post);
    write(KEYS.posts, posts);
    renderPosts();
  }
}
function removePost(id){
  const posts = read(KEYS.posts, []);
  write(KEYS.posts, posts.filter(p=>p.id!==id));
  renderPosts();
}
function renderPosts(){
  const posts = read(KEYS.posts, []);
  const box = $('#postList');
  if(posts.length===0){ box.className='list empty-state'; box.textContent='پستی ثبت نشده.'; return; }
  box.className='list';
  box.innerHTML = posts.map(p=>{
    let mediaContent = '';
    if(p.image) {
      mediaContent += `<img src="${p.image}" alt="عکس پست" style="max-width:100px;max-height:100px;border-radius:0.5rem;margin:0.5rem 0;" />`;
    }
    const colorStyle = p.color ? `background: ${p.color}; color: #1f2937;` : '';
    return `<div class="item" style="${colorStyle}">
      <div><strong>${p.title}</strong><div style="color:#94a3b8">${p.body||''}</div>${mediaContent}<small style="color:#64748b">${p.createdAt}</small></div>
      <div><button class="btn secondary" onclick="removePost('${p.id}')">حذف</button></div>
    </div>`;
  }).join('');
}

function addDiscount(title, percent, desc, imageFile, color){
  const discounts = read(KEYS.discounts, []);
  const discount = { id: uid(), title, percent: percent? Number(percent): null, desc, color: color === '#fecaca' ? null : color };
  
  if (imageFile) {
    const reader = new FileReader();
    reader.onload = function(e) {
      discount.image = e.target.result;
      discounts.unshift(discount);
      write(KEYS.discounts, discounts);
      renderDiscounts();
    };
    reader.readAsDataURL(imageFile);
  } else {
    discounts.unshift(discount);
    write(KEYS.discounts, discounts);
    renderDiscounts();
  }
}
function removeDiscount(id){
  const d = read(KEYS.discounts, []);
  write(KEYS.discounts, d.filter(x=>x.id!==id));
  renderDiscounts();
}
function renderDiscounts(){
  const list = read(KEYS.discounts, []);
  const box = $('#discountList');
  if(list.length===0){ box.className='list empty-state'; box.textContent='تخفیفی ثبت نشده.'; return; }
  box.className='list';
  box.innerHTML = list.map(d=>{
    let mediaContent = '';
    if(d.image) {
      mediaContent = `<img src="${d.image}" alt="عکس تخفیف" style="max-width:100px;max-height:100px;border-radius:0.5rem;margin:0.5rem 0;" />`;
    }
    const colorStyle = d.color ? `background: ${d.color}; color: #1f2937;` : '';
    return `<div class="item" style="${colorStyle}">
      <div><strong>${d.title}</strong> ${d.percent? `— ${d.percent}٪`:''}<div style="color:#94a3b8">${d.desc||''}</div>${mediaContent}</div>
      <div><button class="btn secondary" onclick="removeDiscount('${d.id}')">حذف</button></div>
    </div>`;
  }).join('');
}

function addOffer(title, desc, imageFile, color){
  const offers = read(KEYS.offers, []);
  const offer = { id: uid(), title, desc, color: color === '#fecaca' ? null : color };
  
  // Handle image file
  if (imageFile) {
    const reader = new FileReader();
    reader.onload = function(e) {
      offer.image = e.target.result;
      offers.unshift(offer);
      write(KEYS.offers, offers);
      renderOffers();
    };
    reader.readAsDataURL(imageFile);
  } else {
    offers.unshift(offer);
    write(KEYS.offers, offers);
    renderOffers();
  }
}
function removeOffer(id){
  const offers = read(KEYS.offers, []);
  write(KEYS.offers, offers.filter(x=>x.id!==id));
  renderOffers();
}
function renderOffers(){
  const list = read(KEYS.offers, []);
  const box = $('#offerList');
  if(list.length===0){ box.className='list empty-state'; box.textContent='آفری ثبت نشده.'; return; }
  box.className='list';
  box.innerHTML = list.map(o=>{
    let mediaContent = '';
    if(o.image) {
      mediaContent += `<img src="${o.image}" alt="عکس آفر" style="max-width:100px;max-height:100px;border-radius:0.5rem;margin:0.5rem 0;" />`;
    }
    const colorStyle = o.color ? `background: ${o.color}; color: #1f2937;` : '';
    return `<div class="item" style="${colorStyle}">
      <div><strong>${o.title}</strong><div style="color:#94a3b8">${o.desc||''}</div>${mediaContent}</div>
      <div><button class="btn secondary" onclick="removeOffer('${o.id}')">حذف</button></div>
    </div>`;
  }).join('');
}

// --- Export JSON ---
function exportData(){
  const data = {
    posts: read(KEYS.posts, []),
    discounts: read(KEYS.discounts, []),
    offers: read(KEYS.offers, []),
    slots: read(KEYS.slots, []),
    bookings: read(KEYS.bookings, []),
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.getElementById('downloadLink');
  link.href = url;
  link.download = 'nbat_data_export.json';
  link.style.display = 'inline-block';
  link.textContent = 'دانلود فایل';
}

// --- Init / Event Listeners ---
function init(){
  // Calendar navigation
  $('#prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  
  $('#nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });
  
  // Add selected times
  $('#addSelectedTimes').addEventListener('click', addSelectedSlots);
  
  // Initialize calendar
  renderCalendar();
  
  // bookings
  renderBookings();
  
  // Highlight new bookings on page load
  setTimeout(() => {
    renderBookings();
    renderCalendar();
    if (selectedDate) {
      renderTimeSlots();
    }
  }, 1000); // Check after 1 second

  // Color picker functionality
  function initColorPickers() {
    // Post color picker
    const postColorButtons = document.querySelectorAll('#postForm .item-color');
    postColorButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        // Remove selected class from all buttons
        postColorButtons.forEach(b => b.classList.remove('selected'));
        // Add selected class to clicked button
        this.classList.add('selected');
        // Update hidden input
        $('#postColor').value = this.dataset.color;
      });
    });

    // Discount color picker
    const discountColorButtons = document.querySelectorAll('#discountForm .item-color');
    discountColorButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        // Remove selected class from all buttons
        discountColorButtons.forEach(b => b.classList.remove('selected'));
        // Add selected class to clicked button
        this.classList.add('selected');
        // Update hidden input
        $('#discountColor').value = this.dataset.color;
      });
    });

    // Offer color picker
    const offerColorButtons = document.querySelectorAll('#offerForm .item-color');
    offerColorButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        // Remove selected class from all buttons
        offerColorButtons.forEach(b => b.classList.remove('selected'));
        // Add selected class to clicked button
        this.classList.add('selected');
        // Update hidden input
        $('#offerColor').value = this.dataset.color;
      });
    });
  }

  // posts
  $('#postForm').addEventListener('submit', e=>{
    e.preventDefault();
    const imageFile = $('#postImage').files[0];
    const color = $('#postColor').value;
    addPost($('#postTitle').value.trim(), $('#postBody').value.trim(), imageFile, color);
    e.target.reset();
    // Reset color picker
    document.querySelectorAll('#postForm .item-color').forEach(b => b.classList.remove('selected'));
    $('#postColor').value = '#fecaca';
  });
  renderPosts();

  // discounts
  $('#discountForm').addEventListener('submit', e=>{
    e.preventDefault();
    const imageFile = $('#discountImage').files[0];
    const color = $('#discountColor').value;
    addDiscount($('#discountTitle').value.trim(), $('#discountPercent').value.trim(), $('#discountDesc').value.trim(), imageFile, color);
    e.target.reset();
    // Reset color picker
    document.querySelectorAll('#discountForm .item-color').forEach(b => b.classList.remove('selected'));
    $('#discountColor').value = '#fecaca';
  });
  renderDiscounts();

  // offers
  $('#offerForm').addEventListener('submit', e=>{
    e.preventDefault();
    const imageFile = $('#offerImage').files[0];
    const color = $('#offerColor').value;
    addOffer($('#offerTitle').value.trim(), $('#offerDesc').value.trim(), imageFile, color);
    e.target.reset();
    // Reset color picker
    document.querySelectorAll('#offerForm .item-color').forEach(b => b.classList.remove('selected'));
    $('#offerColor').value = '#fecaca';
  });
  renderOffers();

  // Initialize color pickers
  initColorPickers();

  // export
  $('#exportBtn').addEventListener('click', exportData);
  
  // Auto-refresh for new bookings highlighting
  setInterval(() => {
    renderBookings();
    renderCalendar();
    if (selectedDate) {
      renderTimeSlots();
    }
  }, 30000); // Check every 30 seconds
}
document.addEventListener('DOMContentLoaded', init);
