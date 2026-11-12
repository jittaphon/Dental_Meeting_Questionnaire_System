import axiosClient from './axiosClient';

const dspm = {
  getDateUpdate() {
    return axiosClient.get('/api/dspm_date_update');
  },
};

export default dspm;
