import path from "node:path";
import https from "node:https";
import fs from "fs";
import { createCA, createCert } from "mkcert";
/**
 *
 * @param args
 */
export default async function serve(args) {
    const PORT = 443;

    const MIME_TYPES = {
        default: "application/octet-stream",
        html: "text/html; charset=UTF-8",
        js: "application/javascript",
        css: "text/css",
        png: "image/png",
        jpg: "image/jpg",
        gif: "image/gif",
        ico: "image/x-icon",
        svg: "image/svg+xml",
    };

    const STATIC_PATH = path.join(process.cwd(), args[0]);

    const toBool = [() => true, () => false];

    const prepareFile = async (url) => {
        const paths = [STATIC_PATH, url];
        if (url.endsWith("/")) paths.push("index.html");
        const filePath = path.join(...paths);
        const pathTraversal = !filePath.startsWith(STATIC_PATH);
        const exists = await fs.promises.access(filePath).then(...toBool);
        const found = !pathTraversal && exists;
        const streamPath = found ? filePath : STATIC_PATH + "/index.html";
        const ext = path.extname(streamPath).substring(1).toLowerCase();
        const stream = fs.createReadStream(streamPath);
        return { found, ext, stream };
    };

    const ca = await createCA({
        organization: "Hello CA",
        countryCode: "UA",
        state: "Bagmati",
        locality: "Kathmandu",
        validity: 365
    });

    const cert = await createCert({
        ca: { key: ca.key, cert: ca.cert },
        domains: ["127.0.0.1", "local.applura.app"],
        validity: 365
    });

    const options = {
        cert: cert.cert,
        key: cert.key
    }
    const server = https
        .createServer(options, async (req, res) => {
            const file = await prepareFile(req.url);
            const statusCode = file.found ? 200 : 404;
            const mimeType = MIME_TYPES[file.ext] || MIME_TYPES.default;
            res.writeHead(statusCode, { "Content-Type": mimeType });
            file.stream.pipe(res);
            console.log(`${req.method} ${req.url} ${statusCode}`);
        });

    server.listen(PORT, () => {
        console.log(`Server available at: \n https://127.0.0.1/ \n https://local.applura.app/`);
    });

    return new Promise((res) => {
        server.on('close', res);
    })
}
