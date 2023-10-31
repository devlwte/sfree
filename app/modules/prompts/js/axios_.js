// Electron
const { app, BrowserWindow } = require("electron")

const path = require("path")
const fs = require("fs")

// UserData
const userdata = app.getPath("userData")

// UtilCode
const utilcode = require("../../../../../modules/utilcodes")


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

function getKey(inputString, groupSize, randomSize) {
    inputString = inputString.slice(6)
    const groups = inputString.match(new RegExp(`.{1,${groupSize + randomSize}}`, 'g'));
    let originalData = [];
    groups.forEach((group, index) => {
        if (index !== groups.length - 1) {
            originalData.push(group.substr(0, groupSize));
        } else {
            originalData.push(group);
        }
    });
    return originalData.join('');
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


class Axio_ {
    constructor() {
        this._get = false;
        this.tokenSearch = 10;

        this.run();
    }
    async run() {
        // config
        let cogapp = await openFileJson(path.join(userdata, "apps", "rawgapi", "json", "cog", "config.json"), true, {
            modalkey: "on",
            cache: "on"
        });

        if (!cogapp.thekey) {
            this.tokenSearch = 10;
        } else {
            if (cogapp.thekey == "ruvcLuf22fgGTZn8bfa3dT9l1fc8puT3B493dC9zzFbc15YEIMd6b46vyqQV83edEUeVMbf15") {
                this.tokenSearch = 10;
            } else {
                this.tokenSearch = 20000;
            }
        }
    }
    async get(urlrawg, filejson) {
        // Reload Tokens
        this.run();
        // tokens
        let { tokens, ...tok } = await openFileJson(path.join(userdata, "apps", "rawgapi", "json", "cog", "data.json"), true, {
            tokens: Buffer.from("1").toString('base64')
        });

        let numberToken = null;
        try {
            numberToken = Buffer.from(tokens, 'base64').toString('utf-8');
            numberToken = parseInt(numberToken)
        } catch (error) {
            console.log(error);
            numberToken = false;
        }

        if (numberToken && numberToken == this.tokenSearch) {
            let filecache = await openFileJson(filejson);
            if (filecache) {
                filecache.infotoken = {
                    maxr: this.tokenSearch,
                    token: numberToken
                }
                return filecache;
            } else {
                return "no_token";
            }
        } else {
            let filecache = await openFileJson(filejson);
            if (filecache) {
                filecache.infotoken = {
                    maxr: this.tokenSearch,
                    token: numberToken
                }
                return filecache;
            }
        }

        if (numberToken && numberToken < this.tokenSearch) {
            // add token use
            let newuse = (numberToken + 1);
            let tobase64 = Buffer.from(`${newuse}`).toString('base64');
            tok.tokens = tobase64;
            await utilcode.fsWrite(path.join(userdata, "apps", "rawgapi", "json", "cog", "data.json"), JSON.stringify(tok, null, 2));

            // config
            let { thekey = "ruvcLuf22fgGTZn8bfa3dT9l1fc8puT3B493dC9zzFbc15YEIMd6b46vyqQV83edEUeVMbf15", cache } = await openFileJson(path.join(userdata, "apps", "rawgapi", "json", "cog", "config.json"), true, {
                modalkey: "on",
                cache: "on"
            });

            // Configurar key
            let urlKey = urlrawg.replace(/key_user/g, getKey(thekey, 4, 5));

            // Search Rawg
            try {
                let data = null;
                if (cache == "on") {
                    let filecache = await openFileJson(filejson);
                    if (filecache) {
                        data = filecache;
                    } else {
                        data = await fet(urlKey);
                        if (data.next !== null) {
                            data.next = data.next.replaceAll(getKey(thekey, 4, 5), 'key_user');
                        }

                        if (data.previous !== null) {
                            data.previous = data.previous.replaceAll(getKey(thekey, 4, 5), 'key_user');
                        }

                        await utilcode.fsWrite(filejson, JSON.stringify(data, null, 2));
                    }
                } else {
                    data = await fet(urlKey);
                    if (data.next !== null) {
                        data.next = data.next.replaceAll(getKey(thekey, 4, 5), 'key_user');
                    }

                    if (data.previous !== null) {
                        data.previous = data.previous.replaceAll(getKey(thekey, 4, 5), 'key_user');
                    }
                }

                data.infotoken = {
                    maxr: this.tokenSearch,
                    token: newuse
                }

                return data;
            } catch (error) {
                return false;
            }

        } else {
            return "no_token";
        }

    }
}
module.exports = new Axio_();