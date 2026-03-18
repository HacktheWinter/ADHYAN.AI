import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";

// We use the main mongoose connection instead of creating a new one
// This avoids race conditions and extra connections

let bucket;

const getBucket = () => {
  if (bucket) return bucket;

  const conn = mongoose.connection;
  if (conn.readyState === 1) {
    // 1 = connected
    bucket = new GridFSBucket(conn.db, { bucketName: "notes" });
    return bucket;
  }
  return null;
};

// For backward compatibility but with a getter-like behavior if possible,
// or we update controllers to use getBucket()
export { getBucket };

// Still export conn for compatibility if other parts use it
export const conn = mongoose.connection;
export { bucket }; // This will be undefined initially, controllers should use getBucket()
