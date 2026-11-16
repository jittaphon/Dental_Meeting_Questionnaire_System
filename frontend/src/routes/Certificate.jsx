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
import certBg from '../assets/certificate-bg.png'; // ปรับ path ให้ตรงกับที่วางรูป
import signImg from '../assets/sign.png'; // ลายเซ็นนายแพทย์
import { antdCfg, ThemeShell, glowBtn } from './DentalTheme'; // ปรับ path ให้ตรงโปรเจกต์

/* ---------- ตั้งค่า (แก้ให้ตรงกับงานจริง) ---------- */
const API_BASE =
  'https://pyodatahub.moph.go.th/datahub/pyo-kpi/backend/public/index.php/api/dental';

const ROUTES = {
  home: '/',
  tests: '/tests',
};

// ขนาดใบประกาศ (px ที่ 96dpi) ค่าเริ่มต้น A4 แนวนอน
// ถ้ารูปสัดส่วนไม่ใช่ A4 ให้แก้ SHEET_H = Math.round(SHEET_W * สูงรูป / กว้างรูป)
const SHEET_W = 1123;
const SHEET_H = 794;

// ตำแหน่งช่องชื่อบนรูป (ช่องว่างระหว่าง "ขอมอบเกียรติบัตรฉบับนี้เพื่อแสดงว่า" กับ "ได้เข้าร่วมการอบรม...")
const NAME_TOP = '40%'; // ระยะจากขอบบน (กึ่งกลางช่องชื่อ)
const NAME_LEFT = 150; // px ระยะจากขอบซ้าย
const NAME_RIGHT = 150; // px ระยะจากขอบขวา
const NAME_BOX_HEIGHT = 100; // ความสูงกล่องชื่อ

// ตำแหน่งลายเซ็นนายแพทย์ (กึ่งกลางเหนือเส้นลงนาม)
const SHOW_SIGN = true;
const SIGN_CENTER_X = 548; // px จากขอบซ้าย (กึ่งกลางลายเซ็น)
const SIGN_LINE_Y = 620; // px จากขอบบน (ขอบล่างของลายเซ็น = เหนือเส้นเล็กน้อย)
const SIGN_WIDTH = 150; // px ความกว้างลายเซ็น

// แสดงเลขที่ / วันที่ออก ทับบนรูปหรือไม่ (ในรูปมีวันที่พิมพ์ติดอยู่แล้ว จึงปิดไว้)
const SHOW_CERT_NO = false;
const SHOW_ISSUED_DATE = false;

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
  const d =
    value instanceof Date ? value : new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// ลดขนาดตัวอักษรอัตโนมัติเมื่อชื่อยาว กันล้นกรอบ
const nameFontSize = (name = '') => {
  const len = name.length;
  if (len > 40) return 28;
  if (len > 30) return 34;
  if (len > 22) return 42;
  return 48;
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

/* ---------- ตัวใบประกาศ (ใช้รูป PNG เป็นพื้นหลัง + วางชื่อและลายเซ็นทับ) ---------- */
const CertificateSheet = ({ name, certNo, issuedDate }) => (
  <div
    style={{ width: SHEET_W, height: SHEET_H }}
    className="relative bg-white overflow-hidden"
  >
    {/* พื้นหลังใบประกาศ */}
    <img
      src={certBg}
      alt=""
      draggable={false}
      className="absolute inset-0 w-full h-full select-none"
      style={{ objectFit: 'fill' }}
    />

    {/* ชื่อ: ปรับ NAME_TOP / NAME_LEFT / NAME_RIGHT ด้านบนให้ตรงช่องว่าง */}
    <div
      className="absolute flex items-center justify-center text-center"
      style={{
        top: NAME_TOP,
        left: NAME_LEFT,
        right: NAME_RIGHT,
        height: NAME_BOX_HEIGHT,
        transform: 'translateY(-50%)',
        // outline: '1px dashed red', // เปิดชั่วคราวเพื่อดูกรอบตอนจูนตำแหน่ง
      }}
    >
      <span
        className="font-bold text-slate-800 leading-tight whitespace-nowrap"
        style={{ fontSize: nameFontSize(name) }}
      >
        {name}
      </span>
    </div>

    {/* ลายเซ็นนายแพทย์ */}
    {SHOW_SIGN && (
      <img
        src={signImg}
        alt="ลายเซ็น"
        draggable={false}
        className="absolute select-none pointer-events-none"
        style={{
          left: SIGN_CENTER_X,
          top: SIGN_LINE_Y,
          width: SIGN_WIDTH,
          height: 'auto',
          transform: 'translate(-50%, -100%)', // กึ่งกลางแนวนอน และให้ขอบล่างอยู่ที่ SIGN_LINE_Y
          mixBlendMode: 'multiply', // ทำให้พื้นขาวของรูปกลืนไปกับพื้นหลังใบประกาศ
          // outline: '1px dashed red', // เปิดชั่วคราวเพื่อดูกรอบตอนจูนตำแหน่ง
        }}
      />
    )}

    {/* เลขที่ + วันที่ออก (ปิดได้ที่ค่าคงที่ด้านบน) */}
    {SHOW_CERT_NO && certNo && (
      <span
        className="absolute text-sm text-slate-600"
        style={{ left: 84, bottom: 66 }}
      >
        เลขที่ {certNo}
      </span>
    )}
    {SHOW_ISSUED_DATE && issuedDate && (
      <span
        className="absolute text-sm text-white/90"
        style={{ right: 80, bottom: 34 }}
      >
        ออกให้เมื่อ {issuedDate}
      </span>
    )}
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
        className="relative rounded-xl overflow-hidden shadow-[0_0_40px_rgba(8,145,178,.25)] ring-1 ring-cyan-300/50 bg-white"
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
  const [today] = useState(() => new Date()); // วันที่ปัจจุบัน ณ ตอนเปิดหน้านี้
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
    certNo: cert?.certificate_no,
    issuedDate: formatThaiDate(today),
  };

  const fade = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
      };

  return (
    <ConfigProvider theme={antdCfg}>
      <style>{PRINT_CSS}</style>

      {/* ---------- ส่วนที่แสดงบนหน้าจอ ---------- */}
      <ThemeShell className="no-print">
        {/* Top bar */}
        <div className="text-slate-800 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-10">
          <div className="max-w-4xl mx-auto">
            <button
              type="button"
              onClick={() => navigate(ROUTES.tests)}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4"
            >
              <ArrowLeft size={18} />
              กลับ
            </button>
            <h1 className="dm-head text-2xl font-bold">ใบประกาศนียบัตร</h1>
            <p className="text-sm text-slate-500 mt-1">
              {fullName || 'ผู้เข้าร่วมประชุม'}
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 -mt-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <motion.div
            {...fade}
            className="dm-border rounded-3xl bg-white/85 backdrop-blur-xl shadow-[0_12px_60px_rgba(8,145,178,.18)] p-4 sm:p-6"
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
                <h2 className="dm-head text-lg font-bold text-slate-800 mb-1">
                  ยังไม่สามารถรับใบประกาศได้
                </h2>
                <p className="text-sm text-slate-500 mb-6">
                  ต้องทำแบบทดสอบ Pre-test และ Post-test ให้ครบทั้ง 2 ชุดก่อน
                </p>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate(ROUTES.tests)}
                  style={{ borderRadius: 14, fontWeight: 600, ...glowBtn }}
                >
                  ไปหน้าเลือกแบบทดสอบ
                </Button>
              </div>
            )}

            {/* มีสิทธิ์ */}
            {!loading && !error && cert?.eligible && (
              <>
                <CertificatePreview {...sheetProps} />

                <p className="md:hidden text-center text-xs text-slate-500 mt-3">
                  หมุนจอเป็นแนวนอนเพื่อดูใบประกาศให้ชัดขึ้น
                </p>

                <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:justify-center">
                  <Button
                    type="primary"
                    size="large"
                    icon={<Printer size={18} />}
                    onClick={() => window.print()}
                    style={{ height: 52, borderRadius: 16, fontWeight: 600, ...glowBtn }}
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

                <p className="text-center text-xs text-slate-500 mt-3">
                  ในหน้าต่างพิมพ์ให้เลือกปลายทางเป็น &quot;บันทึกเป็น PDF&quot;
                  (Save as PDF) และเลือกแนวนอน (Landscape)
                  แนะนำให้เปิดหน้านี้ด้วย Chrome หรือ Edge
                </p>
              </>
            )}
          </motion.div>
        </div>
      </ThemeShell>

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