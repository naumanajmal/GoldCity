import weatherReducer, {
  addLiveReading,
  setConnected,
  clearError,
  clearLiveReadings,
  fetchAnalytics,
} from '../../client/src/store/weatherSlice';
import { WeatherState, WeatherReading } from '../../client/src/types';

describe('weatherSlice - Redux State Management', () => {
  const initialState: WeatherState = {
    liveReadings: [],
    analytics: [],
    loading: false,
    error: null,
    connected: false,
  };

  describe('Reducers', () => {
    it('should return the initial state', () => {
      expect(weatherReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    it('should handle addLiveReading', () => {
      const newReading: WeatherReading = {
        id: 1,
        city_name: 'London',
        temperature_c: 15.5,
        humidity_percent: 70,
        recorded_at: new Date().toISOString(),
      };

      const actual = weatherReducer(initialState, addLiveReading(newReading));

      expect(actual.liveReadings).toHaveLength(1);
      expect(actual.liveReadings[0]).toEqual(newReading);
    });

    it('should prepend new readings to maintain chronological order', () => {
      const reading1: WeatherReading = {
        id: 1,
        city_name: 'London',
        temperature_c: 15.0,
        humidity_percent: 70,
        recorded_at: '2025-10-02T10:00:00Z',
      };

      const reading2: WeatherReading = {
        id: 2,
        city_name: 'Dubai',
        temperature_c: 30.0,
        humidity_percent: 45,
        recorded_at: '2025-10-02T10:10:00Z',
      };

      let state = weatherReducer(initialState, addLiveReading(reading1));
      state = weatherReducer(state, addLiveReading(reading2));

      expect(state.liveReadings).toHaveLength(2);
      expect(state.liveReadings[0]).toEqual(reading2); // Most recent first
      expect(state.liveReadings[1]).toEqual(reading1);
    });

    it('should limit liveReadings to 100 items', () => {
      let state = initialState;

      // Add 150 readings
      for (let i = 0; i < 150; i++) {
        const reading: WeatherReading = {
          id: i,
          city_name: 'London',
          temperature_c: 15.0,
          humidity_percent: 70,
          recorded_at: new Date().toISOString(),
        };
        state = weatherReducer(state, addLiveReading(reading));
      }

      expect(state.liveReadings).toHaveLength(100);
      expect(state.liveReadings[0].id).toBe(149); // Most recent
      expect(state.liveReadings[99].id).toBe(50); // Oldest kept
    });

    it('should handle setConnected', () => {
      const actual = weatherReducer(initialState, setConnected(true));

      expect(actual.connected).toBe(true);

      const disconnected = weatherReducer(actual, setConnected(false));

      expect(disconnected.connected).toBe(false);
    });

    it('should handle clearError', () => {
      const stateWithError: WeatherState = {
        ...initialState,
        error: 'Something went wrong',
      };

      const actual = weatherReducer(stateWithError, clearError());

      expect(actual.error).toBeNull();
    });

    it('should handle clearLiveReadings', () => {
      const stateWithReadings: WeatherState = {
        ...initialState,
        liveReadings: [
          {
            id: 1,
            city_name: 'London',
            temperature_c: 15.0,
            humidity_percent: 70,
            recorded_at: new Date().toISOString(),
          },
        ],
      };

      const actual = weatherReducer(stateWithReadings, clearLiveReadings());

      expect(actual.liveReadings).toEqual([]);
    });
  });

  describe('Async Thunks - fetchAnalytics', () => {
    it('should set loading to true when fetchAnalytics is pending', () => {
      const action = { type: fetchAnalytics.pending.type };
      const state = weatherReducer(initialState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set analytics and loading to false when fetchAnalytics is fulfilled', () => {
      const mockAnalytics = [
        {
          city_name: 'London',
          min_temperature: 10.0,
          max_temperature: 20.0,
          avg_humidity: 70.0,
        },
        {
          city_name: 'Dubai',
          min_temperature: 28.0,
          max_temperature: 35.0,
          avg_humidity: 45.0,
        },
      ];

      const action = {
        type: fetchAnalytics.fulfilled.type,
        payload: mockAnalytics,
      };

      const state = weatherReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.analytics).toEqual(mockAnalytics);
      expect(state.error).toBeNull();
    });

    it('should set error and loading to false when fetchAnalytics is rejected', () => {
      const errorMessage = 'Failed to fetch analytics';
      const action = {
        type: fetchAnalytics.rejected.type,
        payload: errorMessage,
      };

      const state = weatherReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
      expect(state.analytics).toEqual([]);
    });
  });

  describe('Complex State Scenarios', () => {
    it('should handle multiple actions in sequence', () => {
      let state = initialState;

      // Connect WebSocket
      state = weatherReducer(state, setConnected(true));
      expect(state.connected).toBe(true);

      // Start fetching analytics
      state = weatherReducer(state, { type: fetchAnalytics.pending.type });
      expect(state.loading).toBe(true);

      // Add live reading while loading
      const reading: WeatherReading = {
        id: 1,
        city_name: 'London',
        temperature_c: 15.0,
        humidity_percent: 70,
        recorded_at: new Date().toISOString(),
      };
      state = weatherReducer(state, addLiveReading(reading));
      expect(state.liveReadings).toHaveLength(1);
      expect(state.loading).toBe(true); // Still loading

      // Analytics fetch completes
      const mockAnalytics = [
        {
          city_name: 'London',
          min_temperature: 10.0,
          max_temperature: 20.0,
          avg_humidity: 70.0,
        },
      ];
      state = weatherReducer(state, {
        type: fetchAnalytics.fulfilled.type,
        payload: mockAnalytics,
      });

      expect(state.loading).toBe(false);
      expect(state.analytics).toEqual(mockAnalytics);
      expect(state.liveReadings).toHaveLength(1);
      expect(state.connected).toBe(true);
    });

    it('should maintain state integrity when errors occur', () => {
      let state = initialState;

      // Add some readings
      const reading1: WeatherReading = {
        id: 1,
        city_name: 'London',
        temperature_c: 15.0,
        humidity_percent: 70,
        recorded_at: new Date().toISOString(),
      };
      state = weatherReducer(state, addLiveReading(reading1));

      // Fetch analytics fails
      state = weatherReducer(state, {
        type: fetchAnalytics.rejected.type,
        payload: 'Network error',
      });

      // Live readings should still be intact
      expect(state.liveReadings).toHaveLength(1);
      expect(state.error).toBe('Network error');

      // Clear error
      state = weatherReducer(state, clearError());
      expect(state.error).toBeNull();
      expect(state.liveReadings).toHaveLength(1); // Still intact
    });

    it('should handle WebSocket reconnection scenario', () => {
      let state = initialState;

      // Initial connection
      state = weatherReducer(state, setConnected(true));

      // Add readings
      for (let i = 0; i < 5; i++) {
        const reading: WeatherReading = {
          id: i,
          city_name: 'London',
          temperature_c: 15.0 + i,
          humidity_percent: 70,
          recorded_at: new Date().toISOString(),
        };
        state = weatherReducer(state, addLiveReading(reading));
      }

      expect(state.liveReadings).toHaveLength(5);

      // Disconnect
      state = weatherReducer(state, setConnected(false));
      expect(state.connected).toBe(false);
      expect(state.liveReadings).toHaveLength(5); // Readings preserved

      // Clear readings on reconnect
      state = weatherReducer(state, clearLiveReadings());
      state = weatherReducer(state, setConnected(true));

      expect(state.connected).toBe(true);
      expect(state.liveReadings).toHaveLength(0);
    });
  });
});
