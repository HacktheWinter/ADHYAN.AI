import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const mongoURI = process.env.MONGODB_URI;

// Create connection
const conn = mongoose.createConnection(mongoURI);

// Initialize GridFSBucket after connection is open
let bucket;
conn.once("open", () => {
  bucket = new GridFSBucket(conn.db, { bucketName: "notes" });
  console.log("GridFSBucket initialized");
});

export { conn, bucket };
