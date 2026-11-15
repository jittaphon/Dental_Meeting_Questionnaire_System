import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, RefreshCw, RotateCcw, Send } from 'lucide-react';
import { Alert, Button, ConfigProvider, Popconfirm, Skeleton } from 'antd';
import { antdCfg, ThemeShell, glowBtn, SuccessBurst } from './DentalTheme'; // ปรับ path ให้ตรงโปรเจกต์

/* ---------- ตั้งค่า (แก้ให้ตรงกับงานจริง) ---------- */
const API_BASE =
  'https://pyodatahub.moph.go.th/datahub/pyo-kpi/backend/public/index.php/api/dental';

const ROUTES = {
  home: '/',
  tests: '/tests',
  certificate: '/certificate',
};

const TYPE_INFO = {
  PRE: { title: 'Pre-test', subtitle: 'แบบทดสอบก่อนการประชุม' },
  POST: { title: 'Post-test', subtitle: 'แบบทดสอบหลังการประชุม' },
};

/*
 * ชุดคำถาม: แบบทดสอบความรู้ SMART Technique และ SDF (11 ข้อ)
 * - id เป็น '1'–'11' ***ต้องแก้ $validQuestions ในระบบหลังบ้านให้รองรับ 1–11 ด้วย***
 * - ตัวเลือกเป็น A, B, C, D ($validOptions)
 * - Pre-test และ Post-test ใช้ชุดเดียวกัน
 *
 * เฉลย (สำหรับตั้งค่าตัวตรวจในหลังบ้าน):
 *   1:B  2:D  3:C  4:A  5:C  6:A  7:C  8:B  9:D  10:A  11:B
 */
const ALL_QUESTIONS = [
  {
    id: '1',
    text: 'ข้อใดอธิบายหลักการสำคัญของ Minimally Invasive Dentistry (MID) ได้ถูกต้องที่สุด',
    options: {
      A: 'กำจัดเนื้อฟันผุออกทั้งหมดเพื่อป้องกันการกลับมาเป็นซ้ำ',
      B: 'เก็บรักษาเนื้อฟันธรรมชาติให้มากที่สุดและเน้นการป้องกันโรค',
      C: 'เน้นการบูรณะฟันด้วยวัสดุที่มีความแข็งแรงสูงเป็นหลัก',
      D: 'รักษาเฉพาะรอยโรคที่มีอาการปวดเท่านั้น',
    },
  },
  {
    id: '2',
    text: 'ในการวางแผน SMART Technique มีส่วนประกอบสำคัญ 2 ชนิดที่ใช้ร่วมกันในการรักษาฟันผุ ทันตบุคลากรต้องการใช้คุณสมบัติของวัสดุให้สอดคล้องกับเป้าหมายการรักษา ข้อใดอธิบายบทบาทของวัสดุทั้งสองชนิดได้ครบถ้วนที่สุด',
    options: {
      A: 'SDF ใช้เพิ่มความแข็งแรงของวัสดุ ส่วน HVGIC ใช้กำจัดแบคทีเรียเพียงอย่างเดียว',
      B: 'SDF และ HVGIC มีหน้าที่เหมือนกันและใช้ทดแทนกันได้',
      C: 'SDF ใช้เป็นวัสดุบูรณะหลัก ส่วน HVGIC ใช้ตรวจหารอยโรค',
      D: 'SDF ช่วยควบคุมเชื้อและการลุกลาม ส่วน HVGIC ใช้บูรณะฟันและช่วยปล่อยฟลูออไรด์',
    },
  },
  {
    id: '3',
    text: 'ผู้ป่วยเด็กมีความเสี่ยงต่อโรคฟันผุสูง ตรวจพบรอยโรคในระยะเริ่มต้น และยังไม่มีข้อบ่งชี้ว่าจำเป็นต้องบูรณะฟันทันที ตามหลัก MID ทันตบุคลากรควรวางแผนอย่างไรจึงเหมาะสมที่สุด',
    options: {
      A: 'กำจัดเนื้อฟันผุทั้งหมดก่อนประเมินสภาพฟันเพื่อที่จะเลือกวัสดุบูรณะ',
      B: 'รอจนผู้ป่วยมีอาการปวดจึงเริ่มวางแผนรักษา',
      C: 'ตรวจหารอยโรคตั้งแต่ระยะเริ่มแรกและประเมินความเสี่ยงแล้ววางแผนป้องกันและส่งเสริมการคืนกลับแร่ธาตุ พร้อมติดตามตามระดับความเสี่ยง',
      D: 'กำจัดเนื้อฟันและบูรณะทันทีโดยไม่ต้องประเมินความเสี่ยง เนื่องจากเป็นเพียงรอยโรคในระยะเริ่มต้น',
    },
  },
  {
    id: '4',
    text: 'ทันตบุคลากรวางแผนดูแลผู้ป่วยฟันผุโดยต้องการให้ครอบคลุมทั้งระดับผู้ป่วย (Patient-level) และระดับรอยโรค (Lesion-level) แผนใดแสดงการประยุกต์ใช้ทั้งสองระดับได้ชัดเจนที่สุด ตามหลักการ Minimally Invasive Dentistry (MID)',
    options: {
      A: 'ให้คำแนะนำการลดความถี่อาหารหวาน สุขอนามัยในช่องปาก และจัดการรอยโรคด้วยการบูรณะตามความเหมาะสม',
      B: 'กำจัดเนื้อฟันผุ และบูรณะรอยโรคหลายตำแหน่ง เพื่อให้รอยโรคหยุดลุกลาม โดยใช้วัสดุบูรณะชนิดปล่อยฟลูออไรด์ได้',
      C: 'ให้คำแนะนำการใช้ยาสีฟันฟลูออไรด์ที่มีความเข้มข้น 5,000 ppm และนัดติดตามพฤติกรรมการแปรงฟัน',
      D: 'ให้คำแนะนำการแปรงฟัน และแนะนำให้ผู้ป่วยดื่มน้ำมากขึ้น',
    },
  },
  {
    id: '5',
    text: 'ระหว่างกำจัดเนื้อฟันผุในรอยโรคที่มีความลึก ทันตบุคลากรต้องการลดการสูญเสียเนื้อฟันธรรมชาติให้มากที่สุด ข้อใดสะท้อนการตัดสินใจตามหลัก MID ได้เหมาะสมที่สุด',
    options: {
      A: 'กำจัดเนื้อฟันผุออกเฉพาะบางส่วน',
      B: 'กำจัดเนื้อฟันทุกส่วนที่มีสีเปลี่ยนแปลงออกทั้งหมด',
      C: 'พิจารณาลักษณะ Infected และ Affected dentin ก่อนเลือกขอบเขตการกำจัดฟันผุ',
      D: 'หลีกเลี่ยงการประเมินเนื้อฟันและเลือกวัสดุบูรณะที่ฆ่าเชื้อฟันผุก่อน',
    },
  },
  {
    id: '6',
    text: 'เป้าหมายระยะยาวของ Minimally Invasive Dentistry ที่ให้ความสำคัญคือข้อใด',
    options: {
      A: 'ส่งเสริมสุขภาพช่องปากและการทำให้รอยโรคฟันผุหยุดลุกลาม เพื่อลดโอกาสเกิดฟันผุซ้ำ',
      B: 'เน้นการรักษาเมื่อเกิดความเสียหายรุนแรงเท่านั้น',
      C: 'มุ่งกำจัดเนื้อฟันผุให้มากที่สุดและส่งเสริมให้เกิดการ Remineralization',
      D: 'เพิ่มจำนวนครั้งในการบูรณะฟันให้มากที่สุด',
    },
  },
  {
    id: '7',
    text: 'ร้อยละความเข้มข้นของซิลเวอร์ไดเอมีนฟลูออไรด์ที่ใช้ในปัจจุบันคือข้อใด',
    options: {
      A: 'ร้อยละ 12',
      B: 'ร้อยละ 20',
      C: 'ร้อยละ 38',
      D: 'ร้อยละ 40',
    },
  },
  {
    id: '8',
    text: 'ข้อใดไม่ใช่ข้อบ่งใช้ในการใช้ซิลเวอร์ไดเอมีนฟลูออไรด์',
    options: {
      A: 'เด็กที่มีความเสี่ยงต่อการเกิดฟันผุในระดับสูง',
      B: 'ฟันผุลุกลามที่มีอาการปวด',
      C: 'รอยผุบริเวณที่รักษาได้ยาก เช่น บริเวณขอบของครอบฟัน',
      D: 'ผู้ป่วยที่ไม่สามารถเข้าถึงบริการทางทันตกรรม',
    },
  },
  {
    id: '9',
    text: 'ข้อใดไม่ใช่ปฏิกิริยาการทำงานของซิลเวอร์ไดเอมีนฟลูออไรด์',
    options: {
      A: 'ช่วยสร้างผลึกฟลูออโรอาพาไทต์ที่มีความต้านทานความเป็นกรดสูงขึ้น',
      B: 'แตกตัวให้ซิลเวอร์ไอออนออกฤทธิ์ทำลายผนังเซลล์และยับยั้งการแบ่งตัวของแบคทีเรีย',
      C: 'ยับยั้งเอนไซม์ MMPs ที่มีฤทธิ์สลายคอลลาเจนในรอยโรคฟันผุ',
      D: 'ซ่อมแซมรอยโรคฟันผุโดยสร้างเซลล์ชั้นเนื้อฟันและชั้นเคลือบฟันให้เกิดขึ้นใหม่',
    },
  },
  {
    id: '10',
    text: 'หากทำซิลเวอร์ไดเอมีนฟลูออไรด์โดนเนื้อเยื่อช่องปากหรือผิวหนังจะเกิดผลอย่างไร',
    options: {
      A: 'ติดสีดำที่เหงือก/ผิวหนัง ไม่ทำให้เกิดอาการปวด',
      B: 'ติดสีดำที่เหงือก/ผิวหนัง ทำให้เกิดอาการปวด',
      C: 'ติดสีดำที่เหงือก/ผิวหนัง ทำให้เกิดอาการแสบร้อน',
      D: 'ไม่ติดสีดำที่เหงือก/ผิวหนัง ทำให้เกิดอาการปวด',
    },
  },
  {
    id: '11',
    text: 'หากทำซิลเวอร์ไดเอมีนฟลูออไรด์โดนเสื้อผ้าจะเกิดผลอย่างไร',
    options: {
      A: 'ติดสีดำที่เสื้อผ้าและซักออก',
      B: 'ติดสีดำที่เสื้อผ้าและซักไม่ออก',
      C: 'เสื้อผ้าถูกกัดเป็นสีขาว',
      D: 'เสื้อผ้าขาดทะลุ',
    },
  },
];

// ข้อที่เปิดใช้งานตอนนี้ (หลังบ้านรองรับ 1–5 ชั่วคราว)
// พอหลังบ้านรองรับครบ 11 ข้อ ให้เปลี่ยนเป็น ALL_QUESTIONS.map((q) => q.id)
const ENABLED_QUESTION_IDS = ['1', '2', '3', '4', '5'];

const BASE_QUESTIONS = ALL_QUESTIONS.filter((q) =>
  ENABLED_QUESTION_IDS.includes(q.id)
);

const QUESTION_SETS = {
  PRE: BASE_QUESTIONS,
  POST: BASE_QUESTIONS,
};

const OPTION_KEYS = ['A', 'B', 'C', 'D'];

// สลับลำดับข้อ / ลำดับตัวเลือก ของแต่ละคน (ปิดได้โดยตั้งเป็น false)
const SHUFFLE_QUESTIONS = true;
const SHUFFLE_OPTIONS = true;

/* ---------- Helpers ---------- */
const getToken = () => sessionStorage.getItem('participant_token');

const clearSession = () => {
  sessionStorage.removeItem('participant_token');
  sessionStorage.removeItem('participant');
  ['PRE', 'POST'].forEach((t) => {
    sessionStorage.removeItem(`dental_answers_${t}`);
    sessionStorage.removeItem(`dental_order_${t}`);
  });
};

/* ---------- สลับโจทย์ ---------- */
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const createOrder = (base) => ({
  q: (SHUFFLE_QUESTIONS ? shuffle(base) : base).map((item) => item.id),
  o: Object.fromEntries(
    base.map((item) => [
      item.id,
      SHUFFLE_OPTIONS ? shuffle(OPTION_KEYS) : [...OPTION_KEYS],
    ])
  ),
});

// เก็บลำดับไว้ใน sessionStorage เพื่อให้รีเฟรชแล้วลำดับเดิม (คำตอบที่ร่างไว้ไม่เพี้ยน)
const loadOrCreateOrder = (base, key) => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || 'null');
    const ids = base.map((item) => item.id);
    const valid =
      saved &&
      Array.isArray(saved.q) &&
      saved.q.length === ids.length &&
      ids.every((id) => saved.q.includes(id)) &&
      ids.every(
        (id) =>
          Array.isArray(saved.o?.[id]) &&
          saved.o[id].length === OPTION_KEYS.length &&
          OPTION_KEYS.every((k) => saved.o[id].includes(k))
      );
    if (valid) return saved;
  } catch {
    /* สร้างใหม่ */
  }
  const fresh = createOrder(base);
  try {
    sessionStorage.setItem(key, JSON.stringify(fresh));
  } catch {
    /* ไม่เป็นไร */
  }
  return fresh;
};

const markCompletedInCache = (type) => {
  try {
    const p = JSON.parse(sessionStorage.getItem('participant') || 'null');
    if (!p) return;
    p[type === 'PRE' ? 'pre_completed' : 'post_completed'] = true;
    sessionStorage.setItem('participant', JSON.stringify(p));
  } catch {
    /* ไม่เป็นไร */
  }
};

const getSubmitError = (error) => {
  const status = error?.response?.status;
  const apiMessage = error?.response?.data?.message;

  if (!error?.response)
    return 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่ (คำตอบของคุณยังถูกเก็บไว้)';
  if (status === 409) return 'คุณส่งแบบทดสอบนี้ไปแล้ว';
  return apiMessage || 'ส่งแบบทดสอบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
};

/* ---------- หน้าจอสำเร็จ ---------- */
const SuccessOverlay = ({ type }) => (
  <SuccessBurst
    title={`ส่ง ${TYPE_INFO[type].title} สำเร็จ`}
    subtitle={type === 'PRE' ? 'กำลังกลับไปหน้าเลือกแบบทดสอบ' : 'กำลังไปหน้าใบประกาศนียบัตร'}
  />
);

/* ---------- ตัวหน้าทำแบบทดสอบ ---------- */
const QuestionnaireInner = ({ type }) => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const baseQuestions = QUESTION_SETS[type];
  const draftKey = `dental_answers_${type}`;
  const orderKey = `dental_order_${type}`;

  // ลำดับข้อ/ตัวเลือกของแต่ละคน (สุ่มครั้งเดียวต่อการทำแบบทดสอบ)
  const [order] = useState(() => loadOrCreateOrder(baseQuestions, orderKey));
  const questions = order.q.map((id) => baseQuestions.find((x) => x.id === id));
  const total = questions.length;

  // โหลดร่างคำตอบ โดยตัดคำตอบของข้อที่ปิดใช้งานอยู่ออก (กันค้างจากตอนที่ยังมี 11 ข้อ)
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(draftKey) || '{}') || {};
      const ids = baseQuestions.map((x) => x.id);
      return Object.fromEntries(
        Object.entries(saved).filter(([id]) => ids.includes(id))
      );
    } catch {
      return {};
    }
  });
  const [current, setCurrent] = useState(() => {
    const idx = questions.findIndex((q) => !answers[q.id]);
    return idx === -1 ? 0 : idx;
  });
  const [dir, setDir] = useState(1);

  const [checking, setChecking] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const timerRef = useRef(null);
  const redirectRef = useRef(null);

  const logout = useCallback(() => {
    clearSession();
    navigate(ROUTES.home, { replace: true });
  }, [navigate]);

  /* เช็กสถานะก่อนเริ่มทำ (กันเข้าตรงผ่าน URL) */
  const checkStatus = useCallback(async () => {
    const token = getToken();
    if (!token) {
      navigate(ROUTES.home, { replace: true });
      return;
    }

    setChecking(true);
    setLoadError('');

    try {
      const res = await axios.get(`${API_BASE}/status`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });

      const d = res?.data?.data;
      if (!res?.data?.success || !d) throw new Error('Invalid status');

      const alreadyDone = type === 'PRE' ? d.pre_completed : d.post_completed;
      const notAllowed = type === 'POST' && !d.pre_completed;

      if (alreadyDone || notAllowed) {
        navigate(ROUTES.tests, { replace: true });
        return;
      }

      setChecking(false);
    } catch (err) {
      if (err?.response?.status === 401) {
        logout();
        return;
      }
      setLoadError('ไม่สามารถตรวจสอบสถานะได้ กรุณาลองใหม่อีกครั้ง');
    }
  }, [navigate, logout, type]);

  useEffect(() => {
    checkStatus();
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(redirectRef.current);
    };
  }, [checkStatus]);

  /* เก็บร่างคำตอบไว้ ป้องกันหายตอนรีเฟรช */
  useEffect(() => {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(answers));
    } catch {
      /* ไม่เป็นไร */
    }
  }, [answers, draftKey]);

  const goTo = (idx) => {
    if (idx < 0 || idx >= total || idx === current) return;
    clearTimeout(timerRef.current);
    setDir(idx > current ? 1 : -1);
    setCurrent(idx);
  };

  const selectAnswer = (key) => {
    const q = questions[current];
    setError('');
    setAnswers((prev) => ({ ...prev, [q.id]: key }));

    // เลือกแล้วเลื่อนไปข้อถัดไปเอง (ยกเว้นข้อสุดท้าย)
    if (current < total - 1) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setDir(1);
        setCurrent((c) => Math.min(c + 1, total - 1));
      }, 280);
    }
  };

  /* รีเซ็ตคำตอบทั้งหมด (ลำดับข้อ/ตัวเลือกที่สุ่มไว้คงเดิม) */
  const handleReset = () => {
    if (submitting) return;
    clearTimeout(timerRef.current);
    setAnswers({});
    setError('');
    setDir(-1);
    setCurrent(0);
    try {
      sessionStorage.removeItem(draftKey);
    } catch {
      /* ไม่เป็นไร */
    }
  };

  const answeredCount = questions.filter((q) => answers[q.id]).length;
  const percent = Math.round((answeredCount / total) * 100);

  const handleSubmit = async () => {
    const firstMissing = questions.findIndex((q) => !answers[q.id]);
    if (firstMissing !== -1) {
      goTo(firstMissing);
      setError('กรุณาตอบให้ครบทุกข้อก่อนส่ง');
      return;
    }

    const token = getToken();
    if (!token) {
      logout();
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await axios.post(
        `${API_BASE}/tests/${type}/submit`,
        { answers },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          timeout: 15000,
        }
      );

      if (!res?.data?.success) throw new Error('Submit failed');

      sessionStorage.removeItem(draftKey);
      sessionStorage.removeItem(orderKey);
      markCompletedInCache(type);
      setDone(true);

      redirectRef.current = setTimeout(() => {
        navigate(type === 'PRE' ? ROUTES.tests : ROUTES.certificate, {
          replace: true,
        });
      }, 2000);
    } catch (err) {
      if (err?.response?.status === 401) {
        logout();
        return;
      }
      setError(getSubmitError(err));
      setSubmitting(false);
    }
  };

  const q = questions[current];
  const selected = answers[q.id];
  const isLast = current === total - 1;

  const slide = reduceMotion
    ? { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        enter: (d) => ({ x: d > 0 ? 36 : -36, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (d) => ({ x: d > 0 ? -36 : 36, opacity: 0 }),
      };

  return (
    <ConfigProvider
      theme={antdCfg}
    >
      <ThemeShell>
        {/* ---------- Header ---------- */}
        <div className="text-slate-800 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-14">
          <div className="max-w-2xl mx-auto">
            <button
              type="button"
              onClick={() => navigate(ROUTES.tests)}
              disabled={submitting || done}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4 disabled:opacity-50"
            >
              <ArrowLeft size={18} />
              กลับ
            </button>

            <p className="text-xs font-semibold tracking-[0.25em] text-[#059669] mb-1">
              DENTALMEET CERT
            </p>
            <h1 className="dm-head text-2xl font-bold">{TYPE_INFO[type].title}</h1>
            <p className="text-sm text-slate-500">{TYPE_INFO[type].subtitle}</p>

            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>
                  ข้อ {current + 1} / {total}
                </span>
                <span>
                  ตอบแล้ว {answeredCount}/{total} · {percent}%
                </span>
              </div>

              {/* แถบความคืบหน้า: ไหลช้า ๆ ตามจำนวนข้อที่ตอบ จนเต็มเมื่อครบ */}
              <div className="relative h-2.5 rounded-full bg-slate-200 overflow-hidden">
                <motion.div
                  className="relative h-full rounded-full overflow-hidden bg-gradient-to-r from-cyan-500 to-emerald-500 shadow-[0_0_12px_rgba(16,185,129,.5)]"
                  initial={false}
                  animate={{ width: `${percent}%` }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 40, damping: 18, mass: 1.2 }
                  }
                >
                  {/* แสงวิ่งผ่านแถบ ให้ดูเหมือนกำลังไหล */}
                  {!reduceMotion && percent > 0 && (
                    <motion.span
                      aria-hidden="true"
                      className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                      initial={{ x: '-100%' }}
                      animate={{ x: '300%' }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                    />
                  )}
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- เนื้อหา ---------- */}
        <div className="max-w-2xl mx-auto px-4 -mt-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <div className="dm-border rounded-3xl bg-white/85 backdrop-blur-xl shadow-[0_12px_60px_rgba(8,145,178,.18)] p-5 sm:p-8">
            {checking && !loadError && <Skeleton active paragraph={{ rows: 6 }} />}

            {loadError && (
              <Alert
                type="error"
                showIcon
                message={loadError}
                action={
                  <Button
                    type="link"
                    size="small"
                    icon={<RefreshCw size={14} />}
                    onClick={checkStatus}
                  >
                    ลองใหม่
                  </Button>
                }
              />
            )}

            {!checking && !loadError && (
              <>
                {/* เลขข้อ (กดข้ามไปมาได้) */}
                <div className="flex gap-2 justify-center mb-6 flex-wrap">
                  {questions.map((item, i) => {
                    const active = i === current;
                    const answered = !!answers[item.id];
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => goTo(i)}
                        aria-label={`ไปข้อ ${i + 1}`}
                        aria-current={active ? 'step' : undefined}
                        className={`w-9 h-9 rounded-full text-sm font-semibold transition-colors ${
                          active
                            ? 'bg-emerald-500 text-white shadow-[0_0_14px_rgba(16,185,129,.55)]'
                            : answered
                            ? 'bg-cyan-100 text-cyan-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>

                {/* คำถาม + ตัวเลือก */}
                <div className="overflow-hidden">
                  <AnimatePresence mode="wait" custom={dir} initial={false}>
                    <motion.div
                      key={q.id}
                      custom={dir}
                      variants={slide}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                    >
                      <p className="text-xs font-semibold text-cyan-600 mb-1">
                        ข้อที่ {current + 1}
                      </p>
                      <h2 className="text-lg font-bold text-slate-800 leading-snug mb-5">
                        {q.text}
                      </h2>

                      <div
                        role="radiogroup"
                        aria-label={`ตัวเลือกข้อที่ ${current + 1}`}
                        className="flex flex-col gap-3"
                      >
                        {(order.o[q.id] || OPTION_KEYS).map((key, pos) => {
                          const checked = selected === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              role="radio"
                              aria-checked={checked}
                              disabled={submitting}
                              onClick={() => selectAnswer(key)}
                              className={`w-full text-left flex items-center gap-3 rounded-2xl border-2 p-3.5 transition-all active:scale-[0.98] ${
                                checked
                                  ? 'border-cyan-500 bg-cyan-50 shadow-[0_0_20px_rgba(8,145,178,.2)]'
                                  : 'border-slate-200 bg-white hover:border-cyan-300'
                              }`}
                            >
                              <span
                                className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm font-bold transition-colors ${
                                  checked
                                    ? 'bg-cyan-600 text-white'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {checked ? (
                                  <Check size={18} strokeWidth={3} />
                                ) : (
                                  OPTION_KEYS[pos]
                                )}
                              </span>
                              <span
                                className={`flex-1 text-[15px] leading-snug ${
                                  checked ? 'text-slate-900 font-medium' : 'text-slate-600'
                                }`}
                              >
                                {q.options[key]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {error && (
                  <Alert
                    type="error"
                    showIcon
                    closable
                    message={error}
                    onClose={() => setError('')}
                    className="mt-5"
                  />
                )}

                {/* ปุ่มนำทาง */}
                <div className="mt-6 flex gap-3">
                  <Button
                    size="large"
                    icon={<ArrowLeft size={18} />}
                    disabled={current === 0 || submitting}
                    onClick={() => goTo(current - 1)}
                    style={{ height: 52, borderRadius: 16 }}
                  >
                    ย้อนกลับ
                  </Button>

                  {isLast ? (
                    <Button
                      type="primary"
                      size="large"
                      block
                      loading={submitting}
                      disabled={!selected}
                      icon={<Send size={18} />}
                      iconPosition="end"
                      onClick={handleSubmit}
                      style={{ height: 52, borderRadius: 16, fontWeight: 600, ...(selected ? glowBtn : {}) }}
                    >
                      ส่งคำตอบ
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      size="large"
                      block
                      disabled={!selected}
                      icon={<ArrowRight size={18} />}
                      iconPosition="end"
                      onClick={() => goTo(current + 1)}
                      style={{ height: 52, borderRadius: 16, fontWeight: 600, ...(selected ? glowBtn : {}) }}
                    >
                      ถัดไป
                    </Button>
                  )}
                </div>

                {/* ปุ่มรีเซ็ตคำตอบ */}
                <div className="mt-3 flex justify-center">
                  <Popconfirm
                    title="ล้างคำตอบทั้งหมด?"
                    description="คำตอบที่เลือกไว้ทุกข้อจะถูกลบ"
                    okText="ล้างคำตอบ"
                    cancelText="ยกเลิก"
                    okButtonProps={{ danger: true }}
                    onConfirm={handleReset}
                    disabled={answeredCount === 0 || submitting}
                  >
                    <Button
                      type="text"
                      icon={<RotateCcw size={16} />}
                      disabled={answeredCount === 0 || submitting}
                      className="text-slate-500"
                    >
                      รีเซ็ตคำตอบ
                    </Button>
                  </Popconfirm>
                </div>

                <p className="text-center text-xs text-slate-500 mt-4">
                  เมื่อส่งแล้วจะไม่สามารถแก้ไขหรือส่งซ้ำได้
                </p>
              </>
            )}
          </div>
        </div>
      </ThemeShell>

      <AnimatePresence>{done && <SuccessOverlay type={type} />}</AnimatePresence>
    </ConfigProvider>
  );
};

/* ---------- wrapper: รับชนิดแบบทดสอบจาก prop (type="PRE" | "POST") หรือจาก URL (/tests/:type) ---------- */
const Questionnaire = ({ type: typeProp }) => {
  const { type: typeParam } = useParams();
  const navigate = useNavigate();
  const type = String(typeProp || typeParam || '').toUpperCase();
  const valid = type === 'PRE' || type === 'POST';

  useEffect(() => {
    if (!valid) navigate(ROUTES.tests, { replace: true });
  }, [valid, navigate]);

  if (!valid) return null;

  // key ทำให้รีเซ็ต state ทั้งหมดเมื่อสลับ Pre <-> Post
  return <QuestionnaireInner key={type} type={type} />;
};

export default Questionnaire;