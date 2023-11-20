const { ipcRenderer, shell } = require('electron');
const fs = require('fs');
const path = require("path")

// Store
const Store = require('electron-store');
const store = new Store();

// ParseTorrent
const parseTorrent = require('parse-torrent');

// UtilCode
const utilcode = require(path.join(__dirname, "../../", "app", "modules/utilcodes"));

// port app
const port = window.location.port;

function href(link) {
    window.location.href = link;
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
function _ajax(url, method, data) {
    return new Promise((resolve, reject) => {
        kit.send({
            url: url,
            method: method,
            data,
            success: (respuesta) => {
                resolve(respuesta);
            },
            error: (codigo, respuesta) => {
                reject({ codigo, respuesta });
            }
        });
    });
}

// Función para enviar mensajes al proceso principal
async function sendMessage(ipc, ...message) {
    try {
        const reply = await ipcRenderer.invoke(ipc, ...message);
        return reply;
    } catch (error) {
        console.error(error);
        return false;
    }
}
// Insert text
function insertTextElm({
    selector,
    intervalo = 100,
    writing = false,
    newText = false
}, callback) {
    let all = document.querySelectorAll(selector);
    all.forEach((element, index) => {
        const text = newText ? newText : element.getAttribute("data-text");
        const indice_text = element.getAttribute("data-indice");

        if (newText) {
            element.innerHTML = "";
        }

        // Crear un elemento 'span' para mostrar el texto
        var printedtext = document.createElement('span');
        printedtext.classList.add("printedtext");
        element.appendChild(printedtext);

        if (writing) {
            // Si se desea efecto de escritura, crear un elemento 'span' para mostrar el índice de escritura
            var iswriting = document.createElement('span');
            iswriting.classList.add("iswriting");
            iswriting.textContent = indice_text;
            element.appendChild(iswriting);
        }

        // Mostrar el elemento con una función 'kit.show'
        kit.show(element, 100, "inline-block");

        // Seleccionar el elemento que mostrará el texto
        const elmText = element.querySelector(".printedtext");
        elmText.style.position = `relative`;
        elmText.style.padding = `0 2px`;

        // Seleccionar el elemento que mostrará el índice de escritura
        const elmWriting = element.querySelector(".iswriting");

        if (elmWriting) {
            // elmWriting.style.position = `absolute`;
            // elmWriting.style.right = 0;
            // elmWriting.style.top = 0;
            elmWriting.style.fontWeight = 300;

            // Si la clase "parpadeo" está presente en elmWriting, quitarla
            if (elmWriting.classList.contains("parpadeo")) {
                elmWriting.classList.remove("parpadeo");
            }
        }

        let indice = 0;

        function agregarCaracter() {
            if (indice < text.length) {
                elmText.textContent += text.charAt(indice);
                indice++;
            } else {
                clearInterval(intervaloID);
                if (elmWriting) {
                    if (writing == "delete") {
                        // Ocultar elmWriting si 'writing' es "delete"
                        kit.hide(elmWriting, 100);
                    } else if (writing == "isStop") {
                        // Agregar la clase "parpadeo" a elmWriting si 'writing' es "isStop"
                        elmWriting.classList.add("parpadeo");
                    }
                }
                if (callback) {
                    callback();
                }
            }
        }

        const intervaloID = setInterval(agregarCaracter, intervalo);
    });
}

function deleteTextElm({ selector, intervalo = 100, writing = false }, callback) {
    let all = document.querySelectorAll(selector);
    all.forEach((element, index) => {
        const elmText = element.querySelector(".printedtext");
        const elmWriting = element.querySelector(".iswriting");

        if (elmText) {
            let text = elmText.textContent;

            if (elmWriting) {
                // Si se proporciona un índice de escritura, restablecerlo
                const indice_text = element.getAttribute("data-indice");
                elmWriting.textContent = indice_text;
                elmWriting.classList.remove("parpadeo");
            }

            let indice = text.length - 1;

            function eliminarCaracter() {
                if (indice >= 0) {
                    elmText.textContent = text.slice(0, indice);
                    indice--;
                } else {
                    clearInterval(intervaloID);
                    if (callback) {
                        callback();
                    }
                }
            }

            const intervaloID = setInterval(eliminarCaracter, intervalo);
        }
    });
}


// Función para insertar texto con promesa y retraso opcional
async function insertTextElmAsync({ selector, intervalo = 100, writing = false, newText = false, delay = 0, callback }) {
    const promesa = new Promise((resolve) => {
        insertTextElm({ selector, intervalo, writing, newText }, resolve);
    });

    await promesa;

    if (callback) {
        callback()
    }
    await new Promise(resolve => setTimeout(resolve, delay));
}

async function delay(delay) {
    await new Promise(resolve => setTimeout(resolve, delay));
}

// Función para eliminar texto con promesa
function deleteTextElmAsync({ selector, intervalo = 100, writing = false }) {
    return new Promise((resolve) => {
        deleteTextElm({ selector, intervalo, writing }, resolve);
    });
}


// Run Download info
async function download_data(circle) {
    let folders = saved.getSaved("folders");

    // cargar json con los datos de los juego
    let articles = await openFileJson(path.join(folders.userData, "apps", "sfree", "json", "db", "db.json"));
    let resultget = 0;

    for (const item of articles) {
        let itemFile = await openFileJson(path.join(folders.userData, "apps", "sfree", "json", "info", `${utilcode.clearSymbols(item.name)}.json`));
        if (!itemFile) {
            await deleteTextElmAsync({ selector: ".text-insert", intervalo: 50, writing: true });
            await insertTextElmAsync({ selector: ".text-insert", newText: item.name, writing: "isStop", intervalo: 50, delay: 1000 });

            // Establecer en 50%
            circle.animate(0.50, {
                duration: (1000 * 1),
            })

            let urlsapi = [];
            if (item.wikipedia.id) {
                urlsapi.push(`https://${item.wikipedia.lang}.wikipedia.org/w/api.php?action=query&format=json&prop=info|extracts&pageids=${item.wikipedia.id}&exintro=1&explaintext=1`);
            }

            if (item.rawg) {
                urlsapi.push(`https://api.rawg.io/api/games/${item.rawg}?key=f22f8bfa1fc8493dbc156b4683edbf15`);
            }

            // Obtener informacion
            let pre = await _ajax("/proxy", "POST", {
                urls: [...urlsapi]
            });

            if (!pre.ends) {
                // Descargar imagen
                let imagen_download = await _ajax("/saveimg", "POST", {
                    img: pre.background_image ? pre.background_image : pre.background_image_additional ? pre.background_image_additional : false,
                    saveIn: path.join(folders.userData, "apps", "sfree", "json", "banner"),
                    name: utilcode.clearSymbols(pre.slug),
                    saveTo: "_base64",
                    quality: 40,
                    format: "webp",
                });

                // end
                circle.animate(1, {
                    duration: (1000 * 1),
                }, async () => {
                    await utilcode.fsWrite(path.join(folders.userData, "apps", "sfree", "json", "info", `${utilcode.clearSymbols(item.name)}.json`), JSON.stringify(pre, null, 2));

                    // Establecer en 0%
                    circle.animate(0, {
                        duration: (600),
                    })
                })
                await delay(1000);
            }

        }

        resultget++;

        if (articles.length == resultget) {
            window.location.href = "/";
        }

    }

}


function r(input) {
    const words = input.split('-');
    const result = words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    return result;
}

async function renderItems($artAll, config = {}, callback) {
    const {
        customCSS = {},
    } = config;

    // Verificar si existen elementos
    const $existingItems = $artAll.children();
    if ($existingItems.length > 0) {
        let animationDelay = 0;

        // Animación para reducir el ancho, alto, padding y margin de los elementos existentes
        $existingItems.each(function (index) {
            const $item = $(this);
            $item.animate(customCSS, 500, function () {
                $item.remove();
                if (index === $existingItems.length - 1) {
                    if (callback) {
                        callback();
                    }
                }
            });
            animationDelay += 100;
        });
    } else {
        if (callback) {
            callback();
        }
    }
}

function loadElms(items, $artAll, config = {}, template) {
    // show
    kit.show(".page-art-show", 200);
    // add
    const {
        before = {},
        after = {},
    } = config;
    let animationDelay = 0;

    for (const item of items) {
        const newItem = template(item, items.length);
        const $newItem = $(newItem)
            .css({ ...before }) // Aplicar estilos personalizados
            .animate({ ...after }, 500);

        $artAll.append($newItem);
        animationDelay += 100;
    }
}

function removeObj(arrays, key, value) {
    return arrays.filter((elemento) => elemento[key] !== value);
}

// Creator Acceso directo
function newFileAcceso(file, { args, description, icon, appUserModelId, iconIndex = 0 }) {
    let updatefiles = {};
    let updatelnk = false;
    if (fs.existsSync(file)) {
        const lnk = shell.readShortcutLink(file);
        updatefiles = { ...lnk };
        updatelnk = true;
    }

    const operation = updatelnk ? 'update' : "create";
    const options = {
        ...updatefiles,
        target: process.execPath,
        args,
        description,
        icon,
        appUserModelId,
        iconIndex
    };

    const acc = shell.writeShortcutLink(file, operation, options);
    if (acc) {
        return file;
    } else {
        return false;
    }
}


kit.onDOMReady(async () => {
    // All folders
    const folders = await sendMessage("all-folders");
    saved.addSaved("folders", folders);

    const input_search = document.getElementById('search-page');
    if (input_search) {
        input_search.addEventListener('input', function () {
            const texto = input_search.value;

            if (texto.trim() == '') {
                localStorage.removeItem('save_search');
            }
        });

        if (localStorage.getItem("save_search")) {
            input_search.value = localStorage.getItem("save_search");
        }
    }





    // Page Update
    const pageUpdate = kit.existsElm(".page-update");
    if (pageUpdate) {
        // carga inicial
        var circle = cacheapp.newProgressBar("update", ".precarga", "Circle", {
            color: "#e5085b",
            trailColor: "rgba(240, 248, 255, 0.384)",
            trailWidth: 10,
            strokeWidth: 10
        });

        circle.animate(1, {
            duration: (1000 * 1),
        }, () => {
            circle.destroy();
            cacheapp.newProgressBar("delete", "update");

            $(".logoUpdate").animate({ width: 90, height: 90 }, async () => {
                const funs = async () => {
                    await insertTextElmAsync({ selector: ".text-insert", writing: "isStop", delay: 3000 });
                    await deleteTextElmAsync({ selector: ".text-insert", intervalo: 50, writing: true });
                    await insertTextElmAsync({ selector: ".text-insert", newText: "No recargues la pagina", writing: "isStop", delay: 2000 });
                    await deleteTextElmAsync({ selector: ".text-insert", intervalo: 50, writing: true });
                    await insertTextElmAsync({ selector: ".text-insert", newText: "Descargando 'datos json'", writing: "isStop", delay: 2000 });
                    // show progress
                    kit.show(".download_data", 500, "block");
                    // next
                    await deleteTextElmAsync({ selector: ".text-insert", intervalo: 50, writing: true });
                    // Iniciar descarga
                    await insertTextElmAsync({
                        selector: ".text-insert",
                        newText: "'games.json'",
                        writing: "isStop",
                        callback: async function () {

                            var circle = cacheapp.newProgressBar("info_get", ".bg_progress", "Line", {
                                color: "#fff",
                                trailColor: "transparent",
                                trailWidth: 10,
                                strokeWidth: 1.6
                            });

                            circle.animate(0.50, {
                                duration: (1000 * 1.5),
                            })


                            await delay(3000);
                            let pre = await _ajax("/proxy", "POST", {
                                urls: [`http://localhost:${port}/games.json`]
                            });

                            if (pre) {
                                circle.animate(1, {
                                    duration: (1000 * 1.5),
                                }, async () => {
                                    await utilcode.fsWrite(path.join(folders.userData, "apps", "sfree", "json", "db", "db.json"), JSON.stringify(pre, null, 2));
                                    // Establecer en 0%
                                    circle.animate(0, {
                                        duration: (1000 * 1),
                                    }, () => {
                                        download_data(circle);
                                    })

                                })
                            }

                            // await utilcode.fsWrite(path.join(folders.userData, "apps", "sfree", "json", "db", "db.json"), JSON.stringify(datosDescargados, null, 2));
                        }
                    });
                }

                funs()


            })



            $(".fondo-color").css({ opacity: 0, borderRadius: "100%" }).animate(
                { opacity: 1, width: "100%", height: "100%", borderRadius: "0" },
                {
                    duration: 500,
                    step: function (now, fx) {
                        if (fx.prop === "borderRadius") {
                            // Reduzca el radio del borde gradualmente
                            $(this).css("borderRadius", now);

                        }
                    }
                }
            );


        })
    }

    let articles = await openFileJson(path.join(folders.userData, "apps", "sfree", "json", "db", "db.json"));

    // Obtener Imagen del juego
    const getIMGLocal = (name) => {
        let folder = path.join(folders.userData, "apps", "sfree", "json", "banner", utilcode.clearSymbols(name) + ".json");
        return JSON.parse(fs.readFileSync(folder, "utf8"));
    }

    // get info
    const getinfo = async (infoname) => {
        return await openFileJson(path.join(folders.userData, "apps", "sfree", "json", "info", `${utilcode.clearSymbols(infoname)}.json`));
    };

    // get img
    const getIMG = async (urlimg, name) => {
        // Descargar imagen
        return await _ajax("/saveimg", "POST", {
            img: urlimg,
            saveIn: path.join(folders.userData, "apps", "sfree", "json", "banner"),
            name: utilcode.clearSymbols(name),
            saveTo: "_base64",
            quality: 40,
            format: "webp",
        });
    };

    const text_short = (text, num) => {
        if (text.length > num) {
            return text.slice(0, num).trim() + "...";
        } else {
            return text;
        }
    }

    const isRec = (fechaDelPost, splittext, setmes = 3) => {
        // Convierte la fecha del post y la fecha actual en objetos Date
        const spl = fechaDelPost.split(splittext);
        const fechaPost = new Date(spl[0], spl[1] - 1, spl[2]);
        const fechaActual = new Date();

        // Calcula la fecha hace 3 meses a partir de la fecha actual
        const tresMesesAtras = new Date(fechaActual);
        tresMesesAtras.setMonth(tresMesesAtras.getMonth() - setmes);

        // Compara la fecha del post con la fecha de 3 meses atrás
        return fechaPost >= tresMesesAtras;
    }

    const getdate = (date_post, splittext, lang) => {
        const meses = {
            en: {
                1: "January",
                2: "February",
                3: "March",
                4: "April",
                5: "May",
                6: "June",
                7: "July",
                8: "August",
                9: "September",
                10: "October",
                11: "November",
                12: "December"
            },
            es: {
                1: "Enero",
                2: "Febrero",
                3: "Marzo",
                4: "Abril",
                5: "Mayo",
                6: "Junio",
                7: "Julio",
                8: "Agosto",
                9: "Septiembre",
                10: "Octubre",
                11: "Noviembre",
                12: "Diciembre"
            }
        };

        const dias = {
            en: {
                0: "Sunday",
                1: "Monday",
                2: "Tuesday",
                3: "Wednesday",
                4: "Thursday",
                5: "Friday",
                6: "Saturday"
            },
            es: {
                0: "domingo",
                1: "lunes",
                2: "martes",
                3: "miércoles",
                4: "jueves",
                5: "viernes",
                6: "sábado"
            }
        };

        const spl = date_post.split(splittext);
        const fecha = new Date(spl[0], spl[1] - 1, spl[2]);

        const diaEspanol = dias[lang][fecha.getDay()];
        const mesEspanol = meses[lang][fecha.getMonth() + 1];


        return `${diaEspanol} ${spl[2]} de ${mesEspanol} de ${spl[0]}`;
    };

    // Función para obtener un objeto en un orden aleatorio sin repetición
    function getRandomObject(arr) {
        let objetosRestantes = [...arr];

        return function () {
            if (objetosRestantes.length === 0) {
                objetosRestantes = [...arr]; // Reiniciar cuando se agoten
            }

            const indiceAleatorio = Math.floor(Math.random() * objetosRestantes.length);
            const objetoSeleccionado = objetosRestantes.splice(indiceAleatorio, 1)[0];
            return objetoSeleccionado;
        };
    }


    saved.addSaved("tags", (item) => {
        return `<li><a href="/games?tag=${item.slug}">${item.name}</a></li>`;
    });

    saved.addSaved("recent", async (item, ref) => {

        // data games
        let inf = await getinfo(item.name);
        // get img
        let img = getIMGLocal(inf.slug);

        let isrecent = false;
        if (inf.released) {
            isrecent = isRec(inf.released, "-", 6)
        }

        return `
                <li>
                    <div class="img_rec" style="background-image: url(${img.image});"></div>
                    <div class="data_art">
                    <div class="name_art"  onclick="href('/watch?q=${ref}')">${item.name} ${isrecent ? `<span class="new badge green" data-badge-caption="Estreno"></span>` : ""}</div>
                    <div class="dcp_rec">${text_short(inf.extract ? inf.extract : inf.description_raw ? inf.description_raw : "No Description", 75)}</div>
                    </div>
                </li>
        `;
    });

    saved.addSaved("interests", async (item) => {
        // data games
        let inf = item;
        let isrecent = false;
        if (inf.released) {
            isrecent = isRec(inf.released, "-", 6)
        }
        // get img
        let img = getIMGLocal(inf.slug);
        return `
                <div class="columns-col">
                    <div class="item" style="background-image: url(${img.image});">
                    ${isrecent ? `<span class="recentpost"><span>Estreno</span></span>` : ""}
                    </div>
                    <div class="item-name" onclick="href('/watch?q=${inf.ref}')">${inf.name}</div>
                </div>
        `;
    });

    saved.addSaved("recommended", async (item) => {
        // data games
        let inf = item;
        let isrecent = false;
        if (inf.released) {
            isrecent = isRec(inf.released, "-", 6)
        }
        // get img
        let img = getIMGLocal(inf.slug);
        return `
                <div class="columns-col">
                    <div class="item" style="background-image: url(${img.image});">
                    ${isrecent ? `<span class="recentpost"><span>Estreno</span></span>` : ""}
                    </div>
                    <div class="item-name" onclick="href('/watch?q=${inf.ref}')">${inf.name}</div>
                </div>
        `;
    });



    const recent = async (arrays, $artAll, tmplet = false, css, total = 12) => {
        let template = tmplet ? tmplet : saved.getSaved("recent");

        let animationDelay = 0;

        const elementosAImprimir = total;
        const startIndex = arrays.length >= elementosAImprimir ? arrays.length - elementosAImprimir : 0;

        for (let i = arrays.length - 1; i >= startIndex; i--) {
            const item = arrays[i];
            const newItem = await template(item, tmplet == false ? item.ref : null);

            const before = css ? css.before : { opacity: 0, marginTop: '-30px', overflow: "hidden", display: "inline-block" };
            const after = css ? css.after : { opacity: 1, marginTop: '0', overflow: "hidden", display: "inline-block" };

            const $newItem = $(newItem)
                .css(before)
                .animate(after, 500);

            $artAll.append($newItem);
            animationDelay += 100;
        }
    };




    const addNewItems = (arrays, $artAll) => {
        let animationDelay = 0;
        let totalnum = (arrays.length > 7 ? 7 : arrays.length);
        for (let i = 0; i < totalnum; i++) {
            const item = arrays[i];
            const newItem = saved.getSaved("tags")(item);
            const $newItem = $(newItem)
                .css({ opacity: 0, marginLeft: '-20px', overflow: "hidden", display: "inline-block" })
                .animate({ opacity: 1, marginLeft: '0', overflow: "hidden", display: "inline-block" }, 500);

            $artAll.append($newItem);
            animationDelay += 100;
        }
    }

    const bannerRandom = async (active = false) => {
        // set banner
        const tobanner = getRandomObject(articles);
        const dataran = tobanner();
        // data games
        let inf = await getinfo(dataran.name);
        // get img
        let img = getIMGLocal(inf.slug);
        // banner
        const banner = document.querySelector(".banner");

        // generate generos
        let gentags = [];
        if (inf.genres) {
            gentags = [...gentags, ...inf.genres]
        }
        if (inf.tags) {
            gentags = [...gentags, ...inf.tags]
        }



        // Animation
        if (active) {
            // show banner
            $(".banner")
                .css({ opacity: 0 })
                .animate({ opacity: 1 }, 600, () => {
                    const $existingItems = $(".tags ul").children();

                    if ($existingItems.length > 0) {
                        let animationDelay = 0;
                        // Animación para reducir el ancho, alto, padding y margin de los elementos existentes
                        $existingItems.each(function (index) {
                            const $item = $(this);
                            $item.animate({
                                opacity: 0,
                                marginLeft: '-20px'
                            }, 500, function () {
                                $item.remove();
                                if (index === $existingItems.length - 1) {
                                    // Esperar un breve período de tiempo después de eliminar los elementos antiguos
                                    setTimeout(() => {
                                        addNewItems(gentags, $(".tags ul"));
                                    }, 500);
                                }
                            });
                            animationDelay += 100;
                        });
                    } else {
                        addNewItems(gentags, $(".tags ul"));
                    }

                    $(".date_add").animate({ opacity: 0, marginLeft: '-100px' }, 300, () => {
                        $(".date_add").find(".date_text").html(inf.released ? getdate(inf.released, "-", "es") : "No Hay Fecha");
                    });
                    $(".name_post").animate({ opacity: 0, marginLeft: '-100px' }, 350, () => {
                        $(".name_post").find(".name_in_banner").html(inf.name);
                    });

                    $(".short_dcp").animate({ opacity: 0, marginLeft: '-300px' }, 400, () => {
                        $(".short_dcp").find(".dcp_short").html(text_short(inf.extract ? inf.extract : inf.description_raw ? inf.description_raw : "No Description", 200));
                    });

                    $(".tags ul li").animate({ opacity: 1, marginLeft: '0px' }, 1000);
                    $(".date_add").animate({ opacity: 1, marginLeft: '0px' }, 520);
                    $(".name_post").animate({ opacity: 1, marginLeft: '0px' }, 530);
                    $(".short_dcp").animate({ opacity: 1, marginLeft: '0px' }, 1000);

                });
        }

        // banner
        banner.style = `background-image: url(${img.image});`;

        // show banner
        if (!active) {
            // Date
            banner.querySelector(".date_text").innerHTML = inf.released ? getdate(inf.released, "-", "es") : "No Hay Fecha";

            // Name
            banner.querySelector(".name_in_banner").innerHTML = inf.name;

            // dcp
            banner.querySelector(".dcp_short").innerHTML = text_short(inf.extract ? inf.extract : inf.description_raw ? inf.description_raw : "No Description", 200);

            // show banner
            $(".banner")
                .css({ opacity: 0 })
                .animate({ opacity: 1 }, 500);
        }
    }

    const getAzar = (array, numeroObjetos) => {
        if (numeroObjetos >= array.length) {
            return array;
        } else {
            const objetosAleatorios = [];
            const copiaArray = [...array];

            while (objetosAleatorios.length < numeroObjetos) {
                const indiceAleatorio = Math.floor(Math.random() * copiaArray.length);
                const objetoSeleccionado = copiaArray.splice(indiceAleatorio, 1)[0];
                objetosAleatorios.push(objetoSeleccionado);
            }

            return objetosAleatorios;
        }
    }

    // interests
    const ints = async (arrays, elm) => {
        let interests_file = await openFileJson(path.join(folders.userData, "apps", "sfree", "json", "user", "user.json"));

        let template = saved.getSaved("interests");

        let copia = [];
        for (let i = 0; i < arrays.length; i++) {
            const interests = arrays[i];
            let { pageid, name, slug, tags, released, genres, background_image = false, background_image_additional = false } = await getinfo(interests.name);
            copia.push({ ref: interests.ref, pageid, name, slug, tags, released, genres, background_image, background_image_additional });
        }

        let result_compare = [];

        for (let a = 0; a < interests_file.interests.length; a++) {
            const getints = interests_file.interests[a];

            // tgas y genres
            let gentags = []

            const buscar = copia.filter((elemento) => {
                gentags = [...elemento["tags"], ...elemento["tags"]]
                let resultsub = gentags;

                const subresultados = resultsub.filter((subelemento) => {
                    return subelemento["slug"] === getints;
                });

                return subresultados.length > 0; // Devuelve verdadero si hay subresultados
            });

            if (buscar.length > 0) {
                result_compare = [...result_compare, ...buscar]
            }
        }

        // elementos
        let elms = saved.deleteDuplicate(result_compare, "name");

        // show recientes
        let stylecss = {
            before: { opacity: 0, marginLeft: '-30px', overflow: "visible", display: "inline-block" },
            after: { opacity: 1, marginLeft: '0', overflow: "visible", display: "inline-block" }
        }
        await recent(getAzar(elms, 8), elm, template, stylecss, 8);

    };


    // recommend
    const getRecommend = async (arrays, elm) => {
        let template = saved.getSaved("recommended");

        let copia = [];
        for (let i = 0; i < arrays.length; i++) {
            const interests = arrays[i];
            let { pageid, name, slug, ratings, released, background_image = false, background_image_additional = false } = await getinfo(interests.name);
            copia.push({ ref: interests.ref, pageid, name, slug, released, ratings, background_image, background_image_additional });
        }

        // paginas
        let pags = ["recommended"]

        for (let a = 0; a < pags.length; a++) {
            let se = pags[a];

            let countsAlto = [];
            const resultados = copia.filter((elemento) => {
                let resultsub = elemento["ratings"];
                if (resultsub.length > 0) {
                    let alto = resultsub;
                    let maxCountItem = { count: -1 }; // Inicializamos con un valor mínimo

                    alto.forEach((subAlto) => {
                        // Obtener el count más alto
                        if (subAlto.count > maxCountItem.count) {
                            maxCountItem = subAlto;
                        }
                    });

                    // Almacenar el count más alto en countsAlto
                    if (maxCountItem.title == "recommended") {
                        countsAlto.push(elemento);
                    }

                }
            });

            // elementos
            let elms = saved.deleteDuplicate(countsAlto, "name");

            // show recientes
            let stylecss = {
                before: { opacity: 0, marginLeft: '-30px', overflow: "visible", display: "inline-block" },
                after: { opacity: 1, marginLeft: '0', overflow: "visible", display: "inline-block" }
            }
            await recent(getAzar(elms, 8), elm, template, stylecss, 8);

            // console.log('Valores de count más altos:', countsAlto);


        }

    }


    // Page Home
    const homepage = kit.existsElm(".page-home");
    if (homepage) {
        await bannerRandom(true);

        kit.createInterval("banner", async () => {
            await bannerRandom(true);
        }, 8000)

        // Agregar un event listener al evento "focus"
        window.addEventListener("focus", function () {
            kit.createInterval("banner", async () => {
                await bannerRandom(true);
            }, 8000)
        });

        // Agregar un event listener al evento "blur" (opcional)
        window.addEventListener("blur", function () {
            kit.removeInterval("banner");
        });

        // show recientes
        await recent(articles, $("#recent"));

        // interests
        await ints(articles, $("#interests"));

        // Recommend
        await getRecommend(articles, $("#recommend"));

    }

    // Page View
    const viewpage = kit.existsElm(".page-view");

    // const generate_Tags = (arrays, $elm) => {
    //     let animationDelay = 0;
    //     let totalnum = (arrays.length);
    //     for (let i = 0; i < totalnum; i++) {
    //         const item = arrays[i];
    //         const newItem = saved.getSaved("tags")(item);
    //         const $newItem = $(newItem)
    //             .css({ opacity: 0, position: "absolute", marginLeft: '40px', overflow: "hidden", display: "inline-block" })
    //             .animate({ position: "relative", opacity: 1, marginLeft: '0', overflow: "hidden", display: "inline-block" }, 500);

    //         $elm.append($newItem);
    //         animationDelay += 100;
    //     }
    // };

    const generate_html = (arrays, $elm, template, css = {}, duration = false, callback = false) => {
        let animationDelay = 0;
        let totalnum = (arrays.length);
        for (let i = 0; i < totalnum; i++) {
            const item = arrays[i];
            const newItem = template(item);
            const $newItem = $(newItem)
                .css(css.before ? css.before : { opacity: 0, marginLeft: '40px', overflow: "hidden", display: "inline-block" })
                .animate(css.after ? css.after : { opacity: 1, marginLeft: '0', overflow: "hidden", display: "inline-block" }, duration ? animationDelay += duration : 500);

            $elm.append($newItem);

            if (callback) {
                callback($newItem);
            }

            if (!duration) {
                animationDelay += 150;
            }
        }
    };

    const generate_Tags = ($elm) => {
        const $existingItems = $elm.children();

        if ($existingItems.length > 0) {
            let animationDelay = 0;
            // Animación para reducir el ancho, alto, padding y margin de los elementos existentes
            $existingItems.each(function (index) {
                const $item = $(this);
                $item.animate({
                    opacity: 1,
                }, animationDelay += 50);

            });
        }
    };

    const animateAll = ($elm, css, duration, callback = false) => {
        const $existingItems = $elm.children();

        if ($existingItems.length > 0) {
            let animationDelay = 0;
            // Animación para reducir el ancho, alto, padding y margin de los elementos existentes
            $existingItems.each(function (index) {
                const $item = $(this);
                $item.css(css.before).animate(css.after, animationDelay += duration);
                if (callback) {
                    callback($item);
                }
            });
        }
    };

    const cemterCover = (cover) => {
        cover.css({
            opacity: 1,
            marginLeft: `calc(50% - ${cover.width() / 2}px)`
        });
        $(window).on("resize", () => {
            cover.css({
                opacity: 1,
                marginLeft: `calc(50% - ${cover.width() / 2}px)`
            });
        });
    }

    let allreplace = (text) => {
        return text.replace(/recommended/g, 'Recomendado')
            .replace(/exceptional/g, 'Excelente')
            .replace(/meh/g, 'Promedio')
            .replace(/skip/g, 'No Recomendado')
    };

    if (viewpage) {
        // querys
        let qs = kit.query();


        // search
        let getgame = saved._search(articles, "ref", qs.q)[0];

        // data games
        let inf = await getinfo(getgame.name);

        // title
        $("title").html("SFree | " + inf.name);

        // get img
        let img = getIMGLocal(inf.slug);

        // add banner
        const $bg = $(".bg_game");

        // bg img
        const loadimg = $bg.find(".img_bg")
        loadimg.css({ opacity: 0, backgroundImage: 'url(' + img.image + ')' }).animate({ opacity: 1 }, 500, async () => {
            // cover
            const cover = $bg.find(".cover");

            cover.css({ opacity: 0, marginLeft: "-100px", backgroundImage: 'url(' + img.image + ')' }).animate({ opacity: 1, marginLeft: 0 }, 700, () => {
                cemterCover(cover);
                if (getgame.data) {
                    $bg.find(".download_art").animate({ opacity: 1, bottom: 0 }, 500);

                    $bg.find(".download_art").on("click", async (e) => {

                        // const datas = $(e.currentTarget).attr("");
                        if (!fs.existsSync(path.resolve(folders.appPath, "apps", "torrenthive", "torrenthive.js"))) {
                            M.toast({
                                html: `<span>No se encontro el TorrentHive</span><button class="btn-flat toast-action">Descargar</button>`,
                                classes: 'rounded blue',
                                displayLength: 6000
                            })
                        } else {
                            let folder = await sendMessage("open-folder");
                            if (folder) {
                                let filejson = await openFileJson(path.resolve(saved.getSaved("folders").appPath, "apps", "torrenthive", "app", "public", "downloads.json"), true, []);
                                let datamagnet = parseTorrent(atob(getgame.data));

                                let editArray = removeObj(filejson, "infoHash", datamagnet.infoHash);

                                editArray.unshift({
                                    name: datamagnet.name,
                                    infoHash: datamagnet.infoHash,
                                    savein: folder,
                                    magnet: parseTorrent.toMagnetURI(datamagnet),
                                    length: 0
                                });


                                // save
                                await utilcode.fsWrite(path.resolve(saved.getSaved("folders").appPath, "apps", "torrenthive", "app", "public", "downloads.json"), JSON.stringify(editArray, null, 2));

                                // save in torrenthive
                                let tr_save = await openFileJson(path.resolve(saved.getSaved("folders").userData, "data", "json", "torrenthive.json"), true,{});
                                tr_save["opentr"] = datamagnet.infoHash;
                                await utilcode.fsWrite(path.resolve(saved.getSaved("folders").userData, "data", "json", "torrenthive.json"), JSON.stringify(tr_save, null, 2));

                                // Open App
                                if (store.get('apps.torrenthive') === "closed") {
                                    const configuracionAccesoDirecto = {
                                        args: ["jqAsd5tr", "torrenthive"].join(" "),
                                        icon: process.execPath,
                                        appUserModelId: `app.torrenthive`,
                                        iconIndex: 0
                                    };

                                    // Crear o actualizar el acceso directo
                                    const acc = newFileAcceso(path.resolve(saved.getSaved("folders").appPath, "apps", "start.lnk"), configuracionAccesoDirecto);

                                    if (acc) {
                                        shell.openExternal(acc);
                                    }
                                }


                            }

                        }

                    });
                }
            });

            // ratings
            let ratings = inf.ratings;

            // Left
            $bg.find(".ratings_conts").css({ opacity: 0, marginLeft: "-70px" }).animate({ opacity: 1, marginLeft: 0 }, 750, () => {
                $bg.find(".title-ratings").css({ opacity: 0, marginLeft: "-50px" }).animate({ opacity: 1, marginLeft: 0 }, 500);


                generate_html(ratings, $bg.find(".list-ratings"), (item) => {
                    return `
                    <div class="ratings-recommended" data-is="${item.title}" data-run="${item.percent}">
                        <div class="title-rat text-resize">
                            ${allreplace(item.title)}
                        </div>
                        <div class="progress-ratings">
                            <div class="run-progress-ratings ${item.title}"></div>
                        </div>
                    </div>
                    `;
                }, {
                    before: { opacity: 0, marginLeft: '-40px', overflow: "hidden", display: "block" },
                    after: { opacity: 1, marginLeft: '0', overflow: "hidden", display: "block" }
                }, 150, (elm) => {
                    $bg.find(`.ratings-recommended .${elm.attr("data-is")}`).animate({ width: `${elm.attr("data-run")}%` });
                });

                // animateAll($bg.find(".ratings .list-ratings"), {
                //     before: { opacity: 0, marginLeft: "-60px" },
                //     after: { opacity: 1, marginLeft: 0 }
                // }, 150, (t)=>{
                //     console.log(t.attr("data-is"));
                // })

            });

            // Stores
            let stores = inf.stores;
            let tor = [];
            if (getgame.data) {
                tor.push({ store: { name: "Torrent", slug: "torrent", domain: "#torrent", ref: getgame.ref } })
            }
            $bg.find(".ratings_stores").css({ opacity: 0, marginLeft: "-70px" }).animate({ opacity: 1, marginLeft: 0 }, 750, () => {

                generate_html([...stores, ...tor], $bg.find(".stores-list"), (item) => {
                    return `<li>
                                <div class="store-btn text-resize ${item.store.slug === "torrent" ? "green" : ""}">${item.store.name}</div>
                            </li>`;
                }, {
                    before: { opacity: 0, marginLeft: '-40px', overflow: "hidden", display: "block" },
                    after: { opacity: 1, marginLeft: '0', overflow: "hidden", display: "block" }
                }, 150, (elm) => {
                    $bg.find(`.ratings-recommended .${elm.attr("data-is")}`).animate({ width: `${elm.attr("data-run")}%` });
                });
            })



            // Right
            let tags_genres = [...inf.tags, ...inf.genres];

            for (const tg of tags_genres) {
                const newItem = saved.getSaved("tags")(tg);
                $(".all_genres_tags").append(newItem);
            }

            $(".title-sprt").css({ opacity: 0, marginLeft: "200px" }).animate({ opacity: 1, marginLeft: 0 }, 500);
            $(".all_genres_tags").css({ opacity: 0, marginLeft: "200px" }).animate({ opacity: 1, marginLeft: 0 }, 600, async () => {

            });
            generate_Tags($(".all_genres_tags"));

            // dcp
            $bg.find(".about_art").html(inf.extract ? inf.extract : inf.description).css({ opacity: 0, marginLeft: "300px" }).animate({ opacity: 1, marginLeft: 0 }, 750);


            $bg.find(".info_devs_publisher").css({ opacity: 0, marginLeft: "200px" }).animate({ opacity: 1, marginLeft: 0 }, 700, async () => {
                let tags_genres = inf.platforms;
                generate_html(tags_genres, $bg.find("#platforms"), (item) => {
                    return ` <span>${item.platform.name}</span> `;
                });

                let tags_developers = inf.developers;
                generate_html(tags_developers, $bg.find("#developers"), (item) => {
                    return ` <span>${item.name}</span> `;
                });

                let tags_publisher = inf.publishers;
                generate_html(tags_publisher, $bg.find("#publisher"), (item) => {
                    return ` <span>${item.name}</span> `;
                });

            });

            // requisitos
            let getRequisitos = saved._searchv2(inf.platforms, "platform.slug", "pc");

            if (Object.keys(getRequisitos[0].requirements).length > 0) {
                const minimos = getRequisitos[0].requirements.minimum ? getRequisitos[0].requirements.minimum : false;
                const recommended = getRequisitos[0].requirements.recommended ? getRequisitos[0].requirements.recommended : false;
                $bg.find(".requi_minimos").html(minimos);
                $bg.find(".requi_reco").html(recommended);

                $bg.find(".requisitos_art").css({ opacity: 0, marginLeft: "300px" }).animate({ opacity: 1, marginLeft: 0 }, 750);
            } else {
                $bg.find(".requi_view").remove();
            }



            $('.pre-line-js').each(function () {
                $(this).text($(this).text().trim());
            });



        });
    }

    const randomBG = async () => {
        // BG Random
        const tobanner = getRandomObject(articles);
        const dataran = tobanner();
        // data games
        let inf = await getinfo(dataran.name);
        // get img
        let img = getIMGLocal(inf.slug);
        // Set BG
        $(".bg_load").css({ opacity: 0, backgroundImage: 'url(' + img.image + ')' }).animate({ opacity: 1 }, 600);
    };

    const pageGames = kit.existsElm(".page-games");
    if (pageGames) {
        await randomBG();

        kit.createInterval("bg_random", async () => {
            await randomBG();
        }, 1000 * 10)

        // Agregar un event listener al evento "focus"
        window.addEventListener("focus", function () {
            kit.createInterval("bg_random", async () => {
                await randomBG();
            }, 1000 * 10)
        });

        // Agregar un event listener al evento "blur" (opcional)
        window.addEventListener("blur", function () {
            kit.removeInterval("bg_random");
        });

        const all_tags_list = async () => {
            let alltags_games = [];
            const promises = [];

            for (let i = 0; i < articles.length; i++) {
                promises.push(
                    (async () => {
                        const elmst = articles[i];
                        let { tags, genres } = await getinfo(elmst.name);
                        alltags_games = [...alltags_games, ...tags, ...genres];
                    })()
                );
            }

            await Promise.all(promises);
            return saved.deleteDuplicate(alltags_games, "slug");
        }

        // list
        let all_tags_sl = await all_tags_list();
        all_tags_sl.sort((a, b) => a.name.localeCompare(b.name));

        // Tags
        const scrollTags = document.querySelector("#tags-scroll-infinite");
        const elmTags = document.querySelector("#tags-scroll-infinite");
        new InfiniteScroll(scrollTags, all_tags_sl, 20, elmTags, async (data, i) => {

            return `<li><a href="?tag=${data.slug.replace(/\s+/g, "-").replace(/ñ/g, "-ene-").toLowerCase()}" class="text-resize">${data.name}</a></li>`;

        });


        const getall_games = async ({ column = "name", order = false }) => {
            let all_games = [];

            const elm = async (articles, i) => {
                const elmst = articles[i];
                let { name, slug, tags, genres, released = false, background_image, background_image_additional } = await getinfo(elmst.name);
                all_games.push({ ...elmst, name, slug, tags: [...tags, ...genres], released, background_image, background_image_additional });
            }

            if (order == "desc") {
                for (let i = articles.length - 1; i >= 0; i--) {
                    await elm(articles, i);
                }
            } else if (order == "a-z") {
                // Ordenar alfabéticamente por el nombre
                articles.sort((a, b) => a[column].localeCompare(b[column]));

                for (let i = 0; i < articles.length; i++) {
                    await elm(articles, i);
                }
            } else {
                for (let i = 0; i < articles.length; i++) {
                    await elm(articles, i);
                }
            }

            // verificar si hay tags seleccionados
            let querys = kit.query();
            let tagResults = [];
            const getTags = all_games.filter((elmst) => {
                if (querys.tag) {
                    let search_tag = saved._search(elmst.tags, "slug", querys.tag);
                    if (search_tag.length > 0) {
                        tagResults.push(elmst);
                        return true; // Devolver verdadero si se encuentra una etiqueta coincidente
                    }

                }
                return false; // Devolver falso si no hay coincidencia o no se especificó una etiqueta
            });
            if (getTags.length > 0) {
                all_games = getTags;
                // Title Page
                $("title").html($("title").html() + " - " + r(querys.tag));
            }
            // Esperar a que todas las promesas se resuelvan antes de devolver el resultado
            return Promise.all(all_games);
        }

        const customConfig = {
            customCSS: {
                opacity: 0,
                marginLeft: '-20px',
            },
            before: {
                opacity: 0,
                marginLeft: '-20px',
            },
            after: {
                opacity: 1,
                marginLeft: '0',
            },
        };

        let lita_de_juegos = await getall_games({ column: "name", order: "desc" });

        const renderPageData = async (list, $elm) => {
            // clear
            // $elm.empty();

            // add
            renderItems($elm, customConfig, () => {
                loadElms(list, $elm, customConfig, (item) => {
                    let img = getIMGLocal(item.slug);
                    let isrecent = false;
                    if (item.released) {
                        isrecent = isRec(item.released, "-", 6)
                    }
                    return `
                    <div class="gm-col">
                    <div class="item" style="background-image: url('${img.image}');">
                        ${isrecent ? `<span class="recentpost"><span>Estreno</span></span>` : ""}
                        <div class="footer-item">
                        <div class="name-item-gm" onclick="href('/watch?q=${item.ref}')">${item.name}</div>
                        </div>
                    </div>
                    </div>
                    `
                });
            });

        };

        $('#pagination-home').pagination({
            dataSource: lita_de_juegos,
            pageSize: 15,
            callback: async function (data, pagination) {
                await renderPageData(data, $("#games-show"));
            }
        });

        // // cargar tags
        // let alltags_games = [];
        // let numexe = 0;
        // const resultados = articles.filter(async (elmst) => {
        //     // data games
        //     let { tags, genres } = await getinfo(elmst.name);
        //     alltags_games = [...alltags_games, ...tags, ...genres];
        //     numexe++;

        //     if (articles.length == numexe) {
        //         return alltags_games;
        //     }
        // });

        // console.log(resultados);
    }

    // Menu Left
    kit.addEvent('.open-menu-left', 'click', (e) => {


        kit.qsSelector(false, e.target.dataset.menu, (e) => {
            const veryClass = kit.hasClass(".menu-left", "menu-left-active");

            if (!veryClass) {
                e.style.left = 0;
                e.classList.add("menu-left-active");
            } else {
                e.style.left = -e.offsetWidth + "px";
                e.classList.remove("menu-left-active");
            }

        });




    });

    kit.addEvent('.menu-left', 'click', (e) => {
        const menu = e.currentTarget;
        const menuWidth = menu.offsetWidth;
        const menuHeight = menu.offsetHeight;

        const menuRect = menu.getBoundingClientRect();

        const clickX = e.clientX - menuRect.left;
        const clickY = e.clientY - menuRect.top;

        if (clickX >= 0 && clickX <= menuWidth && clickY >= 0 && clickY <= menuHeight) {
        } else {
            menu.classList.remove('menu-left-active');
            menu.style.left = -menuWidth + "px";
        }
    });


    // Agrega un event listener al evento beforeunload para guardar el valor antes de cambiar de página
    window.addEventListener('beforeunload', function () {
        const inputField = document.getElementById('search-page');
        if (inputField) {
            const texto = inputField.value;

            if (texto.trim() !== '') {
                // Guarda el valor en localStorage
                localStorage.setItem('save_search', texto);
            }
        }

    });
})