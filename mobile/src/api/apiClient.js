import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getBaseURL = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3000/api';
  }

  if (__DEV__) {
    const host = Constants.expoConfig?.hostUri?.split(':')[0];
    if (!host) {
      return 'http://10.0.2.2:3000/api';
    }

    const url = `http://${host}:3000/api`;
    console.log('--- FINANSE+ CONNECTION ---');
    console.log('Connecting to:', url);
    return url;
  }

  return 'https://твоя-апи.pl/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('Token set for Finanse+');
  } else {
    delete api.defaults.headers.common['Authorization'];
    console.log('Token removed');
  }
};

export default api;
