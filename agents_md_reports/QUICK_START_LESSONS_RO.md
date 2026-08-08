# 🎬 GHID DE UTILIZARE - Adaugă Lecții cu Capitole și Thumbnail-uri

## 🎯 Obiectiv
Permite administratorilor să organizeze lecții în capitole și să adauge video-uri cu thumbnail-uri pentru fiecare lecție.

## 📍 Unde Găsești Această Funcție

1. Login ca administrator
2. Navigează la **Admin Panel** (⚙️ icon în top-right)
3. Click pe **Courses**
4. Selectează un curs existent sau creează unu nou
5. Mergi la secțiunea **"Capitole cu Lecții"**

## 🚀 Cum Să Adaugi Lecții

### Pasul 1: Crează un Capitol (Opțional dacă nu există)

```
1. În formularul "➕ Add New Lesson", click pe "+ Create New Chapter"
2. Introdu numele capitalului, ex: "Capitol 1 - Fundamentals"
3. Click "Add"
4. Capitalul apare acum în lista de selecție
```

Exemple de nume pentru capitole:
- Capitol 1 - Introducere
- Capitol 2 - Concepte Avansate
- Capitol 3 - Practică
- Capitol 4 - Finalizare

### Pasul 2: Selectează Capitalul

```
1. Deasupra formularului, în secțiunea "📚 Select Chapter"
2. Click radio button lângă capitalul dorit
3. Un singur capitol poate fi selectat odată
```

### Pasul 3: Completează Detaliile Lecției

```
Lesson Title * (obligatoriu)
  ↳ Exemplu: "Lesson 1 - Introduction"
  ↳ Exemplu: "Lesson 2 - Deep Dive"

Duration (în secunde)
  ↳ 1800 = 30 minute
  ↳ 3600 = 60 minute
  ↳ 2700 = 45 minute

Description (opțional)
  ↳ Descrie ce va învăța utilizatorul
  ↳ Exemplu: "Learn the basics of creative thinking"
```

### Pasul 4: Încarcă Video-ul

```
Video File * (OBLIGATORIU)
  Format acceptate: MP4, WebM, MOV, AVI, MKV
  Dimensiune max: 500MB
  
  Cum să incarci:
  1. Click pe "Choose file..."
  2. Selectează video-ul din computer
  3. Asteapta să se încarce (va vedea numele fișierului)
  4. Status: ✅ filename.mp4 (123.45 MB)
```

### Pasul 5: Încarcă Thumbnail-ul (RECOMANDAT)

```
Thumbnail (OPȚIONAL)
  Format acceptate: JPG, PNG, GIF, WebP
  Dimensiune max: 500MB (de obicei mult mai mic)
  
  Cum să incarci:
  1. Click pe "Choose file..."
  2. Selectează imaginea din computer
  3. Asteapta să se încarce
  4. Status: ✅ thumbnail.jpg (2.50 MB)

💡 TIP: Dacă nu incarci thumbnail, va fi generat automat din video
```

### Pasul 6: Dă Click pe "➕ Add Lesson"

```
1. Butonul devine activ după ce:
   ✅ Ai introdus titlul lecției
   ✅ Ai selectat un capitol
   ✅ Ai incarcat video-ul

2. Click pe "➕ Add Lesson"
3. Vei vedea: "Uploading... X%"
   - Aceasta încarc video-ul și thumbnail-ul
   - Poate dura câteva minute după mărimea fișierelor
   
4. După upload:
   - Lecția apare sub capitalul selectat
   - Video va arăta status "⏳ Processing..." (HLS transcoding)
   - După câteva minute: "✅ HLS Ready"
```

## 📊 Cum Se Afișează Lecțiile

```
┌─────────────────────────────────────────────────┐
│ 📚 Capitole cu Lecții (2 Capitole, 5 Lecții)  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 📖 Capitol 1 - Fundamentals (2 lecții)         │
├─────────────────────────────────────────────────┤
│                                                  │
│ [L1] Lesson 1 - Introduction                   │
│      Learn the basics of creative thinking     │
│      ⏱️ 30 min 🖼️ Thumbnail ✅ HLS Ready     │
│      [🗑️ Delete]                               │
│                                                  │
│ [L2] Lesson 2 - Advanced Topics                │
│      Deep dive into advanced concepts          │
│      ⏱️ 45 min 🖼️ Thumbnail ✅ HLS Ready     │
│      [🗑️ Delete]                               │
│                                                  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 📖 Capitol 2 - Advanced (3 lecții)             │
├─────────────────────────────────────────────────┤
│ [L3] Lesson 3 - ... ⏱️ 60 min ...             │
│ [L4] Lesson 4 - ... ⏱️ 50 min ...             │
│ [L5] Lesson 5 - ... ⏱️ 55 min ...             │
└─────────────────────────────────────────────────┘
```

## 🔍 Explicare Pictograme

| Pictogramă | Înțeles |
|------------|---------|
| 📖 | Capitol |
| [L1] | Ordinea lecției (Lesson 1) |
| ⏱️ | Durata (minute) |
| 🖼️ | Are thumbnail |
| ✅ | Gata și ready |
| ⏳ | Se proceseaza |
| 📹 | Fără video |
| 🗑️ | Buton delete |

## ⚠️ Important

### Ce Trebuie să Stii:

1. **Video este obligatoriu** - Fără video nu poți adăuga lecție
2. **Thumbnail este opțional** - Dar se recomandă
3. **Format video**: MP4 este cel mai bun și portabil
4. **Upload durează** - Depinde de viteza internet și dimensiunea fișierului
5. **HLS Processing** - După upload, video trece printr-un proces de transcodare HLS (5-15 minute)
6. **Capitolul obligatoriu** - Trebuie inițial să creezi un capitol

### Dimensiuni Recomandate:

```
Video:
  - Rezoluție: 1920x1080 (Full HD)
  - Format: MP4 (H.264 codec)
  - Bitrate: 2-5 Mbps
  - Dimensiune tipică: 300-800 MB pentru 30 minute

Thumbnail:
  - Dimensiune: 300x169 (16:9 aspect ratio)
  - Format: JPG sau PNG
  - Dimensiune tipică: 50-200 KB
```

## 🆘 Troubleshooting

### Problem: "Video file is required" error
**Soluție**: Asigură-te că ai selectat un video file înainte de a apăsa "Add Lesson"

### Problem: "Invalid image format" error
**Soluție**: Thumbnail trebuie să fie JPG, PNG, GIF sau WebP. Nu alte formate!

### Problem: Upload se blocheaza la 50%
**Soluție**: 
- Verifică conexiunea internet
- Redimensionează video-ul (prea mare)
- Încearcă cu alt browser

### Problem: Video nu apare ca "HLS Ready" după 20 minute
**Soluție**: 
- Reîncarcă pagina
- Verifica ca video-ul a fost incarcat complet (nu interrupted)
- Contactează suport dacă nu se mișca

### Problem: Capitolul nu apare în lista
**Soluție**:
- Asigură-te că ai apăsat "Add" după ce ai introdus numele
- Reîncarcă pagina pentru a vedea capitolul

## 💡 Best Practices

1. **Denumire consistentă**: 
   - Capitol 1, Capitol 2, Capitol 3
   - SAU: Capitol 1 - Basics, Capitol 2 - Advanced

2. **Naming lecții**:
   - Lesson 1 - Topic Name
   - Lesson 2 - Next Topic
   - SAU: Lesson 1, Lesson 2 (o notație simplă)

3. **Thumbnail-uri**:
   - Folosește imagini care reprezintă conținutul
   - Asigură-te că sunt clare și profesionale
   - Evită text prea mic

4. **Video Quality**:
   - MP4 cu H.264 codec
   - 1080p rezoluție (Full HD)
   - 2-5 Mbps bitrate

5. **Denumire fișiere**:
   - Folosește nume descriptive
   - Evită spații speciale
   - Exemplu: L01_Introduction.mp4

## 🎥 Exemple

### Exemplu 1: Curs Photography
```
Capitol 1 - Camera Basics
  L1 - Understanding Aperture (1800s)
  L2 - Shutter Speed Explained (1200s)
  
Capitol 2 - Composition
  L3 - Rule of Thirds (900s)
  L4 - Leading Lines (1500s)
  
Capitol 3 - Lighting
  L5 - Natural Light (2700s)
  L6 - Artificial Light (2400s)
```

### Exemplu 2: Curs Web Development
```
Capitol 1 - HTML Basics
  L1 - HTML Introduction (1200s)
  L2 - Tags and Elements (1500s)
  
Capitol 2 - CSS Styling
  L3 - CSS Selectors (1800s)
  L4 - Box Model (1200s)
  
Capitol 3 - JavaScript
  L5 - JavaScript Basics (2400s)
  L6 - DOM Manipulation (2700s)
```

## 📞 Suport

Dacă întâmpini probleme:
1. Verifică documentația de mai sus
2. Contactează echipa de suport
3. Descrie exact ce eroare primești

## ✅ Verificare

După ce ai adăugat o lecție:

- [ ] Lecția apare sub capitalul corect
- [ ] Titlul este corect
- [ ] Video-ul apare în lista
- [ ] Thumbnail-ul este vizibil (dacă l-ai adăugat)
- [ ] Durata este afișată corect
- [ ] Status video-lui actualizează în timp

---

**Ultima actualizare**: 13 Aprilie 2026  
**Versiune**: 1.0  
**Status**: ✅ Gata pentru utilizare
