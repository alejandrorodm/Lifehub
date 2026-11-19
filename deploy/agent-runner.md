# Ejecutor de agentes de Claude

El ejecutor implementa listas de tareas de LifeHub con sesiones de Claude Code: una PR por tarea, fusión si las comprobaciones pasan y despliegue al final. Corre **en tu PC**, el mismo al que te conectas por SSH, nunca en el VPS (en el VPS no hay memoria para compilar ni para pasar tests).

```
LifeHub (VPS)                         Tu PC
─────────────                         ─────
Botón "Implementar con Claude"
  → cola de trabajos  ◀── pregunta ──  ejecutor (npm run runner)
                       ── tarea ──▶     claude --bg --session-id <id>  ← tú: claude attach <id>
                       ◀── estado ──    comprueba, fusiona la PR (gh) y despliega
```

- El VPS nunca llama a tu PC. Es el ejecutor quien pregunta, así que no hay que abrir ningún puerto.
- El ejecutor usa su propio token (`lhr_…`), que puedes revocar desde Ajustes. Solo ve las ejecuciones de tu perfil.
- **El comando de despliegue y las rutas viven en tu PC**, en la configuración del ejecutor. LifeHub solo dice qué tarea toca y en qué repo, y el ejecutor rechaza los repos que no estén en su configuración. Así, aunque alguien entrara en el VPS, no podría elegir qué se ejecuta en tu PC.

## Qué hace con cada tarea

1. Deja el worktree del repo en una rama nueva (`agent/<n>-<título>-<id>`) desde `origin/main` recién descargado.
2. Lanza una sesión de Claude Code en segundo plano con el encargo: implementar con tests, pasar las comprobaciones, hacer commit y push, y abrir la PR. El agente no fusiona ni despliega.
3. Mientras trabaja, LifeHub muestra el id de la sesión. Desde cualquier dispositivo: `ssh <tu-pc>` y luego `claude attach <id>`. Si Claude se queda esperando una respuesta tuya, LifeHub lo marca como "Esperándote".
4. Cuando el agente termina, el ejecutor comprueba varias cosas antes de fusionar. La PR tiene que ser del repo de la ejecución. Descarta lo que haya quedado sin commit y comprueba que el último commit está subido. Después **repite él mismo** las comprobaciones (`checkCommand`). Solo entonces fusiona la PR: squash, con `--match-head-commit`, para que GitHub no fusione otra cosa que lo comprobado. La tarea queda completada en LifeHub y en Google Tasks.
5. Pasa a la siguiente tarea. Cuando están todas fusionadas, despliega `origin/main` con `deployCommand`.

Si algo falla (las comprobaciones, la fusión, se agota el tiempo o Claude se declara bloqueado), la ejecución se detiene y la PR queda abierta. La sesión sigue viva para que puedas conectarte y ver qué pasó. Los cortes de red breves con LifeHub se reintentan (unos 60 s) antes de rendirse.

**Ojo:** el texto de cada tarea (título, descripción, checklist) es el encargo que recibe un agente con acceso a tu PC. Escribe las tareas tú y no enlaces listas en las que otras personas puedan escribir.

## Instalación

Necesitas `claude` (Claude Code con sesión iniciada), `gh` autenticado con permiso para fusionar en tus repos, `git` y Node.

1. **Token.** En LifeHub, Ajustes → Agentes de Claude → "Crear token". Guárdalo en `~/.config/lifehub-runner/env`:

   ```bash
   mkdir -p ~/.config/lifehub-runner && chmod 700 ~/.config/lifehub-runner
   echo 'LIFEHUB_RUNNER_TOKEN=lhr_...' > ~/.config/lifehub-runner/env && chmod 600 ~/.config/lifehub-runner/env
   ```

2. **Configuración.** Crea `~/.config/lifehub-runner/config.json`. Para usar otra ruta, ponla en `LIFEHUB_RUNNER_CONFIG`:

   ```json
   {
     "serverUrl": "https://tu-dominio-de-lifehub",
     "worktreesDir": "/home/tu-usuario/repos/lifehub-agent-worktrees",
     "repos": {
       "tu-usuario/Lifehub": {
         "path": "/home/tu-usuario/repos/Lifehub",
         "checkCommand": "npm ci --no-audit --no-fund && npm run typecheck && npm run lint && npm test",
         "deployCommand": "deploy/deploy.sh"
       }
     }
   }
   ```

   `serverUrl` tiene que ser `https://` (solo se admite `http://` hacia `127.0.0.1` o `localhost`), porque el token viaja en cada petición. Opcionales: `baseBranch` (por defecto `main`), `pollSeconds` (15), `sessionTimeoutMinutes` (180), `commandTimeoutMinutes` (30, tiempo máximo de las comprobaciones y del despliegue), `model` y `permissionMode` (`auto` por defecto, o `acceptEdits`). `bypassPermissions` no se admite, porque el agente trabaja sin nadie mirando.

3. **Worktrees.** Desde el clon de LifeHub:

   ```bash
   npm run runner -- setup
   ```

   Crea un worktree fijo por repo y te dice qué falta. Claude Code solo arranca sesiones en segundo plano en carpetas en las que confías, así que entra una vez en cada worktree, acepta la confianza y sal:

   ```bash
   cd ~/repos/lifehub-agent-worktrees/tu-usuario__Lifehub && claude   # acepta y escribe /exit
   ```

   Es un único worktree por repo porque las tareas van una detrás de otra. Entre tareas se reutiliza, y conserva `node_modules` para no reinstalar cada vez.

4. **Arranque.** Para probarlo a mano, `npm run runner`. Para que funcione siempre, como servicio de usuario:

   ```bash
   mkdir -p ~/.config/systemd/user && cp deploy/lifehub-runner.service ~/.config/systemd/user/
   # ajusta en el archivo la ruta al clon y a Node si no coinciden
   systemctl --user daemon-reload && systemctl --user enable --now lifehub-runner
   loginctl enable-linger "$USER"        # que siga funcionando aunque cierres la sesión
   journalctl --user -u lifehub-runner -f
   ```

   `deploy/deploy.sh` entra al VPS por SSH sin preguntar (`BatchMode`). Si tu clave tiene contraseña, el servicio necesita un agente SSH: pon `SSH_AUTH_SOCK=…` en el archivo `env`, o usa una clave solo para desplegar.

## Uso

1. En Tareas, vista "Listas", enlaza la lista con su repo (`propietario/repo`).
2. Pulsa "Implementar con Claude". Se pone en cola una tarea por cada pendiente de primer nivel, en el orden de la lista. Las subtareas y la checklist abiertas van en el encargo de su tarea.
3. Sigue el progreso en la misma lista: estado, rama, PR y el comando `claude attach <id>` para copiar.
4. "Cancelar" detiene la ejecución. El ejecutor para la sesión en su siguiente latido (cada `pollSeconds`).

Si reinicias el PC o el servicio con una tarea a medias, al arrancar el ejecutor la marca como fallida para que la lista no se quede bloqueada. Vuelve a pulsar el botón para seguir con lo pendiente.
