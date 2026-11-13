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
import { Alert, Button, Skeleton } from 'antd';

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

/* ---------- การ์ดแต่ละรายการ ---------- */
const STATUS_STYLE = {
  done: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    icon: 'bg-emerald-100 text-emerald-600',
  },
  available: {
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    icon: 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30',
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
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      whileTap={clickable && !reduceMotion ? { scale: 0.98 } : undefined}
      className={`w-full text-left rounded-2xl border p-4 flex items-center gap-4 transition-shadow ${
        clickable
          ? 'bg-white border-cyan-200 shadow-md hover:shadow-lg cursor-pointer'
          : 'bg-slate-50 border-slate-200 cursor-not-allowed'
      }`}
    >
      <span
        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${style.icon}`}
      >
        {status === 'done' ? (
          <CheckCircle2 size={24} />
        ) : status === 'locked' ? (
          <Lock size={22} />
        ) : (
          <Icon size={24} />
        )}
      </span>

      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2 flex-wrap mb-0.5">
          <span
            className={`font-semibold ${
              status === 'locked' ? 'text-slate-500' : 'text-slate-800'
            }`}
          >
            {title}
          </span>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${style.badge}`}
          >
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
          certificate_eligible:
            !!participant.pre_completed && !!participant.post_completed,
        }
      : null
  );
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const logout = useCallback(() => {
    clearSession();
    navigate(ROUTES.home, { replace: true });
  }, [navigate]);

  /* ดึงสถานะล่าสุดจากเซิร์ฟเวอร์ */
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
        logout(); // token หมดอายุหรือไม่ถูกต้อง
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
  const doneCount = (pre ? 1 : 0) + (post ? 1 : 0);

  const fade = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] },
        };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex justify-center">
      <div className="w-full max-w-md md:max-w-xl lg:max-w-none flex flex-col lg:flex-row min-h-[100dvh] relative">

        {/* ---------- Hero ---------- */}
        <div className="relative overflow-hidden bg-gradient-to-br from-cyan-600 via-teal-600 to-emerald-600 text-white px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-16 rounded-b-[2.5rem] lg:w-[46%] lg:shrink-0 lg:flex lg:items-center lg:px-14 lg:py-16 lg:rounded-b-none lg:rounded-r-[3rem]">
          <span
            aria-hidden
            className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10"
          />
          <span
            aria-hidden
            className="absolute -bottom-20 -left-12 w-48 h-48 rounded-full bg-white/10"
          />

          <motion.div {...fade(0)} className="relative lg:max-w-md w-full">
            <p className="text-xs font-semibold tracking-[0.25em] text-white/80 mb-3">
              DENTALMEET CERT
            </p>

            <p className="text-sm text-white/80 mb-1">สวัสดี</p>
            <h1 className="text-[26px] lg:text-4xl leading-tight font-bold mb-2 break-words">
              {participant
                ? `${participant.first_name} ${participant.last_name}`
                : 'ผู้เข้าร่วมประชุม'}
            </h1>
            {participant?.hospcode && (
              <p className="text-sm text-white/80">
                รหัสสถานบริการ {participant.hospcode}
              </p>
            )}

            {/* ความคืบหน้า */}
            <div className="mt-6">
              <div className="flex justify-between text-xs text-white/85 mb-2">
                <span>ความคืบหน้า</span>
                <span>ทำแล้ว {doneCount}/2 ชุด</span>
              </div>
              <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-white"
                  initial={{ width: 0 }}
                  animate={{ width: `${(doneCount / 2) * 100}%` }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* ---------- รายการ ---------- */}
        <div className="flex flex-col flex-1 lg:items-center lg:justify-center lg:px-10 lg:py-10">
          <motion.div
            {...fade(0.12)}
            className="relative -mt-8 mx-4 bg-white rounded-3xl shadow-xl shadow-slate-900/5 p-5 pb-6 lg:mt-0 lg:mx-0 lg:w-full lg:max-w-lg lg:p-10 lg:shadow-2xl"
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  เลือกแบบทดสอบ
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ทำ Pre-test ก่อน แล้วจึงทำ Post-test ได้
                </p>
              </div>
              <Button
                type="text"
                shape="circle"
                aria-label="รีเฟรชสถานะ"
                onClick={fetchStatus}
                loading={refreshing}
                icon={<RefreshCw size={16} className="text-slate-400" />}
              />
            </div>

            {error && (
              <Alert
                type="warning"
                showIcon
                closable
                message={error}
                onClose={() => setError('')}
                className="mb-4"
              />
            )}

            {!status ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : (
              <div className="flex flex-col gap-3">
                <ActionCard
                  icon={ClipboardList}
                  title="Pre-test"
                  desc={
                    pre
                      ? 'ส่งแบบทดสอบก่อนการประชุมเรียบร้อยแล้ว'
                      : 'แบบทดสอบก่อนการประชุม'
                  }
                  status={pre ? 'done' : 'available'}
                  badge={pre ? 'ส่งแล้ว' : 'พร้อมทำ'}
                  onClick={() => navigate(ROUTES.pre)}
                  delay={0.2}
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
                  delay={0.28}
                />

                <ActionCard
                  icon={Award}
                  title="ใบประกาศนียบัตร"
                  desc={
                    eligible
                      ? 'คุณมีสิทธิ์รับใบประกาศแล้ว'
                      : 'ทำแบบทดสอบครบทั้ง 2 ชุดเพื่อปลดล็อก'
                  }
                  status={eligible ? 'available' : 'locked'}
                  badge={eligible ? 'รับได้เลย' : 'ล็อก'}
                  onClick={() => navigate(ROUTES.certificate)}
                  delay={0.36}
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

          <p className="text-center text-slate-400 text-xs mt-6 lg:mt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:pb-0">
            Dental Conference Questionnaire &amp; Certificate
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestSelection;