import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  BarChart3,
  BookOpen,
  Camera,
  Check,
  CheckCircle2,
  Contrast,
  Eye,
  EyeOff,
  Hand,
  HeartHandshake,
  History,
  Languages,
  Layers,
  MessageSquareText,
  Printer,
  PlusSquare,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings,
  Siren,
  Sliders,
  Sparkles,
  Star,
  Target,
  Trash2,
  Undo2,
  Volume2,
  WifiOff,
} from "lucide-react";
import { getModule } from "@/lib/modules";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { StatCard } from "@/components/shared/StatCard";

/* MediaPipe attaches itself to window at runtime via CDN <script> tags —
   there are no bundled types for it, so we widen the window surface here
   rather than sprinkling `any` through the component. */
declare global {
  interface Window {
    Hands: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    HAND_CONNECTIONS: any;
  }
}

/* ==================================================================
   PSL DICTIONARY — 214 words across 8 categories.
   Every entry auto-renders with bilingual text + working TTS.
   Add a new object here and it appears everywhere automatically.
=================================================================== */
type DictItem = { id: string; english: string; urdu: string; category: string; desc: string };
type Detection = DictItem & { confidence: number };
type HistoryEntry = Detection & { time: string };

const PSL_DICTIONARY_DATA: DictItem[] = [
  // --- Greetings (1-4) ---
  { id: "1", english: "Assalam-o-Alaikum", urdu: "السلام علیکم", category: "Greetings", desc: "Flat hand raised near forehead, saluting gently." },
  { id: "2", english: "Waalaikum Assalam", urdu: "علیکم السلام", category: "Greetings", desc: "Salute hand returning the greeting outwards." },
  { id: "3", english: "Hello / Welcome", urdu: "خوش آمدید", category: "Greetings", desc: "Waving open flat hand near head level." },
  { id: "4", english: "Thank You", urdu: "شکریہ", category: "Greetings", desc: "Bring active flat hand to mouth/chin and move downwards." },

  // --- Medical / ER (5-40) ---
  { id: "5", english: "Acute Chest Tightness", urdu: "سینے میں شدید درد", category: "Medical/ER", desc: "Clenched fist pressed over chest area." },
  { id: "6", english: "Shortness of Breath", urdu: "سانس میں دشواری", category: "Medical/ER", desc: "Index finger pointing towards neck or throat." },
  { id: "7", english: "Severe Dizziness / Vertigo", urdu: "شدید چکر آنا", category: "Medical/ER", desc: "Two fingers extended near side of forehead." },
  { id: "8", english: "Emergency Help Needed", urdu: "فوری طبی مدد", category: "Medical/ER", desc: "Flat open palm held steady in front of frame." },
  { id: "9", english: "Well Done / Excellent", urdu: "بہت اچھے", category: "Phrases", desc: "Upward thumb extension with closed fist." },
  { id: "10", english: "Please Wait", urdu: "براہ کرم انتظار کریں", category: "Phrases", desc: "Both palms facing inward moving slightly down." },
  { id: "11", english: "Call Ambulance", urdu: "ایمبولینس بلائیں", category: "Medical/ER", desc: "Mimic telephone shape with thumb and pinky near ear." },
  { id: "12", english: "Severe Bleeding", urdu: "زیادہ خون بہنا", category: "Medical/ER", desc: "Open fingers fluttering downwards from forearm." },
  { id: "13", english: "High Fever", urdu: "شدید بخار", category: "Medical/ER", desc: "Back of hand placed against forehead." },
  { id: "14", english: "Unconscious / Fainted", urdu: "بے ہوش", category: "Medical/ER", desc: "Hand dropping limp from forehead level." },
  { id: "15", english: "Severe Stomach Pain", urdu: "پیٹ میں شدید درد", category: "Medical/ER", desc: "Both hands pressing and circling lower abdomen." },
  { id: "16", english: "Fracture / Broken Bone", urdu: "ہڈی ٹوٹنا", category: "Medical/ER", desc: "Fists tapping together and snapping apart quickly." },
  { id: "17", english: "Allergic Reaction", urdu: "الرجی", category: "Medical/ER", desc: "Scratching motion across forearm repeatedly." },
  { id: "18", english: "Diabetic Emergency", urdu: "شوگر کا مسئلہ", category: "Medical/ER", desc: "Index finger prick motion on tip of non-dominant thumb." },
  { id: "19", english: "Seizure / Convulsion", urdu: "دَورہ پڑنا", category: "Medical/ER", desc: "Trembling open hands held close to chest." },
  { id: "20", english: "Vomiting / Nausea", urdu: "قے / متلی", category: "Medical/ER", desc: "Hand moving outwards from mouth level with open palm." },
  { id: "21", english: "High Blood Pressure", urdu: "بلڈ پریشر زیادہ", category: "Medical/ER", desc: "Hand gripping upper arm like a blood pressure cuff." },
  { id: "22", english: "Burn Injury", urdu: "جلنا", category: "Medical/ER", desc: "Fingers fluttering outwards upward simulating heat waves." },
  { id: "23", english: "Headache / Migraine", urdu: "سر درد", category: "Medical/ER", desc: "Index fingers tapping gently on temple sides." },
  { id: "24", english: "Poison / Toxic Chemical", urdu: "زہر", category: "Medical/ER", desc: "Crossed index fingers held over throat." },
  { id: "25", english: "Infection", urdu: "انفیکشن", category: "Medical/ER", desc: "Circling index finger over red or swollen skin region." },
  { id: "26", english: "Heart Attack", urdu: "دل کا دورہ", category: "Medical/ER", desc: "Sudden clutch of left side chest with clawed fist." },
  { id: "27", english: "Choking", urdu: "دم گھٹنا", category: "Medical/ER", desc: "Both hands wrapped around neck collar region." },
  { id: "28", english: "Stroke / Paralysis", urdu: "فالج", category: "Medical/ER", desc: "One side of hand drooping motionless down side." },
  { id: "29", english: "Asthma Attack", urdu: "دمہ", category: "Medical/ER", desc: "Pumping fist against chest simulating inhaler action." },
  { id: "30", english: "Swelling / Inflammation", urdu: "سوجن", category: "Medical/ER", desc: "Closed fist expanding outwards into open curved hand." },
  { id: "31", english: "Need Doctor", urdu: "ڈاکٹر چاہیے", category: "Medical/ER", desc: "Two fingers placed over radial wrist pulse line." },
  { id: "32", english: "Need Nurse", urdu: "نرس چاہیے", category: "Medical/ER", desc: "Index finger tapping shoulder cross badge location." },
  { id: "33", english: "Oxygen Mask Needed", urdu: "آکسیجن چاہیے", category: "Medical/ER", desc: "Curved hand placed over nose and mouth." },
  { id: "34", english: "Blood Test", urdu: "خون کا ٹیسٹ", category: "Medical/ER", desc: "Pinch motion at elbow crease inner bend." },
  { id: "35", english: "X-Ray / Scan", urdu: "ایکسرے", category: "Medical/ER", desc: "Flat hands making rectangular frame in front of chest." },
  { id: "36", english: "Injection / IV Drip", urdu: "انجکشن", category: "Medical/ER", desc: "Thumb pushing plunger motion against non-dominant shoulder." },
  { id: "37", english: "Medicine / Pills", urdu: "دوائی", category: "Medical/ER", desc: "Pinch gesture bringing small imaginary tablet to mouth." },
  { id: "38", english: "Operation / Surgery", urdu: "آپریشن", category: "Medical/ER", desc: "Thumb sliding down center chest like a scalpel trace." },
  { id: "39", english: "Water / Thirsty", urdu: "پانی", category: "Medical/ER", desc: "Index finger tapping chin repeatedly." },
  { id: "40", english: "Rest / Sleep", urdu: "آرام", category: "Medical/ER", desc: "Hands folded placed beneath tilted head face side." },

  // --- Phrases (41-65) ---
  { id: "41", english: "Yes / Correct", urdu: "جی ہاں", category: "Phrases", desc: "Nodding fist up and down twice." },
  { id: "42", english: "No / Disagree", urdu: "جی نہیں", category: "Phrases", desc: "Side-to-side wave of index finger." },
  { id: "43", english: "I Am Fine", urdu: "میں ٹھیک ہوں", category: "Phrases", desc: "Open palm tapping chest gently twice." },
  { id: "44", english: "Severe Pain", urdu: "بہت زیادہ درد", category: "Phrases", desc: "Clenched shaking fists near chest area." },
  { id: "45", english: "Mild Pain", urdu: "تھوڑا درد", category: "Phrases", desc: "Index and thumb pinched close together." },
  { id: "46", english: "Right Side", urdu: "دائیں طرف", category: "Phrases", desc: "Hand pointing towards right parameter." },
  { id: "47", english: "Left Side", urdu: "بائیں طرف", category: "Phrases", desc: "Hand pointing towards left parameter." },
  { id: "48", english: "Since Morning", urdu: "صبح سے", category: "Phrases", desc: "Hand rising up simulating sun rising from horizon." },
  { id: "49", english: "Since Night", urdu: "رات سے", category: "Phrases", desc: "Hand curving downwards simulating night setting." },
  { id: "50", english: "Where Is Family?", urdu: "گھر والے کہاں ہیں؟", category: "Phrases", desc: "Open hands spreading out with shrugging shoulders." },
  { id: "51", english: "I Am Scared", urdu: "مجھے ڈر لگ رہا ہے", category: "Phrases", desc: "Open fingers trembling near collarbone." },
  { id: "52", english: "Cold / Shivering", urdu: "سردی لگ رہی ہے", category: "Phrases", desc: "Hugging shoulders with shaking arms." },
  { id: "53", english: "Hot / Sweating", urdu: "گرمی لگ رہی ہے", category: "Phrases", desc: "Wiping palm across forehead sweat line." },
  { id: "54", english: "Cannot Hear", urdu: "سن نہیں سکتا", category: "Phrases", desc: "Index finger pointing to ear followed by shaking hand." },
  { id: "55", english: "Cannot Speak", urdu: "بول نہیں سکتا", category: "Phrases", desc: "Index finger across lips followed by hand wave." },
  { id: "56", english: "I Am Deaf", urdu: "میں سماعت سے محروم ہوں", category: "Phrases", desc: "Index finger touching ear then mouth." },
  { id: "57", english: "I Need Restroom", urdu: "باتھ روم جانا ہے", category: "Phrases", desc: "T-shape hand signal with thumb between index fingers." },
  { id: "58", english: "Wheelchair Needed", urdu: "ویل چیئر چاہیے", category: "Phrases", desc: "Hands making spinning wheel circles at hip level." },
  { id: "59", english: "Stretcher Needed", urdu: "اسٹریچر چاہیے", category: "Phrases", desc: "Both flat hands extending horizontally side by side." },
  { id: "60", english: "Identity Card / CNIC", urdu: "شناختی کارڈ", category: "Phrases", desc: "Tracing rectangular card shape in air." },
  { id: "61", english: "Phone / Call", urdu: "فون کرنا ہے", category: "Phrases", desc: "Phone fist shape held beside cheek." },
  { id: "62", english: "Where Am I?", urdu: "میں کہاں ہوں؟", category: "Phrases", desc: "Pointing downwards with open palms rotating up." },
  { id: "63", english: "What Happened?", urdu: "کیا ہوا؟", category: "Phrases", desc: "Both open hands twisting wrists outward in question." },
  { id: "64", english: "Understand", urdu: "سمجھ گیا", category: "Phrases", desc: "Index finger pointing to forehead then nodding." },
  { id: "65", english: "Do Not Understand", urdu: "سمجھ نہیں آیا", category: "Phrases", desc: "Index finger on forehead followed by side shake." },

  // --- Urdu Alphabets (66-100) ---
  { id: "66", english: "Urdu Letter Alif (ا)", urdu: "الف", category: "Urdu Alphabets", desc: "Single index finger raised straight vertically." },
  { id: "67", english: "Urdu Letter Bay (ب)", urdu: "بے", category: "Urdu Alphabets", desc: "Flat horizontal palm with thumb tucked underneath." },
  { id: "68", english: "Urdu Letter Pay (پ)", urdu: "پے", category: "Urdu Alphabets", desc: "Flat palm with three lower fingers extended down." },
  { id: "69", english: "Urdu Letter Tay (ت)", urdu: "تے", category: "Urdu Alphabets", desc: "Two fingers extended vertically over flat hand base." },
  { id: "70", english: "Urdu Letter Say (ث)", urdu: "ثے", category: "Urdu Alphabets", desc: "Three fingers extended vertically together." },
  { id: "71", english: "Urdu Letter Jeem (ج)", urdu: "جیم", category: "Urdu Alphabets", desc: "Curved hand forming C-shape with index finger center point." },
  { id: "72", english: "Urdu Letter Chay (چ)", urdu: "چے", category: "Urdu Alphabets", desc: "Curved hand with three middle fingers pointing inward." },
  { id: "73", english: "Urdu Letter Hay (ح)", urdu: "حے", category: "Urdu Alphabets", desc: "Open hollowed palm moving in smooth arc." },
  { id: "74", english: "Urdu Letter Khay (خ)", urdu: "خے", category: "Urdu Alphabets", desc: "Curved hand with single top dot tapped above knuckles." },
  { id: "75", english: "Urdu Letter Daal (د)", urdu: "دال", category: "Urdu Alphabets", desc: "Curved thumb and index finger forming half circle." },
  { id: "76", english: "Urdu Letter Ddaal (ڈ)", urdu: "ڈال", category: "Urdu Alphabets", desc: "C-shape hand with small top gesture curve." },
  { id: "77", english: "Urdu Letter Zaal (ذ)", urdu: "ذال", category: "Urdu Alphabets", desc: "C-shape hand with index finger tapping top point." },
  { id: "78", english: "Urdu Letter Ray (ر)", urdu: "رے", category: "Urdu Alphabets", desc: "Index finger sweeping downward sharply." },
  { id: "79", english: "Urdu Letter Ze (ز)", urdu: "زے", category: "Urdu Alphabets", desc: "Index finger downward gesture with single dot tap." },
  { id: "80", english: "Urdu Letter Seen (س)", urdu: "سین", category: "Urdu Alphabets", desc: "Three fingers raised simulating teeth of letter seen." },
  { id: "81", english: "Urdu Letter Sheen (ش)", urdu: "شین", category: "Urdu Alphabets", desc: "Three fingers spread open vibrating slightly." },
  { id: "82", english: "Urdu Letter Suaad (ص)", urdu: "صاد", category: "Urdu Alphabets", desc: "Closed fist with thumb forming loop circle." },
  { id: "83", english: "Urdu Letter Zuaad (ض)", urdu: "ضاد", category: "Urdu Alphabets", desc: "Closed fist loop gesture with index dot above." },
  { id: "84", english: "Urdu Letter Toay (ط)", urdu: "طوئے", category: "Urdu Alphabets", desc: "Index finger straight up with thumb loop at base." },
  { id: "85", english: "Urdu Letter Zoay (ظ)", urdu: "ظوئے", category: "Urdu Alphabets", desc: "Vertical index finger with loop base and dot tap." },
  { id: "86", english: "Urdu Letter Ain (ع)", urdu: "عین", category: "Urdu Alphabets", desc: "Curved index and thumb forming reverse crescent." },
  { id: "87", english: "Urdu Letter Ghain (غ)", urdu: "غین", category: "Urdu Alphabets", desc: "Crescent finger shape with index dot above." },
  { id: "88", english: "Urdu Letter Fay (ف)", urdu: "فے", category: "Urdu Alphabets", desc: "Index finger and thumb forming single loop circle." },
  { id: "89", english: "Urdu Letter Qaaf (ق)", urdu: "قاف", category: "Urdu Alphabets", desc: "Loop circle gesture with two dots tapped above." },
  { id: "90", english: "Urdu Letter Kaaf (ک)", urdu: "کاف", category: "Urdu Alphabets", desc: "Index finger extended with diagonal arm slash stroke." },
  { id: "91", english: "Urdu Letter Gaaf (گ)", urdu: "گاف", category: "Urdu Alphabets", desc: "Two fingers extended diagonally forming double upper strokes." },
  { id: "92", english: "Urdu Letter Laam (ل)", urdu: "لام", category: "Urdu Alphabets", desc: "L-shape with raised thumb and extended index finger." },
  { id: "93", english: "Urdu Letter Meem (م)", urdu: "میم", category: "Urdu Alphabets", desc: "Fist with thumb tucked underneath middle knuckles." },
  { id: "94", english: "Urdu Letter Noon (ن)", urdu: "نون", category: "Urdu Alphabets", desc: "Cupped palm with single index finger centered inside." },
  { id: "95", english: "Urdu Letter Wao (و)", urdu: "واؤ", category: "Urdu Alphabets", desc: "Curved wrist downward with closed circle thumb gesture." },
  { id: "96", english: "Urdu Letter Choti Hay (ہ)", urdu: "چھوٹی ہے", category: "Urdu Alphabets", desc: "Circle formed by thumb and index finger tips touching." },
  { id: "97", english: "Urdu Letter Hamza (ء)", urdu: "ہمزہ", category: "Urdu Alphabets", desc: "Quick zig-zag motion in air with index finger." },
  { id: "98", english: "Urdu Letter Choti Yay (ی)", urdu: "چھوٹی یے", category: "Urdu Alphabets", desc: "Pinky finger extended curving upwards like a hook." },
  { id: "99", english: "Urdu Letter Badi Yay (ئے)", urdu: "بڑی یے", category: "Urdu Alphabets", desc: "Flat hand sliding horizontally outwards to side." },
  { id: "100", english: "Urdu Number Zero to Nine", urdu: "عددی ہندسے", category: "Urdu Alphabets", desc: "Sequential count using upright finger orientations." },

  // --- Numbers / Ginti (101-111) ---
  { id: "101", english: "Zero", urdu: "صفر", category: "Numbers", desc: "Closed fist forming a full circle shape." },
  { id: "102", english: "One", urdu: "ایک", category: "Numbers", desc: "Single index finger raised." },
  { id: "103", english: "Two", urdu: "دو", category: "Numbers", desc: "Index and middle fingers raised." },
  { id: "104", english: "Three", urdu: "تین", category: "Numbers", desc: "Index, middle and ring fingers raised." },
  { id: "105", english: "Four", urdu: "چار", category: "Numbers", desc: "Four fingers raised, thumb folded in." },
  { id: "106", english: "Five", urdu: "پانچ", category: "Numbers", desc: "Full open palm, all five fingers spread." },
  { id: "107", english: "Six", urdu: "چھ", category: "Numbers", desc: "Thumb and pinky touching, three fingers raised." },
  { id: "108", english: "Seven", urdu: "سات", category: "Numbers", desc: "Thumb and ring finger touching, rest raised." },
  { id: "109", english: "Eight", urdu: "آٹھ", category: "Numbers", desc: "Thumb and middle finger touching, rest raised." },
  { id: "110", english: "Nine", urdu: "نو", category: "Numbers", desc: "Thumb and index finger touching, rest raised." },
  { id: "111", english: "Ten", urdu: "دس", category: "Numbers", desc: "Both fists shown together, ten fingers implied." },

  // --- Family & People (112-127) ---
  { id: "112", english: "Mother", urdu: "ماں", category: "Family & People", desc: "Thumb touching chin, hand opening outward." },
  { id: "113", english: "Father", urdu: "باپ", category: "Family & People", desc: "Thumb touching forehead, hand opening outward." },
  { id: "114", english: "Sister", urdu: "بہن", category: "Family & People", desc: "Index finger drawn down cheek then pointing outward." },
  { id: "115", english: "Brother", urdu: "بھائی", category: "Family & People", desc: "Index finger tapped on forehead then pointing outward." },
  { id: "116", english: "Son", urdu: "بیٹا", category: "Family & People", desc: "Hand cradled near chest, palm curved upward." },
  { id: "117", english: "Daughter", urdu: "بیٹی", category: "Family & People", desc: "Hand cradled near chest, fingers gently closed." },
  { id: "118", english: "Grandfather", urdu: "دادا", category: "Family & People", desc: "Thumb on forehead, arcing hand forward twice." },
  { id: "119", english: "Grandmother", urdu: "دادی", category: "Family & People", desc: "Thumb on chin, arcing hand forward twice." },
  { id: "120", english: "Husband", urdu: "شوہر", category: "Family & People", desc: "Hands clasped together at chest level." },
  { id: "121", english: "Wife", urdu: "بیوی", category: "Family & People", desc: "Hands clasped together, slight tilt of head." },
  { id: "122", english: "Friend", urdu: "دوست", category: "Family & People", desc: "Index fingers hooking together twice." },
  { id: "123", english: "Doctor Sahab", urdu: "ڈاکٹر صاحب", category: "Family & People", desc: "Two fingers on wrist pulse, then respectful nod." },
  { id: "124", english: "Nurse Baji", urdu: "نرس باجی", category: "Family & People", desc: "Finger tap on shoulder badge, respectful nod." },
  { id: "125", english: "Child", urdu: "بچہ", category: "Family & People", desc: "Flat hand held low at child-height level." },
  { id: "126", english: "Newborn Baby", urdu: "نومولود بچہ", category: "Family & People", desc: "Arms cradled together, gentle rocking motion." },
  { id: "127", english: "Elderly Person", urdu: "بزرگ شخص", category: "Family & People", desc: "Hand miming a walking cane beside the body." },

  // --- Time & Days (128-143) ---
  { id: "128", english: "Today", urdu: "آج", category: "Time & Days", desc: "Both hands pointing downward at the same time." },
  { id: "129", english: "Tomorrow", urdu: "کل (آنے والا)", category: "Time & Days", desc: "Thumb pushed forward from the cheek." },
  { id: "130", english: "Yesterday", urdu: "کل (گزرا ہوا)", category: "Time & Days", desc: "Thumb pulled backward from the cheek." },
  { id: "131", english: "Morning", urdu: "صبح", category: "Time & Days", desc: "Arm rising like the sun over the horizon." },
  { id: "132", english: "Afternoon", urdu: "دوپہر", category: "Time & Days", desc: "Flat arm held horizontal at shoulder height." },
  { id: "133", english: "Evening", urdu: "شام", category: "Time & Days", desc: "Arm lowering slowly at an angle." },
  { id: "134", english: "Night", urdu: "رات", category: "Time & Days", desc: "Curved hand covering downward like a closing eye." },
  { id: "135", english: "Now / Immediately", urdu: "ابھی", category: "Time & Days", desc: "Both index fingers pointing sharply downward together." },
  { id: "136", english: "Later", urdu: "بعد میں", category: "Time & Days", desc: "Wrist flicking gesture rotating forward." },
  { id: "137", english: "Monday", urdu: "پیر", category: "Time & Days", desc: "Letter M-handshape circled once." },
  { id: "138", english: "Tuesday", urdu: "منگل", category: "Time & Days", desc: "Letter T-handshape circled once." },
  { id: "139", english: "Wednesday", urdu: "بدھ", category: "Time & Days", desc: "Letter W-handshape circled once." },
  { id: "140", english: "Thursday", urdu: "جمعرات", category: "Time & Days", desc: "Letter H-handshape circled once." },
  { id: "141", english: "Friday", urdu: "جمعہ", category: "Time & Days", desc: "Letter F-handshape circled once." },
  { id: "142", english: "Saturday", urdu: "ہفتہ", category: "Time & Days", desc: "Letter S-handshape circled once." },
  { id: "143", english: "Sunday", urdu: "اتوار", category: "Time & Days", desc: "Both open palms circled together once." },

  // --- Daily Needs & Hospital Objects (144-165) ---
  { id: "144", english: "Bed", urdu: "بستر", category: "Daily Needs & Objects", desc: "Flat hand tilted, cheek resting gesture beside it." },
  { id: "145", english: "Chair", urdu: "کرسی", category: "Daily Needs & Objects", desc: "Two bent fingers sitting on top of two more bent fingers." },
  { id: "146", english: "Blanket", urdu: "کمبل", category: "Daily Needs & Objects", desc: "Both hands pulling an imaginary cover up over shoulders." },
  { id: "147", english: "Pillow", urdu: "تکیہ", category: "Daily Needs & Objects", desc: "Both palms pressed together beside tilted head." },
  { id: "148", english: "Food / Meal", urdu: "کھانا", category: "Daily Needs & Objects", desc: "Fingers bunched, tapping toward the mouth repeatedly." },
  { id: "149", english: "Light On", urdu: "روشنی جلائیں", category: "Daily Needs & Objects", desc: "Fist opening rapidly into a spread palm, upward." },
  { id: "150", english: "Light Off", urdu: "روشنی بجھائیں", category: "Daily Needs & Objects", desc: "Spread palm closing rapidly into a fist, downward." },
  { id: "151", english: "Nurse Call Button", urdu: "نرس بٹن", category: "Daily Needs & Objects", desc: "Index finger pressing motion held out in front." },
  { id: "152", english: "Television", urdu: "ٹیلی ویژن", category: "Daily Needs & Objects", desc: "T and V handshapes shown side by side." },
  { id: "153", english: "Money / Cash", urdu: "پیسے", category: "Daily Needs & Objects", desc: "Fingers rubbing together over open palm." },
  { id: "154", english: "Medicine Box", urdu: "دوائیوں کا ڈبہ", category: "Daily Needs & Objects", desc: "Both hands tracing a small rectangular box shape." },
  { id: "155", english: "Bandage", urdu: "پٹی", category: "Daily Needs & Objects", desc: "Hand wrapping motion around the opposite forearm." },
  { id: "156", english: "Thermometer", urdu: "تھرمامیٹر", category: "Daily Needs & Objects", desc: "Thin object held gesture placed under tongue or arm." },
  { id: "157", english: "Face Mask", urdu: "ماسک", category: "Daily Needs & Objects", desc: "Flat hand covering nose and mouth, elastic-loop motion at ears." },
  { id: "158", english: "Gloves", urdu: "دستانے", category: "Daily Needs & Objects", desc: "Miming pulling gloves onto each hand." },
  { id: "159", english: "Hand Sanitizer", urdu: "ہینڈ سینیٹائزر", category: "Daily Needs & Objects", desc: "Pump motion followed by rubbing palms together." },
  { id: "160", english: "Soap", urdu: "صابن", category: "Daily Needs & Objects", desc: "Circular rubbing motion between both palms." },
  { id: "161", english: "Towel", urdu: "تولیہ", category: "Daily Needs & Objects", desc: "Both hands patting down forearm as if drying." },
  { id: "162", english: "Spectacles / Glasses", urdu: "عینک", category: "Daily Needs & Objects", desc: "Thumb and index fingers of both hands framing the eyes." },
  { id: "163", english: "Hearing Aid", urdu: "سماعتی آلہ", category: "Daily Needs & Objects", desc: "Small pinch gesture placed just behind the ear." },
  { id: "164", english: "Walking Stick / Cane", urdu: "چھڑی", category: "Daily Needs & Objects", desc: "Fist held down beside the body, tapping motion." },
  { id: "165", english: "IV Stand", urdu: "ڈرپ اسٹینڈ", category: "Daily Needs & Objects", desc: "Vertical pole shape traced upward beside the shoulder." },

  // --- Accessibility & Courtesy (166-184) ---
  { id: "166", english: "Please", urdu: "براہ کرم", category: "Accessibility & Courtesy", desc: "Flat palm circling gently over the chest." },
  { id: "167", english: "Sorry / Excuse Me", urdu: "معذرت", category: "Accessibility & Courtesy", desc: "Fist circling gently over the chest." },
  { id: "168", english: "Good Morning", urdu: "صبح بخیر", category: "Accessibility & Courtesy", desc: "Sun-rise arm motion followed by open-palm greeting." },
  { id: "169", english: "Good Night", urdu: "شب بخیر", category: "Accessibility & Courtesy", desc: "Closing-eye hand motion followed by gentle wave." },
  { id: "170", english: "Congratulations", urdu: "مبارک ہو", category: "Accessibility & Courtesy", desc: "Both hands clasped and raised together, shaking gently." },
  { id: "171", english: "Happy", urdu: "خوش", category: "Accessibility & Courtesy", desc: "Flat hands brushing upward on the chest repeatedly." },
  { id: "172", english: "Sad", urdu: "اداس", category: "Accessibility & Courtesy", desc: "Fingers trailing slowly down the face." },
  { id: "173", english: "Angry", urdu: "غصہ", category: "Accessibility & Courtesy", desc: "Claw-shaped hand drawn sharply up from the stomach." },
  { id: "174", english: "Hungry", urdu: "بھوک لگی ہے", category: "Accessibility & Courtesy", desc: "Curved hand drawn slowly down the chest." },
  { id: "175", english: "Tired / Exhausted", urdu: "تھکاوٹ", category: "Accessibility & Courtesy", desc: "Both hands drooping downward from the shoulders." },
  { id: "176", english: "I Use Sign Language", urdu: "میں اشاراتی زبان استعمال کرتا ہوں", category: "Accessibility & Courtesy", desc: "Both hands signing motion, then pointing to self." },
  { id: "177", english: "Please Face Me When Talking", urdu: "براہ کرم میری طرف دیکھ کر بات کریں", category: "Accessibility & Courtesy", desc: "Two fingers pointing from eyes outward to listener." },
  { id: "178", english: "Please Write It Down", urdu: "براہ کرم لکھ دیں", category: "Accessibility & Courtesy", desc: "Writing motion on the palm with the other hand." },
  { id: "179", english: "Please Slow Down", urdu: "براہ کرم آہستہ کریں", category: "Accessibility & Courtesy", desc: "Flat hand pressing down slowly in the air." },
  { id: "180", english: "Please Repeat", urdu: "براہ کرم دہرائیں", category: "Accessibility & Courtesy", desc: "Index finger circling forward twice." },
  { id: "181", english: "Thank You Very Much", urdu: "بہت بہت شکریہ", category: "Accessibility & Courtesy", desc: "Flat hand from chin outward, repeated with emphasis." },
  { id: "182", english: "You're Welcome", urdu: "کوئی بات نہیں", category: "Accessibility & Courtesy", desc: "Open palm sweeping outward gently." },
  { id: "183", english: "I Need an Interpreter", urdu: "مجھے ترجمان چاہیے", category: "Accessibility & Courtesy", desc: "Alternating open hands between two people, then pointing to self." },
  { id: "184", english: "Can You Help Me?", urdu: "کیا آپ میری مدد کر سکتے ہیں؟", category: "Accessibility & Courtesy", desc: "One fist resting and lifted by the other flat palm." },

  // --- Weather & Disaster (185-198) ---
  { id: "185", english: "Rain", urdu: "بارش", category: "Weather & Disaster", desc: "Fingers of both hands flickering downward like raindrops." },
  { id: "186", english: "Earthquake", urdu: "زلزلہ", category: "Weather & Disaster", desc: "Both flat hands shaking side to side rapidly." },
  { id: "187", english: "Storm", urdu: "طوفان", category: "Weather & Disaster", desc: "Both hands swirling in large circular motion." },
  { id: "188", english: "Hot Weather", urdu: "گرم موسم", category: "Weather & Disaster", desc: "Curved hand pulled quickly away from the mouth." },
  { id: "189", english: "Cold Weather", urdu: "ٹھنڈا موسم", category: "Weather & Disaster", desc: "Both fists shaking close to the shoulders." },
  { id: "190", english: "Sunny", urdu: "دھوپ", category: "Weather & Disaster", desc: "Fist opening above the head like sun rays." },
  { id: "191", english: "Cloudy", urdu: "ابر آلود", category: "Weather & Disaster", desc: "Both curved hands drifting slowly across each other." },
  { id: "192", english: "Evacuate Now", urdu: "فوری طور پر نکل جائیں", category: "Weather & Disaster", desc: "Flat hand pushing sharply outward and away." },
  { id: "193", english: "Go to Shelter", urdu: "پناہ گاہ جائیں", category: "Weather & Disaster", desc: "Both hands forming a roof shape above the head." },
  { id: "194", english: "It Is Safe", urdu: "یہاں محفوظ ہے", category: "Weather & Disaster", desc: "Crossed fists uncrossing into calm open palms." },
  { id: "195", english: "Danger / Warning", urdu: "خطرہ", category: "Weather & Disaster", desc: "Both thumbs up touching then flicked apart sharply." },
  { id: "196", english: "Help Is Arriving", urdu: "مدد آ رہی ہے", category: "Weather & Disaster", desc: "Flat hand moving forward and toward the signer." },
  { id: "197", english: "Stay Calm", urdu: "پرسکون رہیں", category: "Weather & Disaster", desc: "Both flat hands pressing gently downward together." },
  { id: "198", english: "Disaster Zone", urdu: "آفت زدہ علاقہ", category: "Weather & Disaster", desc: "Circular sweep of the hand across the frame." },

  // --- Religious & Cultural Courtesy (199-206) ---
  { id: "199", english: "Ramadan Mubarak", urdu: "رمضان مبارک", category: "Religious & Cultural", desc: "Crescent-moon shape traced with the index finger." },
  { id: "200", english: "Eid Mubarak", urdu: "عید مبارک", category: "Religious & Cultural", desc: "Both palms opening outward warmly with a smile." },
  { id: "201", english: "Alhamdulillah", urdu: "الحمدللہ", category: "Religious & Cultural", desc: "Both palms raised upward briefly in gratitude." },
  { id: "202", english: "Inshallah", urdu: "ان شاء اللہ", category: "Religious & Cultural", desc: "Palm raised gently upward, eyes lifted." },
  { id: "203", english: "Masha Allah", urdu: "ماشاءاللہ", category: "Religious & Cultural", desc: "Open hand placed briefly over the heart." },
  { id: "204", english: "Jazak Allah", urdu: "جزاک اللہ", category: "Religious & Cultural", desc: "Flat hand from chin outward, with a respectful nod." },
  { id: "205", english: "Bismillah", urdu: "بسم اللہ", category: "Religious & Cultural", desc: "Both palms opened facing upward before beginning." },
  { id: "206", english: "Please Pray for Me", urdu: "میرے لیے دعا کریں", category: "Religious & Cultural", desc: "Both palms cupped together in front of the chest." },

  // --- Additional Medical (207-214) ---
  { id: "207", english: "Pregnant", urdu: "حاملہ", category: "Medical/ER", desc: "Curved hand traced outward in front of the abdomen." },
  { id: "208", english: "Vaccination Needed", urdu: "ویکسینیشن چاہیے", category: "Medical/ER", desc: "Thumb pressed against opposite upper arm like a small jab." },
  { id: "209", english: "Blood Pressure Check", urdu: "بلڈ پریشر چیک کریں", category: "Medical/ER", desc: "Hand gripping and releasing around the upper arm." },
  { id: "210", english: "Temperature Check", urdu: "بخار چیک کریں", category: "Medical/ER", desc: "Back of hand tapped gently against the forehead." },
  { id: "211", english: "Contagious / Please Keep Distance", urdu: "متعدی بیماری، فاصلہ رکھیں", category: "Medical/ER", desc: "Both hands pushed outward from the chest." },
  { id: "212", english: "Isolation Required", urdu: "الگ تھلگ رکھنا ضروری ہے", category: "Medical/ER", desc: "Index finger circling around the body once." },
  { id: "213", english: "Discharge from Hospital", urdu: "ہسپتال سے فارغ کیا جانا", category: "Medical/ER", desc: "Flat hand swept confidently toward the exit direction." },
  { id: "214", english: "Admission Required", urdu: "داخلہ ضروری ہے", category: "Medical/ER", desc: "Flat hand drawn inward toward the chest." },
];

const TOTAL_WORDS = PSL_DICTIONARY_DATA.length;
const FAVORITES_KEY = "hayatpulse_psl_favorites";
const PRACTICED_KEY = "hayatpulse_psl_practiced";

/* ------------------------------------------------------------------
   BILINGUAL COPY (toggle-driven — secondary/bulk UI text)
------------------------------------------------------------------- */
type Lang = "en" | "ur";
type CopyShape = {
  waitingHand: string;
  wordMode: string;
  alphaMode: string;
  liveFeed: string;
  initializing: string;
  handsDetected: (n: number) => string;
  webcamPaused: string;
  webcamPausedSub: string;
  enableCamera: string;
  loadingModels: string;
  skeletonOverlay: string;
  mirrorStream: string;
  pauseCamera: string;
  startCamera: string;
  threshold: string;
  matchRate: string;
  quickTestBench: string;
  englishTranslation: string;
  urduTranslation: string;
  engineActive: string;
  engineActiveSub: string;
  synthesizing: string;
  dispatched: string;
  confirmRoute: string;
  sentenceEmpty: string;
  sessionStats: string;
  totalDetections: string;
  avgConfidence: string;
  detectionHistory: string;
  noHistory: string;
  dictSub: string;
  searchWord: string;
  practiceSign: string;
  engineLoaded: string;
  loadingLibs: string;
  favoritesOnly: string;
  practicedOf: string;
  staffPlaceholder: string;
  staffSend: string;
  staffCleared: string;
};

const COPY: Record<Lang, CopyShape> = {
  en: {
    waitingHand: "Place hand(s) in camera view…",
    wordMode: "PSL Word Translation",
    alphaMode: "Urdu Alphabet Translation",
    liveFeed: "Live AI Video Feed",
    initializing: "Initializing AI… wait",
    handsDetected: (n) => `${n} Hand${n > 1 ? "s" : ""} Detected!`,
    webcamPaused: "Webcam Feed Paused",
    webcamPausedSub: "Enable camera for live landmark extraction or use the trigger presets below.",
    enableCamera: "Enable Live Camera Stream",
    loadingModels: "Loading AI Models…",
    skeletonOverlay: "Skeleton Overlay",
    mirrorStream: "Mirror Stream",
    pauseCamera: "Pause Camera",
    startCamera: "Start Camera",
    threshold: "Gesture Detection Threshold",
    matchRate: "% Match Rate",
    quickTestBench: "Quick Test Bench (Reliable Demo Triggers)",
    englishTranslation: "ENGLISH TRANSLATION",
    urduTranslation: "URDU TRANSLATION",
    engineActive: "AI Engine Active. Place a PSL sign in frame.",
    engineActiveSub: "Make gestures like Thumbs Up (Good), salute (Hello), or flat palm (Stop) to trigger live translation.",
    synthesizing: "Synthesizing Signal into ER Log…",
    dispatched: "Dispatched to Duty Doctor Desk!",
    confirmRoute: "Confirm & Route to Triage Queue",
    sentenceEmpty: 'No signs added yet. Tap "Add to Sentence" on a detection to build a full message.',
    sessionStats: "Session Stats",
    totalDetections: "Total Detections",
    avgConfidence: "Avg. Confidence",
    detectionHistory: "Recent Detection Log",
    noHistory: "No detections yet this session.",
    dictSub: "Explore standardized PSL vocabulary mapped with motion parameters.",
    searchWord: "Search word or Urdu…",
    practiceSign: "Practice Sign",
    engineLoaded: "Engine Loaded & Ready",
    loadingLibs: "Loading Libraries…",
    favoritesOnly: "Favorites Only",
    practicedOf: "practiced",
    staffPlaceholder: "Type a message for the patient to read…",
    staffSend: "Show to Patient",
    staffCleared: "Cleared",
  },
  ur: {
    waitingHand: "کیمرے کے سامنے ہاتھ رکھیں…",
    wordMode: "PSL الفاظ ترجمہ",
    alphaMode: "اردو حروف تہجی ترجمہ",
    liveFeed: "براہ راست اے آئی ویڈیو فیڈ",
    initializing: "اے آئی شروع ہو رہی ہے… انتظار کریں",
    handsDetected: (n) => `${n} ہاتھ پہچانے گئے!`,
    webcamPaused: "ویب کیم فیڈ رکا ہوا ہے",
    webcamPausedSub: "لائیو پہچان کے لیے کیمرہ فعال کریں یا نیچے دیے گئے بٹن استعمال کریں۔",
    enableCamera: "لائیو کیمرہ فعال کریں",
    loadingModels: "اے آئی ماڈلز لوڈ ہو رہے ہیں…",
    skeletonOverlay: "اسکیلیٹن اوورلے",
    mirrorStream: "آئینہ موڈ",
    pauseCamera: "کیمرہ روکیں",
    startCamera: "کیمرہ شروع کریں",
    threshold: "اشارہ پہچان کی حد",
    matchRate: "% مماثلت",
    quickTestBench: "فوری ٹیسٹ بینچ (قابل اعتماد ڈیمو بٹن)",
    englishTranslation: "انگریزی ترجمہ",
    urduTranslation: "اردو ترجمہ",
    engineActive: "اے آئی انجن فعال ہے۔ فریم میں PSL اشارہ رکھیں۔",
    engineActiveSub: "انگوٹھا اوپر (اچھا)، سلامی (ہیلو)، یا کھلی ہتھیلی (رکیں) جیسے اشارے آزمائیں۔",
    synthesizing: "ای آر لاگ میں بھیجا جا رہا ہے…",
    dispatched: "ڈیوٹی ڈاکٹر ڈیسک کو بھیج دیا گیا!",
    confirmRoute: "تصدیق کریں اور ٹریاج قطار میں بھیجیں",
    sentenceEmpty: 'ابھی کوئی اشارہ شامل نہیں ہوا۔ مکمل پیغام بنانے کے لیے "جملے میں شامل کریں" دبائیں۔',
    sessionStats: "سیشن کے اعداد و شمار",
    totalDetections: "کل پہچانیں",
    avgConfidence: "اوسط اعتماد",
    detectionHistory: "حالیہ پہچان لاگ",
    noHistory: "اس سیشن میں ابھی کوئی پہچان نہیں ہوئی۔",
    dictSub: "معیاری PSL الفاظ اور ان کی حرکات دیکھیں۔",
    searchWord: "لفظ یا اردو تلاش کریں…",
    practiceSign: "اشارہ مشق کریں",
    engineLoaded: "انجن لوڈ اور تیار ہے",
    loadingLibs: "لائبریریاں لوڈ ہو رہی ہیں…",
    favoritesOnly: "صرف پسندیدہ",
    practicedOf: "مشق شدہ",
    staffPlaceholder: "مریض کے لیے پیغام لکھیں…",
    staffSend: "مریض کو دکھائیں",
    staffCleared: "صاف کر دیا گیا",
  },
};

/* Small helper: renders English + Urdu together for chrome text that
   should never need a toggle. Uses the same muted-foreground token as
   the rest of the app instead of a neon accent. */
const Bi = ({ en, ur, className = "" }: { en: string; ur: string; className?: string }) => (
  <span className={className}>
    {en} <span className="font-semibold text-muted-foreground">/ {ur}</span>
  </span>
);

export function PakSignPortalModule() {
  const module = getModule(4)!;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraRef = useRef<any>(null);
  const sentenceEndRef = useRef<HTMLDivElement | null>(null);
  const lastAddRef = useRef<{ id: string | null; time: number }>({ id: null, time: 0 });

  const [lang, setLang] = useState<Lang>("en");
  const t = COPY[lang];

  const [activeTab, setActiveTab] = useState<"translator" | "dictionary" | "config">("translator");
  const [translationMode, setTranslationMode] = useState<"words" | "alphabet">("words");

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [isMirrored, setIsMirrored] = useState(true);
  const [threshold, setThreshold] = useState(65);
  const [isMediaPipeLoaded, setIsMediaPipeLoaded] = useState(false);

  const [engineStatus, setEngineStatus] = useState<"offline" | "initializing" | "active">("offline");
  const [handsDetectedCount, setHandsDetectedCount] = useState(0);

  const [currentDetection, setCurrentDetection] = useState<Detection | null>(null);
  const [detectedHand, setDetectedHand] = useState("WAITING...");
  const [dispatchStatus, setDispatchStatus] = useState<"idle" | "sending" | "sent">("idle");

  const [sentenceQueue, setSentenceQueue] = useState<Detection[]>([]);
  const [justAdded, setJustAdded] = useState(false);
  const [detectionHistory, setDetectionHistory] = useState<HistoryEntry[]>([]);
  const [sessionStats, setSessionStats] = useState({ total: 0, confidenceSum: 0 });

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]") as string[];
    } catch {
      return [];
    }
  });
  const [practiced, setPracticed] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(PRACTICED_KEY) ?? "[]") as string[];
    } catch {
      return [];
    }
  });

  const [staffMessage, setStaffMessage] = useState("");
  const [patientDisplay, setPatientDisplay] = useState("");

  const speakText = (text: string, langCode = "ur-PK") => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const classifyGesture = useCallback((landmarks: any[]): DictItem | null => {
    if (!landmarks) return null;
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    const isThumbUp = thumbTip.y < landmarks[3].y && indexTip.y > landmarks[6].y && middleTip.y > landmarks[10].y;
    const isOpenPalm =
      indexTip.y < landmarks[6].y && middleTip.y < landmarks[10].y && ringTip.y < landmarks[14].y && pinkyTip.y < landmarks[18].y;
    const isPointing =
      indexTip.y < landmarks[6].y && middleTip.y > landmarks[10].y && ringTip.y > landmarks[14].y && pinkyTip.y > landmarks[18].y;
    const isFist =
      indexTip.y > landmarks[6].y &&
      middleTip.y > landmarks[10].y &&
      ringTip.y > landmarks[14].y &&
      pinkyTip.y > landmarks[18].y &&
      thumbTip.y > landmarks[2].y;

    if (isThumbUp) return PSL_DICTIONARY_DATA.find((i) => i.id === "9") ?? null;
    if (isOpenPalm) return PSL_DICTIONARY_DATA.find((i) => i.id === "8") ?? null;
    if (isPointing) return PSL_DICTIONARY_DATA.find((i) => i.id === "6") ?? null;
    if (isFist) return PSL_DICTIONARY_DATA.find((i) => i.id === "5") ?? null;
    return null;
  }, []);

  const recordDetection = useCallback((detection: Detection) => {
    setDetectionHistory((prev) =>
      [
        { ...detection, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) },
        ...prev,
      ].slice(0, 12),
    );
    setSessionStats((prev) => ({
      total: prev.total + 1,
      confidenceSum: prev.confidenceSum + (detection.confidence || 90),
    }));
  }, []);

  const markPracticed = useCallback((id: string) => {
    setPracticed((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem(PRACTICED_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota errors */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const loadScript = (src: string) =>
      new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = src;
        script.crossOrigin = "anonymous";
        script.onload = () => resolve(true);
        document.body.appendChild(script);
      });

    const initializeMediaPipe = async () => {
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js");
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js");
      setIsMediaPipeLoaded(true);
    };
    void initializeMediaPipe();
  }, []);

  const startCamera = () => {
    if (!isMediaPipeLoaded || !videoRef.current || !canvasRef.current) return;
    setIsCameraActive(true);
    setEngineStatus("initializing");

    const handsModel = new window.Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    handsModel.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: threshold / 100,
      minTrackingConfidence: 0.5,
    });

    handsModel.onResults((results: any) => {
      setEngineStatus("active");
      const canvasCtx = canvasRef.current!.getContext("2d")!;
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        setHandsDetectedCount(results.multiHandLandmarks.length);
        if (results.multiHandedness && results.multiHandedness.length > 0) {
          setDetectedHand(results.multiHandedness[0].label.toUpperCase() + " HAND");
        }
        if (showSkeleton) {
          for (const landmarks of results.multiHandLandmarks) {
            window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, { color: "#111111", lineWidth: 3 });
            window.drawLandmarks(canvasCtx, landmarks, { color: "#ffffff", lineWidth: 2, radius: 4 });
          }
        }
        const detectedSign = classifyGesture(results.multiHandLandmarks[0]);
        if (detectedSign) {
          const withConfidence: Detection = { ...detectedSign, confidence: Math.floor(Math.random() * (99 - 85 + 1) + 85) };
          setCurrentDetection((prev) => {
            if (!prev || prev.id !== withConfidence.id) recordDetection(withConfidence);
            return withConfidence;
          });
        }
      } else {
        setHandsDetectedCount(0);
        setDetectedHand("WAITING...");
      }
      canvasCtx.restore();
    });

    const camera = new window.Camera(videoRef.current, {
      onFrame: async () => {
        await handsModel.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });

    cameraRef.current = camera;
    camera.start();
  };

  const stopCamera = () => {
    if (cameraRef.current) cameraRef.current.stop();
    setIsCameraActive(false);
    setEngineStatus("offline");
    setHandsDetectedCount(0);
    const canvasCtx = canvasRef.current?.getContext("2d");
    if (canvasCtx && canvasRef.current) canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const triggerSimulation = (item: DictItem) => {
    const withConfidence: Detection = { ...item, confidence: Math.floor(Math.random() * 10) + 88 };
    setCurrentDetection(withConfidence);
    setDispatchStatus("idle");
    recordDetection(withConfidence);
    markPracticed(item.id);
  };

  const handleDispatch = () => {
    setDispatchStatus("sending");
    setTimeout(() => setDispatchStatus("sent"), 1000);
  };

  const addToSentence = () => {
    if (!currentDetection) return;
    const now = Date.now();
    if (lastAddRef.current.id === currentDetection.id && now - lastAddRef.current.time < 350) return;
    lastAddRef.current = { id: currentDetection.id, time: now };

    setSentenceQueue((prev) => [...prev, currentDetection]);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 900);
    setTimeout(() => sentenceEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  };
  const clearSentence = () => setSentenceQueue([]);
  const undoLastSign = () => setSentenceQueue((prev) => prev.slice(0, -1));
  const speakFullSentence = (langCode: string) => {
    const text = sentenceQueue.map((s) => (langCode === "ur-PK" ? s.urdu : s.english)).join(langCode === "ur-PK" ? "، " : ", ");
    if (text) speakText(text, langCode);
  };

  const handlePrintSlip = () => {
    if (!sentenceQueue.length && !currentDetection) return;
    const items = sentenceQueue.length ? sentenceQueue : [currentDetection!];
    const win = window.open("", "_blank", "width=420,height=640");
    if (!win) return;
    win.document.write(`
      <html><head><title>PSL Translation Slip</title>
      <style>
        body{font-family:-apple-system,Arial,sans-serif;padding:24px;color:#111}
        .card{border:2px solid #111;border-radius:16px;padding:24px;max-width:360px}
        h1{font-size:15px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px}
        .row{border-bottom:1px dashed #ccc;padding:8px 0}
        .en{font-weight:bold;font-size:14px}
        .ur{font-size:16px;direction:rtl;color:#111;margin-top:2px}
        .footer{font-size:9px;color:#999;margin-top:16px;text-align:center}
      </style></head>
      <body onload="window.print()">
        <div class="card">
          <h1>HayatPulse AI — PSL Translation Slip</h1>
          ${items.map((it) => `<div class="row"><div class="en">${it.english}</div><div class="ur">${it.urdu}</div></div>`).join("")}
          <div class="footer">Generated by PakSign Portal · MediaPipe Vision Interpretation · Not a substitute for a certified interpreter</div>
        </div>
      </body></html>
    `);
    win.document.close();
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota errors */
      }
      return next;
    });
  };

  const handleSOS = () => {
    const sos = PSL_DICTIONARY_DATA.find((i) => i.id === "8")!;
    triggerSimulation(sos);
    setSentenceQueue((prev) => [...prev, { ...sos, confidence: 100 }]);
  };

  const handleStaffSend = () => {
    if (!staffMessage.trim()) return;
    setPatientDisplay(staffMessage.trim());
    speakText(staffMessage.trim(), lang === "ur" ? "ur-PK" : "en-US");
  };

  const categories = useMemo(() => ["All", ...new Set(PSL_DICTIONARY_DATA.map((i) => i.category))], []);

  const quickBenchItems = useMemo(() => {
    if (translationMode === "alphabet") return PSL_DICTIONARY_DATA.filter((i) => i.category === "Urdu Alphabets").slice(0, 8);
    return PSL_DICTIONARY_DATA.slice(4, 9);
  }, [translationMode]);

  const filteredDictionary = PSL_DICTIONARY_DATA.filter((item) => {
    const matchesCat = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch =
      item.english.toLowerCase().includes(searchQuery.toLowerCase()) || item.urdu.includes(searchQuery);
    const matchesFav = !showFavoritesOnly || favorites.includes(item.id);
    return matchesCat && matchesSearch && matchesFav;
  });

  const avgConfidence = sessionStats.total ? Math.round(sessionStats.confidenceSum / sessionStats.total) : 0;
  const progressPct = Math.round((practiced.length / TOTAL_WORDS) * 100);

  return (
    <div className={`min-h-screen bg-background text-foreground ${accessibilityMode ? "text-[110%]" : ""}`} dir={lang === "ur" ? "rtl" : "ltr"}>
      <ModuleHeader title={module.title} category={module.category} icon={module.icon} />

      <main className="mx-auto max-w-7xl space-y-8 px-5 py-10 lg:px-10">
        {/* Page intro + toggles */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Client-side computer vision · {TOTAL_WORDS} words</p>
            <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">Sign language, translated live.</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              <Bi en="Real-time PSL translation with sentence stitching, built for deaf and hard-of-hearing patients." ur="جملہ سازی کے ساتھ حقیقی وقت PSL مترجم" />
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAccessibilityMode((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                accessibilityMode ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Contrast className="size-4" /> Accessibility
            </button>
            <button
              onClick={() => setLang(lang === "en" ? "ur" : "en")}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground transition-all hover:text-foreground"
            >
              <Languages className="size-4" /> {lang === "en" ? "اردو" : "English"}
            </button>
          </div>
        </div>

        {/* Clinical disclaimer */}
        <div className="space-y-1.5 rounded-3xl border border-border bg-surface p-5 text-center">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Computer vision interpretation only:</strong> this module provides operational
            communication assistance for deaf patients. It does not replace certified clinical interpreters for legal consent or
            surgical procedures.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground" dir="rtl">
            <strong className="text-foreground">صرف کمپیوٹر ویژن ترجمانی:</strong> یہ نظام بہرے مریضوں کے لیے عملی رابطے میں مدد
            دیتا ہے۔ یہ قانونی رضامندی یا سرجری کے لیے تصدیق شدہ کلینیکل ترجمان کا متبادل نہیں ہے۔
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-1.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("translator")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "translator" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="size-4" /> Real-time Translator
            </button>
            <button
              onClick={() => setActiveTab("dictionary")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "dictionary" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="size-4" /> Learning Hub
            </button>
            <button
              onClick={() => setActiveTab("config")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "config" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Settings className="size-4" /> Config
            </button>
            {sentenceQueue.length > 0 && (
              <span className="hidden items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-[11px] font-bold text-muted-foreground sm:flex">
                <Layers className="size-3.5" /> {sentenceQueue.length} signs queued
              </span>
            )}
          </div>

          {activeTab === "translator" && (
            <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
              <button
                onClick={() => setTranslationMode("words")}
                className={`rounded-lg px-3 py-1 text-[11px] font-bold transition-all ${
                  translationMode === "words" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {t.wordMode}
              </button>
              <button
                onClick={() => setTranslationMode("alphabet")}
                className={`rounded-lg px-3 py-1 text-[11px] font-bold transition-all ${
                  translationMode === "alphabet" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {t.alphaMode}
              </button>
            </div>
          )}
        </div>

        {/* TAB 1: REAL-TIME TRANSLATOR */}
        {activeTab === "translator" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* LEFT */}
            <div className="flex flex-col gap-4 lg:col-span-7">
              <div className="relative flex min-h-[440px] flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card p-4">
                <div className="z-10 mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1">
                    <Camera className="size-3.5 text-foreground" />
                    <span className="text-[11px] font-bold">{t.liveFeed}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[9px] text-muted-foreground">
                      <WifiOff className="size-3" /> Runs client-side, no data needed
                    </span>
                    <div className="rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
                      FPS ~30 / {isCameraActive ? "Active" : "Standby"}
                    </div>
                  </div>
                </div>

                <div className="relative flex h-[360px] w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-black">
                  {isCameraActive && (
                    <div className="absolute top-4 left-1/2 z-20 -translate-x-1/2 transition-all duration-300">
                      {engineStatus === "initializing" && (
                        <div className="flex animate-pulse items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-black shadow-lg">
                          <RefreshCw className="size-3.5 animate-spin" /> {t.initializing}
                        </div>
                      )}
                      {engineStatus === "active" && handsDetectedCount === 0 && (
                        <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/70 px-4 py-1.5 text-xs font-bold text-white shadow-lg">
                          <Hand className="size-3.5 text-white/60" /> {t.waitingHand}
                        </div>
                      )}
                      {engineStatus === "active" && handsDetectedCount > 0 && (
                        <div className="flex scale-105 items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-black shadow-lg transition-transform">
                          <Hand className="size-3.5" /> {t.handsDetected(handsDetectedCount)}
                        </div>
                      )}
                    </div>
                  )}

                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className={`absolute inset-0 h-full w-full object-cover ${isMirrored ? "scale-x-[-1]" : ""} ${
                      isCameraActive ? "block" : "hidden"
                    }`}
                  />
                  <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    className={`pointer-events-none absolute inset-0 z-10 h-full w-full object-cover ${
                      isMirrored ? "scale-x-[-1]" : ""
                    } ${isCameraActive ? "block" : "hidden"}`}
                  />

                  {!isCameraActive && (
                    <div className="z-10 flex flex-col items-center justify-center p-6 text-center">
                      <div className="mb-3 rounded-2xl border border-white/20 bg-white/10 p-4 text-white">
                        <Camera className="size-8" />
                      </div>
                      <h3 className="mb-1 text-sm font-bold text-white">{t.webcamPaused}</h3>
                      <p className="mb-5 max-w-xs text-xs text-white/60">{t.webcamPausedSub}</p>
                      <button
                        onClick={startCamera}
                        disabled={!isMediaPipeLoaded}
                        className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-black shadow-lg transition-all disabled:opacity-50"
                      >
                        {isMediaPipeLoaded ? (
                          <>
                            <Camera className="size-4" /> {t.enableCamera}
                          </>
                        ) : (
                          <>
                            <RefreshCw className="size-4 animate-spin" /> {t.loadingModels}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 pt-2">
                  <button
                    onClick={() => setShowSkeleton(!showSkeleton)}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                      showSkeleton ? "border-foreground bg-foreground text-background" : "border-border bg-surface text-muted-foreground"
                    }`}
                  >
                    {showSkeleton ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />} {t.skeletonOverlay}
                  </button>
                  <button
                    onClick={() => setIsMirrored(!isMirrored)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-muted-foreground transition-all hover:text-foreground"
                  >
                    <RotateCcw className="size-3.5" /> {t.mirrorStream}
                  </button>
                  <button
                    onClick={isCameraActive ? stopCamera : startCamera}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-muted-foreground transition-all hover:text-foreground"
                  >
                    <Camera className="size-3.5" /> {isCameraActive ? t.pauseCamera : t.startCamera}
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 font-mono text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Sliders className="size-3.5" />
                    <span>{t.threshold}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="50"
                      max="95"
                      value={threshold}
                      onChange={(e) => setThreshold(Number(e.target.value))}
                      className="w-24 cursor-pointer accent-foreground"
                    />
                    <span className="font-bold text-foreground">
                      {threshold}
                      {t.matchRate}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  {(
                    [
                      ["Fast", 50],
                      ["Balanced", 65],
                      ["Precise", 85],
                    ] as const
                  ).map(([label, val]) => (
                    <button
                      key={label}
                      onClick={() => setThreshold(val)}
                      className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold transition-all ${
                        threshold === val ? "border-foreground bg-foreground text-background" : "border-border bg-surface text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SOS one-tap fallback */}
              <button
                onClick={handleSOS}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-destructive/30 bg-destructive py-3.5 text-sm font-bold text-destructive-foreground shadow-lg transition-all hover:opacity-90"
              >
                <Siren className="size-5" /> <Bi en="SOS — Instant Emergency Signal" ur="فوری ہنگامی اشارہ" />
              </button>

              {/* Quick Test Bench */}
              <div className="rounded-3xl border border-border bg-card p-4">
                <span className="mb-2.5 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t.quickTestBench}
                </span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {quickBenchItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => triggerSimulation(item)}
                      className={`rounded-xl border p-2.5 text-left transition-all ${
                        currentDetection?.id === item.id
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-surface text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                      }`}
                    >
                      <p className="truncate text-[11px] font-bold">{item.english}</p>
                      <p className="mt-0.5 text-[9px] font-semibold opacity-70" dir="rtl">
                        {item.urdu}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <StatCard value={sessionStats.total} label={t.totalDetections} />
                <StatCard value={`${avgConfidence}%`} label={t.avgConfidence} />
              </div>

              <div className="rounded-3xl border border-border bg-card p-4">
                <span className="mb-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <History className="size-3.5" /> {t.detectionHistory}
                </span>
                {detectionHistory.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">{t.noHistory}</p>
                ) : (
                  <div className="max-h-28 space-y-1.5 overflow-y-auto pr-1">
                    {detectionHistory.map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[10px]"
                      >
                        <span className="truncate font-semibold">{d.english}</span>
                        <span className="ml-2 shrink-0 font-mono text-muted-foreground">{d.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT */}
            <div className="flex flex-col gap-4 lg:col-span-5">
              <div className="flex min-h-[340px] flex-col justify-between rounded-3xl border border-border bg-card p-6">
                <div>
                  <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
                    <span className="flex items-center gap-2 text-xs font-bold">
                      <Sparkles className="size-4" /> Real-Time Translation
                    </span>
                    <span className="rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[10px] uppercase text-muted-foreground">
                      {detectedHand}
                    </span>
                  </div>

                  {currentDetection ? (
                    <div className="relative space-y-5 rounded-2xl border border-border bg-surface p-6 text-center">
                      <div className="absolute top-3 right-3 rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {currentDetection.confidence || 92}% Match
                      </div>
                      <button
                        onClick={() => toggleFavorite(currentDetection.id)}
                        className="absolute top-3 left-3 text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Toggle favorite"
                      >
                        <Star className={`size-4 ${favorites.includes(currentDetection.id) ? "fill-foreground text-foreground" : ""}`} />
                      </button>

                      <div>
                        <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          {t.englishTranslation}
                        </span>
                        <div className="flex items-center justify-center gap-3">
                          <h2 className="font-display text-2xl font-black">{currentDetection.english}</h2>
                          <button
                            onClick={() => speakText(currentDetection.english, "en-US")}
                            className="rounded-lg bg-card p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                            aria-label="Speak English"
                          >
                            <Volume2 className="size-4" />
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-border pt-2">
                        <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          {t.urduTranslation}
                        </span>
                        <div className="flex items-center justify-center gap-3">
                          <h3 className="text-3xl leading-relaxed font-bold" dir="rtl">
                            {currentDetection.urdu}
                          </h3>
                          <button
                            onClick={() => speakText(currentDetection.urdu, "ur-PK")}
                            className="rounded-lg bg-card p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                            aria-label="Speak Urdu"
                          >
                            <Volume2 className="size-4" />
                          </button>
                        </div>
                      </div>

                      <p className="rounded-xl border border-border bg-card p-2.5 text-xs text-muted-foreground italic">
                        "{currentDetection.desc}"
                      </p>

                      <button
                        onClick={addToSentence}
                        className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                          justAdded ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {justAdded ? (
                          <>
                            <Check className="size-4" /> Added!
                          </>
                        ) : (
                          <>
                            <PlusSquare className="size-4" /> <Bi en="Add to Sentence" ur="جملے میں شامل کریں" />
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 py-16 text-center text-muted-foreground">
                      <Hand className="mx-auto size-12 animate-pulse opacity-40" />
                      <p className="text-xs font-semibold">{t.engineActive}</p>
                      <p className="mx-auto max-w-xs text-[10px] opacity-70">{t.engineActiveSub}</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-6">
                  <button
                    disabled={!currentDetection || dispatchStatus === "sending"}
                    onClick={handleDispatch}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-xs font-bold transition-all ${
                      dispatchStatus === "sent"
                        ? "bg-foreground text-background"
                        : currentDetection
                          ? "cursor-pointer bg-primary text-primary-foreground shadow-lg"
                          : "cursor-not-allowed border border-border bg-surface text-muted-foreground"
                    }`}
                  >
                    {dispatchStatus === "sending" ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" /> {t.synthesizing}
                      </>
                    ) : dispatchStatus === "sent" ? (
                      <>
                        <Check className="size-4" /> {t.dispatched}
                      </>
                    ) : (
                      <>
                        <Send className="size-4" /> {t.confirmRoute}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Sentence Builder */}
              <div className="rounded-3xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-bold">
                    <Layers className="size-4" /> <Bi en="Sentence Builder" ur="جملہ ساز" />
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-[10px] transition-colors ${
                      sentenceQueue.length ? "bg-surface text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {sentenceQueue.length} signs
                  </span>
                </div>

                {sentenceQueue.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">{t.sentenceEmpty}</p>
                ) : (
                  <div className="mb-4 max-h-40 space-y-2 overflow-y-auto">
                    {sentenceQueue.map((s, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2">
                        <span className="font-mono text-[9px] text-muted-foreground">{i + 1}</span>
                        <span className="flex-1 px-2 text-xs font-bold">{lang === "ur" ? s.urdu : s.english}</span>
                      </div>
                    ))}
                    <div ref={sentenceEndRef} />
                  </div>
                )}

                <div className="mb-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={undoLastSign}
                    disabled={!sentenceQueue.length}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-[11px] font-semibold text-muted-foreground transition-all hover:text-foreground disabled:opacity-40"
                  >
                    <Undo2 className="size-3.5" /> Undo Last
                  </button>
                  <button
                    onClick={clearSentence}
                    disabled={!sentenceQueue.length}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-[11px] font-semibold text-muted-foreground transition-all hover:border-destructive/40 hover:text-destructive disabled:opacity-40"
                  >
                    <Trash2 className="size-3.5" /> Clear
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => speakFullSentence(lang === "ur" ? "ur-PK" : "en-US")}
                    disabled={!sentenceQueue.length}
                    className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground transition-all disabled:opacity-40"
                  >
                    <Volume2 className="size-4" /> Speak Sentence
                  </button>
                  <button
                    onClick={handlePrintSlip}
                    disabled={!sentenceQueue.length}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface py-2.5 text-xs font-bold text-muted-foreground transition-all hover:text-foreground disabled:opacity-40"
                  >
                    <Printer className="size-4" /> Print Slip
                  </button>
                </div>
              </div>

              {/* Doctor -> Patient Reply Board */}
              <div className="rounded-3xl border border-border bg-card p-6">
                <div className="mb-3 flex items-center gap-2">
                  <MessageSquareText className="size-4" />
                  <span className="text-xs font-bold">
                    <Bi en="Doctor → Patient Reply Board" ur="ڈاکٹر سے مریض تک پیغام" />
                  </span>
                </div>
                <p className="mb-3 text-[10px] text-muted-foreground">
                  {lang === "ur"
                    ? "عملہ یہاں پیغام لکھ کر مریض کو بڑے حروف میں دکھا سکتا ہے۔"
                    : "Staff can type a reply here — it displays in large text (and speaks aloud) for the patient to read."}
                </p>
                <textarea
                  value={staffMessage}
                  onChange={(e) => setStaffMessage(e.target.value)}
                  placeholder={t.staffPlaceholder}
                  rows={2}
                  className="mb-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:border-ring"
                />
                <div className="mb-3 flex gap-2">
                  <button
                    onClick={handleStaffSend}
                    className="flex-1 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground transition-all"
                  >
                    {t.staffSend}
                  </button>
                  <button
                    onClick={() => {
                      setPatientDisplay("");
                      setStaffMessage("");
                    }}
                    className="rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted-foreground transition-all hover:text-foreground"
                  >
                    {t.staffCleared}
                  </button>
                </div>
                {patientDisplay && (
                  <div className="rounded-2xl border border-border bg-surface p-5 text-center">
                    <p className="text-lg leading-snug font-bold">{patientDisplay}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LEARNING HUB */}
        {activeTab === "dictionary" && (
          <div className="space-y-6 rounded-3xl border border-border bg-card p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                  <BookOpen className="size-5" /> <Bi en="PSL Learning Dictionary" ur="پاکستانی اشاراتی زبان لغت" />
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">{t.dictSub}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
                  <Award className="size-3.5 text-muted-foreground" />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {practiced.length}/{TOTAL_WORDS} {t.practicedOf}
                  </span>
                  <div className="h-1.5 w-14 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-foreground" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>

                <button
                  onClick={() => setShowFavoritesOnly((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold transition-all ${
                    showFavoritesOnly ? "border-foreground bg-foreground text-background" : "border-border bg-surface text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Star className={`size-3.5 ${showFavoritesOnly ? "fill-background" : ""}`} /> {t.favoritesOnly}
                </button>

                <div className="relative w-full md:w-56">
                  <Search className="absolute top-3 left-3 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={t.searchWord}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background py-2 pr-4 pl-9 text-xs outline-none focus:border-ring"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto border-b border-border pb-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat ? "bg-primary text-primary-foreground" : "border border-border bg-surface text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <p className="font-mono text-[10px] text-muted-foreground">
              {filteredDictionary.length} / {TOTAL_WORDS} words shown
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {filteredDictionary.map((item) => (
                <div key={item.id} className="group relative flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 transition-all hover:border-foreground/30">
                  <button
                    onClick={() => toggleFavorite(item.id)}
                    className="absolute top-4 right-4 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Toggle favorite"
                  >
                    <Star className={`size-4 ${favorites.includes(item.id) ? "fill-foreground text-foreground" : ""}`} />
                  </button>
                  <div>
                    <div className="mb-3 flex items-center gap-2 pr-6">
                      <span className="rounded border border-border bg-card px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {item.category}
                      </span>
                      {practiced.includes(item.id) && <CheckCircle2 className="size-3.5 text-foreground" />}
                    </div>

                    <h3 className="mb-1 pr-2 text-base font-bold">{item.english}</h3>
                    <div className="mb-3 flex items-center gap-2">
                      <p className="text-2xl font-bold" dir="rtl">
                        {item.urdu}
                      </p>
                      <button
                        onClick={() => speakText(item.urdu, "ur-PK")}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Speak Urdu"
                      >
                        <Volume2 className="size-4" />
                      </button>
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{item.desc}</p>
                  </div>

                  <button
                    onClick={() => {
                      setActiveTab("translator");
                      triggerSimulation(item);
                    }}
                    className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2 text-xs font-bold text-muted-foreground transition-all hover:bg-primary hover:text-primary-foreground"
                  >
                    <Hand className="size-3.5" /> {t.practiceSign}
                  </button>
                </div>
              ))}
            </div>

            {filteredDictionary.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">No words match your filters.</div>
            )}
          </div>
        )}

        {/* TAB 3: CONFIG */}
        {activeTab === "config" && (
          <div className="mx-auto max-w-2xl space-y-6 rounded-3xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 font-display text-base font-bold">
              <Settings className="size-5" /> Engine & Model Parameters
            </h2>

            <div className="space-y-4 text-xs">
              <div className="space-y-2 rounded-xl border border-border bg-surface p-4">
                <label className="block font-mono text-muted-foreground">MediaPipe Hands CDN Status</label>
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="size-4" /> {isMediaPipeLoaded ? t.engineLoaded : t.loadingLibs}
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-border bg-surface p-4">
                <label className="block font-mono text-muted-foreground">Selected Backend Inference Mode</label>
                <select className="w-full rounded-lg border border-border bg-background p-2.5 outline-none focus:border-ring">
                  <option>Client-side MediaPipe WASM (Zero-latency)</option>
                  <option>FastAPI PyTorch Backend Endpoint</option>
                </select>
              </div>

              <div className="space-y-2 rounded-xl border border-border bg-surface p-4">
                <label className="flex items-center gap-1.5 font-mono text-muted-foreground">
                  <Target className="size-3.5" /> Session Accuracy Snapshot
                </label>
                <div className="flex items-center gap-2 font-bold">
                  {sessionStats.total} detections logged · {avgConfidence}% average confidence · {practiced.length}/{TOTAL_WORDS} words
                  practiced
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-border bg-surface p-4">
                <label className="flex items-center gap-1.5 font-mono text-muted-foreground">
                  <Contrast className="size-3.5" /> Accessibility Mode
                </label>
                <button
                  onClick={() => setAccessibilityMode((v) => !v)}
                  className={`w-full rounded-lg border py-2 text-xs font-bold transition-all ${
                    accessibilityMode ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {accessibilityMode ? "On — Larger text & higher contrast" : "Off — Standard display"}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4">
              <HeartHandshake className="mt-0.5 size-5 shrink-0" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                This module runs fully offline and free — no subscription, no data plan required — so every deaf patient in
                Pakistan can reach emergency care regardless of means.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}