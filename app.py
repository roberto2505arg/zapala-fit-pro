import smtplib
from email.mime.text import MIMEText
from flask import Flask, render_template, request, jsonify, redirect, url_for, session
import os

app = Flask(__name__)
# Una clave secreta para que nadie pueda hackear tu sesión de Zapala
app.secret_key = 'zapala_seguro_2026_fit'

# --- CONFIGURACIÓN DE CORREO ---
MAIL_EMISOR = "comprovendoneuquen@gmail.com" 
MAIL_PASSWORD = "crdw zxaj qnln mixr" 
MAIL_DESTINO = "comprovendoneuquen@gmail"

def enviar_correo_motivador(datos):
    try:
        import random
        frases = [
            "¡Nivel completado! Estás más cerca de la meta que ayer. ⚡",
            "Disciplina mata talento. ¡Excelente sesión! 🔥",
            "En Zapala no se regala nada, y vos te lo ganaste hoy. 💪",
            "Constancia pura. ¡Esa es la mentalidad! 🥊"
        ]
        gran_frase = random.choice(frases)
        contenido = f"""
        🔥 ¡REPORTE DE ACCIÓN: ZAPALA FIT! 🔥
        
        {gran_frase}
        
        DETALLES TÉCNICOS:
        -------------------------------------------
        📍 Etapa: Semana {datos.get('semana')}
        ⚖️ Peso: {datos.get('peso')} kg
        📊 IMC: {datos.get('imc')}
        💧 Hidratación: {datos.get('agua')} L
        -------------------------------------------
        """
        msg = MIMEText(contenido)
        msg['Subject'] = f'🚀 ¡Misión Cumplida! (Semana {datos.get("semana")})'
        msg['From'] = MAIL_EMISOR
        msg['To'] = MAIL_DESTINO

        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(MAIL_EMISOR, MAIL_PASSWORD)
            server.sendmail(MAIL_EMISOR, MAIL_DESTINO, msg.as_string())
        return True
    except:
        return False

# --- RUTAS DE ACCESO ---

@app.route('/')
def index():
    # Si no hay sesión iniciada, rebota al Login
    if not session.get('autenticado'):
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        # Aquí Python crea la sesión "oficial"
        session['autenticado'] = True
        return jsonify({"status": "success"})
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear() # Borra todo rastro del usuario
    return redirect(url_for('login'))

@app.route('/api/notificar', methods=['POST'])
def notificar_progreso():
    if not session.get('autenticado'):
        return jsonify({"error": "No autorizado"}), 401
    datos = request.json
    if enviar_correo_motivador(datos):
        return jsonify({"status": "ok", "message": "Email enviado"}), 200
    return jsonify({"status": "error"}), 500
if __name__ == '__main__':
    # Esto permite que el servidor de la nube elija el puerto necesario
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
    
    