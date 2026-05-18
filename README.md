# HelloWorldApp — Expo + TypeScript

Progetto Expo Managed Workflow con TypeScript, pronto per sviluppo su Windows e test via Expo Go su iPhone.

---

## Struttura del Progetto

```
hello-world-app/
├── .github/
│   └── workflows/
│       └── eas-build.yml       # Pipeline CI/CD GitHub Actions
├── assets/
│   ├── icon.png                # Icona app (1024x1024)
│   ├── splash-icon.png         # Splash screen (200x200)
│   ├── adaptive-icon.png       # Icona Android adaptive (1024x1024)
│   └── favicon.png             # Favicon web (48x48)
├── src/                        # Cartella per componenti futuri
│   ├── components/
│   ├── screens/
│   └── constants/
├── .gitignore
├── App.tsx                     # Entry point dell'applicazione
├── app.json                    # Configurazione Expo
├── babel.config.js
├── eas.json                    # Configurazione EAS Build
├── package.json
└── tsconfig.json
```

---

## Guida Comandi Windows (PowerShell / CMD)

### FASE 1 — Prerequisiti (una tantum)

Installa Node.js LTS da https://nodejs.org (include npm).
Poi installa gli strumenti globali:

```powershell
npm install -g expo-cli eas-cli
```

Verifica l'installazione:

```powershell
node --version
npm --version
expo --version
eas --version
```

---

### FASE 2 — Inizializzare la cartella del progetto

Crea la cartella, entra e copia tutti i file di questo repository:

```powershell
mkdir hello-world-app
cd hello-world-app
```

Crea manualmente le sottocartelle necessarie:

```powershell
mkdir assets
mkdir src\components
mkdir src\screens
mkdir src\constants
mkdir .github\workflows
```

Copia tutti i file (.gitignore, App.tsx, app.json, package.json, tsconfig.json,
babel.config.js, eas.json, .github\workflows\eas-build.yml) nella cartella.

> NOTA ASSET: Expo richiede le immagini in `assets/`. Puoi creare placeholder
> con qualsiasi editor grafico o usare immagini PNG minimali per lo sviluppo.
> Dimensioni consigliate: icon.png 1024x1024, splash-icon.png 200x200.

---

### FASE 3 — Installare le dipendenze

```powershell
npm install
```

---

### FASE 4 — Avviare il server di sviluppo (test su iPhone con Expo Go)

1. Installa **Expo Go** dall'App Store sul tuo iPhone.
2. Assicurati che iPhone e PC siano sulla **stessa rete Wi-Fi**.
3. Avvia il server:

```powershell
npx expo start
```

4. Nel terminale apparirà un **QR Code**: aprilo con la fotocamera dell'iPhone
   oppure direttamente dall'app Expo Go (`Scan QR Code`).

Per forzare la modalità tunnel (se la rete blocca le connessioni locali):

```powershell
npx expo start --tunnel
```

---

### FASE 5 — Type check e lint

```powershell
# Verifica TypeScript senza compilare
npx tsc --noEmit

# Lint del codice
npx eslint . --ext .ts,.tsx
```

---

### FASE 6 — Inizializzare il repository Git e pushare su GitHub

```powershell
git init
git add .
git commit -m "feat: initial Expo TypeScript project setup"
```

Crea un nuovo repository su GitHub (senza README/license/gitignore pre-generati),
poi collega e pusha:

```powershell
git remote add origin https://github.com/TUO_USERNAME/hello-world-app.git
git branch -M main
git push -u origin main
```

Il push su `main` attiverà automaticamente la GitHub Action **EAS iOS Build**.

---

### FASE 7 — Configurare il Secret EXPO_TOKEN per la CI/CD

Prima del primo push, aggiungi il token EAS come secret GitHub:

1. Vai su https://expo.dev → Account → Access Tokens → crea un nuovo token.
2. Nel repository GitHub → Settings → Secrets and variables → Actions.
3. Aggiungi un nuovo secret con nome `EXPO_TOKEN` e incolla il valore del token.

La pipeline `.github/workflows/eas-build.yml` usa questo secret per autenticarsi
con EAS e avviare la build iOS remota.

---

### FASE 8 — Login EAS (per build manuali da locale)

```powershell
eas login
eas build:configure
eas build --platform ios --profile preview
```

---

## Note Importanti

- **bundleIdentifier** in `app.json` → sostituisci `com.yourname.helloworldapp`
  con il tuo identificatore univoco in stile reverse-domain.
- **eas.json submit** → aggiorna `appleId`, `ascAppId` e `appleTeamId` solo
  quando sei pronto per la submission all'App Store.
- La build EAS richiede un account Expo (gratuito su https://expo.dev).
- Con Expo Go puoi testare senza un account Apple Developer ($99/anno);
  il Developer Account è necessario solo per distribuire sull'App Store.
