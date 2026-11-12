// forms.js
import { axiosAuthClient } from './axiosClient';

const forms = {
  store(payload) {
    return axiosAuthClient.post('/api/forms', payload);
  },
  list(formName) {
    return axiosAuthClient.get(`/api/forms/${formName}`);
  }
};

export default forms;