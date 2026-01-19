const AWS = require('aws-sdk');

const configureAWS = (accessKey, secretKey, region = 'us-east-1') => {
  AWS.config.update({
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
    region: region
  });
  
  return {
    s3: new AWS.S3(),
    sts: new AWS.STS(),
    eks: new AWS.EKS(),
    cloudwatch: new AWS.CloudWatch()
  };
};

module.exports = {
  configureAWS
};