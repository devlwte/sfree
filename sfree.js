const { app, BrowserWindow, dialog } = require('electron');

const path = require("path");
const fs = require("fs");

// URL
const { URLSearchParams, URL } = require('url');

// Saved
const saved = require('../../modules/saved')

// UserData
const userdata = app.getPath("userData");

// package main
const package_main = require("../../package.json")

// package app
const package_app = require("./package.json")

// UtilCode
const utilcode = require("../../modules/utilcodes");

// UtilCode
const prompts = require("./app/modules/prompts");

// libraries
const lib = require("../../modules/util-libraries");

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args))

async function fet(url) {
    try {
        const response = await fetch(url);

        if (response.status !== 200) {
            throw new Error('Error en la solicitud: ' + response.status);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
        return false;
    }
}

// Read Files Json
async function openFileJson(file, existfile = false, value = "") {
    try {
        if (existfile) {
            if (!fs.existsSync(file)) {
                await utilcode.fsWrite(file, JSON.stringify(value, null, 2));
            }
        }
        const filejsontext = await utilcode.fsRead(file)
        return utilcode.jsonParse(filejsontext);
    } catch (error) {
        return false;
    }
}

// Crear carpetas
async function setFolders(raiz, ruta) {
    try {
        await utilcode.createFolderRecursive(raiz, ruta);
        return true;
    } catch (error) {
        return false;
    }
}

// crear carpetas requeridas
async function folderReq() {
    await setFolders(userdata, "apps/sfree/json/banner");
    await setFolders(userdata, "apps/sfree/json/info");
    await setFolders(userdata, "apps/sfree/json/db");
    await setFolders(userdata, "apps/sfree/json/user");

    // cargar json con los datos de los juego
    if (!saved.hasKey("articles")) {
        let articles = await openFileJson(path.join(userdata, "apps", "sfree", "db", "sfree.json"), true, { articulos: [] });
        saved.addSaved("articles", articles);
    }

}

// isArray
function isArrayorText(ojc) {
    try {
        if (Array.isArray(ojc)) {
            if (ojc.every(item => typeof item === "object")) {
                return "object_array";
            }
        }
        return "text_array";
    } catch (error) {
        return "text";
    }
}

// get Querys
function getQuery(url) {
    const datauri = new URL(url);
    const params = new URLSearchParams(datauri.search);

    const queryParams = {};

    for (const [key, value] of params) {
        if (queryParams[key]) {
            if (Array.isArray(queryParams[key])) {
                queryParams[key].push(value);
            } else {
                queryParams[key] = [queryParams[key], value];
            }
        } else {
            queryParams[key] = value;
        }
    }

    return { ...{ pathuri: `${datauri.origin + datauri.pathname}` }, ...queryParams };
}


const routes = [
    {
        method: 'get',
        path: '/update',
        handler: async (req, res) => {
            await folderReq();
            await openFileJson(path.join(userdata, "apps", "sfree", "json", "user", "user.json"), true, {name: utilcode.getUUID(5)});
            res.render(path.join(__dirname, "app", "views", "update"));
            // res.redirect('/');
        }
    },
    {
        method: 'get',
        path: '/',
        handler: async (req, res) => {
            res.render(path.join(__dirname, "app", "views", "sfree"));
        }
    },
    {
        method: 'get',
        path: '/games',
        handler: async (req, res) => {
            res.render(path.join(__dirname, "app", "views", "games"));
        }
    },
    {
        method: 'get',
        path: '/watch',
        handler: async (req, res) => {
            res.render(path.join(__dirname, "app", "views", "view"));
        }
    },
    {
        method: "post",
        path: "/saveimg",
        handler: async (req, res) => {
            // page
            let { img, ...arg } = req.body;

            let resp = await prompts.compressIMG(img, {
                ...arg
            });


            if (resp) {
                res.send({ img: resp });
            } else {
                res.send(false);
            }

        },
    },
    {
        method: 'post',
        path: '/proxy',
        handler: async (req, res) => {
            let { urls } = req.body;

            const verificar = isArrayorText(urls);

            let whattype = "object";

            let result = {};

            if (verificar == "text_array") {
                let resultget = 0;

                for (const urldownload of urls) {
                    let response = await fet(urldownload);
                    if (response) {
                        if (isArrayorText(response) == "object_array") {
                            if (whattype == "object") {
                                whattype = "array";
                                result = [];
                            }

                            result = [...result, ...response];

                        } else {
                            if (response.query) {
                                if (response.query.pages) {
                                    let getid = getQuery(urldownload);
                                    response = response.query.pages[getid.pageids]
                                }
                            }
                            result = {
                                ...result,
                                ...response
                            }
                        }

                    } else {
                        result = {
                            ends: false
                        }
                    }
                    resultget++;

                    if (urls.length === resultget) {

                    }
                }

            } else {
                result = false
            }

            res.json(result);

        }
    },
    {
        method: 'get',
        path: '/img-appdata/*',
        handler: async (req, res) => {
            let qs = req.query;

            const extName = path.extname(req.params[0]);
            const contentTypes = {
                ".css": "text/css",
                ".js": "text/javascript",
                ".json": "application/json",
                ".png": "image/png",
                ".ico": "image/x-icon",
                ".jpg": "image/jpeg",
                ".svg": "image/svg+xml",
                ".mp3": "audio/mpeg",
                ".mp4": "video/mp4",
            };

            const contentType = contentTypes[extName] || "text/html";
            res.writeHead(200, { "Content-Type": contentType });
            const nameFile = path.join(pathAppData, req.params[0]);
            const readStream = fs.createReadStream(nameFile);
            readStream.pipe(res);
        }
    }

];

module.exports = [...routes, ...lib];
