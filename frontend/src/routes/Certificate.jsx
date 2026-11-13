import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Lock, Printer, RefreshCw } from 'lucide-react';
import { Alert, Button, ConfigProvider, Skeleton } from 'antd';

/* ---------- ตั้งค่า (แก้ให้ตรงกับงานจริง) ---------- */
const API_BASE =
  'https://pyodatahub.moph.go.th/datahub/pyo-kpi/backend/public/index.php/api/dental';

const ROUTES = {
  home: '/',
  tests: '/tests',
};

// ข้อความบนใบประกาศ
const EVENT_NAME = 'การประชุมวิชาการทันตแพทย์';

// ช่องลงนามท้ายใบประกาศ (แก้ตำแหน่งให้ตรงกับงานจริง หรือเพิ่ม/ลดได้)
const SIGNATORIES = [
  { title: 'ประธานการประชุม' },
  { title: 'ผู้จัดงาน' },
];

// ขนาดใบประกาศ A4 แนวนอน (px ที่ 96dpi)
const SHEET_W = 1123;
const SHEET_H = 794;

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

const formatThaiDate = (value) => {
  if (!value) return '';
  const d = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/* ---------- สไตล์สำหรับพิมพ์ / บันทึก PDF ---------- */
const PRINT_CSS = `
  .print-only { display: none; }
  @media print {
    @page { size: A4 landscape; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; }
    .no-print { display: none !important; }
    .print-only { display: block !important; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

/* ---------- ไอคอนฟัน ---------- */
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

/* ---------- ตัวใบประกาศ (ขนาดคงที่ A4 แนวนอน) ---------- */
const CertificateSheet = ({ name, hospcode, certNo, issuedDate }) => (
  <div
    style={{ width: SHEET_W, height: SHEET_H }}
    className="relative bg-white text-slate-800 overflow-hidden"
  >
    {/* กรอบ */}
    <div className="absolute inset-4 border-[6px] border-cyan-600" />
    <div className="absolute inset-7 border border-cyan-300" />

    {/* ลายตกแต่งมุม */}
    <span className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-cyan-50" />
    <span className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-emerald-50" />

    {/* ลายน้ำรูปฟัน */}
    <ToothIcon className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] text-cyan-600 opacity-[0.04]" />

    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-28 pb-24">
      <ToothIcon className="w-16 h-16 text-cyan-600 mb-3" />

      <p className="text-sm font-semibold tracking-[0.35em] text-cyan-700 mb-2">
        CERTIFICATE OF PARTICIPATION
      </p>
      <h1 className="text-[64px] leading-none font-bold text-slate-800 mb-4">
        ประกาศนียบัตร
      </h1>

      {/* เส้นคั่นลายอัญมณี */}
      <div className="flex items-center gap-3 mb-5" aria-hidden="true">
        <span className="w-24 h-px bg-gradient-to-r from-transparent to-cyan-500" />
        <span className="w-2.5 h-2.5 rotate-45 bg-amber-400" />
        <span className="w-24 h-px bg-gradient-to-l from-transparent to-cyan-500" />
      </div>

      <p className="text-lg text-slate-500 mb-3">
        ขอมอบประกาศนียบัตรฉบับนี้ไว้เพื่อแสดงว่า
      </p>

      <p className="text-5xl font-bold text-cyan-700 border-b-2 border-cyan-600 px-12 pb-3 mb-4 max-w-full break-words">
        {name}
      </p>

      {hospcode && (
        <p className="text-lg text-slate-500 mb-3">
          รหัสสถานบริการ {hospcode}
        </p>
      )}

      <p className="text-xl leading-relaxed text-slate-600 max-w-3xl">
        ได้เข้าร่วมและทำแบบทดสอบ Pre-test และ Post-test ครบถ้วน
        ใน{EVENT_NAME}
      </p>
    </div>

    {/* ลายเซ็น + ตราประทับ */}
    <div className="absolute bottom-[76px] inset-x-24 flex items-end justify-between">
      {SIGNATORIES.slice(0, 1).map((s) => (
        <div key={s.title} className="w-60 text-center">
          <div className="h-10 border-b border-slate-400" />
          <p className="text-sm font-semibold text-slate-700 mt-2">{s.title}</p>
        </div>
      ))}

      {/* ตราประทับ */}
      <div className="relative w-28 h-28 shrink-0">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-md" />
        <div className="absolute inset-2 rounded-full border-2 border-dashed border-amber-100" />
        <div className="absolute inset-4 rounded-full bg-white flex items-center justify-center">
          <ToothIcon className="w-9 h-9 text-amber-600" />
        </div>
      </div>

      {SIGNATORIES.slice(1, 2).map((s) => (
        <div key={s.title} className="w-60 text-center">
          <div className="h-10 border-b border-slate-400" />
          <p className="text-sm font-semibold text-slate-700 mt-2">{s.title}</p>
        </div>
      ))}
    </div>

    {/* เลขที่ + วันที่ออก */}
    <div className="absolute bottom-10 inset-x-20 flex justify-between text-sm text-slate-500">
      <span>{certNo ? `เลขที่ ${certNo}` : ''}</span>
      <span>{issuedDate ? `ออกให้เมื่อ ${issuedDate}` : ''}</span>
    </div>
  </div>
);

/* ---------- พรีวิวย่อให้พอดีความกว้างหน้าจอ ---------- */
const CertificatePreview = (props) => {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const update = () => setScale(Math.min(1, el.clientWidth / SHEET_W));
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full">
      <div
        style={{ height: SHEET_H * scale }}
        className="relative rounded-xl overflow-hidden shadow-xl ring-1 ring-slate-200 bg-white"
      >
        <div
          style={{
            width: SHEET_W,
            height: SHEET_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
          className="absolute top-0 left-0"
        >
          <CertificateSheet {...props} />
        </div>
      </div>
    </div>
  );
};

/* ---------- หน้าใบประกาศ ---------- */
const Certificate = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [participant] = useState(readCachedParticipant);
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCertificate = useCallback(async () => {
    const token = sessionStorage.getItem('participant_token');

    if (!token) {
      navigate(ROUTES.home, { replace: true });
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await axios.get(`${API_BASE}/certificate`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });

      const data = res?.data?.data;
      if (!res?.data?.success || !data) throw new Error('Invalid response');

      setCert(data);
    } catch (err) {
      if (err?.response?.status === 401) {
        clearSession();
        navigate(ROUTES.home, { replace: true });
        return;
      }
      setError('ไม่สามารถโหลดข้อมูลใบประกาศได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchCertificate();
  }, [fetchCertificate]);

  const fullName = participant
    ? `${participant.first_name} ${participant.last_name}`
    : '';

  const sheetProps = {
    name: fullName || 'ผู้เข้าร่วมประชุม',
    hospcode: participant?.hospcode,
    certNo: cert?.certificate_no,
    issuedDate: formatThaiDate(cert?.certificate_issued_at),
  };

  const fade = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
      };

  return (
    <ConfigProvider
      theme={{
        token: { colorPrimary: '#0891b2', borderRadius: 14, fontSize: 16 },
      }}
    >
      <style>{PRINT_CSS}</style>

      {/* ---------- ส่วนที่แสดงบนหน้าจอ ---------- */}
      <div className="no-print min-h-[100dvh] bg-slate-50">
        {/* Top bar */}
        <div className="bg-gradient-to-br from-cyan-600 via-teal-600 to-emerald-600 text-white px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-10 rounded-b-[2rem]">
          <div className="max-w-4xl mx-auto">
            <button
              type="button"
              onClick={() => navigate(ROUTES.tests)}
              className="flex items-center gap-1.5 text-sm text-white/85 hover:text-white mb-4"
            >
              <ArrowLeft size={18} />
              กลับ
            </button>
            <h1 className="text-2xl font-bold">ใบประกาศนียบัตร</h1>
            <p className="text-sm text-white/85 mt-1">
              {fullName || 'ผู้เข้าร่วมประชุม'}
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 -mt-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <motion.div
            {...fade}
            className="bg-white rounded-3xl shadow-xl shadow-slate-900/5 p-4 sm:p-6"
          >
            {loading && <Skeleton active paragraph={{ rows: 6 }} />}

            {!loading && error && (
              <Alert
                type="error"
                showIcon
                message={error}
                action={
                  <Button
                    type="link"
                    size="small"
                    icon={<RefreshCw size={14} />}
                    onClick={fetchCertificate}
                  >
                    ลองใหม่
                  </Button>
                }
              />
            )}

            {/* ยังไม่มีสิทธิ์ */}
            {!loading && !error && cert && !cert.eligible && (
              <div className="text-center py-10 px-2">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
                  <Lock size={28} />
                </div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">
                  ยังไม่สามารถรับใบประกาศได้
                </h2>
                <p className="text-sm text-slate-500 mb-6">
                  ต้องทำแบบทดสอบ Pre-test และ Post-test ให้ครบทั้ง 2 ชุดก่อน
                </p>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate(ROUTES.tests)}
                  style={{ borderRadius: 14, fontWeight: 600 }}
                >
                  ไปหน้าเลือกแบบทดสอบ
                </Button>
              </div>
            )}

            {/* มีสิทธิ์ */}
            {!loading && !error && cert?.eligible && (
              <>
                <CertificatePreview {...sheetProps} />

                <p className="md:hidden text-center text-xs text-slate-400 mt-3">
                  หมุนจอเป็นแนวนอนเพื่อดูใบประกาศให้ชัดขึ้น
                </p>

                <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:justify-center">
                  <Button
                    type="primary"
                    size="large"
                    icon={<Printer size={18} />}
                    onClick={() => window.print()}
                    style={{ height: 52, borderRadius: 16, fontWeight: 600 }}
                  >
                    บันทึกเป็น PDF / พิมพ์
                  </Button>
                  <Button
                    size="large"
                    onClick={() => navigate(ROUTES.tests)}
                    style={{ height: 52, borderRadius: 16 }}
                  >
                    กลับหน้าเลือกแบบทดสอบ
                  </Button>
                </div>

                <p className="text-center text-xs text-slate-400 mt-3">
                  ในหน้าต่างพิมพ์ให้เลือกปลายทางเป็น &quot;บันทึกเป็น PDF&quot;
                  (Save as PDF) และเลือกแนวนอน (Landscape)
                  แนะนำให้เปิดหน้านี้ด้วย Chrome หรือ Edge
                </p>
              </>
            )}
          </motion.div>
        </div>
      </div>

      {/* ---------- ฉบับพิมพ์ (แสดงเฉพาะตอนพิมพ์) ---------- */}
      {cert?.eligible && (
        <div
          className="print-only"
          style={{ width: '297mm', height: '210mm', overflow: 'hidden' }}
        >
          <CertificateSheet {...sheetProps} />
        </div>
      )}
    </ConfigProvider>
  );
};

export default Certificate;