// pick the driver via STORAGE_DRIVER, both expose the same interface
const driver = process.env.STORAGE_DRIVER === 's3'
  ? await import('./s3.js')
  : await import('./local.js');

export const { put, getRange, remove, healthy } = driver;
export const driverName = process.env.STORAGE_DRIVER === 's3' ? 's3' : 'local';
