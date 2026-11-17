import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  LogOut,
  Lock,
  RefreshCw,
  Search,
  Users,
  ClipboardCheck,
  TrendingUp,
  Trophy,
  AlertTriangle,
  ChevronDown,
  Check,
  X,
} from 'lucide-react';
import { Alert, Button, ConfigProvider, Input, Segmented, Skeleton, Switch, Tag } from 'antd';
import { antdCfg, ThemeShell } from './DentalTheme'; // ปรับ path ให้ตรงโปรเจกต์

/* ---------- ตั้งค่า ---------- */
// true = ใช้ข้อมูลตัวอย่าง, false = ดึงข้อมูลจริงจากหลังบ้าน
const USE_MOCK = false;

const API_BASE =
  'https://pyodatahub.moph.go.th/datahub/pyo-kpi/backend/public/index.php/api/dental';
const RESULTS_URL = `${API_BASE}/answers`;

// ⚠ รหัสผ่านฝั่งหน้าเว็บ ใครเปิด DevTools ก็เห็นได้ ควรตรวจรหัสที่หลังบ้านด้วยเมื่อใช้งานจริง
const ADMIN_PASSWORD = '00043';
const AUTH_KEY = 'dental_admin_ok';

// header สำหรับยืนยันตัวตน (Authorization อยู่ใน Access-Control-Allow-Headers ของหลังบ้านแล้ว)
const authHeaders = (password) => ({
  Accept: 'application/json',
  Authorization: `Bearer ${password}`,
});

// คำที่ใช้ระบุว่าเป็นข้อมูลทดสอบ (ตรวจจากชื่อ-นามสกุล และชื่อสถานบริการ) เพิ่ม/ลบคำได้
const TEST_KEYWORDS = ['ทดสอบ', 'test'];
// ถ้ามี id ที่อยากระบุตรง ๆ ใส่ที่นี่ เช่น [1, 2]
const TEST_IDS = [];

const OPTION_KEYS = ['A', 'B', 'C', 'D'];

// เฉลยและหัวข้อย่อของแต่ละข้อ (ตรงกับ Questionnaire)
const QUESTIONS = [
  { id: '1', key: 'B', short: 'หลักการสำคัญของ MID' },
  { id: '2', key: 'D', short: 'บทบาทของ SDF และ HVGIC ใน SMART Technique' },
  { id: '3', key: 'C', short: 'วางแผนผู้ป่วยเด็กเสี่ยงสูง รอยโรคระยะเริ่มต้น' },
  { id: '4', key: 'A', short: 'แผนที่ครอบคลุม Patient-level และ Lesion-level' },
  { id: '5', key: 'C', short: 'Infected / Affected dentin กับการกำจัดฟันผุ' },
  { id: '6', key: 'A', short: 'เป้าหมายระยะยาวของ MID' },
  { id: '7', key: 'C', short: 'ความเข้มข้นของ SDF ที่ใช้ปัจจุบัน' },
  { id: '8', key: 'B', short: 'ข้อที่ไม่ใช่ข้อบ่งใช้ SDF' },
  { id: '9', key: 'D', short: 'ข้อที่ไม่ใช่ปฏิกิริยาการทำงานของ SDF' },
  { id: '10', key: 'A', short: 'SDF โดนเนื้อเยื่อช่องปาก/ผิวหนัง' },
  { id: '11', key: 'B', short: 'SDF โดนเสื้อผ้า' },
];
const TOTAL = QUESTIONS.length;

/* ---------- ข้อมูลตัวอย่าง (สุ่มแบบคงที่ ใช้เมื่อ USE_MOCK = true) ---------- */
const buildMock = () => {
  let seed = 7;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  // ความน่าจะเป็นที่จะตอบถูกของแต่ละข้อ (ข้อ 4, 5, 9 ให้ยากหน่อย)
  const hardness = { 1: 0.85, 2: 0.7, 3: 0.6, 4: 0.4, 5: 0.45, 6: 0.75, 7: 0.65, 8: 0.5, 9: 0.4, 10: 0.7, 11: 0.8 };
  const names = [
    ['สมชาย', 'ใจดี'], ['สมหญิง', 'รักเรียน'], ['วิชัย', 'สุขสันต์'], ['นิภา', 'แสงทอง'],
    ['ประเสริฐ', 'มั่นคง'], ['อรทัย', 'บุญมา'], ['ธนากร', 'พึ่งพา'], ['กัลยา', 'เจริญสุข'],
    ['ภานุ', 'ศรีสุข'], ['ปวีณา', 'ดีเลิศ'], ['สุรชัย', 'ทองแท้'], ['มาลี', 'สายสุด'],
    ['อนุชา', 'พรหมมา'], ['จิราพร', 'คำดี'], ['ณัฐวุฒิ', 'อินทร์แก้ว'], ['รัตนา', 'วงศ์ใหญ่'],
    ['พิชิต', 'เพชรงาม'], ['ศิริพร', 'นาคสุข'], ['วรากร', 'สมบูรณ์'], ['ดวงใจ', 'ใสสะอาด'],
  ];
  const answer = (boost) =>
    Object.fromEntries(
      QUESTIONS.map((q) => {
        const p = Math.min(0.97, hardness[q.id] + boost);
        if (rnd() < p) return [q.id, q.key];
        const wrong = OPTION_KEYS.filter((k) => k !== q.key);
        return [q.id, wrong[Math.floor(rnd() * wrong.length)]];
      })
    );

  return names.map(([first_name, last_name], i) => ({
    id: i + 1,
    first_name,
    last_name,
    hospcode: `รพ.สต.ตัวอย่าง ${i + 1}`,
    pre_answers: i % 9 === 8 ? null : answer(-0.1), // บางคนยังไม่ทำ Pre
    post_answers: i % 6 === 5 ? null : answer(0.15), // บางคนยังไม่ทำ Post
  }));
};

/* ---------- Helpers ---------- */
// รองรับ answers ได้หลายรูปแบบ: object, JSON string, หรือ array ของ {question_id, answer}
const toMap = (raw) => {
  if (!raw) return null;
  let v = raw;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      return null;
    }
  }
  if (Array.isArray(v)) {
    return Object.fromEntries(
      v.map((x) => [String(x.question_id ?? x.question), String(x.answer ?? x.selected).toUpperCase()])
    );
  }
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, a]) => [String(k), String(a).toUpperCase()]));
  }
  return null;
};

const pickTest = (v) => {
  const s = String(v ?? '').toLowerCase();
  if (s.includes('post')) return 'post';
  if (s.includes('pre')) return 'pre';
  return null;
};

// รองรับ 2 รูปแบบ: 1 แถวต่อคน (มี pre_answers/post_answers) และ 1 แถวต่อ 1 คำตอบ
const normalize = (list) => {
  const arr = Array.isArray(list) ? list : [];

  // รูปแบบ A: 1 แถวต่อคน มี pre_answers / post_answers
  const isPerPerson =
    arr.length > 0 &&
    arr.some((p) => 'pre_answers' in p || 'post_answers' in p || 'pre' in p || 'post' in p);

  if (isPerPerson) {
    return arr.map((p) => ({
      id: p.id,
      name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
      hospcode: p.hospcode ?? '-',
      pre: toMap(p.pre_answers ?? p.pre),
      post: toMap(p.post_answers ?? p.post),
    }));
  }

  // รูปแบบ B: 1 แถวต่อ 1 คำตอบ (participant_id, test_type, question_id, answer)
  const byUser = new Map();
  arr.forEach((a) => {
    const uid = a.participant_id ?? a.user_id ?? a.participant?.id;
    if (uid == null) return;
    if (!byUser.has(uid)) {
      const src = a.participant ?? a;
      byUser.set(uid, {
        id: uid,
        name: `${src.first_name ?? ''} ${src.last_name ?? ''}`.trim(),
        hospcode: src.hospcode ?? '-',
        pre: null,
        post: null,
      });
    }
    const row = byUser.get(uid);
    const t = pickTest(a.test_type ?? a.type ?? a.test ?? a.test_set);
    const qid = a.question_id ?? a.question_no ?? a.question;
    const ans = a.answer ?? a.selected ?? a.choice;
    if (!t || qid == null || ans == null) return;
    row[t] = { ...(row[t] || {}), [String(qid)]: String(ans).toUpperCase() };
  });
  return [...byUser.values()];
};

// เป็นข้อมูลทดสอบหรือไม่
const isTestRow = (r) => {
  if (TEST_IDS.includes(r.id)) return true;
  const text = `${r.name} ${r.hospcode}`.toLowerCase();
  return TEST_KEYWORDS.some((k) => text.includes(k.toLowerCase()));
};

const scoreOf = (map) =>
  map ? QUESTIONS.reduce((s, q) => s + (map[q.id] === q.key ? 1 : 0), 0) : null;

const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const fmt = (n) => (n == null ? '-' : n.toFixed(1));

// ระดับความเข้าใจของแต่ละข้อ
const levelOf = (rate, hasData = true) => {
  if (!hasData) {
    return { label: 'ไม่มีข้อมูล', badge: 'bg-slate-100 text-slate-500', circle: 'bg-slate-100 text-slate-500', bar: 'from-slate-300 to-slate-300' };
  }
  if (rate >= 80) {
    return { label: 'ทำได้ดี', badge: 'bg-emerald-100 text-emerald-700', circle: 'bg-emerald-100 text-emerald-700', bar: 'from-emerald-400 to-emerald-500' };
  }
  if (rate >= 60) {
    return { label: 'พอใช้', badge: 'bg-amber-100 text-amber-700', circle: 'bg-amber-100 text-amber-700', bar: 'from-amber-300 to-amber-400' };
  }
  return { label: 'ควรทบทวน', badge: 'bg-rose-100 text-rose-700', circle: 'bg-rose-100 text-rose-700', bar: 'from-rose-400 to-rose-500' };
};

const computeQuestionStats = (rows, key) => {
  const who = rows.filter((r) => r[key]);
  return QUESTIONS.map((q) => {
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    who.forEach((r) => {
      const a = r[key][q.id];
      if (counts[a] !== undefined) counts[a] += 1;
    });
    const n = who.length;
    const correct = counts[q.key];
    const topWrong = OPTION_KEYS.filter((k) => k !== q.key).sort((a, b) => counts[b] - counts[a])[0];
    return {
      ...q,
      n,
      correct,
      wrong: n - correct,
      rate: pct(correct, n),
      counts,
      topWrong: counts[topWrong] > 0 ? topWrong : null,
    };
  });
};

/* ---------- ส่วนย่อย ---------- */
const StatCard = ({ icon: Icon, label, value, hint, tone = 'cyan' }) => {
  const tones = {
    cyan: 'bg-cyan-50 text-cyan-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  return (
    <div className="dm-border rounded-2xl bg-white/85 backdrop-blur-xl p-4 shadow-[0_8px_30px_rgba(8,145,178,.12)]">
      <div className="flex items-center gap-3">
        <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
          <Icon size={22} />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-800 leading-tight">{value}</p>
        </div>
      </div>
      {hint && <p className="text-xs text-slate-400 mt-2">{hint}</p>}
    </div>
  );
};

const AnswerChips = ({ map }) => {
  if (!map) return <span className="text-slate-400 text-sm">ยังไม่ได้ทำ</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {QUESTIONS.map((q) => {
        const a = map[q.id];
        const ok = a === q.key;
        return (
          <span
            key={q.id}
            title={`ข้อ ${q.id}: ตอบ ${a || '-'} (เฉลย ${q.key})`}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
              ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}
          >
            {q.id}
            {ok ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
            <span className="opacity-70">{a || '-'}</span>
            {!ok && <span className="opacity-60">→{q.key}</span>}
          </span>
        );
      })}
    </div>
  );
};

const ScoreBadge = ({ label, score }) => {
  if (score == null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-400">
        {label} -
      </span>
    );
  }
  const lv = levelOf(pct(score, TOTAL));
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${lv.badge}`}>
      {label} {score}/{TOTAL}
    </span>
  );
};

/* ---------- แถวสรุปรายข้อ: โหมดดู Pre หรือ Post ---------- */
const QuestionDetailRow = ({ q }) => {
  const lv = levelOf(q.rate, q.n > 0);
  const wrongShare = q.n ? 100 - q.rate : 0;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-base font-bold ${lv.circle}`}>
          {q.id}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold text-slate-800">{q.short}</p>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${lv.badge}`}>{lv.label}</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {q.n ? `ตอบถูก ${q.correct} จาก ${q.n} คน · เฉลยข้อ ${q.key}` : 'ยังไม่มีผู้ทำแบบทดสอบชุดนี้'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-slate-800 leading-none">{q.rate}%</p>
          <p className="text-[11px] text-slate-400 mt-1">ตอบถูก</p>
        </div>
      </div>

      {/* แถบ ถูก / ผิด */}
      <div className="mt-3 flex h-7 rounded-full overflow-hidden bg-slate-100 text-[11px] font-semibold">
        {q.n > 0 && (
          <>
            <motion.div
              className={`flex items-center justify-center text-white bg-gradient-to-r ${lv.bar}`}
              initial={false}
              animate={{ width: `${q.rate}%` }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {q.rate >= 14 && `ถูก ${q.correct} คน`}
            </motion.div>
            <motion.div
              className="flex items-center justify-center bg-rose-100 text-rose-600"
              initial={false}
              animate={{ width: `${wrongShare}%` }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {wrongShare >= 14 && `ผิด ${q.wrong} คน`}
            </motion.div>
          </>
        )}
      </div>

      {/* คนตอบแต่ละตัวเลือกกี่คน */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {OPTION_KEYS.map((k) => {
          const c = q.counts[k];
          const p = pct(c, q.n);
          const isKey = k === q.key;
          const isTopWrong = k === q.topWrong;
          const tone = isKey
            ? 'border-emerald-300 bg-emerald-50/60'
            : isTopWrong
            ? 'border-rose-300 bg-rose-50/60'
            : 'border-slate-200 bg-white';
          const fill = isKey ? 'bg-emerald-200/70' : isTopWrong ? 'bg-rose-200/70' : 'bg-slate-100';
          return (
            <div key={k} className={`relative overflow-hidden rounded-xl border px-3 py-2 ${tone}`}>
              <div className={`absolute inset-y-0 left-0 ${fill}`} style={{ width: `${p}%` }} />
              <div className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                  {k}
                  {isKey && <Check size={14} strokeWidth={3} className="text-emerald-600" />}
                </span>
                <span className="text-xs text-slate-600">
                  {c} คน <span className="text-slate-400">({p}%)</span>
                </span>
              </div>
              {(isKey || isTopWrong) && (
                <p className={`relative text-[10px] mt-0.5 ${isKey ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {isKey ? 'คำตอบที่ถูก' : 'ตอบผิดบ่อยสุด'}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ---------- แถวสรุปรายข้อ: โหมดเทียบ Pre vs Post ---------- */
const QuestionCompareRow = ({ pre, post }) => {
  const hasBoth = pre.n > 0 && post.n > 0;
  const d = hasBoth ? post.rate - pre.rate : null;
  const lv = levelOf(post.rate, post.n > 0);

  const Bar = ({ label, rate, n, gradient }) => (
    <div className="flex items-center gap-2">
      <span className="w-10 text-[11px] font-semibold text-slate-500 shrink-0">{label}</span>
      <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
          initial={false}
          animate={{ width: `${n ? rate : 0}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <span className="w-10 text-right text-sm font-semibold text-slate-700 shrink-0">{n ? `${rate}%` : '-'}</span>
    </div>
  );

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-base font-bold ${lv.circle}`}>
          {pre.id}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-slate-800">{pre.short}</p>
          <div className="mt-2 flex flex-col gap-1.5">
            <Bar label="Pre" rate={pre.rate} n={pre.n} gradient="from-slate-300 to-slate-400" />
            <Bar label="Post" rate={post.rate} n={post.n} gradient="from-cyan-500 to-emerald-500" />
          </div>
        </div>
        <div className="shrink-0 text-right w-16">
          {d == null ? (
            <span className="text-slate-300">-</span>
          ) : (
            <>
              <p
                className={`text-xl font-bold leading-none ${
                  d > 0 ? 'text-emerald-600' : d < 0 ? 'text-rose-600' : 'text-slate-400'
                }`}
              >
                {d > 0 ? '▲' : d < 0 ? '▼' : '='} {Math.abs(d)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">% เทียบ Pre</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------- หน้ากรอกรหัสผ่าน ---------- */
const Gate = ({ onPass }) => {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');

  const submit = () => {
    if (pw === ADMIN_PASSWORD) {
      onPass(pw);
    } else {
      setErr('รหัสผ่านไม่ถูกต้อง');
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-5">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="dm-border w-full max-w-sm rounded-3xl bg-white/85 backdrop-blur-xl p-7 shadow-[0_12px_60px_rgba(8,145,178,.18)]"
      >
        <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-4">
          <Lock size={22} />
        </div>
        <p className="text-xs font-semibold tracking-[0.25em] text-[#059669] mb-1">DENTALMEET CERT</p>
        <h1 className="dm-head text-2xl font-bold text-slate-800 mb-1">สำหรับผู้ดูแลระบบ</h1>
        <p className="text-sm text-slate-500 mb-5">กรอกรหัสผ่านเพื่อดูสรุปผลแบบทดสอบ</p>

        <Input.Password
          size="large"
          value={pw}
          placeholder="รหัสผ่าน"
          autoFocus
          onChange={(e) => {
            setPw(e.target.value);
            setErr('');
          }}
          onPressEnter={submit}
          status={err ? 'error' : undefined}
        />
        {err && <p className="text-xs text-rose-500 mt-2">{err}</p>}

        <Button
          type="primary"
          size="large"
          block
          onClick={submit}
          style={{ height: 50, borderRadius: 16, fontWeight: 600, marginTop: 16 }}
        >
          เข้าสู่ระบบ
        </Button>
      </motion.div>
    </div>
  );
};

/* ---------- แดชบอร์ด ---------- */
const Dashboard = ({ password, onLogout }) => {
  const [allRows, setAllRows] = useState([]);
  const [showTest, setShowTest] = useState(false); // ค่าเริ่มต้น: ซ่อนข้อมูลทดสอบ
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('POST'); // PRE | POST | COMPARE
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL | DONE | PENDING
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 400));
        setAllRows(normalize(buildMock()));
      } else {
        const res = await axios.get(RESULTS_URL, {
          headers: authHeaders(password),
          timeout: 20000,
        });
        const body = res?.data;
        if (body?.success === false) throw new Error(body?.message || 'Request failed');
        setAllRows(normalize(body?.data ?? body));
      }
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message || err?.message;
      if (status === 401 || status === 403) {
        setError(`หลังบ้านไม่อนุญาตให้เข้าถึง (${serverMsg}) กรุณาตรวจสอบสิทธิ์ของ endpoint /answers`);
      } else if (err?.response) {
        setError(`โหลดข้อมูลไม่สำเร็จ: ${serverMsg}`);
      } else if (err?.message && !err?.request) {
        setError(`โหลดข้อมูลไม่สำเร็จ: ${serverMsg}`);
      } else {
        setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ (ตรวจสอบเน็ตหรือ CORS)');
      }
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => {
    load();
  }, [load]);

  // กรองข้อมูลทดสอบออก (ถ้าสวิตช์ปิดอยู่)
  const testCount = useMemo(() => allRows.filter(isTestRow).length, [allRows]);
  const rows = useMemo(
    () => (showTest ? allRows : allRows.filter((r) => !isTestRow(r))),
    [allRows, showTest]
  );

  const summary = useMemo(() => {
    const preDone = rows.filter((r) => r.pre);
    const postDone = rows.filter((r) => r.post);
    const both = rows.filter((r) => r.pre && r.post);
    const preAvg = avg(preDone.map((r) => scoreOf(r.pre)));
    const postAvg = avg(postDone.map((r) => scoreOf(r.post)));
    return { preDone: preDone.length, postDone: postDone.length, both: both.length, preAvg, postAvg };
  }, [rows]);

  const statsPre = useMemo(() => computeQuestionStats(rows, 'pre'), [rows]);
  const statsPost = useMemo(() => computeQuestionStats(rows, 'post'), [rows]);

  // ชุดที่ใช้แสดงผลหลัก (โหมดเทียบ ใช้ Post เป็นตัวหลัก)
  const viewKey = mode === 'PRE' ? 'pre' : 'post';
  const viewStats = mode === 'PRE' ? statsPre : statsPost;
  const viewLabel = mode === 'PRE' ? 'Pre-test' : 'Post-test';

  const ranked = useMemo(
    () => [...viewStats].filter((q) => q.n > 0).sort((a, b) => a.rate - b.rate),
    [viewStats]
  );
  const hardest = ranked[0];
  const easiest = ranked[ranked.length - 1];

  // การกระจายของคะแนน 0..TOTAL
  const histogram = useMemo(() => {
    const buckets = Array.from({ length: TOTAL + 1 }, () => 0);
    rows.forEach((r) => {
      const s = scoreOf(r[viewKey]);
      if (s != null) buckets[s] += 1;
    });
    return buckets;
  }, [rows, viewKey]);
  const maxBucket = Math.max(1, ...histogram);

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === 'DONE' && !(r.pre && r.post)) return false;
      if (filter === 'PENDING' && r.pre && r.post) return false;
      if (!s) return true;
      return (
        r.name.toLowerCase().includes(s) ||
        String(r.hospcode).toLowerCase().includes(s)
      );
    });
  }, [rows, search, filter]);

  const diff =
    summary.preAvg != null && summary.postAvg != null ? summary.postAvg - summary.preAvg : null;

  return (
    <div className="w-full px-4 sm:px-6 xl:px-10 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      {/* ---------- Header ---------- */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.25em] text-[#059669] mb-1">DENTALMEET CERT</p>
          <h1 className="dm-head text-2xl sm:text-3xl font-bold text-slate-800">สรุปผลแบบทดสอบ</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            SMART Technique และ SDF · {TOTAL} ข้อ
            {USE_MOCK && (
              <Tag color="gold" className="!ml-2">
                ข้อมูลตัวอย่าง
              </Tag>
            )}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Switch size="small" checked={showTest} onChange={setShowTest} />
            <span className="text-xs text-slate-500">
              แสดงข้อมูลทดสอบ
              {testCount > 0 && (
                <span className="text-slate-400">
                  {' '}({showTest ? `รวม ${testCount} รายการ` : `ซ่อนอยู่ ${testCount} รายการ`})
                </span>
              )}
            </span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button icon={<RefreshCw size={16} />} onClick={load} loading={loading}>
            รีเฟรช
          </Button>
          <Button icon={<LogOut size={16} />} onClick={onLogout}>
            ออก
          </Button>
        </div>
      </div>

      {error && <Alert type="error" showIcon message={error} className="mb-5" />}

      {loading ? (
        <div className="dm-border rounded-3xl bg-white/85 p-6">
          <Skeleton active paragraph={{ rows: 10 }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
          {/* =============== ซ้าย: สถิติ =============== */}
          <div className="flex flex-col gap-6 min-w-0">
            {/* การ์ดสรุป */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={Users} label="ผู้เข้าร่วมทั้งหมด" value={rows.length} hint="คน" />
              <StatCard
                icon={ClipboardCheck}
                label="ทำครบทั้ง Pre และ Post"
                value={`${summary.both} คน`}
                hint={`Pre ${summary.preDone} · Post ${summary.postDone} คน`}
                tone="emerald"
              />
              <StatCard
                icon={TrendingUp}
                label="คะแนนเฉลี่ย Pre → Post"
                value={`${fmt(summary.preAvg)} → ${fmt(summary.postAvg)}`}
                hint={`เต็ม ${TOTAL} คะแนน`}
                tone="violet"
              />
              <StatCard
                icon={Trophy}
                label="คะแนนเฉลี่ยเพิ่มขึ้น"
                value={diff == null ? '-' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)}`}
                hint="Post เทียบกับ Pre"
                tone="amber"
              />
            </div>

            {/* แถบเลือกชุด */}
            <div className="dm-border rounded-2xl bg-white/85 backdrop-blur-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-[0_8px_30px_rgba(8,145,178,.1)]">
              <div>
                <p className="text-sm font-bold text-slate-800">ดูผลของ</p>
                <p className="text-xs text-slate-500">
                  {mode === 'COMPARE' ? 'เปรียบเทียบ Pre กับ Post ในแต่ละข้อ' : `เฉพาะ ${viewLabel}`}
                </p>
              </div>
              <Segmented
                value={mode}
                onChange={setMode}
                options={[
                  { label: 'Pre-test', value: 'PRE' },
                  { label: 'Post-test', value: 'POST' },
                  { label: 'เทียบ Pre/Post', value: 'COMPARE' },
                ]}
              />
            </div>

            {/* ภาพรวม: ข้อที่ยากสุด / ง่ายสุด / การกระจายคะแนน */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-600">
                  <AlertTriangle size={14} /> ข้อที่ตอบถูกน้อยที่สุด ({viewLabel})
                </p>
                {hardest ? (
                  <>
                    <p className="text-3xl font-bold text-rose-600 mt-1">
                      ข้อ {hardest.id} <span className="text-lg">· {hardest.rate}%</span>
                    </p>
                    <p className="text-sm text-slate-600 mt-1">{hardest.short}</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-400 mt-2">ยังไม่มีข้อมูล</p>
                )}
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                  <Trophy size={14} /> ข้อที่ตอบถูกมากที่สุด ({viewLabel})
                </p>
                {easiest ? (
                  <>
                    <p className="text-3xl font-bold text-emerald-600 mt-1">
                      ข้อ {easiest.id} <span className="text-lg">· {easiest.rate}%</span>
                    </p>
                    <p className="text-sm text-slate-600 mt-1">{easiest.short}</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-400 mt-2">ยังไม่มีข้อมูล</p>
                )}
              </div>

              <div className="dm-border rounded-2xl bg-white/85 p-4">
                <p className="text-xs font-semibold text-slate-600">
                  จำนวนคนในแต่ละคะแนน ({viewLabel})
                </p>
                <div className="mt-2 flex items-end gap-1 h-20">
                  {histogram.map((c, s) => {
                    const lv = levelOf(pct(s, TOTAL));
                    return (
                      <div key={s} className="flex-1 flex flex-col items-center justify-end h-full" title={`${s} คะแนน: ${c} คน`}>
                        <span className="text-[10px] text-slate-500 leading-none mb-0.5">{c || ''}</span>
                        <div
                          className={`w-full rounded-t bg-gradient-to-t ${lv.bar}`}
                          style={{ height: `${(c / maxBucket) * 100}%`, minHeight: c ? 4 : 2, opacity: c ? 1 : 0.25 }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-1 mt-1">
                  {histogram.map((_, s) => (
                    <span key={s} className="flex-1 text-center text-[10px] text-slate-400">
                      {s}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 text-center">คะแนนที่ได้ (เต็ม {TOTAL})</p>
              </div>
            </div>

            {/* สรุปรายข้อ */}
            <section className="dm-border rounded-3xl bg-white/85 backdrop-blur-xl p-5 sm:p-6 shadow-[0_12px_60px_rgba(8,145,178,.12)]">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <h2 className="text-lg font-bold text-slate-800">ถูก / ผิดรายข้อ</h2>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 font-semibold">ตั้งแต่ 80% ทำได้ดี</span>
                  <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 font-semibold">60-79% พอใช้</span>
                  <span className="rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 font-semibold">ต่ำกว่า 60% ควรทบทวน</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                {mode === 'COMPARE'
                  ? 'แถบเทาคือ Pre แถบเขียวคือ Post ลูกศรบอกว่าเปอร์เซ็นต์ตอบถูกเปลี่ยนไปเท่าไร'
                  : 'ดูว่าแต่ละข้อมีคนตอบถูกกี่คน ผิดกี่คน และคนที่ตอบผิดไปเลือกข้อไหนมากที่สุด'}
              </p>

              <div className="flex flex-col gap-3">
                {mode === 'COMPARE'
                  ? statsPre.map((q, i) => <QuestionCompareRow key={q.id} pre={q} post={statsPost[i]} />)
                  : viewStats.map((q) => <QuestionDetailRow key={q.id} q={q} />)}
              </div>
            </section>
          </div>

          {/* =============== ขวา: รายชื่อ =============== */}
          <aside className="dm-border rounded-3xl bg-white/85 backdrop-blur-xl shadow-[0_12px_60px_rgba(8,145,178,.12)] flex flex-col xl:sticky xl:top-6 max-h-[80dvh] xl:max-h-[calc(100dvh-3rem)]">
            <div className="p-5 pb-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-slate-800">รายชื่อผู้เข้าร่วม</h2>
                <span className="text-xs text-slate-500">{list.length} / {rows.length} คน</span>
              </div>
              <Input
                allowClear
                prefix={<Search size={16} className="text-slate-400" />}
                placeholder="ค้นหาชื่อหรือสถานบริการ"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Segmented
                block
                className="mt-3"
                value={filter}
                onChange={setFilter}
                options={[
                  { label: 'ทั้งหมด', value: 'ALL' },
                  { label: 'ทำครบ', value: 'DONE' },
                  { label: 'ยังไม่ครบ', value: 'PENDING' },
                ]}
              />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-4">
              {list.length === 0 && (
                <p className="text-center text-sm text-slate-400 py-10">ไม่พบข้อมูล</p>
              )}
              <ul className="flex flex-col gap-2">
                {list.map((r) => {
                  const open = openId === r.id;
                  const preScore = scoreOf(r.pre);
                  const postScore = scoreOf(r.post);
                  const d = preScore != null && postScore != null ? postScore - preScore : null;
                  return (
                    <li
                      key={r.id}
                      className={`rounded-2xl border transition-colors ${
                        open ? 'border-cyan-300 bg-cyan-50/40' : 'border-slate-100 bg-white hover:border-cyan-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : r.id)}
                        aria-expanded={open}
                        className="w-full text-left flex items-center gap-3 p-3"
                      >
                        <span className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 text-white font-bold flex items-center justify-center shrink-0">
                          {r.name.charAt(0)}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold text-slate-800 truncate">
                            {r.name}
                            {showTest && isTestRow(r) && (
                              <Tag color="orange" className="!ml-2 !text-[10px]">
                                ทดสอบ
                              </Tag>
                            )}
                          </span>
                          <span className="block text-xs text-slate-400 truncate" title={r.hospcode}>
                            {r.hospcode}
                          </span>
                          <span className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <ScoreBadge label="Pre" score={preScore} />
                            <ScoreBadge label="Post" score={postScore} />
                            {d != null && (
                              <span
                                className={`text-xs font-semibold ${
                                  d > 0 ? 'text-emerald-600' : d < 0 ? 'text-rose-600' : 'text-slate-400'
                                }`}
                              >
                                {d > 0 ? `▲ +${d}` : d < 0 ? `▼ ${d}` : '='}
                              </span>
                            )}
                          </span>
                        </span>
                        <ChevronDown
                          size={18}
                          className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {open && (
                        <div className="px-3 pb-3 flex flex-col gap-3 border-t border-slate-100 pt-3">
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1.5">Pre-test</p>
                            <AnswerChips map={r.pre} />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1.5">Post-test</p>
                            <AnswerChips map={r.post} />
                          </div>
                          <p className="text-[11px] text-slate-400">
                            ✓ คือตอบถูก ✗ คือตอบผิด (ตัวที่ตอบ → เฉลย)
                          </p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

/* ---------- หน้า Admin ---------- */
const AdminPage = () => {
  const [password, setPassword] = useState(() => {
    try {
      return sessionStorage.getItem(AUTH_KEY) || '';
    } catch {
      return '';
    }
  });

  const pass = (pw) => {
    try {
      sessionStorage.setItem(AUTH_KEY, pw);
    } catch {
      /* ไม่เป็นไร */
    }
    setPassword(pw);
  };

  const logout = () => {
    try {
      sessionStorage.removeItem(AUTH_KEY);
    } catch {
      /* ไม่เป็นไร */
    }
    setPassword('');
  };

  return (
    <ConfigProvider theme={antdCfg}>
      <ThemeShell>
        {password === ADMIN_PASSWORD ? (
          <Dashboard password={password} onLogout={logout} />
        ) : (
          <Gate onPass={pass} />
        )}
      </ThemeShell>
    </ConfigProvider>
  );
};

export default AdminPage;