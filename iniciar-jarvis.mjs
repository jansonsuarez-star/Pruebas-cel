#!/usr/bin/env node
/**
 * Instala y arranca JARVIS (https://github.com/adewaskar/jarvis) en tu
 * computadora, fijado al commit que ya probamos y con la misma configuración
 * restringida:
 *
 *   - sin servidores MCP          JARVIS_MCP_SERVERS=","
 *   - solo lectura                JARVIS_ALLOW_WRITES=0
 *   - navegador y cámara apagados JARVIS_DISABLE="browser,camera"
 *
 * Si ya tienes alguna de esas variables definidas en tu terminal, se respeta
 * tu valor (por ejemplo JARVIS_DISABLE="" para dejar todo encendido).
 *
 * Uso:
 *   node iniciar-jarvis.mjs                  instala si hace falta y arranca
 *   node iniciar-jarvis.mjs --pruebas        ejecuta npm test antes de arrancar
 *   node iniciar-jarvis.mjs --solo-instalar  instala y verifica, sin arrancar
 *   node iniciar-jarvis.mjs --reinstalar     fuerza npm ci aunque ya esté instalado
 *   node iniciar-jarvis.mjs --dir <ruta>     carpeta de JARVIS (por defecto ~/jarvis)
 *
 * Funciona igual en Windows, macOS y Linux. Solo necesita Node 20+ y Git, más
 * Claude Code instalado y con sesión iniciada para que JARVIS pueda responder.
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import process from 'node:process'

const REPO = 'https://github.com/adewaskar/jarvis.git'
const COMMIT = '9ae5ec8' // "Document the bridge settings and protections from the merged PRs (#52)"
const PORTS = [8787, 5173] // bridge, interfaz

// ---------------------------------------------------------------- argumentos

const argv = process.argv.slice(2)
const flags = new Set(argv.filter((a) => a.startsWith('--')))
const known = new Set(['--pruebas', '--solo-instalar', '--reinstalar', '--dir', '--ayuda', '--help'])
for (const f of flags) {
  if (!known.has(f)) fail(`Opción desconocida: ${f}. Usa --ayuda para ver las opciones.`)
}
if (flags.has('--ayuda') || flags.has('--help')) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\*\n?/, '').replace(/^ \* ?/gm, ''))
  process.exit(0)
}
let dirArg
if (flags.has('--dir')) {
  dirArg = argv[argv.indexOf('--dir') + 1]
  if (!dirArg || dirArg.startsWith('--')) fail('Falta la ruta después de --dir.')
}
const DIR = resolve(dirArg ?? join(homedir(), 'jarvis'))

// ------------------------------------------------------------------ utilidades

function paso(msg) {
  console.log(`\n==> ${msg}`)
}
function ok(msg) {
  console.log(`  [ok]   ${msg}`)
}
function aviso(msg) {
  console.log(`  [ojo]  ${msg}`)
}
function fail(msg) {
  console.error(`\n  [error] ${msg}\n`)
  process.exit(1)
}

/** git sin shell: las rutas viajan como argumentos, nunca se interpretan. */
function git(args, opts = {}) {
  return spawnSync('git', args, { encoding: 'utf8', ...opts })
}

/**
 * npm y claude son scripts .cmd en Windows y necesitan shell. Los comandos son
 * literales fijos de este archivo; nada que escriba el usuario llega al shell.
 */
function sh(command, opts = {}) {
  return spawnSync(command, { shell: true, ...opts })
}

function puertoLibre(port) {
  return new Promise((done) => {
    const s = net.createServer()
    s.once('error', () => done(false))
    s.once('listening', () => s.close(() => done(true)))
    s.listen(port, '127.0.0.1')
  })
}

function mismoRepo(url) {
  const u = url
    .trim()
    .toLowerCase()
    .replace(/^git@github\.com:/, 'https://github.com/')
    .replace(/\/+$/, '')
    .replace(/\.git$/, '')
  return u.endsWith('github.com/adewaskar/jarvis')
}

// ------------------------------------------------------------ 1. requisitos

paso('Comprobando requisitos')

const major = Number(process.versions.node.split('.')[0])
if (!(major >= 20)) fail(`Node ${process.versions.node} es muy antiguo. Instala Node 20 o superior desde https://nodejs.org`)
ok(`Node ${process.versions.node}`)

const gitV = git(['--version'])
if (gitV.status !== 0) fail('No encuentro Git. Instálalo desde https://git-scm.com y vuelve a ejecutar este script.')
ok(gitV.stdout.trim())

const claudeV = sh('claude --version', { encoding: 'utf8' })
if (claudeV.status === 0 && claudeV.stdout) {
  ok(`Claude Code ${claudeV.stdout.trim()}`)
} else {
  aviso('No encuentro Claude Code. JARVIS cargará la interfaz pero NO podrá responder.')
  aviso('Instálalo (npm install -g @anthropic-ai/claude-code), ejecuta `claude` una vez e inicia sesión.')
}

// ------------------------------------------------- 2. código en el commit fijo

paso(`Preparando JARVIS en ${DIR}`)

if (!existsSync(DIR)) {
  const r = git(['clone', REPO, DIR], { stdio: 'inherit' })
  if (r.status !== 0) fail('No se pudo clonar el repositorio. Revisa tu conexión a internet.')
  ok('Repositorio clonado')
} else {
  const origin = git(['-C', DIR, 'remote', 'get-url', 'origin'])
  if (origin.status !== 0 || !mismoRepo(origin.stdout)) {
    fail(`La carpeta ${DIR} ya existe y no es un clon de JARVIS. No la toco; usa --dir con otra ruta.`)
  }
  ok('Clon existente encontrado')
}

if (git(['-C', DIR, 'cat-file', '-e', `${COMMIT}^{commit}`]).status !== 0) {
  const r = git(['-C', DIR, 'fetch', 'origin'], { stdio: 'inherit' })
  if (r.status !== 0) fail('No se pudo actualizar el repositorio (git fetch).')
}

const head = git(['-C', DIR, 'rev-parse', 'HEAD']).stdout.trim()
const target = git(['-C', DIR, 'rev-parse', `${COMMIT}^{commit}`]).stdout.trim()
if (!target) fail(`El commit ${COMMIT} no existe en el repositorio.`)

if (head !== target) {
  const dirty = git(['-C', DIR, 'status', '--porcelain', '--untracked-files=no']).stdout.trim()
  if (dirty) {
    fail(`${DIR} tiene cambios locales sin guardar. No los toco; guárdalos o descártalos y vuelve a intentar.`)
  }
  const r = git(['-C', DIR, '-c', 'advice.detachedHead=false', 'checkout', COMMIT], { stdio: 'inherit' })
  if (r.status !== 0) fail(`No se pudo cambiar al commit ${COMMIT}.`)
}
ok(`En el commit ${COMMIT}`)

// ------------------------------------------------------------ 3. dependencias

paso('Dependencias')

const stamp = join(DIR, 'node_modules', '.jarvis-commit')
const instalado = existsSync(stamp) && readFileSync(stamp, 'utf8').trim() === target
if (instalado && !flags.has('--reinstalar')) {
  ok('Ya estaban instaladas para este commit')
} else {
  // onnxruntime-node (dependencia de kokoro-js) intenta bajar binarios CUDA de
  // GitHub al instalarse y puede fallar con 404; JARVIS no los usa.
  const r = sh('npm ci --onnxruntime-node-install-cuda=skip', { cwd: DIR, stdio: 'inherit' })
  if (r.status !== 0) fail('npm ci falló. Revisa el mensaje de arriba.')
  writeFileSync(stamp, `${target}\n`)
  ok('Dependencias instaladas')
}

// ----------------------------------------------------------------- 4. pruebas

if (flags.has('--pruebas')) {
  paso('Ejecutando npm test')
  const r = sh('npm test', { cwd: DIR, stdio: 'inherit' })
  if (r.status !== 0) fail('Hay pruebas que fallan. No arranco JARVIS.')
  ok('Todas las pruebas pasaron')
}

if (flags.has('--solo-instalar')) {
  paso('Listo. Para arrancarlo: node iniciar-jarvis.mjs')
  process.exit(0)
}

// ----------------------------------------------------------------- 5. arranque

paso('Arrancando JARVIS')

for (const port of PORTS) {
  if (!(await puertoLibre(port))) {
    fail(`El puerto ${port} ya está en uso. ¿JARVIS ya está abierto en otra terminal? Ciérralo y vuelve a intentar.`)
  }
}

const env = {
  ...process.env,
  JARVIS_MCP_SERVERS: process.env.JARVIS_MCP_SERVERS ?? ',',
  JARVIS_ALLOW_WRITES: process.env.JARVIS_ALLOW_WRITES ?? '0',
  JARVIS_DISABLE: process.env.JARVIS_DISABLE ?? 'browser,camera',
}

console.log(`
  Servidores MCP : ${env.JARVIS_MCP_SERVERS.replace(/,/g, '').trim() ? env.JARVIS_MCP_SERVERS : 'ninguno'}
  Escrituras     : ${env.JARVIS_ALLOW_WRITES === '1' ? 'PERMITIDAS' : 'desactivadas (solo lectura)'}
  Desactivado    : ${env.JARVIS_DISABLE || 'nada'}

  En esta computadora: abre http://localhost:5173 en Chrome, pulsa INITIALISE
  y di "Hey Jarvis".
  En un celular Android: sigue los pasos de "Probar en el celular" del README.

  Ctrl+C detiene todo.
`)

const child = spawn(process.execPath, ['scripts/start.mjs'], { cwd: DIR, env, stdio: 'inherit' })

// Ctrl+C llega también al proceso hijo, que se apaga solo; aquí solo esperamos
// a que termine para no dejarlo huérfano.
process.on('SIGINT', () => {})
process.on('SIGTERM', () => child.kill('SIGTERM'))
child.on('exit', (code) => process.exit(code ?? 0))
