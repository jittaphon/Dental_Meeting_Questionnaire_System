import axiosClient from './axiosClient';

const home = {
  getHospitalList() {
    return axiosClient.get('/api/utils/hcode_full_list');
  },
  getAffiliationList() {
    return axiosClient.get('/api/utils/type_hos_list');
  },
  getReportOpd(params) {
    return axiosClient.post('/api/hdc_check/report_data', params);
  },
};

export default home;
