import axiosClient from './axiosClient';

const files_43 = {
  getData(budgetYear) {
    return axiosClient.get('/api/hdc_check/get_data', {
      params: { budget_year: budgetYear },
    });
  },
  postData(payload) {
    return axiosClient.post('/api/hdc_check/insert_data', payload);
  },
};

export default files_43;
