const express = require('express');
require('dotenv').config();

const { handleFileDelete, handleLogin, handleImgList, handleFileUpload, responseHeaders } = require('./utils');

const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod || event.method;
  const path = event.rawPath || event.path;

  if (method === 'OPTIONS') {
    return { statusCode: 200, body: JSON.stringify({ message: 'ok' }), headers: responseHeaders };
  }

  switch (path) {
    case '/login':
      return handleLogin(event);
    case '/file-list':
      return await handleImgList(event);
    case '/upload':
      return await handleFileUpload(event);
    case '/delete':
      return await handleFileDelete(event);
    default:
      return { statusCode: 404, body: JSON.stringify({ message: 'not found' }), headers: responseHeaders };
  }
};

// local use only -> will need to adjust logic surrounding the event coming in to match below
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  // this will need to be updated to handle w/e place it's hosted (maybe host on aws for the angular portion) and the lambda
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.all('/{*path}', async (req, res) => {
  const result = await handler({ path: req.path, body: JSON.stringify(req.body), headers: req.headers });
  res.status(result.statusCode).json(JSON.parse(result.body));
  return res;
});
app.listen(3001);

exports.handler = handler;
