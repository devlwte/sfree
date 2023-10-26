const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require("path")

// UtilCode
const utilcode = require(path.join(__dirname, "../../", "app", "modules/utilcodes"))


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


// Rnadom Object
function randomArray(array) {
    var random = Math.floor(Math.random() * array.length);
    return array[random];
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
                reject(new Error(`Error al realizar la solicitud: ${response.status} ${response.statusText}`));
            }
        } catch (error) {
            console.error('Error de red:', error);
            reject(error);
        }
    });
}


kit.onDOMReady(async () => {
    // All folders
    const folders = await sendMessage("all-folders");
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
                    await deleteTextElmAsync({ selector: ".text-insert", intervalo: 50, writing: true });
                    // Iniciar descarga
                    await insertTextElmAsync({
                        selector: ".text-insert",
                        newText: "'games.json'",
                        writing: "isStop",
                        callback: async function () {

                            // show progress
                            kit.show(".download_data", 500, "block");
                            await delay(3000);
                            try {
                                const url = '/games.json'; // Reemplaza con la URL de tu archivo
                                const datosDescargados = await descargarArchivoConProgreso(url, "gamesjson", async (id, circle) => {
                                    await delay(3000);
                                    kit.hide(".download_data", 500);
                                    circle.destroy();
                                    cacheapp.newProgressBar("delete", id);

                                });
                                await utilcode.fsWrite(path.join(folders.userData, "apps", "sfree", "json", "db", "db.json"), JSON.stringify(datosDescargados, null, 2));

                                // Haz lo que necesites con los datos descargados, por ejemplo:

                            } catch (error) {
                                console.error('Error en la descarga:', error);
                            }
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

        return;
    }
    // Page Home

    var objetos = [
        { nombre: 'Text 1', valor: 50 },
        { nombre: 'Text 2', valor: 51 },
        { nombre: 'Text 3', valor: 52 },
        { nombre: 'Text 4', valor: 53 },
        { nombre: 'Text 5', valor: 54 },
        { nombre: 'Text 6', valor: 55 },
        { nombre: 'Text 7', valor: 56 },
        { nombre: 'Text 8', valor: 57 },
        { nombre: 'Text 9', valor: 58 },
        { nombre: 'Text 10', valor: 59 },
        { nombre: 'Text 11', valor: 60 }
    ];
    console.log(randomArray(objetos));

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