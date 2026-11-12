
import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  RefreshCw,
  User,
  Building2,
  Stethoscope,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

import { API } from '../api';
import { useNavigate } from 'react-router-dom';

import {
  Form,
  Input,
  Select,
  Button,
  Spin,
  Alert,
  Card,
  Typography,
  Divider,
} from 'antd';

const { Title, Text } = Typography;

const HomePage = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const [hospOptions, setHospOptions] = useState([]);
  const [loadingHosp, setLoadingHosp] = useState(false);
  const [hospError, setHospError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load hospital list
  const fetchHospNames = async () => {
    setLoadingHosp(true);
    setHospError(false);

    try {
      const res = await API.home.getHospitalList();
      const list = res?.data?.data;

      if (!Array.isArray(list)) {
        throw new Error('Invalid hospital data');
      }

      setHospOptions(
        list.map((item) => ({
          value: item.Hcode,
          label: `${item.HmainOP_FULL} (${item.Hcode})`,
        }))
      );
    } catch (error) {
      console.error(error);
      setHospError(true);
    } finally {
      setLoadingHosp(false);
    }
  };

  useEffect(() => {
    fetchHospNames();
  }, []);

  // Submit participant information
  const handleSubmit = async (values) => {
    setSubmitting(true);

    try {
      const payload = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        hospcode: values.hospcode,
      };

      // TODO:
      // สร้าง API สำหรับตรวจสอบข้อมูลกับรายชื่อผู้ลงทะเบียน
      // ตัวอย่าง response:
      // { data: { participantId, accessToken } }

      const res = await API.home.verifyParticipant(payload);

      const participant = res?.data?.data;

      if (!participant?.participantId) {
        throw new Error('ไม่พบข้อมูลผู้เข้าร่วม');
      }

      // เก็บ token สำหรับกลับมาใช้งานต่อ
      // Production แนะนำ HttpOnly Secure Cookie
      if (participant.accessToken) {
        sessionStorage.setItem(
          'participant_token',
          participant.accessToken
        );
      }

      navigate('/tests', {
        state: {
          participantId: participant.participantId,
        },
      });

    } catch (error) {
      console.error('Registration error:', error);

      // TODO: แยก error จาก API เช่น
      // PARTICIPANT_NOT_FOUND
      // ALREADY_REGISTERED
      // EVENT_CLOSED

      form.setFields([
        {
          name: 'firstName',
          errors: [
            error?.response?.data?.message ||
            'ไม่พบข้อมูล กรุณาตรวจสอบข้อมูลอีกครั้ง',
          ],
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center px-4 py-10">

      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-7">

          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white shadow-md flex items-center justify-center">
            <Stethoscope className="w-9 h-9 text-blue-600" />
          </div>

          <p className="text-blue-600 font-semibold tracking-widest text-xs mb-2">
            DENTALMEET CERT
          </p>

          <Title level={2} className="!mb-2 !text-slate-800">
            ข้อมูลผู้เข้าร่วมประชุม
          </Title>

          <Text type="secondary">
            กรุณากรอกข้อมูลให้ตรงกับที่ลงทะเบียนไว้
          </Text>

        </div>

        {/* Form Card */}
        <Card
          className="!rounded-3xl shadow-xl border-0"
          styles={{ body: { padding: 32 } }}
        >

          <div className="mb-6">
            <Title level={4} className="!mb-1">
              ยืนยันตัวตน
            </Title>

            <Text type="secondary" className="text-sm">
              ข้อมูลทั้ง 3 รายการต้องตรงกับฐานข้อมูลผู้ลงทะเบียน
            </Text>
          </div>

          {hospError && (
            <Alert
              type="warning"
              showIcon
              message="ไม่สามารถโหลดรายชื่อหน่วยงานได้"
              action={
                <Button
                  type="link"
                  size="small"
                  icon={<RefreshCw size={14} />}
                  onClick={fetchHospNames}
                >
                  ลองใหม่
                </Button>
              }
              className="mb-5"
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            requiredMark={false}
            size="large"
          >

            <Form.Item
              label="ชื่อ"
              name="firstName"
              rules={[
                { required: true, message: 'กรุณากรอกชื่อ' },
              ]}
            >
              <Input
                prefix={<User size={17} className="text-slate-400" />}
                placeholder="ชื่อของคุณ"
                maxLength={100}
              />
            </Form.Item>

            <Form.Item
              label="นามสกุล"
              name="lastName"
              rules={[
                { required: true, message: 'กรุณากรอกนามสกุล' },
              ]}
            >
              <Input
                prefix={<User size={17} className="text-slate-400" />}
                placeholder="นามสกุลของคุณ"
                maxLength={100}
              />
            </Form.Item>

            <Form.Item
              label="หน่วยงาน / สถานพยาบาล"
              name="hospcode"
              rules={[
                { required: true, message: 'กรุณาเลือกหน่วยงาน' },
              ]}
            >
              <Select
                showSearch
                allowClear
                placeholder="ค้นหาหน่วยงาน"
                options={hospOptions}
                loading={loadingHosp}
                disabled={hospError}
                optionFilterProp="label"
                notFoundContent={
                  loadingHosp ? <Spin size="small" /> :
                  'ไม่พบข้อมูลหน่วยงาน'
                }
                suffixIcon={
                  <Building2 size={17} className="text-slate-400" />
                }
              />
            </Form.Item>

            <Divider />

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-5 flex gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />

              <Text className="!text-xs !text-slate-600">
                ระบบจะตรวจสอบข้อมูลกับรายชื่อผู้ลงทะเบียน
                เพื่อป้องกันการระบุตัวตนผิดพลาด
              </Text>
            </div>

            <Button
              type="primary"
              htmlType="submit"
              block
              loading={submitting}
              disabled={loadingHosp || hospError || !hospOptions.length}
              className="!h-12 !rounded-xl !font-semibold"
              icon={<ArrowRight size={17} />}
              iconPosition="end"
            >
              ยืนยันข้อมูลและดำเนินการต่อ
            </Button>

          </Form>

        </Card>

        <p className="text-center text-slate-400 text-xs mt-6">
          Dental Conference Questionnaire & Certificate
        </p>

      </div>
    </div>
  );
};

export default HomePage;
