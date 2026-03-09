import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, push, set, onValue, query, limitToLast } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// 2. PLAN DE 16 SEMANAS
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

// --- FUNCIONES DE CALCULADORA ---
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

// --- FUNCIONES DEL CRONÓMETRO ---
window.ajustarTimer = (s) => { if(!corriendo) { tiempoRestante = Math.max(10, tiempoRestante + s); tiempoTotal = tiempoRestante; actualizarDisplay(); }};
function actualizarDisplay() {
    const m = Math.floor(tiempoRestante / 60);
    const s = tiempoRestante % 60;
    document.getElementById('timerDisplay').innerText = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    const offset = 283 - (283 * tiempoRestante) / tiempoTotal;
    document.getElementById('progresoReloj').style.strokeDashoffset = offset;
}
window.toggleTimer = () => {
    const btn = document.getElementById('btnStartTimer');
    if(corriendo) { clearInterval(timerInterval); btn.innerHTML = '<i class="fas fa-play"></i>'; corriendo = false; }
    else {
        corriendo = true; btn.innerHTML = '<i class="fas fa-pause"></i>';
        timerInterval = setInterval(() => {
            tiempoRestante--; actualizarDisplay();
            if(tiempoRestante <= 0) { 
                clearInterval(timerInterval); corriendo = false; btn.innerHTML = '<i class="fas fa-play"></i>';
                if("vibrate" in navigator) navigator.vibrate([1000, 200, 1000]);
                alert("¡Tiempo Cumplido!"); tiempoRestante = tiempoTotal; actualizarDisplay();
            }
        }, 1000);
    }
};

// --- GESTIÓN DE RUTINA ---
window.cambiarSemana = (n) => { semanaActual = n; progresoMemoria = {"fuerza":{}, "cardio":{}}; window.renderRutina(rutinaTipo); };
window.renderRutina = (tipo) => {
    rutinaTipo = tipo;
    document.getElementById('tabFuerza').classList.toggle('active', tipo === 'fuerza');
    document.getElementById('tabCardio').classList.toggle('active', tipo === 'cardio');
    const lista = document.getElementById('listaEjercicios');
    if (!lista) return;
    const ejercicios = plan16Semanas[semanaActual][tipo];
    let html = "";
    ejercicios.forEach(ej => {
        const id = `sem${semanaActual}_${tipo}_${ej}`;
        const check = (progresoMemoria[tipo] && progresoMemoria[tipo][id]) ? "checked" : "";
        html += `<div class="ejercicio-row"><label>${ej}</label><input type="checkbox" onclick="window.toggleEj('${tipo}','${id}')" ${check}></div>`;
    });
    lista.innerHTML = html; actualizarBarra();
};
window.toggleEj = (t, id) => { 
    if(!progresoMemoria[t]) progresoMemoria[t] = {};
    progresoMemoria[t][id] = !progresoMemoria[t][id]; 
    actualizarBarra(); 
};
function actualizarBarra() {
    const ejercicios = plan16Semanas[semanaActual][rutinaTipo];
    const total = ejercicios.length;
    const marcados = Object.values(progresoMemoria[rutinaTipo] || {}).filter(v => v).length;
    const porc = Math.round((marcados / total) * 100);
    document.getElementById('barraRelleno').style.width = porc + "%";
    document.getElementById('porcentajeProgreso').innerText = porc + "%";
}

// --- HIDRATACIÓN Y GUARDADO ---
window.sumarAgua = () => { litrosAgua = parseFloat((litrosAgua + 0.25).toFixed(2)); document.getElementById('aguaContador').innerText = `${litrosAgua} L`; };

async function guardarTodo() {
    const user = auth.currentUser;
    if(!user) return alert("Debe iniciar sesión para guardar");

    const peso = document.getElementById('peso').value;
    const imc = document.getElementById('imcBadge').innerText;
    if(!peso) return alert("Cargá el peso antes de finalizar");

    // Guardar en la carpeta específica del usuario
    const nuevoRef = push(ref(db, `usuarios/${user.uid}/historial`));
    set(nuevoRef, { peso, imc, agua: litrosAgua, semana: semanaActual, fecha: Date.now() })
    .then(() => {
        fetch('/api/notificar', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ peso, imc, semana: semanaActual, agua: litrosAgua })
        }).then(() => alert("¡Datos guardados y reporte enviado!"));
    });
}

function cargarHistorial(uid) {
    const historialRef = query(ref(db, `usuarios/${uid}/historial`), limitToLast(5));
    onValue(historialRef, (snapshot) => {
        const data = snapshot.val();
        let html = "";
        if (data) {
            const registros = Object.values(data).sort((a, b) => b.fecha - a.fecha);
            registros.forEach(d => {
                html += `<div class="historial-item"><span>${d.peso}kg</span><span>IMC: ${d.imc}</span></div>`;
            });
            document.getElementById('alertaRegistro').style.display = "none";
        } else {
            document.getElementById('alertaRegistro').style.display = "block";
        }
        document.getElementById('listaHistorial').innerHTML = html || "<p>Sin registros aún</p>";
    });
}

// --- INICIALIZACIÓN Y SEGURIDAD ---
document.addEventListener('DOMContentLoaded', () => {
    ['peso','altura','edad','sexo','actividad','intensidadDeficit'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', calcularMetricas);
    });

    document.getElementById('btnGuardar').onclick = guardarTodo;

    const btnL = document.getElementById('btnLogout');
    if(btnL) {
        btnL.onclick = async () => {
            if(confirm("¿Poner sistema en STANDBY?")) {
                try {
                    await signOut(auth);
                    window.location.href = "/logout";
                } catch (e) { console.error("Error al salir:", e); }
            }
        };
    }

    onAuthStateChanged(auth, (user) => {
        if(user) { 
            console.log("Sesión activa:", user.email);
            cargarHistorial(user.uid);
            window.renderRutina('fuerza');
        } else { 
            if (window.location.pathname !== "/login") {
                window.location.href = "/login";
            }
        }
    });
});