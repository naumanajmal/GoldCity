import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { WeatherState, WeatherReading } from '../types';
import * as weatherService from '../services/weatherService';

const initialState: WeatherState = {
  liveReadings: [],
  analytics: [],
  loading: false,
  error: null,
  connected: false,
};

export const fetchAnalytics = createAsyncThunk(
  'weather/fetchAnalytics',
  async (hours: number = 24, { rejectWithValue }) => {
    try {
      const response = await weatherService.getAnalytics(hours);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch analytics');
    }
  }
);

const weatherSlice = createSlice({
  name: 'weather',
  initialState,
  reducers: {
    addLiveReading: (state, action: PayloadAction<WeatherReading>) => {
      state.liveReadings = [action.payload, ...state.liveReadings].slice(0, 100);
    },
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.connected = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearLiveReadings: (state) => {
      state.liveReadings = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnalytics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.analytics = action.payload;
      })
      .addCase(fetchAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { addLiveReading, setConnected, clearError, clearLiveReadings } = weatherSlice.actions;
export default weatherSlice.reducer;
