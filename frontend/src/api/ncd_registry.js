import axiosClient from './axiosClient';

const ncd_registry = {
  getData() {
    return axiosClient.get('/api/ncd_registry');
  },
  postData(payload) {
    return axiosClient.post('/api/post_data_ncd_registry', payload);
  },
};

export default ncd_registry;
