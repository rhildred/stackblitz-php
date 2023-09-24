import express from 'express';
import { NodePHP } from '@php-wasm/node';
import fs from 'fs';

const app = express();

app.get(/\.php$/, async (req, res) => {
  const php = await NodePHP.load('8.2', {
    emscriptenOptions: {
      ENV: {
        ...process.env,
        TERM: 'xterm',
      },
    },
  });
  php.useHostFilesystem();
  let sUrl = req.path;
  if (sUrl[sUrl.length - 1] == '/') {
    sUrl += 'index.php';
  }
  sUrl = sUrl.replace(/^\//, '');
  if (!fs.existsSync(sUrl)) {
    res.status(404).send(`cannot get ${sUrl}`);
    return;
  }
  const args = [sUrl];

  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk) => {
    res.write(chunk);
  };
  await php.cli(['php', ...args]);
  res.end();
  process.stdout.write = originalStdoutWrite;
});

const server = app.listen(3001, () =>
  console.log(`listening on ${server.address().port}`)
);
