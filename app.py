import smtplib
import os
import random
from email.mime.text import MIMEText
from flask import Flask, render_template, request, jsonify, redirect, url_for, session

app = Flask(__name__)
# Clave secreta para sesiones seguras
app.secret_key = 'zapala_seguro_2026_fit'

# --- CONFIGURACIÓN DE CORREO ---
# IMPORTANTE: Asegurate de que la contraseña sea la de 16 letras de Google sin espacios
MAIL_EMISOR = "comprovendoneuquen@gmail.com" 
MAIL_PASSWORD = "crdwzxajqnlnmixr"  # Quité los espacios que tenías
MAIL_DESTINO = "comprovendoneuquen@gmail.com"

def enviar_correo_motivador(datos):
    try:
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
        📍 Etapa: Semana {datos.get('semana', 'N/A')}
        ⚖️ Peso: {datos.get('peso', '0')} kg
        📊 IMC: {datos.get('imc', '0.0')}
        💧 Hidratación: {datos.get('agua', '0')} L
        -------------------------------------------
        """
        
        msg = MIMEText(contenido, 'plain', 'utf-8')
        msg['Subject'] = f'🚀 Misión Cumplida! (Semana {datos.get("semana")})'
        msg['From'] = MAIL_EMISOR
        msg['To'] = MAIL_DESTINO

        # Conexión segura con Gmail
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(MAIL_EMISOR, MAIL_PASSWORD)
            server.sendmail(MAIL_EMISOR, MAIL_DESTINO, msg.as_string())
        
        print("✅ Correo enviado con éxito")
        return True
    except Exception as e:
        print(f"❌ Error al enviar correo: {e}")
        return False

# --- RUTAS DE ACCESO ---

@app.route('/')
def index():
    if not session.get('autenticado'):
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        session['autenticado'] = True
        return jsonify({"status": "success"})
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/api/notificar', methods=['POST'])
def notificar_progreso():
    # Eliminamos la verificación de sesión solo para la API por ahora 
    # para asegurar que el JS pueda avisar aunque haya delay en la cookie
    datos = request.get_json()
    if not datos:
        return jsonify({"error": "No hay datos"}), 400
        
    if enviar_correo_motivador(datos):
        return jsonify({"status": "ok", "message": "Email enviado"}), 200
    else:
        return jsonify({"status": "error", "reason": "Fallo en el servidor de correo"}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
