// server/config/awsConfig.js
import AWS from 'aws-sdk';

const sts = new AWS.STS();

export function configureAWS(accessKey, secretKey, region = 'us-east-1') {
  AWS.config.update({
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
    region: region
  });
  
  const config = {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
    region: region
  };

  return {
    s3: new AWS.S3(config),
    sts: new AWS.STS(config),
    eks: new AWS.EKS(config),
    cloudwatch: new AWS.CloudWatch(config)
  };
}