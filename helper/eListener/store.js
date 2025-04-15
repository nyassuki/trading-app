// store.js
import { configureStore } from '@reduxjs/toolkit';
import { thunk } from 'redux-thunk';
import walletConnectReducer from './walletConnectSlice';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web

// Persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['walletConnect'], // only persist walletConnect state
  version: 1,
  migrate: (state) => {
    // Migration logic if store structure changes between versions
    return Promise.resolve(state);
  }
};

// Enhanced root reducer with persistence
const persistedReducer = persistReducer(persistConfig, walletConnectReducer);

// Store configuration
const store = configureStore({
  reducer: {
    walletConnect: persistedReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for redux-persist
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['items.dates']
      }
    }).concat(thunk), // Add thunk middleware
  devTools: process.env.NODE_ENV !== 'production'
});

// Persistor for redux-persist
const persistor = persistStore(store);

// Type definitions for TypeScript (optional)
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
module.exports = { store, persistor };
