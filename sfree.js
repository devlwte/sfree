const { app, BrowserWindow, dialog } = require('electron');

const path = require("path");
const fs = require("fs");

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

// libraries
const lib = require("../../modules/util-libraries");

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

    // cargar json con los datos de los juego
    if (!saved.hasKey("articles")) {
        let articles = await openFileJson(path.join(userdata, "apps", "sfree", "db", "sfree.json"), true, { articulos: [] });
        saved.addSaved("articles", articles);
    }

}


const routes = [
    {
        method: 'get',
        path: '/update',
        handler: async (req, res) => {
            await folderReq();
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
