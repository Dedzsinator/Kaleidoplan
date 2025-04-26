import axios from 'axios';
import { Sponsor } from '../app/models/types';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Cache for sponsor data
let sponsorCache: Record<string, Sponsor> = {};
let lastFetch = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get all sponsors
 */
export const getAllSponsors = async (options?: { forceRefresh?: boolean }): Promise<Sponsor[]> => {
  try {
    // Check if we should use cache
    const currentTime = Date.now();
    const shouldUseCache =
      !options?.forceRefresh && Object.keys(sponsorCache).length > 0 && currentTime - lastFetch < CACHE_DURATION;

    if (shouldUseCache) {
      return Object.values(sponsorCache);
    }

    // Fetch fresh data

    const response = await axios.get(`${API_URL}/sponsors`);

    // Update cache
    sponsorCache = {};
    response.data.forEach((sponsor: Sponsor) => {
      sponsorCache[sponsor.id] = sponsor;
    });
    lastFetch = currentTime;

    return response.data;
  } catch (error) {
    console.error('Error fetching sponsors:', error);

    // Return cached data if available, even if it's stale
    if (Object.keys(sponsorCache).length > 0) {
      return Object.values(sponsorCache);
    }

    // If all else fails, return mock data for development
    return getMockSponsors();
  }
};

/**
 * Get a specific sponsor by ID
 */
export const getSponsorById = async (sponsorId: string): Promise<Sponsor | null> => {
  try {
    // Check cache first
    if (sponsorCache[sponsorId]) {
      return sponsorCache[sponsorId];
    }

    // Fetch from API
    const response = await axios.get(`${API_URL}/sponsors/${sponsorId}`);

    // Update cache
    sponsorCache[sponsorId] = response.data;

    return response.data;
  } catch (error) {
    console.error(`Error fetching sponsor ${sponsorId}:`, error);

    // Return mock sponsor for development
    return getMockSponsorById(sponsorId);
  }
};

/**
 * Get sponsors for a specific event
 */
export const getSponsors = async (sponsorIds: string[]): Promise<Sponsor[]> => {
  try {
    if (!sponsorIds || !sponsorIds.length) {
      return [];
    }

    // Check if all requested sponsors are in cache
    const allInCache = sponsorIds.every((id) => !!sponsorCache[id]);

    if (allInCache) {
      return sponsorIds.map((id) => sponsorCache[id]);
    }

    // Fetch from API - optimally would use a batch endpoint
    const response = await axios.get(`${API_URL}/sponsors?ids=${sponsorIds.join(',')}`);

    // Update cache with fetched sponsors
    if (Array.isArray(response.data)) {
      response.data.forEach((sponsor: Sponsor) => {
        sponsorCache[sponsor.id] = sponsor;
      });
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching sponsors for event:', error);

    const cachedSponsors = sponsorIds.filter((id) => !!sponsorCache[id]).map((id) => sponsorCache[id]);

    if (cachedSponsors.length > 0) {
      return cachedSponsors;
    }

    return getMockSponsorsByIds(sponsorIds);
  }
};

const getMockSponsors = (): Sponsor[] => {
  return Array(20)
    .fill(0)
    .map((_, index) => ({
      id: `${index + 1}`,
      name: `Sponsor ${index + 1}`,
      description: `Description for Sponsor ${index + 1}`,
      website: `https://sponsor${index + 1}.com`,
      logoUrl: `https://ui-avatars.com/api/?name=S${index + 1}&background=random`,
      level: index % 3 === 0 ? 'Platinum' : index % 3 === 1 ? 'Gold' : 'Silver',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
};

/**
 * Get a mock sponsor by ID for development and fallback
 */
const getMockSponsorById = (id: string): Sponsor => {
  const idNum = parseInt(id, 10) || 1;
  return {
    id,
    name: `Sponsor ${idNum}`,
    description: `Description for Sponsor ${idNum}`,
    website: `https://sponsor${idNum}.com`,
    logoUrl: `https://ui-avatars.com/api/?name=S${idNum}&background=random`,
    level: idNum % 3 === 0 ? 'Platinum' : idNum % 3 === 1 ? 'Gold' : 'Silver',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

/**
 * Get multiple mock sponsors by IDs for development and fallback
 */
const getMockSponsorsByIds = (ids: string[]): Sponsor[] => {
  return ids.map((id) => getMockSponsorById(id));
};

export default {
  getAllSponsors,
  getSponsorById,
  getSponsors,
};
