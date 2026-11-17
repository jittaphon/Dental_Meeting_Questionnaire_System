import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  User,
  Building2,
  ArrowRight,
  ShieldCheck,
  ClipboardList,
  Award,
} from 'lucide-react';
import {
  Form,
  Input,
  AutoComplete,
  Button,
  Alert,
  ConfigProvider,
} from 'antd';
import axios from 'axios';
import { C, ThemeShell, SuccessBurst, antdCfg } from './DentalTheme'; // ปรับ path ให้ตรงโปรเจกต์

const VERIFY_URL =
  'https://pyodatahub.moph.go.th/datahub/pyo-kpi/backend/public/index.php/api/dental/verify';

const HOSPITALS_URL =
  'https://pyodatahub.moph.go.th/datahub/pyo-kpi/backend/public/index.php/api/dental/hospitals';

// สถานบริการที่มีคำเหล่านี้จะไม่แสดงในรายการ (แต่ผู้ใช้ยังพิมพ์ชื่อเองได้)
const HIDDEN_KEYWORDS = ['ทดสอบ', 'test'];
const isHiddenHospital = (name) =>
  HIDDEN_KEYWORDS.some((k) => String(name).toLowerCase().includes(k.toLowerCase()));

const STEPS = [
  { icon: ShieldCheck, label: 'ยืนยันตัวตน' },
  { icon: ClipboardList, label: 'ทำแบบทดสอบ' },
  { icon: Award, label: 'รับใบประกาศ' },
];

const TOOTH_PATH =
  'M20 10c-7 0-12 5-12 13 0 6 2 10 4 16 2 6 3 15 7 15 4 0 4-9 6-13 1-3 3-4 5-4s4 1 5 4c2 4 2 13 6 13 4 0 5-9 7-15 2-6 4-10 4-16 0-8-5-13-12-13-4 0-7 2-10 2s-6-2-10-2z';


/* ---------- ฟันโฮโลแกรม: วาดเส้น + ลำแสงสแกน + วงโคจร ---------- */
const HoloTooth = ({ reduce }) => {
  const loop = (duration, extra = {}) =>
    reduce ? {} : { transition: { duration, repeat: Infinity, ease: 'linear', ...extra } };

  return (
    <svg viewBox="0 0 320 320" className="w-full h-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id="dm-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.accent} stopOpacity="0" />
          <stop offset="0.7" stopColor={C.accent} stopOpacity="0.55" />
          <stop offset="1" stopColor={C.cyan} stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id="dm-halo">
          <stop offset="0" stopColor={C.cyan} stopOpacity="0.35" />
          <stop offset="1" stopColor={C.cyan} stopOpacity="0" />
        </radialGradient>
        <clipPath id="dm-clip">
          <path d={TOOTH_PATH} transform="translate(77 77) scale(2.6)" />
        </clipPath>
      </defs>

      <circle cx="160" cy="160" r="150" fill="url(#dm-halo)" />

      {/* วงโคจร */}
      <motion.g
        style={{ originX: '160px', originY: '160px' }}
        animate={reduce ? undefined : { rotate: 360 }}
        {...loop(22)}
      >
        <circle cx="160" cy="160" r="138" fill="none" stroke={C.cyan} strokeOpacity="0.5" strokeWidth="1" strokeDasharray="2 10" />
        <circle cx="160" cy="22" r="5" fill={C.cyan} />
      </motion.g>
      <motion.g
        style={{ originX: '160px', originY: '160px' }}
        animate={reduce ? undefined : { rotate: -360 }}
        {...loop(14)}
      >
        <circle cx="160" cy="160" r="112" fill="none" stroke={C.accent} strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="60 30 10 30" />
        <circle cx="272" cy="160" r="4" fill={C.accent} />
      </motion.g>

      {/* ตัวฟัน */}
      <g transform="translate(77 77) scale(2.6)">
        <path d={TOOTH_PATH} fill={C.cyan} fillOpacity="0.08" />
        <motion.path
          d={TOOTH_PATH}
          fill="none"
          stroke={C.cyan}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.2, ease: 'easeInOut' }}
          style={{ filter: `drop-shadow(0 0 4px ${C.cyan})` }}
        />
      </g>

      {/* ลำแสงสแกนภายในฟัน */}
      <g clipPath="url(#dm-clip)">
        <motion.rect
          x="60"
          width="200"
          height="34"
          fill="url(#dm-beam)"
          initial={{ y: 60 }}
          animate={reduce ? { y: 120 } : { y: [60, 215, 60] }}
          transition={{ duration: 3.4, repeat: reduce ? 0 : Infinity, ease: 'easeInOut' }}
        />
      </g>

      {/* จุดวิเคราะห์ */}
      {[[121, 107], [199, 107], [160, 150], [138, 215], [182, 215]].map(([x, y], i) => (
        <motion.circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r="3"
          fill={C.accent}
          animate={reduce ? undefined : { opacity: [0.2, 1, 0.2], r: [2, 4.5, 2] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.35 }}
        />
      ))}
    </svg>
  );
};

const Chip = ({ children, className = '', delay = 0, reduce }) => (
  <motion.div
    className={`absolute flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-white/85 backdrop-blur px-2.5 py-1 text-[11px] text-cyan-800 shadow-[0_4px_16px_rgba(8,145,178,.2)] ${className}`}
    initial={reduce ? false : { opacity: 0, scale: 0.7 }}
    animate={reduce ? undefined : { opacity: 1, scale: 1, y: [0, -7, 0] }}
    transition={{
      opacity: { delay: 1.2 + delay },
      scale: { delay: 1.2 + delay },
      y: { duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay },
    }}
  >
    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
    {children}
  </motion.div>
);

/* ---------- Stepper ---------- */
const Stepper = ({ current = 0 }) => (
  <ol className="flex items-start justify-between mb-6" aria-label="ขั้นตอน">
    {STEPS.map((step, i) => {
      const Icon = step.icon;
      const active = i === current;
      const done = i < current;
      return (
        <li key={step.label} className="flex-1 flex flex-col items-center relative">
          {i > 0 && (
            <span
              className={`absolute top-4 right-1/2 w-full h-px ${
                done || active ? 'bg-cyan-400/70' : 'bg-slate-200'
              }`}
            />
          )}
          <span
            className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
              active
                ? 'bg-cyan-600 text-white shadow-[0_0_18px_rgba(8,145,178,.5)]'
                : done
                ? 'bg-cyan-500 text-white'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            <Icon size={15} />
          </span>
          <span
            className={`mt-1.5 text-[11px] leading-tight text-center ${
              active ? 'text-cyan-700 font-semibold' : 'text-slate-400'
            }`}
          >
            {step.label}
          </span>
        </li>
      );
    })}
  </ol>
);

/* ---------- การ์ด (เลื่อนขึ้นตอนโหลดเท่านั้น ไม่เอียงตามเมาส์) ---------- */
const FormCard = ({ children, className = '', reduce }) => (
  <motion.div
    initial={reduce ? false : { opacity: 0, y: 40 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

/* ---------- แปลง error จาก API ---------- */
const FIELD_MAP = {
  first_name: 'firstName',
  last_name: 'lastName',
  hospcode: 'hospcode',
};

const getErrorMessage = (error) => {
  const status = error?.response?.status;
  const apiMessage = error?.response?.data?.message;

  if (!error?.response) return 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่';
  if (status === 404) return 'ไม่พบข้อมูลผู้ลงทะเบียน กรุณาตรวจสอบชื่อ นามสกุล และสถานบริการให้ตรงกับที่ลงทะเบียนไว้';
  if (status === 409) return 'พบข้อมูลซ้ำในระบบ กรุณาติดต่อผู้จัดงาน';
  return apiMessage || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
};

const HEADLINE = ['ยืนยันตัวตน', 'ผู้เข้าร่วมประชุม'];

const HomePage = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [verifiedName, setVerifiedName] = useState('');

  const [hospitals, setHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);

  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  /* ---------- โหลดรายชื่อสถานบริการจาก API (ซ่อนชื่อที่เป็นข้อมูลทดสอบ) ---------- */
  const loadHospitals = async (signal) => {
    setLoadingHospitals(true);
    try {
      const res = await axios.get(HOSPITALS_URL, { timeout: 15000, signal });
      const list = Array.isArray(res?.data?.data) ? res.data.data : [];
      setHospitals(
        list
          .filter((name) => !isHiddenHospital(name))
          .map((name) => ({ value: name, label: name }))
      );
    } catch (error) {
      if (axios.isCancel(error)) return;
      console.error('Load hospitals error:', error);
      setSubmitError('โหลดรายชื่อสถานบริการไม่สำเร็จ กรุณารีเฟรชหน้าแล้วลองใหม่');
    } finally {
      setLoadingHospitals(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadHospitals(controller.signal);
    return () => controller.abort();
  }, []);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    setSubmitError('');

    try {
      const payload = {
        first_name: values.firstName.trim(),
        last_name: values.lastName.trim(),
        hospcode: values.hospcode.trim(),
      };

      const res = await axios.post(VERIFY_URL, payload, { timeout: 15000 });
      const body = res?.data;

      if (!body?.success || !body?.token || !body?.data?.id) {
        throw new Error('ข้อมูลตอบกลับไม่ถูกต้อง');
      }

      sessionStorage.setItem('participant_token', body.token);
      sessionStorage.setItem('participant', JSON.stringify(body.data));

      setVerifiedName(`คุณ${body.data.first_name}`);

      timerRef.current = setTimeout(() => {
        navigate('/tests', { replace: true, state: { participant: body.data } });
      }, 2000);
    } catch (error) {
      console.error('Verify error:', error);

      const apiErrors = error?.response?.data?.errors;
      if (error?.response?.status === 422 && apiErrors) {
        form.setFields(
          Object.entries(apiErrors).map(([key, msgs]) => ({
            name: FIELD_MAP[key] || key,
            errors: Array.isArray(msgs) ? msgs : [String(msgs)],
          }))
        );
      } else {
        setSubmitError(getErrorMessage(error));
      }
      setSubmitting(false);
    }
  };

  return (
    <ConfigProvider
      theme={antdCfg}
    >
      <ThemeShell>
        <div className="mx-auto w-full max-w-md md:max-w-xl lg:max-w-6xl min-h-[100dvh] flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12 px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
          {/* ---------- Hero ---------- */}
          <div className="lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="relative w-[210px] h-[210px] sm:w-[250px] sm:h-[250px] lg:w-[360px] lg:h-[360px] mb-6">
              <HoloTooth reduce={reduce} />
              <Chip reduce={reduce} className="top-4 -right-3 lg:-right-8">AI SCAN · ACTIVE</Chip>
              <Chip reduce={reduce} delay={0.6} className="bottom-8 -left-3 lg:-left-8">ENAMEL 100%</Chip>
              <Chip reduce={reduce} delay={1.1} className="bottom-0 right-2">CERT READY</Chip>
            </div>

            <motion.p
              initial={reduce ? false : { opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3 text-xs font-semibold tracking-[0.3em] mb-3"
              style={{ color: C.accent }}
            >
              <span className="w-8 h-px" style={{ background: C.accent }} />
              DENTALMEET CERT
            </motion.p>

            <h1 className="dm-head text-[28px] sm:text-4xl lg:text-5xl leading-tight font-bold mb-3">
              {HEADLINE.map((line, i) => (
                <motion.span
                  key={line}
                  className="block"
                  initial={reduce ? false : { opacity: 0, y: 28, filter: 'blur(14px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.9, delay: 0.45 + i * 0.2, ease: [0.22, 1, 0.36, 1] }}
                >
                  {line}
                </motion.span>
              ))}
            </h1>

            <motion.p
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.95 }}
              className="text-sm lg:text-base text-slate-600 max-w-sm"
            >
              กรอกข้อมูลให้ตรงกับที่ลงทะเบียนไว้ เพื่อเริ่มทำแบบทดสอบ
            </motion.p>
            <p className="hidden lg:block mt-6 pt-6 border-t border-slate-200 text-sm leading-relaxed text-slate-500 max-w-sm">
              ทำ Pre-test ก่อนเข้าร่วมประชุม และ Post-test หลังจบการประชุม
              เมื่อทำครบทั้งสองชุดจะมีสิทธิ์รับใบประกาศนียบัตร
            </p>
          </div>

          {/* ---------- Card ---------- */}
          <div className="lg:w-1/2 flex flex-col items-center">
            <FormCard
              reduce={reduce}
              className="dm-border w-full max-w-md rounded-3xl bg-white/85 backdrop-blur-xl p-5 pb-6 lg:p-9 shadow-[0_12px_60px_rgba(8,145,178,.18)]"
            >
              <Stepper current={0} />

              <AnimatePresence initial={false}>
                {submitError && (
                  <motion.div
                    key="submit-error"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <Alert
                      type="error"
                      showIcon
                      closable
                      message={submitError}
                      onClose={() => setSubmitError('')}
                      className="mb-4"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <Form
                form={form}
                layout="vertical"
                size="large"
                requiredMark={false}
                onFinish={handleSubmit}
                onValuesChange={() => submitError && setSubmitError('')}
                disabled={submitting}
                autoComplete="off"
              >
                <Form.Item
                  label="ชื่อ"
                  name="firstName"
                  rules={[{ required: true, whitespace: true, message: 'กรุณากรอกชื่อ' }]}
                >
                  <Input
                    prefix={<User size={18} className="text-cyan-600/70 mr-1" />}
                    placeholder="ชื่อจริง (ไม่ต้องใส่คำนำหน้า)"
                    maxLength={150}
                    autoComplete="given-name"
                    enterKeyHint="next"
                  />
                </Form.Item>

                <Form.Item
                  label="นามสกุล"
                  name="lastName"
                  rules={[{ required: true, whitespace: true, message: 'กรุณากรอกนามสกุล' }]}
                >
                  <Input
                    prefix={<User size={18} className="text-cyan-600/70 mr-1" />}
                    placeholder="นามสกุล"
                    maxLength={150}
                    autoComplete="family-name"
                    enterKeyHint="next"
                  />
                </Form.Item>

                {/* เลือกจากรายการ หรือพิมพ์เองก็ได้ (รายการไม่แสดงชื่อที่เป็นข้อมูลทดสอบ) */}
                <Form.Item
                  label="สถานบริการ"
                  name="hospcode"
                  rules={[{ required: true, whitespace: true, message: 'กรุณาเลือกหรือพิมพ์ชื่อสถานบริการ' }]}
                >
                  <AutoComplete
                    allowClear
                    options={hospitals}
                    filterOption={(input, option) =>
                      String(option?.label ?? '').toLowerCase().includes(input.trim().toLowerCase())
                    }
                    notFoundContent={loadingHospitals ? 'กำลังโหลด...' : 'ไม่พบสถานบริการ'}
                    listHeight={256}
                  >
                    <Input
                      prefix={<Building2 size={18} className="text-cyan-600/70 mr-1" />}
                      placeholder="เลือกหรือพิมพ์ชื่อสถานบริการ"
                      maxLength={255}
                    />
                  </AutoComplete>
                </Form.Item>

                <div className="flex gap-3 items-start rounded-2xl bg-cyan-50 border border-cyan-100 p-3.5 mb-5 mt-1">
                  <ShieldCheck className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed text-slate-600">
                    ระบบจะตรวจสอบกับรายชื่อผู้ลงทะเบียน
                    หลังยืนยันแล้วคุณจะไปเลือกทำแบบทดสอบ Pre-test / Post-test ได้ทันที
                  </p>
                </div>

                <motion.div whileHover={reduce ? undefined : { scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    block
                    loading={submitting}
                    icon={<ArrowRight size={18} />}
                    iconPosition="end"
                    style={{
                      height: 54,
                      fontWeight: 600,
                      borderRadius: 16,
                      background: `linear-gradient(90deg, ${C.cyan}, ${C.accent})`,
                      boxShadow: '0 6px 28px rgba(8,145,178,.4)',
                      border: 'none',
                    }}
                  >
                    ยืนยันและดำเนินการต่อ
                  </Button>
                </motion.div>
              </Form>
            </FormCard>

            <p className="text-center text-slate-400 text-xs mt-6">
              Dental Conference Questionnaire &amp; Certificate
            </p>
          </div>
        </div>
      </ThemeShell>

      <AnimatePresence>
        {verifiedName && (
          <SuccessBurst
            title="ยืนยันตัวตนสำเร็จ"
            subtitle={`ยินดีต้อนรับ ${verifiedName}`}
          />
        )}
      </AnimatePresence>
    </ConfigProvider>
  );
};

export default HomePage;