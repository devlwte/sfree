// Electron
const { app, BrowserWindow } = require("electron")


const sharp = require('sharp');
const path = require("path");
const fs = require("fs");

// UserData
const userdata = app.getPath("userData");

// UtilCode
const utilcode = require("../../../../../modules/utilcodes");

// fetch
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args))

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


class Prompts_ {
    constructor() {
        this.jpgOptions = {
            quality: 80,
            progressive: true,
            format: 'webp',
        };
    }
    async compressIMG(urlimg, { saveIn, name, saveTo, ...arg }) {
        if (urlimg !== false) {
            let { ...data } = this.jpgOptions;

            this.jpgOptions = {
                ...data,
                ...arg
            }




            if (saveTo == "_base64") {
                let saveimg = await openFileJson(path.join(saveIn, `${name}.json`), true, {
                    name,
                    namefile: `${name}.json`,
                });

                let result = false;

                if (!saveimg.image) {
                    // get Buffer
                    const getbuffer = await this.getBufferIMG(urlimg);
                    if (getbuffer) {
                        // Compress
                        const optimizedImageBuffer = await this.optimizeImage(getbuffer);
                        saveimg.image = `data:image/jpeg;base64,${optimizedImageBuffer.toString('base64')}`;
                        // Save
                        await utilcode.fsWrite(path.join(saveIn, `${name}.json`), JSON.stringify({ ...saveimg }, null, 2));

                        result = saveimg.image;
                    } else {
                        result = false;
                    }

                } else {
                    result = saveimg.image;
                }



                return result;
            }
        }else{
            return false;
        }
    }

    async getBufferIMG(urlimg) {
        try {
            const response = await fetch(urlimg);
            if (!response.ok) {
                throw new Error(`Error al descargar la imagen: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer(); // Utiliza response.arrayBuffer() en lugar de response.buffer()

            const imageBuffer = Buffer.from(arrayBuffer);

            return imageBuffer;
        } catch (error) {
            console.error('Error:', error);
            return false;
        }
    }

    async optimizeImage(imageBuffer) {
        try {
            // const { format } = await image.metadata(); // Get the format of the original image
            let { quality, format, width, height } = this.jpgOptions;

            if (width && height) {
                return await sharp(imageBuffer)
                    .resize(width, height, { fit: 'inside' })
                    .toFormat(format, { quality })
                    .toBuffer();
            } else {
                return await sharp(imageBuffer)
                    .resize(width, height)
                    .toFormat(format, { quality })
                    .toBuffer();
            }

        } catch (error) {
            throw error;
        }
    }
}
module.exports = new Prompts_();