import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ClipboardList,
  ClipboardCheck,
  Award,
  Lock,
  CheckCircle2,
  ChevronRight,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { Alert, Button, ConfigProvider, Skeleton } from 'antd';
import { C, ThemeShell, antdCfg } from './DentalTheme'; // ปรับ path ให้ตรงโปรเจกต์

/* ---------- ตั้งค่า (แก้ให้ตรงกับ route / API จริงของโปรเจกต์) ---------- */
const API_BASE =
  'https://pyodatahub.moph.go.th/datahub/pyo-kpi/backend/public/index.php/api/dental';

const ROUTES = {
  home: '/',
  pre: '/tests/pre',
  post: '/tests/post',
  certificate: '/certificate',
};

/* ---------- Helpers ---------- */
const readCachedParticipant = () => {
  try {
    return JSON.parse(sessionStorage.getItem('participant') || 'null');
  } catch {
    return null;
  }
};

const clearSession = () => {
  sessionStorage.removeItem('participant_token');
  sessionStorage.removeItem('participant');
};

/* ---------- แถบความคืบหน้าแบบแบ่งช่อง (แทนวงแหวน) ---------- */
const ProgressSteps = ({ steps }) => {
  const reduceMotion = useReducedMotion();
  const done = steps.filter((s) => s.done).length;
  const total = steps.length;

  return (
    <div className="w-full max-w-xs text-left">
      <div className="flex items-end justify-between mb-3">
        <div className="flex items-baseline gap-1">
          <span className="dm-head text-5xl font-bold leading-none" style={{ color: C.accent }}>
            {done}
          </span>
          <span className="dm-head text-xl font-semibold text-slate-400">/{total}</span>
        </div>
        <span className="text-xs text-slate-500 pb-1">ชุดที่ทำแล้ว</span>
      </div>

      <div className="flex gap-2">
        {steps.map((s, i) => (
          <div key={s.label} className="flex-1">
            <div className="h-2.5 rounded-full bg-cyan-600/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full origin-left"
                style={{
                  background: `linear-gradient(90deg, ${C.cyan}, ${C.accent})`,
                  boxShadow: `0 0 10px ${C.cyan}`,
                }}
                initial={reduceMotion ? false : { scaleX: 0 }}
                animate={{ scaleX: s.done ? 1 : 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.8,
                  delay: reduceMotion ? 0 : 0.3 + i * 0.25,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            </div>
            <div
              className={`mt-2 flex items-center gap-1.5 text-[11px] font-medium ${
                s.done ? 'text-emerald-700' : 'text-slate-400'
              }`}
            >
              {s.done ? (
                <CheckCircle2 size={13} className="text-emerald-600" />
              ) : (
                <span className="w-[13px] h-[13px] rounded-full border border-slate-300 inline-block" />
              )}
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-slate-600">
        {done === total
          ? 'ครบทั้ง 2 ชุดแล้ว รับใบประกาศได้เลย'
          : 'ทำแบบทดสอบให้ครบทั้ง 2 ชุดเพื่อรับใบประกาศ'}
      </p>
    </div>
  );
};

/* ---------- การ์ดแต่ละรายการ ---------- */
const STATUS_STYLE = {
  done: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    icon: 'bg-emerald-100 text-emerald-600',
  },
  available: {
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    icon: 'bg-cyan-600 text-white shadow-[0_0_18px_rgba(8,145,178,.45)]',
  },
  locked: {
    badge: 'bg-slate-100 text-slate-500 border-slate-200',
    icon: 'bg-slate-100 text-slate-400',
  },
};

const ActionCard = ({ icon: Icon, title, desc, status, badge, onClick, delay }) => {
  const reduceMotion = useReducedMotion();
  const style = STATUS_STYLE[status];
  const clickable = status === 'available';

  return (
    <motion.button
      type="button"
      onClick={clickable ? onClick : undefined}
      aria-disabled={!clickable}
      initial={reduceMotion ? false : { opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={clickable && !reduceMotion ? { x: 4 } : undefined}
      whileTap={clickable && !reduceMotion ? { scale: 0.98 } : undefined}
      className={`w-full text-left rounded-2xl border p-4 flex items-center gap-4 transition-colors ${
        clickable
          ? 'bg-white border-cyan-200 shadow-[0_6px_24px_rgba(8,145,178,.15)] hover:border-cyan-400 cursor-pointer'
          : 'bg-slate-50 border-slate-200 cursor-not-allowed'
      }`}
    >
      <span className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${style.icon}`}>
        {status === 'done' ? <CheckCircle2 size={24} /> : status === 'locked' ? <Lock size={22} /> : <Icon size={24} />}
      </span>

      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className={`font-semibold ${status === 'locked' ? 'text-slate-400' : 'text-slate-800'}`}>
            {title}
          </span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${style.badge}`}>
            {badge}
          </span>
        </span>
        <span className="block text-xs leading-relaxed text-slate-500">{desc}</span>
      </span>

      {clickable && <ChevronRight className="text-cyan-600 shrink-0" size={20} />}
    </motion.button>
  );
};

/* ---------- หน้าเลือกทำแบบทดสอบ ---------- */
const TestSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  const [participant] = useState(
    () => location.state?.participant || readCachedParticipant()
  );

  const [status, setStatus] = useState(() =>
    participant
      ? {
          pre_completed: !!participant.pre_completed,
          post_completed: !!participant.post_completed,
          certificate_eligible: !!participant.pre_completed && !!participant.post_completed,
        }
      : null
  );
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const logout = useCallback(() => {
    clearSession();
    navigate(ROUTES.home, { replace: true });
  }, [navigate]);

  const fetchStatus = useCallback(async () => {
    const token = sessionStorage.getItem('participant_token');

    if (!token) {
      navigate(ROUTES.home, { replace: true });
      return;
    }

    setRefreshing(true);
    setError('');

    try {
      const res = await axios.get(`${API_BASE}/status`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });

      const data = res?.data?.data;
      if (!res?.data?.success || !data) throw new Error('Invalid status');

      setStatus({
        pre_completed: !!data.pre_completed,
        post_completed: !!data.post_completed,
        certificate_eligible: !!data.certificate_eligible,
      });
    } catch (err) {
      if (err?.response?.status === 401) {
        logout();
        return;
      }
      setError('ไม่สามารถอัปเดตสถานะล่าสุดได้ กรุณาลองใหม่');
    } finally {
      setRefreshing(false);
    }
  }, [navigate, logout]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const pre = status?.pre_completed;
  const post = status?.post_completed;
  const eligible = status?.certificate_eligible;

  const fade = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 24, filter: 'blur(10px)' },
          animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
          transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] },
        };

  return (
    <ConfigProvider theme={antdCfg}>
      <ThemeShell>
        <div className="mx-auto w-full max-w-md md:max-w-xl lg:max-w-5xl min-h-[100dvh] flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12 px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
          {/* ---------- Hero ---------- */}
          <motion.div {...fade(0)} className="lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left">
            <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.3em] mb-4" style={{ color: C.accent }}>
              <span className="w-8 h-px" style={{ background: C.accent }} />
              DENTALMEET CERT
            </p>

            <p className="text-sm text-slate-500 mb-1">สวัสดี</p>
            <h1 className="dm-head text-[28px] lg:text-5xl leading-tight font-bold mb-2 break-words">
              {participant ? `${participant.first_name} ${participant.last_name}` : 'ผู้เข้าร่วมประชุม'}
            </h1>
            {participant?.hospcode && (
              <p className="text-sm text-slate-500">รหัสสถานบริการ {participant.hospcode}</p>
            )}

            <div className="mt-8 w-full flex justify-center lg:justify-start">
              <ProgressSteps
                steps={[
                  { label: 'Pre-test', done: !!pre },
                  { label: 'Post-test', done: !!post },
                ]}
              />
            </div>
          </motion.div>

          {/* ---------- รายการ ---------- */}
          <div className="lg:w-1/2 flex flex-col items-center">
            <motion.div
              {...fade(0.2)}
              className="dm-border w-full max-w-md rounded-3xl bg-white/85 backdrop-blur-xl p-5 pb-6 lg:p-8 shadow-[0_12px_60px_rgba(8,145,178,.18)]"
            >
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="dm-head text-lg font-bold text-slate-800">เลือกแบบทดสอบ</h2>
                  <p className="text-xs text-slate-500 mt-0.5">ทำ Pre-test ก่อน แล้วจึงทำ Post-test ได้</p>
                </div>
                <Button
                  type="text"
                  shape="circle"
                  aria-label="รีเฟรชสถานะ"
                  onClick={fetchStatus}
                  loading={refreshing}
                  icon={<RefreshCw size={16} className="text-cyan-600/70" />}
                />
              </div>

              {error && (
                <Alert type="warning" showIcon closable message={error} onClose={() => setError('')} className="mb-4" />
              )}

              {!status ? (
                <Skeleton active paragraph={{ rows: 5 }} />
              ) : (
                <div className="flex flex-col gap-3">
                  <ActionCard
                    icon={ClipboardList}
                    title="Pre-test"
                    desc={pre ? 'ส่งแบบทดสอบก่อนการประชุมเรียบร้อยแล้ว' : 'แบบทดสอบก่อนการประชุม'}
                    status={pre ? 'done' : 'available'}
                    badge={pre ? 'ส่งแล้ว' : 'พร้อมทำ'}
                    onClick={() => navigate(ROUTES.pre)}
                    delay={0.5}
                  />
                  <ActionCard
                    icon={ClipboardCheck}
                    title="Post-test"
                    desc={
                      !pre
                        ? 'ต้องทำ Pre-test ให้เสร็จก่อน'
                        : post
                        ? 'ส่งแบบทดสอบหลังการประชุมเรียบร้อยแล้ว'
                        : 'แบบทดสอบหลังการประชุม'
                    }
                    status={!pre ? 'locked' : post ? 'done' : 'available'}
                    badge={!pre ? 'ล็อก' : post ? 'ส่งแล้ว' : 'พร้อมทำ'}
                    onClick={() => navigate(ROUTES.post)}
                    delay={0.62}
                  />
                  <ActionCard
                    icon={Award}
                    title="ใบประกาศนียบัตร"
                    desc={eligible ? 'คุณมีสิทธิ์รับใบประกาศแล้ว' : 'ทำแบบทดสอบครบทั้ง 2 ชุดเพื่อปลดล็อก'}
                    status={eligible ? 'available' : 'locked'}
                    badge={eligible ? 'รับได้เลย' : 'ล็อก'}
                    onClick={() => navigate(ROUTES.certificate)}
                    delay={0.74}
                  />
                </div>
              )}

              <button
                type="button"
                onClick={logout}
                className="mt-6 mx-auto flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                <LogOut size={14} />
                ไม่ใช่คุณ? ออกจากระบบ
              </button>
            </motion.div>

            <p className="text-center text-slate-400 text-xs mt-6">
              Dental Conference Questionnaire &amp; Certificate
            </p>
          </div>
        </div>
      </ThemeShell>
    </ConfigProvider>
  );
};

export default TestSelection;