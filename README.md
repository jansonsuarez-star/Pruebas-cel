# Pruebas-cel — JARVIS en un solo comando

`iniciar-jarvis.mjs` instala y arranca [JARVIS](https://github.com/adewaskar/jarvis)
en tu computadora, fijado al commit `9ae5ec8` (el que ya probamos: 21 pruebas
pasan, 0 fallan, 1 omitida que solo corre en WSL).

Arranca con la misma configuración restringida de la prueba:

| Variable              | Valor por defecto  | Qué significa                                  |
| --------------------- | ------------------ | ---------------------------------------------- |
| `JARVIS_MCP_SERVERS`  | `","`              | No carga ningún servidor MCP                   |
| `JARVIS_ALLOW_WRITES` | `0`                | Solo lectura: no ejecuta comandos ni modifica archivos |
| `JARVIS_DISABLE`      | `"browser,camera"` | Control del navegador y cámara apagados        |

> La computadora es el "cerebro" (ahí corre Claude Code). El celular solo abre
> la página y le hablas.

---

## Requisitos (en la computadora)

1. **Node.js 20 o superior** — <https://nodejs.org>
2. **Git** — <https://git-scm.com>
3. **Claude Code instalado y con sesión iniciada**
   ```bash
   npm install -g @anthropic-ai/claude-code
   claude        # ejecútalo una vez e inicia sesión
   ```
   Sin esto la interfaz carga, pero JARVIS no responde.
4. **Google Chrome** (o Edge).

## Uso

Descarga este repositorio (botón **Code → Download ZIP** en GitHub, o
`git clone`) y, dentro de la carpeta:

**Windows:** doble clic en `iniciar-jarvis.cmd`, o en una terminal:
```powershell
node iniciar-jarvis.mjs
```

**macOS / Linux:**
```bash
node iniciar-jarvis.mjs
```

La primera vez clona JARVIS en `~/jarvis` (tu carpeta de usuario) e instala las
dependencias; las siguientes veces arranca directamente. Cuando veas
`Local: http://localhost:5173/`, abre esa dirección en Chrome, pulsa
**INITIALISE**, permite el micrófono y di **"Hey Jarvis"**.

**Ctrl+C** detiene todo.

### Opciones

| Opción            | Hace                                                |
| ----------------- | --------------------------------------------------- |
| `--pruebas`       | Ejecuta `npm test` antes de arrancar; si algo falla, no arranca |
| `--solo-instalar` | Clona e instala, sin arrancar                       |
| `--reinstalar`    | Fuerza `npm ci` aunque ya esté instalado            |
| `--dir <ruta>`    | Usa otra carpeta en vez de `~/jarvis`               |
| `--ayuda`         | Muestra la ayuda                                    |

### Cambiar la configuración

Si defines una variable antes de ejecutar el script, se usa tu valor. Por
ejemplo, para dejar encendidos el navegador y la cámara:

```bash
# macOS / Linux
JARVIS_DISABLE="" node iniciar-jarvis.mjs
```
```powershell
# Windows (PowerShell)
$env:JARVIS_DISABLE=""; node iniciar-jarvis.mjs
```

---

## Probar en el celular (Android)

El celular abre JARVIS a través de la computadora con un cable USB. Para el
teléfono es `localhost`, así que el micrófono funciona y no hay que abrir nada
a la red.

1. Arranca JARVIS en la computadora con `node iniciar-jarvis.mjs`.
2. En el teléfono: **Ajustes → Acerca del teléfono →** toca 7 veces
   **Número de compilación** para activar las Opciones de desarrollador. Luego
   **Opciones de desarrollador → Depuración USB** = activado.
3. Conecta el teléfono a la computadora por USB y acepta el aviso
   "¿Permitir depuración USB?".
4. En **Chrome de la computadora**, abre `chrome://inspect/#devices`, pulsa
   **Port forwarding…** y añade:
   - `5173` → `localhost:5173`
   - `8787` → `localhost:8787`

   Marca **Enable port forwarding** y pulsa **Done**.
5. En **Chrome del teléfono**, abre `http://localhost:5173`, pulsa
   **INITIALISE**, permite el micrófono y di **"Hey Jarvis"**.

Deja la pestaña `chrome://inspect` abierta en la computadora mientras pruebas:
el reenvío solo funciona mientras está abierta.

**iPhone:** Safari no tiene este reenvío de puertos y su reconocimiento de voz
es limitado; por ahora la prueba en celular es solo con Android.

---

## Problemas comunes

- **"El puerto 8787 / 5173 ya está en uso"** — JARVIS ya está abierto en otra
  terminal. Ciérralo (Ctrl+C) y vuelve a intentar.
- **La interfaz carga pero JARVIS no responde** — Claude Code no está instalado
  o no has iniciado sesión. Ejecuta `claude` una vez.
- **"tiene cambios locales sin guardar"** — modificaste archivos dentro de
  `~/jarvis`. El script no los toca; descártalos o usa `--dir` con otra carpeta.
- **`npm ci` falla con `onnxruntime-node … 404`** — el script ya lo evita con
  `--onnxruntime-node-install-cuda=skip`. Si aparece, usa `--reinstalar`.
