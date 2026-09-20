import fs from 'node:fs';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';

// S3_ENDPOINT set: minio with env keys, otherwise EC2 resolves its IAM role
const client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  ...(process.env.S3_ENDPOINT
    ? {
        endpoint: process.env.S3_ENDPOINT,
        forcePathStyle: true, // minio uses path-style buckets
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});
const Bucket = process.env.S3_BUCKET;

export async function put(key, body, contentType) {
  await client.send(new PutObjectCommand({
    Bucket,
    Key: key,
    Body: Buffer.isBuffer(body) ? body : fs.createReadStream(body),
    ContentType: contentType,
  }));
  return key;
}

export async function getRange(key, range) {
  const obj = await client.send(new GetObjectCommand({ Bucket, Key: key, Range: range }));
  return {
    stream: obj.Body,
    contentLength: obj.ContentLength,
    contentRange: obj.ContentRange || null,
    size: obj.ContentRange ? Number(obj.ContentRange.split('/')[1]) : obj.ContentLength,
  };
}

export async function remove(key) {
  await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
}

export async function healthy() {
  await client.send(new HeadBucketCommand({ Bucket }));
  return true;
}
