import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, push, set, onValue, query, limitToLast, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 1. CONFIGURACIÓN FIREBASE (Mantenemos tus credenciales)
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

// --- LOGICA DE GUARDADO INTELIGENTE (PESO SEMANAL + AVANCE) ---
async function guardarTodo() {
    const user = auth.currentUser;
    if(!user) return alert("Inicie sesión para guardar.");

    // Verificamos el último peso en la base de datos
    const historialRef = query(ref(db, `usuarios/${user.uid}/historial`), limitToLast(1));
    
    get(historialRef).then(async (snapshot) => {
        let ultimoPeso = 0;
        let ultimaFecha = 0;
        
        snapshot.forEach((child) => {
            ultimoPeso = parseFloat(child.val().peso);
            ultimaFecha = child.val().fecha;
        });

        const hoy = Date.now();
        const unaSemanaMs = 7 * 24 * 60 * 60 * 1000;
        let pesoFinal = ultimoPeso;

        // Si es la primera vez o pasaron 7 días, pedimos peso
        if (!ultimaFecha || (hoy - ultimaFecha > unaSemanaMs)) {
            const nuevoPeso = prompt("🛡️ ZAPALA FIT: Día de Pesaje. Ingresá tu peso actual (kg):", ultimoPeso || "");
            if (nuevoPeso && !isNaN(nuevoPeso)) {
                pesoFinal = parseFloat(nuevoPeso);
                document.getElementById('peso').value = pesoFinal;
                calcularMetricas();
            } else {
                alert("Control de peso requerido para avanzar.");
                return;
            }
        }

        // Guardamos progreso
        const imc = document.getElementById('imcBadge').innerText;
        const nuevaEntradaRef = push(ref(db, `usuarios/${user.uid}/historial`));
        
        await set(nuevaEntradaRef, {
            peso: pesoFinal,
            imc: imc,
            agua: litrosAgua,
            semana: semanaActual,
            fecha: hoy,
            completado: true
        });

        // Notificar al servidor Python para el mail
        fetch('/api/notificar', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ peso: pesoFinal, imc, semana: semanaActual, agua: litrosAgua })
        });

        festejarYAvance();
    });
}

function festejarYAvance() {
    // 1. Mensaje Motivador
    alert("¡MISIÓN CUMPLIDA! 💪\nEntrenamiento registrado correctamente.\n\nPreparando objetivos para la siguiente etapa...");
    
    // 2. Avance de semana automático
    if (semanaActual < 16) {
        semanaActual++;
        window.cambiarSemana(semanaActual);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// --- CRONÓMETRO ---
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
                alert("¡Descanso terminado!"); tiempoRestante = tiempoTotal; actualizarDisplay();
            }
        }, 1000);
    }
};

// --- RUTINAS ---
window.cambiarSemana = (n) => { 
    semanaActual = n; 
    document.getElementById('semanaDisplay').innerText = "SEMANA " + n;
    progresoMemoria = {"fuerza":{}, "cardio":{}}; 
    window.renderRutina(rutinaTipo); 
};

window.renderRutina = (tipo) => {
    rutinaTipo = tipo;
    const lista = document.getElementById('listaEjercicios');
    if (!lista) return;
    const ejercicios = plan16Semanas[semanaActual][tipo];
    let html = "";
    ejercicios.forEach(ej => {
        const id = `sem${semanaActual}_${tipo}_${ej}`;
        const check = (progresoMemoria[tipo] && progresoMemoria[tipo][id]) ? "checked" : "";
        html += `<div class="ejercicio-row"><label>${ej}</label><input type="checkbox" onclick="window.toggleEj('${tipo}','${id}')" ${check}></div>`;
    });
    lista.innerHTML = html;
    actualizarBarra();
};

window.toggleEj = (t, id) => { 
    if(!progresoMemoria[t]) progresoMemoria[t] = {};
    progresoMemoria[t][id] = !progresoMemoria[t][id]; 
    actualizarBarra(); 
};

function actualizarBarra() {
    const ejercicios = plan16Semanas[semanaActual][rutinaTipo];
    const marcados = Object.values(progresoMemoria[rutinaTipo] || {}).filter(v => v).length;
    const porc = Math.round((marcados / ejercicios.length) * 100);
    document.getElementById('barraRelleno').style.width = porc + "%";
    document.getElementById('porcentajeProgreso').innerText = porc + "%";
}

// --- HIDRATACIÓN ---
window.sumarAgua = () => { litrosAgua = parseFloat((litrosAgua + 0.25).toFixed(2)); document.getElementById('aguaContador').innerText = `${litrosAgua} L`; };

// --- INICIALIZACIÓN ---
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
                await signOut(auth);
                window.location.href = "/logout";
            }
        };
    }

onAuthStateChanged(auth, (user) => {
    if(user) { 
        console.log("Usuario detectado:", user.email);
        
        // 1. Cargamos el historial visual
        cargarHistorial(user.uid);
        
        // 2. Traemos el último peso para la calculadora
        const hRef = query(ref(db, `usuarios/${user.uid}/historial`), limitToLast(1));
        get(hRef).then((snap) => {
            snap.forEach(c => { 
                const ultimo = c.val();
                document.getElementById('peso').value = ultimo.peso;
                semanaActual = ultimo.semana || 1; // Recupera en qué semana se quedó
                document.getElementById('semanaDisplay').innerText = "SEMANA " + semanaActual;
                calcularMetricas();
            });
            window.renderRutina('fuerza');
        });

    } else { 
        if (window.location.pathname !== "/login") window.location.href = "/login";
    }
});
function cargarHistorial(uid) {
    console.log("Cargando historial para:", uid);
    const historialRef = query(ref(db, `usuarios/${uid}/historial`), limitToLast(10));
    
    onValue(historialRef, (snapshot) => {
        const lista = document.getElementById('listaHistorial');
        if (!lista) return;

        let html = "";
        if (snapshot.exists()) {
            const registros = [];
            snapshot.forEach((child) => {
                registros.push(child.val());
            });
            
            // Los ordenamos para que el más nuevo aparezca arriba
            registros.reverse().forEach(reg => {
                const fechaHumana = new Date(reg.fecha).toLocaleDateString();
                html += `
                    <div class="historial-item" style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #333;">
                        <span style="color:#2ecc71; font-weight:bold;">${reg.peso} kg</span>
                        <span style="color:#888;">${fechaHumana}</span>
                        <span style="color:#fff; font-size:0.8rem;">Semana ${reg.semana}</span>
                    </div>`;
            });
            // Ocultamos el mensaje de "Sin registros" si hay datos
            const alerta = document.getElementById('alertaRegistro');
            if(alerta) alerta.style.display = "none";
        } else {
            html = "<p style='color:#666; padding:10px;'>Aún no hay registros de entrenamiento.</p>";
        }
        lista.innerHTML = html;
    });
}
