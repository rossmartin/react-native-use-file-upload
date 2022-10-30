import express from 'express';
import multer from 'multer';
import Throttle from 'throttle';
import http from 'http';
import os from 'os';

const app = express();
const port = 8080;
const upload = multer({
  limits: { fieldSize: 50 * 1024 * 1024 }, // limit uploads to 50 MB
  storage: multer.diskStorage({
    filename: (_req, file, callback) => {
      callback(null, file.originalname);
    },
    destination: `${os.tmpdir()}/uploads`,
  }),
});

(() => {
  app.get('/', (_req, res) => {
    res.send(
      'Hi! The server is listening on port 8080. Use the React Native app to start an upload.'
    );
  });

  app.post('/upload', (req, res) => {
    console.log('/upload');
    console.log(`Received headers: ${JSON.stringify(req.headers)}`);

    // Using the throttle lib here to simulate a real world
    // scenario on a cellular connection or slower network.
    // This helps test out the progress and timeout handling.

    // The below pipes the request stream to the throttle
    // transform stream. Then it pipes the throttled stream data
    // to the "/_upload" route on this same server via http.request
    // Finally we pipe the response stream received from the http.request
    // to the original response stream on this route.
    const throttle = new Throttle(100 * 1024); // 100 kilobytes per second
    req.pipe(throttle).pipe(
      http.request(
        {
          host: 'localhost',
          path: '/_upload',
          port,
          method: 'POST',
          headers: req.headers,
        },
        requestResp => {
          requestResp.pipe(res);
        }
      )
    );
  });

  app.post('/_upload', upload.single('file'), (req, res) => {
    console.log('req.file: ', req.file);
    console.log(`Wrote to: ${req.file?.path}`);
    res.status(200).send({ path: req.file?.path });
  });

  return app.listen(port, () =>
    console.log(`Server listening on port ${port}!`)
  );
})();
