import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, RefreshCw, Send } from 'lucide-react';
import { Alert, Button, ConfigProvider, Skeleton } from 'antd';

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
 * ชุดคำถาม  ***ตัวอย่างชั่วคราว ต้องเปลี่ยนเป็นคำถามจริง***
 * - id ต้องเป็น '1'–'5' ให้ตรงกับที่ระบบหลังบ้านตรวจ ($validQuestions)
 * - ตัวเลือกต้องเป็น A, B, C, D ($validOptions)
 * - Pre-test และ Post-test ใช้ชุดเดียวกันได้ หรือแยกชุดกันก็ได้
 */
const BASE_QUESTIONS = [
  1, 2, 3, 4, 5,
].map((n) => ({
  id: String(n),
  text: `(ตัวอย่าง) ใส่คำถามข้อที่ ${n} ตรงนี้`,
  options: {
    A: 'ตัวเลือก A',
    B: 'ตัวเลือก B',
    C: 'ตัวเลือก C',
    D: 'ตัวเลือก D',
  },
}));

const QUESTION_SETS = {
  PRE: BASE_QUESTIONS,
  POST: BASE_QUESTIONS,
};

const OPTION_KEYS = ['A', 'B', 'C', 'D'];

/* ---------- Helpers ---------- */
const getToken = () => sessionStorage.getItem('participant_token');

const clearSession = () => {
  sessionStorage.removeItem('participant_token');
  sessionStorage.removeItem('participant');
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
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.25 }}
    className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-cyan-600 via-teal-600 to-emerald-600 text-white px-6 text-center"
    role="status"
    aria-live="polite"
  >
    <motion.div
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-6 ring-8 ring-white/10"
    >
      <Check size={48} strokeWidth={3} />
    </motion.div>
    <motion.p
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.15 }}
      className="text-2xl font-bold mb-1"
    >
      ส่ง {TYPE_INFO[type].title} สำเร็จ
    </motion.p>
    <motion.p
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.25 }}
      className="text-white/85"
    >
      {type === 'PRE' ? 'กำลังกลับไปหน้าเลือกแบบทดสอบ' : 'กำลังไปหน้าใบประกาศนียบัตร'}
    </motion.p>
  </motion.div>
);

/* ---------- ตัวหน้าทำแบบทดสอบ ---------- */
const QuestionnaireInner = ({ type }) => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const questions = QUESTION_SETS[type];
  const total = questions.length;
  const draftKey = `dental_answers_${type}`;

  const [answers, setAnswers] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(draftKey) || '{}') || {};
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

  const answeredCount = questions.filter((q) => answers[q.id]).length;

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
      markCompletedInCache(type);
      setDone(true);

      redirectRef.current = setTimeout(() => {
        navigate(type === 'PRE' ? ROUTES.tests : ROUTES.certificate, {
          replace: true,
        });
      }, 1400);
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
      theme={{
        token: { colorPrimary: '#0891b2', borderRadius: 14, fontSize: 16 },
      }}
    >
      <div className="min-h-[100dvh] bg-slate-50">
        {/* ---------- Header ---------- */}
        <div className="bg-gradient-to-br from-cyan-600 via-teal-600 to-emerald-600 text-white px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-14 rounded-b-[2rem]">
          <div className="max-w-2xl mx-auto">
            <button
              type="button"
              onClick={() => navigate(ROUTES.tests)}
              disabled={submitting || done}
              className="flex items-center gap-1.5 text-sm text-white/85 hover:text-white mb-4 disabled:opacity-50"
            >
              <ArrowLeft size={18} />
              กลับ
            </button>

            <p className="text-xs font-semibold tracking-[0.25em] text-white/80 mb-1">
              DENTALMEET CERT
            </p>
            <h1 className="text-2xl font-bold">{TYPE_INFO[type].title}</h1>
            <p className="text-sm text-white/85">{TYPE_INFO[type].subtitle}</p>

            <div className="mt-4">
              <div className="flex justify-between text-xs text-white/85 mb-1.5">
                <span>
                  ข้อ {current + 1} / {total}
                </span>
                <span>
                  ตอบแล้ว {answeredCount}/{total}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-white"
                  initial={false}
                  animate={{ width: `${(answeredCount / total) * 100}%` }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ---------- เนื้อหา ---------- */}
        <div className="max-w-2xl mx-auto px-4 -mt-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-900/5 p-5 sm:p-8">
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
                            ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
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
                      <p className="text-xs font-semibold text-cyan-700 mb-1">
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
                        {OPTION_KEYS.map((key) => {
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
                                  ? 'border-cyan-500 bg-cyan-50 shadow-sm'
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
                                {checked ? <Check size={18} strokeWidth={3} /> : key}
                              </span>
                              <span
                                className={`flex-1 text-[15px] leading-snug ${
                                  checked ? 'text-slate-900 font-medium' : 'text-slate-700'
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
                      style={{ height: 52, borderRadius: 16, fontWeight: 600 }}
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
                      style={{ height: 52, borderRadius: 16, fontWeight: 600 }}
                    >
                      ถัดไป
                    </Button>
                  )}
                </div>

                <p className="text-center text-xs text-slate-400 mt-4">
                  เมื่อส่งแล้วจะไม่สามารถแก้ไขหรือส่งซ้ำได้
                </p>
              </>
            )}
          </div>
        </div>
      </div>

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