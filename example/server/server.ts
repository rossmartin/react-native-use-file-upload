import express from 'express';
import multer from 'multer';
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

  app.post(
    '/upload',
    (req, _res, next) => {
      console.log('/upload');
      console.log(`Received headers: ${JSON.stringify(req.headers)}`);
      return next();
    },
    upload.single('file'),
    (req, res) => {
      console.log('req.file: ', req.file);
      console.log(`Wrote to: ${req.file?.path}`);
      res.status(200).send({ path: req.file?.path });
    }
  );

  return app.listen(port, () =>
    console.log(`Server listening on port ${port}!`)
  );
})();
