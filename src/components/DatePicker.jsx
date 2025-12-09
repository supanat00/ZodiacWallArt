import { useState, useEffect, useMemo, useRef } from 'react';
import logo from '../assets/logo.png';
import lineSvg from '../assets/line.svg';
import './DatePicker.css';

// Custom Select Component
function CustomSelect({ value, options, placeholder, onChange, type }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target) &&
        !event.target.closest('.custom-select-popup-content')
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const selectedLabel = value
    ? options.find((opt) => opt.value === value)?.label || placeholder
    : placeholder;

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div
      className={`custom-select-wrapper ${isOpen ? 'open' : ''}`}
      ref={selectRef}
    >
      <button
        type="button"
        className="custom-select-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedLabel}</span>
      </button>
      {isOpen && (
        <div
          className="custom-select-popup"
          onClick={(e) => {
            if (e.target.classList.contains('custom-select-popup')) {
              setIsOpen(false);
            }
          }}
        >
          <div className={`custom-select-popup-content ${type ? `custom-select-${type}` : ''}`}>
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`custom-select-option ${value === option.value ? 'selected' : ''
                  }`}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DatePicker({ onDateSelect }) {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const months = [
    { value: 1, label: 'มกราคม' },
    { value: 2, label: 'กุมภาพันธ์' },
    { value: 3, label: 'มีนาคม' },
    { value: 4, label: 'เมษายน' },
    { value: 5, label: 'พฤษภาคม' },
    { value: 6, label: 'มิถุนายน' },
    { value: 7, label: 'กรกฎาคม' },
    { value: 8, label: 'สิงหาคม' },
    { value: 9, label: 'กันยายน' },
    { value: 10, label: 'ตุลาคม' },
    { value: 11, label: 'พฤศจิกายน' },
    { value: 12, label: 'ธันวาคม' },
  ];
  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);

  // ฟังก์ชันตรวจสอบปีอธิกสุรทิน
  const isLeapYear = (year) => {
    if (!year) return false;
    const y = parseInt(year);
    return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
  };

  // ฟังก์ชันคำนวณจำนวนวันในแต่ละเดือน
  const getDaysInMonth = (month, year) => {
    if (!month || !year) return 31; // default 31 วันถ้ายังไม่ได้เลือก

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // เดือนที่มี 31 วัน
    if ([1, 3, 5, 7, 8, 10, 12].includes(monthNum)) {
      return 31;
    }
    // เดือนที่มี 30 วัน
    if ([4, 6, 9, 11].includes(monthNum)) {
      return 30;
    }
    // กุมภาพันธ์
    if (monthNum === 2) {
      return isLeapYear(yearNum) ? 29 : 28;
    }
    return 31;
  };

  // คำนวณจำนวนวันตามเดือนและปีที่เลือก
  const maxDays = useMemo(() => {
    return getDaysInMonth(month, year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  // สร้าง array ของวัน
  const days = useMemo(() => {
    return Array.from({ length: maxDays }, (_, i) => ({
      value: (i + 1).toString(),
      label: (i + 1).toString(),
    }));
  }, [maxDays]);

  // รีเซ็ตวันถ้าวันที่เลือกเกินจำนวนวันในเดือนใหม่
  useEffect(() => {
    if (day && parseInt(day) > maxDays) {
      setDay('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxDays]);

  const handleMonthChange = (value) => {
    setMonth(value);
    // รีเซ็ตวันเมื่อเปลี่ยนเดือน
    if (day && parseInt(day) > getDaysInMonth(value, year)) {
      setDay('');
    }
  };

  const handleYearChange = (value) => {
    setYear(value);
    // รีเซ็ตวันเมื่อเปลี่ยนปี (กรณีกุมภาพันธ์)
    if (month === '2' && day && parseInt(day) > getDaysInMonth(month, value)) {
      setDay('');
    }
  };

  const yearOptions = useMemo(() => {
    return years.map((y) => ({
      value: y.toString(),
      label: y.toString(),
    }));
  }, [years]);


  // ฟังก์ชันคำนวณราศี
  const getZodiacSign = (day, month) => {
    if (!day || !month) return null;
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);

    // ราศีตามวันเดือน
    if (
      (monthNum === 3 && dayNum >= 21) ||
      (monthNum === 4 && dayNum <= 19)
    ) {
      return { name: 'เมษ', icon: '♈' };
    }
    if (
      (monthNum === 4 && dayNum >= 20) ||
      (monthNum === 5 && dayNum <= 20)
    ) {
      return { name: 'พฤษภ', icon: '♉' };
    }
    if (
      (monthNum === 5 && dayNum >= 21) ||
      (monthNum === 6 && dayNum <= 21)
    ) {
      return { name: 'เมถุน', icon: '♊' };
    }
    if (
      (monthNum === 6 && dayNum >= 22) ||
      (monthNum === 7 && dayNum <= 22)
    ) {
      return { name: 'กรกฎ', icon: '♋' };
    }
    if (
      (monthNum === 7 && dayNum >= 23) ||
      (monthNum === 8 && dayNum <= 22)
    ) {
      return { name: 'สิงห์', icon: '♌' };
    }
    if (
      (monthNum === 8 && dayNum >= 23) ||
      (monthNum === 9 && dayNum <= 22)
    ) {
      return { name: 'กันย์', icon: '♍' };
    }
    if (
      (monthNum === 9 && dayNum >= 23) ||
      (monthNum === 10 && dayNum <= 23)
    ) {
      return { name: 'ตุล', icon: '♎' };
    }
    if (
      (monthNum === 10 && dayNum >= 24) ||
      (monthNum === 11 && dayNum <= 21)
    ) {
      return { name: 'พิจิก', icon: '♏' };
    }
    if (
      (monthNum === 11 && dayNum >= 22) ||
      (monthNum === 12 && dayNum <= 21)
    ) {
      return { name: 'ธนู', icon: '♐' };
    }
    if (
      (monthNum === 12 && dayNum >= 22) ||
      (monthNum === 1 && dayNum <= 19)
    ) {
      return { name: 'มกร', icon: '♑' };
    }
    if (
      (monthNum === 1 && dayNum >= 20) ||
      (monthNum === 2 && dayNum <= 18)
    ) {
      return { name: 'กุมภ์', icon: '♒' };
    }
    if (
      (monthNum === 2 && dayNum >= 19) ||
      (monthNum === 3 && dayNum <= 20)
    ) {
      return { name: 'มีน', icon: '♓' };
    }
    return null;
  };

  // ฟังก์ชันคำนวณปีนักษัตรพร้อมไอคอน
  const getNakshatYearWithIcon = (year) => {
    if (!year) return null;
    const yearNum = parseInt(year);
    const nakshatData = [
      { name: 'ชวด', animal: 'หนู', icon: '🐭' },
      { name: 'ฉลู', animal: 'วัว', icon: '🐂' },
      { name: 'ขาล', animal: 'เสือ', icon: '🐅' },
      { name: 'เถาะ', animal: 'กระต่าย', icon: '🐇' },
      { name: 'มะโรง', animal: 'มังกร', icon: '🐉' },
      { name: 'มะเส็ง', animal: 'งูเล็ก', icon: '🐍' },
      { name: 'มะเมีย', animal: 'ม้า', icon: '🐴' },
      { name: 'มะแม', animal: 'แพะ', icon: '🐑' },
      { name: 'วอก', animal: 'ลิง', icon: '🐵' },
      { name: 'ระกา', animal: 'ไก่', icon: '🐔' },
      { name: 'จอ', animal: 'สุนัข', icon: '🐕' },
      { name: 'กุน', animal: 'หมู', icon: '🐷' },
    ];
    const index = (yearNum - 4) % 12;
    return nakshatData[index < 0 ? index + 12 : index];
  };

  // ฟังก์ชันคำนวณวันในสัปดาห์
  const getDayOfWeek = (day, month, year) => {
    if (!day || !month || !year) return null;
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    const date = new Date(yearNum, monthNum - 1, dayNum);
    const dayOfWeek = date.getDay();

    const daysOfWeek = [
      { name: 'อาทิตย์', icon: '☀️' },
      { name: 'จันทร์', icon: '🌙' },
      { name: 'อังคาร', icon: '🔥' },
      { name: 'พุธ', icon: '☿️' },
      { name: 'พฤหัสบดี', icon: '♃' },
      { name: 'ศุกร์', icon: '♀️' },
      { name: 'เสาร์', icon: '♄' },
    ];

    return daysOfWeek[dayOfWeek];
  };

  // คำนวณปีนักษัตร ราศี และวันในสัปดาห์
  const nakshatYear = useMemo(() => getNakshatYearWithIcon(year), [year]);
  const zodiacSign = useMemo(
    () => getZodiacSign(day, month),
    [day, month]
  );
  const dayOfWeek = useMemo(
    () => getDayOfWeek(day, month, year),
    [day, month, year]
  );

  const handleSubmit = () => {
    // ป้องกันการกดซ้ำ
    if (isSubmitting) {
      return;
    }

    if (day && month && year && nakshatYear && zodiacSign && dayOfWeek) {
      setIsSubmitting(true);
      onDateSelect({
        day: parseInt(day),
        month: parseInt(month),
        year: parseInt(year),
        dayOfWeek: dayOfWeek.name,
        zodiac: zodiacSign.name,
        chineseZodiac: nakshatYear.name,
      });
      // Note: ไม่ต้อง reset isSubmitting เพราะ component จะ unmount เมื่อเปลี่ยน step
    }
  };

  return (
    <div className="date-picker-container">
      <img src={logo} alt="Logo" className="date-picker-logo" />
      <div className="date-picker-content">
        <div className="date-picker-label">เลือกวันเกิดเพื่อทำนายดวงชะตา</div>
        <div className="date-picker-inputs">
          <div className="date-picker-inputs-wrapper">
            <CustomSelect
              value={day}
              options={days}
              placeholder="วัน"
              onChange={setDay}
            />
            <CustomSelect
              value={month}
              options={months.map((m) => ({ value: m.value.toString(), label: m.label }))}
              placeholder="เดือน"
              onChange={handleMonthChange}
              type="month"
            />
            <CustomSelect
              value={year}
              options={yearOptions}
              placeholder="ปี"
              onChange={handleYearChange}
            />
          </div>
          <div className="date-picker-info">
            <img src={lineSvg} alt="" className="date-picker-info-line" />
            {day && month && year && nakshatYear && zodiacSign && dayOfWeek && (
              <div className="date-info-item">
                <span className="date-info-value">
                  วัน{dayOfWeek.name}
                </span>
                <span className="date-info-value">
                  ราศี{zodiacSign.name} {zodiacSign.icon}
                </span>
                <span className="date-info-value">
                  ปี{nakshatYear.name} {nakshatYear.icon}
                </span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!day || !month || !year || isSubmitting}
          className="send-button"
        >
          {isSubmitting ? 'กำลังส่ง...' : 'เริ่มทำนาย'}
        </button>
      </div>
    </div>
  );
}

export default DatePicker;

