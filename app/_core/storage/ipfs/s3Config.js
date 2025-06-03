// S3 Configuration using environment variables
export const s3Config = {
    endpoint: process.env.NEXT_PUBLIC_S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY
    },
    region: 'us-east-1', // Filebase uses us-east-1
    bucketName: process.env.NEXT_PUBLIC_S3_BUCKET_NAME
};

// Check if S3 credentials are configured
export const hasS3Credentials = () => {
    return !!(
        process.env.NEXT_PUBLIC_S3_ENDPOINT &&
        process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID &&
        process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY &&
        process.env.NEXT_PUBLIC_S3_BUCKET_NAME
    );
};

// Get the S3 gateway URL
export const getS3Gateway = () => {
    if (!hasS3Credentials()) {
        throw new Error('S3 credentials not configured');
    }
    return process.env.NEXT_PUBLIC_S3_ENDPOINT;
};

export default s3Config;