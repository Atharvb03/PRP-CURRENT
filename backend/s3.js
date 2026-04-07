/**
 * s3.js — Shared AWS S3 client and helper.
 * Import this in any route file that needs S3 operations.
 */

const AWS = require('aws-sdk');
require('dotenv').config();

const s3 = new AWS.S3({
  accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region:          process.env.AWS_REGION,
});

/**
 * Extract the S3 object key from any S3 URL format.
 */
function extractS3Key(fileUrl) {
  const bucket = process.env.S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;
  const patterns = [
    `https://${bucket}.s3.${region}.amazonaws.com/`,
    `https://${bucket}.s3.amazonaws.com/`,
    `https://s3.${region}.amazonaws.com/${bucket}/`,
    `https://s3.amazonaws.com/${bucket}/`,
  ];
  for (const p of patterns) {
    if (fileUrl.startsWith(p)) return decodeURIComponent(fileUrl.slice(p.length));
  }
  const url = new URL(fileUrl);
  let key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
  if (key.startsWith(bucket + '/')) key = key.slice(bucket.length + 1);
  return decodeURIComponent(key);
}

module.exports = { s3, extractS3Key };
