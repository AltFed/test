# UNIVERSAL — PROJECT CONTEXT
> RULE: Read this file FIRST on every session. Update after every commit or significant file change.

---

## META
- path: `c:\Users\feder\Documents\hello-world-app`
- branch: `claude/setup-expo-typescript-project-Kxow7`
- git user: AltFed
- last_updated: 2026-05-19
- last_commit: Block 3 — OGGI timeline in orario, Flashcard mode in studio

---

## STACK
```
RN 0.81.5 / Expo SDK 54 / expo-router v6
newArchEnabled: false  ← NEVER change
react 19.1.0  ← peer conflict with react-dom@19.2.6 → use --legacy-peer-deps for installs
SQLite: expo-sqlite (openDatabaseSync, getAllSync, getFirstSync, runSync, execSync)
UI: react-native-paper (MD3) + react-native-gesture-handler + react-native-safe-area-context
Icons: @expo/vector-icons MaterialCommunityIcons
Fonts: VT323_400Regular (dot/numbers) + SpaceMono_400Regular (all text)
Swipe: react-native-gesture-handler Swipeable
SVG: react-native-svg
Blur: expo-blur
tsconfig: paths @/* → src/*
```

---

## FILE MAP
```
app/
  _layout.tsx              root layout — GestureHandlerRootView, PaperProvider, Stack, fonts
  (tabs)/
    _layout.tsx            tab bar — nothing aesthetic, accent tint, mono labels
    esami.tsx              exam list — swipe-delete, filter pills, FAB+dialog
    orario.tsx             weekly schedule — grouped by day, swipe-delete
    studio.tsx             pomodoro — FatigueRing, MorningCheckIn, CooldownSheet, amber
    simulatore.tsx         grade simulator — delta row, VT323 nums
  esame/[id].tsx           exam detail — moduli, lezioni, sessioni, voto
  impostazioni.tsx         settings screen

src/
  theme.ts                 useColors(), usePaperTheme(), monoFonts(), fonts const
  db/
    database.ts            all SQLite ops (see DB section)
    types.ts               Esame, Modulo, SessioneStudio, Lezione, LezioneConEsame
  components/
    SwipeableRow.tsx       swipe-to-delete wrapper — style prop carries border/radius
    FatigueRing.tsx        SVG arc ring — total/completed/activeColor/dimColor
    MorningCheckIn.tsx     daily energy check-in card — 1-5 dots → budget 4/6/8
    CooldownSheet.tsx      expo-blur bottom sheet — over-budget gate
    FlashCard.tsx          single flashcard with 3D flip — front/back + photo support
```

---

## THEME SYSTEM (`src/theme.ts`)
```ts
// dark
background:#000  surface:#0A0A0A  card:#111  border:#1C1C1C
textPrimary:#FFF  textSecondary:#888  textMuted:#444
accent:#FFE600  accentDim:#2A2600
destructive/error:#FF3B30  success:#30D158  warning:#FF9F0A

// light
background:#FFF  surface:#F2F2F7  card:#FFF  border:#E5E5EA
textPrimary:#000  textSecondary:#6C6C70  textMuted:#AEAEB2
accent:#B8A000  accentDim:#FFF8C0

fonts.dot  = 'VT323_400Regular'    // use for: numbers, timers, scores, big displays
fonts.mono = 'SpaceMono_400Regular' // use for: ALL other text

monoFonts() overrides ALL Paper MD3 font variants → SpaceMono in TextInput placeholders
useColors() → dark|light via useColorScheme()
usePaperTheme() → darkPaper|lightPaper
```

---

## DB SCHEMA (`src/db/database.ts`)
```sql
impostazioni(chiave PK TEXT, valore TEXT)
esami(id PK, nome, cfu, tipo[voto|tirocinio], voto_finale, ore_tirocinio_target, superato, created_at, professore)
moduli(id PK, esame_id FK→esami, nome, tipo[scritto|orale|progetto|ore], completato, ore_completate)
sessioni_studio(id PK, esame_id FK→esami, durata_minuti, data ISO)
lezioni(id PK, esame_id FK→esami, giorno[0=Lun..6=Dom], ora_inizio, ora_fine, aula, colore hex)
flashcard(id PK, esame_id FK→esami, fronte TEXT, retro TEXT, retro_foto TEXT nullable)
PRAGMA foreign_keys=ON  →  cascade deletes work
```

### DB FUNCTIONS
```
getSetting(key) / setSetting(key, value)
getAllEsami() / getEsame(id) / insertEsame(...) / updateEsameVoto(id,voto) / deleteEsame(id)
getModuli(esameId) / insertModulo / toggleModulo / deleteModulo
insertSessione(esameId, minuti) / getOreStudiate(esameId) / getSessioniRecenti(esameId)
getSessioniOggiTotali() → COUNT(*) WHERE substr(data,1,10)=today
getAllLezioniConEsame() / getLezioniByEsame(esameId) / insertLezione / deleteLezione
getFlashcard(esameId) / insertFlashcard(esameId, fronte, retro, retro_foto?) / deleteFlashcard(id)
getMediaPonderata() / getCfuAcquisiti() / getEsamiSuperati()
```

### SETTINGS KEYS
```
ultima_checkin   → ISO date string YYYY-MM-DD (last MorningCheckIn completion)
budget_odierno   → string number "4"|"6"|"8" (pomodoro budget for today)
```

---

## COMPONENT PATTERNS

### SwipeableRow
```tsx
<SwipeableRow
  onDelete={() => { deleteX(id); load(); }}
  style={{ borderRadius:16, borderWidth:1, borderLeftWidth:3,
           borderColor:C.border, borderLeftColor:accent, marginBottom:10 }}
>
  <TouchableOpacity style={[s.card, {backgroundColor:C.card}]}>
    // NO border/radius on card — all on SwipeableRow style
  </TouchableOpacity>
</SwipeableRow>
// outer: overflow:'hidden' clips card+action to same rect → no border gap artifact
// friction:1.5, rightThreshold:60, onSwipeableOpen auto-deletes
```

### FatigueRing
```tsx
<FatigueRing total={budget} completed={sessioniOggi} activeColor={activeColor} dimColor={C.border}>
  <Text style={{fontSize:80, fontFamily:fonts.dot, color:faseColor}}>{timer}</Text>
</FatigueRing>
// size=250 default, strokeWidth=8, arcs fill from top, gap=12/9/7 for 4/6/8 segments
// amber mode: pass activeColor='#CC8800' when sessioniOggi >= budget
```

### Dialog with keyboard avoidance (esami.tsx pattern)
```tsx
<Dialog ...>
  <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'}>
    <Dialog.Title /><Dialog.Content /><Dialog.Actions />
  </KeyboardAvoidingView>
</Dialog>
```

---

## STUDIO TAB — BLOCK 2 LOGIC
```
AMBER_COLOR = '#CC8800'
budget: loaded from getSetting('budget_odierno') || 6
sessioniOggi: loaded from getSessioniOggiTotali() on focus + after each pomodoro
isOverBudget = sessioniOggi >= budget

MorningCheckIn shown if getSetting('ultima_checkin') !== todayStr()
  → onConfirm(b): setSetting('ultima_checkin', today), setSetting('budget_odierno', b), hide card

startStop():
  if !running && fase==='lavoro' && isOverBudget → setShowCooldown(true), return
  else actuallyStart()

CooldownSheet:
  onDismiss → close, don't start
  onForceContinue → actuallyStart() (overrides budget)

Timer card border: C.border | AMBER+'55' when over budget
Phase label: 'SESSIONE FOCUS' | 'OVER BUDGET' | 'PAUSA'
Sessions display: "X / budget"
```

---

## SCREEN INVENTORY

### esami.tsx
- Filter pills: tutti/da_fare/superati
- Accent colors: ACCENTS array, accentForIndex(i) cycles through 6 colors
- FAB opens dialog: nome(req), professore(opt), cfu(req), tipo pill, oreTarget(if tirocinio)
- voto_finale===33 displays as '30L'

### orario.tsx
- OGGI section at top: today's lessons with ORA/PROX badges, past lessons dimmed (opacity 0.45)
  - jsGiornoToOur(jsDay) = (jsDay+6)%7 converts JS weekday to our 0=Mon..6=Sun format
  - getLessonStatuses(): now/next/past/future based on current time vs ora_inizio/fine
- Weekly section below: GIORNI[0..6] groups, today day dot in accent color
- SwipeableRow with borderLeftColor=l.colore

### esame/[id].tsx
- Sections: grade display, moduli checklist, lezioni orario, sessioni recenti
- Custom checkbox: 22x22, borderRadius:6, borderWidth:1.5
- Lezione add dialog: giorno picker, ora_inizio/fine, aula, colore selector
- SwipeableRow on both moduli rows and lezioni rows

### simulatore.tsx
- Hypothetical grade simulator
- delta row with VT323 numbers, C.success/>0, C.destructive/<0

### impostazioni.tsx
- Yellow save button, card layout

---

## RECURRING GOTCHAS
```
1. tsconfig.json: linter removes expo-env.d.ts from include[] — always restore:
   "include": ["**/*.ts","**/*.tsx",".expo/types/**/*.d.ts","expo-env.d.ts"]

2. npm installs: use --legacy-peer-deps (react@19.1.0 vs react-dom@19.2.6 conflict)

3. git add with parentheses in path: use PowerShell, quote path in double quotes
   git add "app/(tabs)/file.tsx"

4. git commit heredoc in PowerShell: use @'...'@ single-quoted here-string
   BUT: Set-Location first, not cd "path" && ...

5. SwipeableRow border artifact: NEVER put borderWidth/borderRadius on the inner card.
   Put ALL border styling in SwipeableRow's style prop. overflow:'hidden' on outer.

6. TextInput font: handled by monoFonts() in theme.ts — do NOT add fontFamily inline
   to TextInput style prop (Paper ignores it for placeholder).

7. headerBackButtonDisplayMode:'minimal' in Stack screenOptions → arrow only, no text

8. expo-blur BlurView: iOS=real blur, Android=colored overlay (tint+backgroundColor fallback)
```

---

## BLOCK STATUS
```
✅ BLOCK 1 — Nothing aesthetic + swipe-delete + dark/light mode
✅ BLOCK 2 — FatigueRing + MorningCheckIn + CooldownSheet + amber mode
✅ BLOCK 3 — OGGI timeline in orario + Flashcard mode in studio (foto support, 3D flip)
⬜ BLOCK 4 — Soundscape Mixer
```

### BLOCK 3 (done)
- orario.tsx: OGGI section — today's lessons, ORA/PROX badges, past dimmed
- studio.tsx: TIMER | FLASHCARD mode switcher (pill segment control)
  - Flashcard: 3D flip, SO/RIPASSARE buttons, session score, shuffle, foto risposta
  - Add dialog: fronte text, retro text, retro_foto via expo-image-picker
  - expo-image-picker: requestMediaLibraryPermissionsAsync before launchImageLibraryAsync
  - deck = shuffle(getFlashcard(esameId)), sessionDone when deckIndex+1>=deck.length

### BLOCK 4 (planned)
- Soundscape mixer: ambient audio loops during pomodoro sessions
- expo-av for audio
- Presets: rain/cafe/white-noise/lofi

---

## STYLE CONVENTIONS
```
borderRadius: cards=16, pills=20, FAB=18, inputs=10, tags=6, checkboxes=6
borderWidth: cards=1, borderLeftWidth=3 (accent stripe), hairlineWidth for dividers
fontSize: title=36(dot), timer=80(dot), section header=10(mono,letterSpacing:2)
         card title=14-15(mono,600), body=12-13(mono), tag=11(mono,700)
padding: screen=16, card=16, header=20h+16t
FAB: position:absolute, right:20, bottom:28, w:56, h:56, borderRadius:18, accent bg, black icon
Empty states: big VT323 number ("00"), title, hint text — paddingTop:60, gap:10
```
