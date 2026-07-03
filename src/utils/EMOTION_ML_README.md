# Emotion-Based ML Course Recommendation System
## Sistem de Recomandare Cursuri Bazat pe Emoție și Deep Learning

### 📋 Descriere

Acest sistem folosește Machine Learning și Deep Learning pentru a recomanda cursuri personalizate bazate pe:

1. **Emoția curentă a utilizatorului** - Selectată la autentificare prin MoodModal
2. **Nivelul de energie** - Ridicată, Medie sau Scăzută
3. **Istoricul cursurilor** - Cursuri la care s-a înscris sau pe care le-a completat
4. **Tag-urile/Label-urile cursurilor** - Pentru potrivire contextuală

### 🏗️ Arhitectura Sistemului

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  MoodModal  │  │   App.tsx    │  │ emotionRecService │  │
│  │ (selectare  │→ │ (afișare     │→ │ (comunicare       │  │
│  │  emoție)    │  │ recomandări) │  │  cu API)          │  │
│  └─────────────┘  └──────────────┘  └───────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP REST API
┌────────────────────────────▼────────────────────────────────┐
│                    Backend (Python Flask)                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              emotion_recommendation_api.py               ││
│  │         (Flask Server - Port 5001)                       ││
│  └─────────────────────────────────────────────────────────┘│
│                             │                                │
│  ┌─────────────────────────▼─────────────────────────────┐  │
│  │           emotion_based_recommender.py                 │  │
│  │  ┌─────────────────┐  ┌──────────────────────────┐   │  │
│  │  │ EmotionTagAffinity│ │EmotionRecommenderModel  │   │  │
│  │  │ (Mood-Tag Matrix) │ │ (Deep Learning/TF)      │   │  │
│  │  └─────────────────┘  └──────────────────────────┘   │  │
│  │                                                        │  │
│  │  ┌─────────────────┐  ┌──────────────────────────┐   │  │
│  │  │ FeatureEncoder  │  │RecommendationEngine     │   │  │
│  │  │ (Tag/Cat vocab) │  │ (Main Logic)            │   │  │
│  │  └─────────────────┘  └──────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                    MongoDB Atlas                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │   courses   │  │user_profiles │  │ user_interactions │  │
│  └─────────────┘  └──────────────┘  └───────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 🧠 Algoritmul ML/DL

#### 1. Matricea de Afinitate Emoție-Tag

```python
EMOTION_TAG_AFFINITY = {
    Emotion.MOTIVAT: {
        "achievement": 0.95, "leadership": 0.95, "business": 0.90,
        "goals": 0.90, "success": 0.90, "intensive": 0.85,
        ...
    },
    Emotion.RELAXAT: {
        "creative": 0.95, "artistic": 0.90, "relaxing": 0.90,
        "easy": 0.80, "beginner": 0.75,
        ...
    },
    # ... pentru toate cele 6 emoții
}
```

#### 2. Modelul Deep Learning (când TensorFlow este disponibil)

```
Input Layers:
├── emotion_input (embedding dim=32)
├── energy_input (embedding dim=16)
├── course_tags_input (dense → dim=32)
├── course_category_input (embedding dim=32)
├── user_history_input (dense → dim=32)
└── course_features_input (rating, students, progress, duration)

Processing:
├── Concatenate all features
├── Hidden Layer 1 (128 units, ReLU, BatchNorm, Dropout)
├── Hidden Layer 2 (64 units, ReLU, BatchNorm, Dropout)
└── Hidden Layer 3 (32 units, ReLU, BatchNorm, Dropout)

Output:
└── recommendation_score (sigmoid, 0-1)
```

#### 3. Scorul Final de Recomandare

```
Final Score = (emotion_match × 0.40) + 
              (history_match × 0.25) + 
              (category_match × 0.20) + 
              (popularity × 0.15)
```

### 🚀 Cum să Pornești

#### 1. Instalează Dependențele Python

```bash
cd src/utils
pip install -r requirements_emotion_ml.txt
```

#### 2. Pornește Serverul ML API

```bash
python start_ml_server.py --port 5001
```

Sau direct:
```bash
python emotion_recommendation_api.py
```

#### 3. Configurează Frontend-ul (opțional)

În fișierul `.env`:
```
VITE_ML_API_URL=http://localhost:5001
```

### 📡 API Endpoints

#### GET /api/health
Verifică starea serverului.

```json
{
    "status": "healthy",
    "engine_initialized": true,
    "mongodb_connected": true
}
```

#### POST /api/recommendations
Obține recomandări personalizate.

**Request:**
```json
{
    "userId": "user-123",
    "dailyMood": {
        "mood": "motivat",
        "energy": "ridicata"
    },
    "enrolledCourses": ["course-1"],
    "completedCourses": [],
    "numRecommendations": 10
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "recommendations": [
            {
                "courseId": "course-3",
                "title": "Business Strategy",
                "recommendationScore": 87.5,
                "explanation": "Potrivire excelentă! Se potrivește cu starea ta de motivat",
                "matchFactors": {
                    "emotionMatch": 0.92,
                    "energyMatch": 1.2,
                    "historyMatch": 0.0,
                    "categoryMatch": 0.95
                }
            }
        ],
        "userMood": "motivat",
        "userEnergy": "ridicata",
        "count": 10
    }
}
```

#### POST /api/recommendations/mood
Recomandări pentru o emoție specifică.

#### POST /api/interactions
Înregistrează interacțiuni pentru antrenarea modelului.

### 🎯 Emoțiile Disponibile

| Emoție | Descriere | Categorii Recomandate |
|--------|-----------|----------------------|
| `felicit` (Fericit) | 😊 | creative, music, featured |
| `motivat` (Motivat) | 💪 | business, tech, featured |
| `relaxat` (Relaxat) | 😌 | creative, wellness, featured |
| `curios` (Curios) | 🤔 | tech, business, creative |
| `productiv` (Productiv) | ⚡ | business, tech, featured |
| `creativ` (Creativ) | 🎨 | creative, music, design |

### 🔋 Nivelurile de Energie

| Nivel | Descriere | Modificatori |
|-------|-----------|--------------|
| `ridicata` | 🚀 Energie ridicată | +30% pentru cursuri intensive, challenging |
| `medie` | 🌟 Energie medie | Balance pentru toate |
| `scazuta` | 🌙 Energie scăzută | +30% pentru cursuri relaxante, ușoare |

### 📁 Structura Fișierelor

```
src/utils/
├── emotion_based_recommender.py      # Modelul ML/DL principal
├── emotion_recommendation_api.py     # Flask API Server
├── emotionRecommendationService.ts   # TypeScript client service
├── useEmotionRecommendations.ts      # React Hook
├── start_ml_server.py                # Script de pornire server
├── requirements_emotion_ml.txt       # Dependențe Python
└── EMOTION_ML_README.md              # Această documentație
```

### 🔄 Fallback System

Sistemul are un fallback automat când TensorFlow nu este disponibil:

1. **TensorFlow disponibil** → Folosește rețeaua neuronală
2. **TensorFlow indisponibil** → Folosește scorul bazat pe reguli (Emotion-Tag Affinity Matrix)
3. **API indisponibil** → Frontend-ul folosește `mlRecommendations.ts` local

### 💾 Persistența Datelor

- **Interacțiunile utilizatorilor** sunt salvate în MongoDB pentru antrenarea viitoare
- **Profilurile utilizatorilor** sunt actualizate cu mood și energie
- **Cache-ul recomandărilor** are TTL de 24 ore

### 🧪 Testare

```bash
# Test basic al engine-ului
python emotion_based_recommender.py

# Test API endpoints
curl http://localhost:5001/api/health
curl -X POST http://localhost:5001/api/recommendations \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","dailyMood":{"mood":"motivat","energy":"ridicata"}}'
```

### 📈 Îmbunătățiri Viitoare

1. **Online Learning** - Antrenarea continuă pe baza interacțiunilor
2. **Collaborative Filtering** - Recomandări bazate pe utilizatori similari
3. **Content Embeddings** - Folosirea BERT pentru descrieri de cursuri
4. **A/B Testing** - Compararea diferitelor strategii de recomandare
5. **Explainability** - SHAP/LIME pentru explicații mai detaliate

---

**Autor:** StreamClass ML Team  
**Versiune:** 2.0.0  
**Data:** Decembrie 2025
