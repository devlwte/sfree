const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require("path")

// UtilCode
const utilcode = require(path.join(__dirname, "../../", "app", "modules/utilcodes"));

// port app
const port = window.location.port;

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



async function descargarArchivoConProgreso(url, idprogress, callback) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await fetch(url, { timeout: 10000 }); // Realiza la solicitud

            if (response.ok) {
                const blob = await response.blob();
                const totalSize = blob.size;
                let receivedSize = 0;

                const reader = blob.stream().getReader();
                const chunks = [];

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        console.log('Descarga completada');
                        break;
                    }

                    receivedSize += value.byteLength;
                    const progreso = (receivedSize / totalSize);
                    const tolerance = 0.0001;
                    let progress_dw = Math.abs(progreso - 1) < tolerance ? parseInt(1.0) : progreso.toFixed(2);

                    var circle = cacheapp.newProgressBar(idprogress, ".bg_progress", "Line", {
                        color: "#fff",
                        trailColor: "transparent",
                        trailWidth: 10,
                        strokeWidth: 1.6
                    });

                    circle.animate(progress_dw, {
                        duration: (1000 * 1.5),
                    })

                    // Almacena los chunks para reensamblar los datos si es necesario
                    chunks.push(value);
                }

                // Reensambla los chunks en un blob completo
                const datosBlob = new Blob(chunks);

                if (callback) {
                    callback(idprogress, circle);
                }

                // Obtén los datos como texto
                const datosComoTexto = await datosBlob.text();
                if (
                    /^[\],:{}\s]*$/.test(
                        datosComoTexto
                            .replace(/\\["\\\/bfnrtu]/g, "@")
                            .replace(
                                /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,
                                "]"
                            )
                            .replace(/(?:^|:|,)(?:\s*\[)+/g, "")
                    )
                ) {
                    resolve(JSON.parse(datosComoTexto));
                }


                // O bien, obtén los datos como ArrayBuffer si lo prefieres
                // const arrayBuffer = await datosBlob.arrayBuffer();

            } else {
                console.error('Error al realizar la solicitud:', response.status, response.statusText);
                reject(false);
            }
        } catch (error) {
            console.error('Error de red:', error);
            reject(false);
        }
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


kit.onDOMReady(async () => {
    // All folders
    const folders = await sendMessage("all-folders");
    saved.addSaved("folders", folders);
    console.log(folders);

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
        return `<li><a href="#">${item.name}</a></li>`;
    });

    saved.addSaved("recent", async (item) => {
        // data games
        let inf = await getinfo(item.name);
        // get img
        let img = await getIMG(inf.background_image ? inf.background_image : inf.background_image_additional ? inf.background_image_additional : false, inf.slug);
        return `
                <li>
                    <div class="img_rec" style="background-image: url(${img.img});"></div>
                    <div class="data_art">
                    <div class="name_art">${item.name}</div>
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
        let img = await getIMG(inf.background_image ? inf.background_image : inf.background_image_additional ? inf.background_image_additional : false, inf.slug);
        return `
                <div class="columns-col">
                    <div class="item" style="background-image: url(${img.img});">
                    ${isrecent ? `<span class="recentpost"><span>Estreno</span></span>` : ""}
                    </div>
                    <div class="item-name">${inf.name}</div>
                </div>
        `;
    });

    const recent = async (arrays, $artAll, tmplet = false, css, total = 12) => {
        let template = tmplet ? tmplet : saved.getSaved("recent");

        let animationDelay = 0;

        const elementosAImprimir = total; // Número de elementos a imprimir
        const startIndex = arrays.length >= elementosAImprimir ? arrays.length - elementosAImprimir : 0;

        for (let i = arrays.length - 1; i >= startIndex; i--) {
            const item = arrays[i];
            const newItem = await template(item);

            const before = css ? css.before : { opacity: 0, marginTop: '-30px', overflow: "hidden", display: "inline-block" };
            const after = css ? css.after : { opacity: 1, marginTop: '0', overflow: "hidden", display: "inline-block" };

            const $newItem = $(newItem)
                .css(before)
                .animate(after, 500);

            $artAll.append($newItem);
            animationDelay += 100;
        }
    };


    const createtags = (array) => {
        let template = saved.getSaved("tags");
        let totalnum = (array.length > 5 ? 5 : array.length);
        let html = "";
        for (let i = 0; i < totalnum; i++) {
            const element = array[i];

            html += template(element);

        }

        return html;
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
        let img = await getIMG(inf.background_image ? inf.background_image : inf.background_image_additional ? inf.background_image_additional : false, inf.slug);
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
        banner.style = `background-image: url(${img.img});`;

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
            let inf = await getinfo(interests.name);
            copia.push(inf);
        }

        let result_compare = [];

        for (let a = 0; a < interests_file.interests.length; a++) {
            const getints = interests_file.interests[a];
            let buscar = saved._search_(copia, "tags", "slug", getints)
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
})