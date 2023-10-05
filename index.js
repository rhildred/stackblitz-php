import express from 'express';
import { NodePHP } from '@php-wasm/node';
import fs from 'fs';

const app = express();

const requestBodyToString = async (req) =>
	await new Promise((resolve) => {
		let body = '';
		req.on('data', (chunk) => {
			body += chunk.toString(); // convert Buffer to string
		});
		req.on('end', () => {
			resolve(body);
		});
	});



const phpHandler = async (req, res) => {
    const php = await NodePHP.load('8.2', {
        emscriptenOptions: {
            ENV: {
                ...process.env,
                TERM: 'xterm',
            },
        },
    });
    php.useHostFilesystem();
    try {
        const requestHeaders = {};
        if (req.rawHeaders && req.rawHeaders.length) {
            for (let i = 0; i < req.rawHeaders.length; i += 2) {
                requestHeaders[req.rawHeaders[i].toLowerCase()] =
                    req.rawHeaders[i + 1];
            }
        }

        const body = requestHeaders['content-type']?.startsWith(
            'multipart/form-data'
        )
            ? requestBodyToMultipartFormData(
                req.body,
                requestHeaders['content-type'].split('; boundary=')[1]
            )
            : await requestBodyToString(req);
        let sUrl = req.path;
        if (sUrl[sUrl.length - 1] == '/') {
            sUrl += 'index.php';
        }
        sUrl = sUrl.replace(/^\//, '');
        const data = {
            url: req.url,
            headers: requestHeaders,
            method: req.method,
            files: Object.fromEntries(
                Object.entries((req).files || {}).map (
                    ([key, file]) => [
                        key,
                        {
                            key,
                            name: file.name,
                            size: file.size,
                            type: file.mimetype,
                            arrayBuffer: () => file.data.buffer,
                        },
                    ]
                )
            ),
            body: body,
            scriptPath: sUrl,
        };
        const resp = await php.run(data);
        res.statusCode = resp.httpStatusCode;
        Object.keys(resp.headers).forEach((key) => {
            res.setHeader(key, resp.headers[key]);
        });
        res.end(resp.bytes);
    } catch (e) {
        console.log(e);
    }

}

app.get(/\.php$/, async (req, res) => {
    return phpHandler(req, res);
});

app.get("/", async (req, res) => {
    return phpHandler(req, res);
});


const server = app.listen(3001, () =>
    console.log(`listening on ${server.address().port}`)
);
