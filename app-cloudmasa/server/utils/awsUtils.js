// server/utils/awsClient.js
import AWS from 'aws-sdk';

const connectToAWS = (credentials) => {
  const { accessKeyId, secretAccessKey, region = 'us-east-1' } = credentials;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials missing: accessKeyId and secretAccessKey are required');
  }

  AWS.config.update({
    accessKeyId,
    secretAccessKey,
    region
  });

  return new AWS.S3({ region });
};

export { connectToAWS };