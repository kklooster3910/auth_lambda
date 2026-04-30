const jwt = require('jsonwebtoken');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const { format } = require('date-fns');

const s3 = new S3Client({ region: process.env.AWS_REGION });

// comment out for lambda(leave as empty object) - CORS Policy handles this
const responseHeaders = {
  // 'Access-Control-Allow-Origin': 'https://main.dho80v77vf9yf.amplifyapp.com',
  // 'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS, DELETE',
  // 'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  // 'Content-Type': 'application/json',
};

const parseEventBody = (event, fallbackValue) => {
  if (!event?.body) return fallbackValue;

  try {
    const rawBody = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
    return typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
  } catch (error) {
    console.error('failed to parse request body', { error });
    return fallbackValue;
  }
};

const handleTokenCheck = (event) => {
  try {
    const authorizationHeader = event.headers?.authorization || event.headers?.Authorization;
    const token = authorizationHeader?.split(' ')?.[1];
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error('token check failed', { error });
    return { statusCode: 401, body: JSON.stringify({ message: error.message }), headers: responseHeaders };
  }
};

const handleLogin = (event) => {
  const { username, password } = parseEventBody(event, {});

  if (username !== process.env.AUTH_USERNAME || password !== process.env.AUTH_PASSWORD)
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'wrong username or password, try again' }),
      headers: responseHeaders,
    };

  const token = jwt.sign({ authenticated: true }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return { statusCode: 200, body: JSON.stringify({ token }), headers: responseHeaders };
};

const getUrlType = (file) => {
  const imageExtension = 'jpg/png/gif/webp/avif';
  const splitArray = file.Key.split('.');
  const fileExtension = splitArray[splitArray.length - 1];
  return imageExtension.includes(fileExtension) ? 'img' : 'vid';
};

const handleImgList = async (event) => {
  const tokenError = handleTokenCheck(event);
  if (tokenError) return tokenError;

  const data = await s3.send(new ListObjectsV2Command({ Bucket: process.env.AWS_BUCKET_NAME }));
  const _imgList = await Promise.all(
    data?.Contents
      ? data.Contents.map((c) =>
          getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: c.Key }), {
            expiresIn: 3600,
          }),
        )
      : [],
  );

  const imgList = _imgList.map((imgUrl, idx) => ({
    url: imgUrl,
    type: getUrlType(data.Contents[idx]),
    key: data.Contents[idx].Key,
    lastModified: format(data.Contents[idx].LastModified, 'MM/dd/yyyy'),
  }));

  return { statusCode: 200, body: JSON.stringify({ imgList }), headers: responseHeaders };
};

const handleFileUpload = async (event) => {
  const tokenError = handleTokenCheck(event);
  if (tokenError) return tokenError;

  const files = parseEventBody(event, []);
  const uploadUrls = await Promise.all(
    files.map((file) => {
      return getSignedUrl(
        s3,
        new PutObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: file.name, ContentType: file.type }),
        { expiresIn: 3600 },
      );
    }),
  );
  return { statusCode: 200, body: JSON.stringify(uploadUrls), headers: responseHeaders };
};

const handleFileDelete = async (event) => {
  const tokenError = handleTokenCheck(event);
  if (tokenError) return tokenError;

  const { fileKey } = parseEventBody(event, {});
  const deleteConfig = new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: fileKey });
  await s3.send(deleteConfig);
  return { statusCode: 200, body: JSON.stringify({ message: 'success' }), headers: responseHeaders };
};

module.exports = { handleFileUpload, handleImgList, handleLogin, handleFileDelete, responseHeaders };
