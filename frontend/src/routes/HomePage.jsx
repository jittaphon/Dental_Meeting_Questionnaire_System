import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  User,
  Building2,
  ArrowRight,
  ShieldCheck,
  Check,
  ClipboardList,
  Award,
} from 'lucide-react';
import {
  Form,
  Input,
  Button,
  Alert,
  ConfigProvider,
} from 'antd';

import axios from 'axios';

const VERIFY_URL =
  'https://pyodatahub.moph.go.th/datahub/pyo-kpi/backend/public/index.php/api/dental/verify';

/* ---------- ขั้นตอนทั้งหมดของงาน (หน้านี้คือขั้นที่ 1) ---------- */
const STEPS = [
  { icon: ShieldCheck, label: 'ยืนยันตัวตน' },
  { icon: ClipboardList, label: 'ทำแบบทดสอบ' },
  { icon: Award, label: 'รับใบประกาศ' },
];

/* ---------- ไอคอนฟัน (SVG) ---------- */
const ToothIcon = ({ className = '' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth="3.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M20 10c-7 0-12 5-12 13 0 6 2 10 4 16 2 6 3 15 7 15 4 0 4-9 6-13 1-3 3-4 5-4s4 1 5 4c2 4 2 13 6 13 4 0 5-9 7-15 2-6 4-10 4-16 0-8-5-13-12-13-4 0-7 2-10 2s-6-2-10-2z" />
  </svg>
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
              className={`absolute top-4 right-1/2 w-full h-0.5 -z-0 ${
                done || active ? 'bg-cyan-500' : 'bg-slate-200'
              }`}
            />
          )}
          <span
            className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              active
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
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

/* ---------- หน้าจอสำเร็จก่อนไปหน้าเลือกแบบทดสอบ ---------- */
const SuccessOverlay = ({ name }) => (
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
      ยืนยันตัวตนสำเร็จ
    </motion.p>
    <motion.p
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.25 }}
      className="text-white/85"
    >
      ยินดีต้อนรับ {name}
    </motion.p>
  </motion.div>
);

/* ---------- แปลง error จาก API เป็นข้อความที่ผู้ใช้เข้าใจ ---------- */
const FIELD_MAP = {
  first_name: 'firstName',
  last_name: 'lastName',
  hospcode: 'hospcode',
};

const getErrorMessage = (error) => {
  const status = error?.response?.status;
  const apiMessage = error?.response?.data?.message;

  if (!error?.response) return 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่';
  if (status === 404) return 'ไม่พบข้อมูลผู้ลงทะเบียน กรุณาตรวจสอบชื่อ นามสกุล และหน่วยงานให้ตรงกับที่ลงทะเบียนไว้';
  if (status === 409) return 'พบข้อมูลซ้ำในระบบ กรุณาติดต่อผู้จัดงาน';
  return apiMessage || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
};

const HomePage = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [verifiedName, setVerifiedName] = useState('');

  const timerRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  /* ยืนยันตัวตน */
  const handleSubmit = async (values) => {
    setSubmitting(true);
    setSubmitError('');

    try {
      // ชื่อ field ต้องตรงกับ API: first_name / last_name / hospcode
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

      // เก็บ token + ข้อมูลผู้เข้าร่วม (หมดอายุเมื่อปิดแท็บ)
      sessionStorage.setItem('participant_token', body.token);
      sessionStorage.setItem('participant', JSON.stringify(body.data));

      setVerifiedName(`คุณ${body.data.first_name}`);

      // โชว์หน้าสำเร็จสั้นๆ แล้วไปหน้าเลือกทำแบบทดสอบ Pre / Post
      timerRef.current = setTimeout(() => {
        navigate('/tests', {
          replace: true,
          state: { participant: body.data },
        });
      }, 1300);
    } catch (error) {
      console.error('Verify error:', error);

      // 422: ผูก error เข้ากับ field ที่ผิด
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

  const fade = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] },
        };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0891b2',
          borderRadius: 14,
          fontSize: 16, // 16px ป้องกัน iOS ซูมเองตอนแตะช่องกรอก
          controlHeightLG: 52,
        },
      }}
    >
      <div className="min-h-[100dvh] bg-slate-50 flex justify-center">
        <div className="w-full max-w-md md:max-w-xl lg:max-w-none flex flex-col lg:flex-row min-h-[100dvh] relative">

          {/* ---------- Hero ---------- */}
          <div className="relative overflow-hidden bg-gradient-to-br from-cyan-600 via-teal-600 to-emerald-600 text-white px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-16 rounded-b-[2.5rem] lg:w-[46%] lg:shrink-0 lg:flex lg:items-center lg:px-14 lg:py-16 lg:rounded-b-none lg:rounded-r-[3rem]">
            {/* วงกลมตกแต่ง */}
            <motion.span
              aria-hidden
              className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10"
              animate={reduceMotion ? undefined : { scale: [1, 1.08, 1] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.span
              aria-hidden
              className="absolute -bottom-20 -left-12 w-48 h-48 rounded-full bg-white/10"
              animate={reduceMotion ? undefined : { scale: [1.05, 1, 1.05] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            />

            <motion.div {...fade(0)} className="relative lg:max-w-md">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-5 ring-1 ring-white/30">
                <ToothIcon className="w-8 h-8 text-white" />
              </div>

              <p className="text-xs font-semibold tracking-[0.25em] text-white/80 mb-2">
                DENTALMEET CERT
              </p>
              <h1 className="text-[26px] lg:text-4xl leading-tight font-bold mb-2 lg:mb-4">
                ยืนยันตัวตน
                <br />
                ผู้เข้าร่วมประชุม
              </h1>
              <p className="text-sm lg:text-base text-white/85">
                กรอกข้อมูลให้ตรงกับที่ลงทะเบียนไว้
                เพื่อเริ่มทำแบบทดสอบ
              </p>
              <p className="hidden lg:block mt-6 pt-6 border-t border-white/20 text-sm leading-relaxed text-white/80">
                ทำ Pre-test ก่อนเข้าร่วมประชุม และ Post-test หลังจบการประชุม
                เมื่อทำครบทั้งสองชุดจะมีสิทธิ์รับใบประกาศนียบัตร
              </p>
            </motion.div>
          </div>

          {/* ---------- Card ---------- */}
          <div className="flex flex-col flex-1 lg:items-center lg:justify-center lg:px-10 lg:py-10">
          <motion.div
            {...fade(0.12)}
            className="relative -mt-8 mx-4 bg-white rounded-3xl shadow-xl shadow-slate-900/5 p-5 pb-6 lg:mt-0 lg:mx-0 lg:w-full lg:max-w-lg lg:p-10 lg:shadow-2xl"
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
                  prefix={<User size={18} className="text-slate-400 mr-1" />}
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
                  prefix={<User size={18} className="text-slate-400 mr-1" />}
                  placeholder="นามสกุล"
                  maxLength={150}
                  autoComplete="family-name"
                  enterKeyHint="next"
                />
              </Form.Item>

              <Form.Item
                label="รหัสสถานบริการ"
                name="hospcode"
                rules={[{ required: true, whitespace: true, message: 'กรุณากรอกรหัสสถานบริการ' }]}
              >
                <Input
                  prefix={<Building2 size={18} className="text-slate-400 mr-1" />}
                  placeholder="เช่น 10001"
                  maxLength={20}
                  inputMode="numeric"
                  autoComplete="off"
                  enterKeyHint="done"
                />
              </Form.Item>

              <div className="flex gap-3 items-start rounded-2xl bg-cyan-50 border border-cyan-100 p-3.5 mb-5 mt-1">
                <ShieldCheck className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed text-slate-600">
                  ระบบจะตรวจสอบกับรายชื่อผู้ลงทะเบียน
                  หลังยืนยันแล้วคุณจะไปเลือกทำแบบทดสอบ
                  Pre-test / Post-test ได้ทันที
                </p>
              </div>

              <Button
                type="primary"
                htmlType="submit"
                block
                loading={submitting}
                icon={<ArrowRight size={18} />}
                iconPosition="end"
                style={{ height: 54, fontWeight: 600, borderRadius: 16 }}
              >
                ยืนยันและดำเนินการต่อ
              </Button>
            </Form>
          </motion.div>

          <p className="text-center text-slate-400 text-xs mt-6 lg:mt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:pb-0">
            Dental Conference Questionnaire &amp; Certificate
          </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {verifiedName && <SuccessOverlay name={verifiedName} />}
      </AnimatePresence>
    </ConfigProvider>
  );
};

export default HomePage;