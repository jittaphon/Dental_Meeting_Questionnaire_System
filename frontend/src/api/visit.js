import { MophPyoCenterClient } from './axiosClient';

const visit = {
  track(source, page) {
    return MophPyoCenterClient.post('/api/visits', { source, page });
  },
  getSummary(source) {
    return MophPyoCenterClient.get('/api/visits/summary', { params: { source } });
  },
};

export default visit;
