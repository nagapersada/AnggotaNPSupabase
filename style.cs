/* === ROOT & BODY === */
:root {
  --warna-utama: #FFD700; /* Gold */
  --warna-aksen: #C5A021; /* Darker Gold */
  --warna-bg-utama: #0F0F0F; 
  --warna-bg-kartu: #181818; 
  --warna-teks: #E0E0E0;   
  --warna-teks-sekunder: #999;
  --warna-border: #2A2A2A;
  --glass-bg: rgba(255, 255, 255, 0.03);
}

body {
  font-family: 'Inter', -apple-system, sans-serif;
  background-color: var(--warna-bg-utama);
  color: var(--warna-teks);
  margin: 0;
  padding: 0;
  line-height: 1.6;
  -webkit-user-select: none;
  user-select: none;
}

/* === TATA LETAK UTAMA === */
.dashboard {
  max-width: 1100px;
  margin: 40px auto;
  padding: 0 20px;
  animation: fadeIn 0.8s ease-out;
  text-align: center;
}

.small-logo {
  width: 80px;
  height: auto;
  margin-bottom: 10px;
  filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.2));
}

.dashboard h2 {
  font-weight: 700;
  letter-spacing: -0.5px;
  margin-bottom: 40px;
  background: linear-gradient(to bottom, #FFF, #AAA);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* === DESAIN KARTU (MODERN & CLEAN) === */
.card {
  background-color: var(--warna-bg-kartu);
  border: 1px solid var(--warna-border);
  border-radius: 16px;
  padding: 30px;
  margin-bottom: 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  text-align: left;
}

.card h3 {
  font-size: 1.1em;
  color: var(--warna-utama);
  margin-bottom: 20px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* === LAYOUT GRID === */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 24px;
}

.stats-card {
  background: linear-gradient(145deg, #1e1e1e, #141414);
}

#totalMembers {
  font-size: 4em;
  font-weight: 800;
  color: var(--warna-utama);
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
}

/* === FORM (PRESISI) === */
#form-container {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 12px;
  align-items: center;
}

.input-label {
  color: var(--warna-teks-sekunder);
  font-size: 0.85em;
  font-weight: 600;
}

/* === ELEMEN FORM === */
input[type="text"], input[type="password"], input[type="date"], select {
  background-color: #0A0A0A;
  border: 1px solid var(--warna-border);
  border-radius: 10px;
  padding: 12px 16px;
  color: white;
  transition: 0.3s;
}

input:focus {
  border-color: var(--warna-utama);
  outline: none;
  background-color: #111;
}

/* === TOMBOL === */
button {
  background: linear-gradient(135deg, var(--warna-utama), var(--warna-aksen));
  color: #000;
  padding: 14px 24px;
  border-radius: 10px;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.8em;
  letter-spacing: 0.5px;
  border: none;
  transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(255, 215, 0, 0.4);
}

button.btn-secondary { background: #2A2A2A; color: #FFF; }
button.btn-danger { background: #451313; color: #FF9999; border: 1px solid #631C1C; }

/* === DIAGRAM JARINGAN === */
#networkDiagram {
  width: 100%;
  height: 80vh;
  background: radial-gradient(circle at center, #1a1a1a 0%, #000 100%);
  border-radius: 20px;
  border: 1px solid var(--warna-border);
}

/* === KARTU HASIL PENCARIAN === */
.result-card {
  background: #121212;
  border-radius: 12px;
  padding: 20px;
  border-left: 4px solid var(--warna-utama);
  margin-bottom: 16px;
}

.info-label { font-size: 0.7em; color: var(--warna-teks-sekunder); }
.info-value { font-size: 1.05em; color: #FFF; }

/* === TABEL === */
.results-table { border-radius: 10px; overflow: hidden; border: none; }
.results-table th { background-color: #000; padding: 18px; font-size: 0.85em; }
.results-table td { padding: 15px; border-bottom: 1px solid #222; }

@media (max-width: 768px) {
  .dashboard-grid { grid-template-columns: 1fr; }
  #form-container { grid-template-columns: 1fr; gap: 5px; }
  .input-label { margin-bottom: 0; }
}
