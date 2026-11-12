import axiosClient from './axiosClient';

const tele_med = {
  getData() {
    return axiosClient.get('/api/tele_med');
  },
  getDataV2(budgetYear) {
    return axiosClient.get('/api/tele_med_v2', { params: { budget_year: budgetYear } });
  },
  postData(payload) {
    return axiosClient.post('/api/post_data_tele_med', payload);
  },
  getClinics(hospcode, fiscalYear) {
    return axiosClient.get('/api/tele_med_clinic', {
      params: { hospcode, budget_year: fiscalYear },
    });
  },
  getClinicsDateUpdate() {
    return axiosClient.get('/api/tele_med_clinic_date_update');
  },
};

export default tele_med;
