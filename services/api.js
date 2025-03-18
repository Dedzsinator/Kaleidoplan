// /services/api.js
import axios from 'axios';
import { MONGODB_API_URL } from '@env';

export const fetchEvents = async () => {
  const response = await axios.get(`${MONGODB_API_URL}/events`);
  return response.data;
};