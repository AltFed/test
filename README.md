# UniVersal — App universitaria (Expo + TypeScript)

Tracker universitario per iOS/Android costruito con Expo Router, SQLite locale e React Native Paper. Estetica Nothing Phone (font dot-matrix, dark/light mode).

---

## Funzionalità

- **Dashboard** — countdown alla laurea, progress CFU, media ponderata, radar esami in sospeso
- **Esami** — lista esami con voto, CFU, tipo (voto/tirocinio), swipe-to-delete, aggiunta rapida
- **Dettaglio esame** — task (scritto/orale/progetto/ore), orario lezioni settimanale, timer studio, registrazione voto con lode
- **Orario** — vista settimanale aggregata di tutte le lezioni
- **Simulatore** — sliding doors (voti ipotetici), calcolatore target media, conversione /110
- **Pianificatore** — task di studio per esame (nome, difficoltà 1-10, ore stimate), blocchi orari occupati, algoritmo greedy che genera un piano giornaliero rispettando il limite 4h Deep Work/giorno
- **Studio / Personal Trainer** — Pomodoro personalizzabile (focus + pausa configurabili), budget Deep Work giornaliero da 4h (Cal Newport), Shallow Zone con cambio colori quando il budget è esaurito, reset manuale del budget; sezione Flashcard con accesso ai deck per esame
- **Flashcard** — deck per esame con domanda/risposta, navigazione prev/next, tap-to-flip, aggiunta/eliminazione carte, lista completa con swipe-to-delete
- **Esami — Import massivo** — incolla più esami in formato "Nome CFU [tirocinio]" (uno per riga) per importarli tutti in un colpo solo
- **Impostazioni** — data laurea, CFU totali, tema

---

## Stack tecnico

| Cosa | Tecnologia |
|---|---|
| Framework | Expo SDK (Managed Workflow) |
| Navigazione | expo-router (file-based) |
| Database | expo-sqlite (SQLite locale, sync API) |
| UI | React Native Paper + SafeAreaContext |
| Icone | @expo/vector-icons (MaterialCommunityIcons) |
| Tema | React Native Paper theming + hook `useColors` custom |
| Font | Dot-matrix custom (`fonts.dot`, `fonts.mono`) |
| Linguaggio | TypeScript strict |

---

## Struttura

```
app/
├── (tabs)/
│   ├── index.tsx          # Dashboard
│   ├── esami.tsx          # Lista esami + import massivo
│   ├── orario.tsx         # Vista settimanale lezioni + pianificatore
│   ├── simulatore.tsx     # Simulatore media
│   ├── studio.tsx         # Timer sessioni di studio + flashcard list
│   └── _layout.tsx        # Tab bar
├── esame/[id].tsx         # Dettaglio esame
├── flashcard/[esameId].tsx # Deck flashcard per esame
├── impostazioni.tsx
└── _layout.tsx            # Root layout (PaperProvider, SQLite init)

src/
├── db/
│   ├── database.ts        # Tutte le funzioni SQLite (init, CRUD, stats)
│   └── types.ts           # Tipi TypeScript (Esame, Modulo, Lezione, ...)
├── components/
│   └── SwipeableRow.tsx   # Swipe-to-delete generico
└── theme.ts               # Colori, font, hook useColors
```

---

## Schema DB

```sql
esami          (id, nome, cfu, tipo, voto_finale, ore_tirocinio_target, superato, created_at, professore, data_esame)
moduli         (id, esame_id, nome, tipo, completato, ore_completate)
sessioni_studio(id, esame_id, durata_minuti, data)
lezioni        (id, esame_id, giorno, ora_inizio, ora_fine, aula, colore)
impostazioni   (chiave, valore)
task_studio    (id, esame_id, nome, difficolta, ore_stimate, completato)
blocchi_occupati(id, data, ora_inizio, ora_fine, etichetta)
piano_studio   (id, task_id, data, ora_inizio, ora_fine, ore_pianificate)
flashcard      (id, esame_id, domanda, risposta, created_at)
```

> **30 con lode** è salvato come `voto_finale = 33` e mostrato come `30L`. La media ponderata normalizza automaticamente 33 → 30 prima del calcolo.

> **Personal Trainer**: al primo accesso alla tab Studio compare un manifesto con la filosofia Deep Work. Le impostazioni `pomodoro_lavoro`, `pomodoro_pausa`, `trainer_visto` e `deep_work_reset_ts` sono salvate nella tabella `impostazioni`.

> **Pianificatore**: l'algoritmo greedy ordina i task per `(data_esame ASC, difficoltà DESC)`, poi per ogni giorno riempie gli slot liberi (08:00–22:00 meno lezioni settimanali meno blocchi occupati) fino a 4h di Deep Work. `piano_studio` è rigenerabile in qualsiasi momento tramite `generatePiano()`. La deadline è `data_esame` dell'esame associato al task.

---

## Avvio sviluppo

```bash
npm install
npx expo start
```

Scansiona il QR con Expo Go (iPhone/Android sulla stessa rete Wi-Fi).

### Type check

```bash
npx tsc --noEmit
```

---

## Note implementative

- La media ponderata usa `(Σ voto_i × cfu_i) / Σ cfu_i`, dove 30L conta come 30.
- `superato = 1` marca un esame come passato; gli esami di tipo `tirocinio` non entrano nella media.
- Le lezioni sono collegate all'esame via `esame_id` (FK con CASCADE DELETE).
- Il tema segue `useColorScheme()` di React Native con override manuale nelle impostazioni.
