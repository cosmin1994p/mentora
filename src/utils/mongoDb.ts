// MongoDB connection configuration
export const mongoDbConfig = {
  uri: import.meta.env.VITE_MONGODB_URI,
  db: import.meta.env.VITE_MONGODB_DB
};

// Helper function to get MongoDB URI
export const getMongoDbUri = (): string => {
  const uri = import.meta.env.VITE_MONGODB_URI;
  if (!uri) {
    throw new Error('MongoDB URI not configured in environment variables');
  }
  return uri;
};

// Helper function to get database name
export const getMongoDbName = (): string => {
  const dbName = import.meta.env.VITE_MONGODB_DB || 'masterclass';
  return dbName;
};
