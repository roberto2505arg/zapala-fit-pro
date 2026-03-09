import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, push, set, onValue, query, limitToLast, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 1. CONFIGURACIÓN FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyCNvIkCnzAX8rXQTXOW_N7pYkn9yxOv4HM",
    authDomain: "app-ejercicio-841f1.firebaseapp.com",
    databaseURL: "https://app-ejercicio-841f1-default-rtdb.firebaseio.com", 
    projectId: "app-ejercicio-841f1",
    storageBucket: "app-ejercicio-841f1.firebasestorage.app",
    messagingSenderId: "956933867402",
    appId: "1:956933867402:web:beb2c28e9f7104e8a32a73"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// 2. PLAN TÁCTICO DE 16 SEMANAS
const plan16Semanas = {
    1: { fuerza: ["Sentadillas", "Flexiones", "Estocadas", "Plancha"], cardio: ["Caminata 40 min"] },
    2: { fuerza: ["Sentadillas", "Flexiones", "Estocadas", "Plancha Abdominal"], cardio: ["Caminata 40 min"] },
    3: { fuerza: ["Sentadillas c/peso", "Flexiones Diamante", "Estocadas", "Plancha Lateral"], cardio: ["Caminata 45 min"] },
    4: { fuerza: ["Sentadillas c/peso", "Flexiones Diamante", "Estocadas", "Plancha Lateral"], cardio: ["Caminata 45 min"] },
    5: { fuerza: ["Sentadillas Búlgaras", "Flexiones Arqueras", "Puente Glúteo", "Burpees"], cardio: ["Caminata 50 min"] },
    6: { fuerza: ["Sentadillas Búlgaras", "Flexiones Arqueras", "Puente Glúteo", "Burpees"], cardio: ["Caminata 50 min"] },
    7: { fuerza: ["Sentadillas Salto", "Flexiones Declinadas", "Estocada Lateral", "Escaladores"], cardio: ["Caminata 55 min"] },
    8: { fuerza: ["Sentadilla Salto", "Flexiones Declinadas", "Estocada Lateral", "Escaladores"], cardio: ["Caminata 55 min"] },
    9: { fuerza: ["Zancadas con Salto", "Flexiones Explosivas", "Plancha Dinámica", "V-Ups"], cardio: ["Caminata 60 min"] },
    10: { fuerza: ["Zancadas con Salto", "Flexiones Explosivas", "Plancha Dinámica", "V-Ups"], cardio: ["Caminata 60 min"] },
    11: { fuerza: ["Pistol Squats (asist)", "Flexiones en Pica", "Superman", "Mountain Climbers"], cardio: ["Caminata 65 min"] },
    12: { fuerza: ["Pistol Squats (asist)", "Flexiones en Pica", "Superman", "Mountain Climbers"], cardio: ["Caminata 65 min"] },
    13: { fuerza: ["Sentadilla Isométrica", "Flex. Tríceps", "Burpees", "Toque Hombros"], cardio: ["Caminata 70 min"] },
    14: { fuerza: ["Sentadilla Isométrica", "Flex. Tríceps", "Burpees", "Toque Hombros"], cardio: ["Caminata 70 min"] },
    15: { fuerza: ["Circuito Total", "Burpees Max", "Plancha 2 min"], cardio: ["Caminata 75 min"] },
    16: { fuerza: ["Circuito Final Eva", "Máximas Reps", "Plancha al fallo"], cardio: ["Caminata 80 min"] }
};

// VARIABLES DE ESTADO
let semanaActual = 1;
let rutinaTipo = "fuerza";
let progresoMemoria = { "fuerza": {}, "cardio": {} };
let litrosAgua = 0;
let timerInterval, tiempoRestante = 30, tiempoTotal = 30, corriendo = false;

// --- CALCULADORA ---
function calcularMetricas() {
    const peso = parseFloat(document.getElementById('peso').value) || 0;
    const altura = parseFloat(document.getElementById('altura').value) || 0;
    const edad = parseInt(document.getElementById('edad').value) || 42;
    const sexo = document.getElementById('sexo').value;
    const actividad = parseFloat(document.getElementById('actividad').value);
    const intensidad = parseFloat(document.getElementById('intensidadDeficit').value);

    if (peso > 0 && altura > 0) {
        const imc = (peso / ((altura / 100) ** 2)).toFixed(1);
        document.getElementById('imcBadge').innerText = imc;
        let tmb = (sexo === "H") ? (10 * peso) + (6.25 * altura) - (5 * edad) + 5 : (10 * peso) + (6.25 * altura) - (5 * edad) - 161;
        const mantenimiento = Math.round(tmb * actividad);
        const objetivo = Math.round(mantenimiento * (1 - intensidad));
        document.getElementById('calObj').innerText = `${objetivo} kcal`;
    }
}

// --- HISTORIAL VISUAL ---
function cargarHistorial(uid) {
    const historialRef = query(ref(db, `usuarios/${uid}/historial`), limitToLast(10));
    onValue(historialRef, (snapshot) => {
        const lista = document.getElementById('listaHistorial');
        if (!lista) return;
        let html = "";
        if (snapshot.exists()) {
            const regs = [];
            snapshot.forEach(c => regs.push(c.val()));
            regs.reverse().forEach(r => {
                const f = new Date(r.fecha).toLocaleDateString();
                html += `<div class="hist-row" style="display:flex; justify-content:space-between; border-bottom:1px solid #333; padding:5px;">
                            <span>${f}</span><b>${r.peso}kg</b><small>Sem ${r.semana}</small>
                         </div>`;
            });
        } else { html = "<p>Sin registros aún.</p>"; }
        lista.innerHTML = html;
    });
}

// --- GUARDADO ESTRICTO (BLOQUEO SI NO COMPLETA TODO) ---
async function guardarTodo() {
    const user = auth.currentUser;
    if(!user) return;

    // VALIDACIÓN: ¿Están todos los checks de AMBOS tipos?
    const ejsFuerza = plan16Semanas[semanaActual].fuerza;
    const ejsCardio = plan16Semanas[semanaActual].cardio;
    
    const hechosFuerza = Object.values(progresoMemoria.fuerza || {}).filter(v => v).length;
    const hechosCardio = Object.values(progresoMemoria.cardio || {}).filter(v => v).length;

    if (hechosFuerza < ejsFuerza.length || hechosCardio < ejsCardio.length) {
        alert("⚠️ OBJETIVOS INCOMPLETOS\nDebes terminar todos los ejercicios de FUERZA y CARDIO para avanzar.");
        return; 
    }

    // SI COMPLETO TODO, PROCEDE AL PESAJE
    const hRef = query(ref(db, `usuarios/${user.uid}/historial`), limitToLast(1));
    get(hRef).then(async (snap) => {
        let uPeso = 0, uFecha = 0;
        snap.forEach(c => { uPeso = c.val().peso; uFecha = c.val().fecha; });

        const hoy = Date.now();
        let pesoFinal = uPeso;

        if (!uFecha || (hoy - uFecha > (7 * 24 * 60 * 60 * 1000))) {
            const nPeso = prompt("🛡️ REGISTRO SEMANAL: Ingresá tu peso actual para cerrar la etapa:", uPeso || "");
            if (nPeso && !isNaN(nPeso)) { pesoFinal = parseFloat(nPeso); }
            else { alert("Peso requerido."); return; }
        }

        const imc = document.getElementById('imcBadge').innerText;
        await set(push(ref(db, `usuarios/${user.uid}/historial`)), {
            peso: pesoFinal, imc, agua: litrosAgua, semana: semanaActual, fecha: hoy, status: "COMPLETO"
        });

        alert("¡EXCELENTE! Semana " + semanaActual + " completada al 100%.");
        if(semanaActual < 16) { 
            semanaActual++; 
            window.cambiarSemana(semanaActual); 
            progresoMemoria = { "fuerza": {}, "cardio": {} }; // Resetea para la nueva semana
        }
    });
}

// --- BORRAR HISTORIAL ---
async function borrarHistorial() {
    const user = auth.currentUser;
    if(user && confirm("¿Borrar todo tu progreso?") && prompt("Escribe BORRAR") === "BORRAR") {
        await set(ref(db, `usuarios/${user.uid}/historial`), null);
        location.reload();
    }
}

// --- CRONÓMETRO ---
window.ajustarTimer = (s) => { if(!corriendo) { tiempoRestante = Math.max(10, tiempoRestante + s); tiempoTotal = tiempoRestante; actualizarDisplay(); }};
function actualizarDisplay() {
    const m = Math.floor(tiempoRestante / 60), s = tiempoRestante % 60;
    document.getElementById('timerDisplay').innerText = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    document.getElementById('progresoReloj').style.strokeDashoffset = 283 - (283 * tiempoRestante) / tiempoTotal;
}
window.toggleTimer = () => {
    const btn = document.getElementById('btnStartTimer');
    if(corriendo) { clearInterval(timerInterval); btn.innerHTML = '<i class="fas fa-play"></i>'; corriendo = false; }
    else {
        corriendo = true; btn.innerHTML = '<i class="fas fa-pause"></i>';
        timerInterval = setInterval(() => {
            tiempoRestante--; actualizarDisplay();
            if(tiempoRestante <= 0) { 
                clearInterval(timerInterval); alert("¡Descanso terminado!"); 
                tiempoRestante = tiempoTotal; corriendo = false; btn.innerHTML = '<i class="fas fa-play"></i>';
                actualizarDisplay();
            }
        }, 1000);
    }
};

// --- RUTINAS ---
window.cambiarSemana = (n) => { 
    semanaActual = n; 
    document.getElementById('semanaDisplay').innerText = "SEMANA " + n;
    window.renderRutina(rutinaTipo); 
};

window.renderRutina = (tipo) => {
    rutinaTipo = tipo;
    const lista = document.getElementById('listaEjercicios');
    const ejs = plan16Semanas[semanaActual][tipo];
    
    // Cambia la clase activa en los botones
    document.querySelectorAll('.btn-tipo').forEach(b => b.classList.remove('active'));
    event?.target?.classList?.add('active');

    lista.innerHTML = ejs.map(ej => {
        const id = `sem${semanaActual}_${tipo}_${ej}`;
        const check = (progresoMemoria[tipo] && progresoMemoria[tipo][id]) ? "checked" : "";
        return `<div class="ejercicio-row" style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span>${ej}</span>
                    <input type="checkbox" onclick="window.toggleEj('${tipo}','${ej}')" ${check}>
                </div>`;
    }).join('');
    window.updateBar();
};

window.toggleEj = (tipo, ejNombre) => {
    const id = `sem${semanaActual}_${tipo}_${ejNombre}`;
    if (!progresoMemoria[tipo]) progresoMemoria[tipo] = {};
    progresoMemoria[tipo][id] = !progresoMemoria[tipo][id];
    window.updateBar();
};

window.updateBar = () => {
    const totalEjs = plan16Semanas[semanaActual][rutinaTipo].length;
    const marcados = Object.values(progresoMemoria[rutinaTipo] || {}).filter(v => v).length;
    const p = Math.round((marcados/totalEjs)*100) || 0;
    document.getElementById('barraRelleno').style.width = p + "%";
    document.getElementById('porcentajeProgreso').innerText = p + "%";
};

// --- AGUA ---
window.sumarAgua = () => { litrosAgua += 0.25; document.getElementById('aguaContador').innerText = litrosAgua.toFixed(2) + " L"; };

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    ['peso','altura','edad','sexo','actividad','intensidadDeficit'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', calcularMetricas);
    });

    document.getElementById('btnGuardar').onclick = guardarTodo;
    document.getElementById('btnBorrarTodo').onclick = borrarHistorial;
    document.getElementById('btnLogout').onclick = () => signOut(auth).then(() => window.location.href="/logout");

    onAuthStateChanged(auth, (user) => {
        if(user) {
            document.getElementById('userDisplay').innerText = "OPERATIVO: " + user.email.split('@')[0].toUpperCase();
            cargarHistorial(user.uid);
            
            // Cargar datos del último registro
            get(query(ref(db, `usuarios/${user.uid}/historial`), limitToLast(1))).then(s => {
                s.forEach(c => {
                    const data = c.val();
                    document.getElementById('peso').value = data.peso;
                    semanaActual = data.semana || 1;
                    window.cambiarSemana(semanaActual);
                    calcularMetricas();
                });
            });
            window.renderRutina('fuerza');
        } else { 
            if (window.location.pathname !== "/login") window.location.href = "/login";
        }
    });
});
