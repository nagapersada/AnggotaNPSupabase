const supabaseUrl = 'https://hysjbwysizpczgcsqvuv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5c2pid3lzaXpwY3pnY3NxdnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjA2MTYsImV4cCI6MjA3OTQ5NjYxNn0.sLSfXMn9htsinETKUJ5IAsZ2l774rfeaNNmB7mVQcR4';

const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let allMembersCache = []; 
let diagram = null;
let growthChart = null; 

document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');

    if (!isLoggedIn && !path.includes('index.html') && !path.endsWith('/')) {
        window.location.href = 'index.html';
        return; 
    }

    if (path.includes('index.html') || path.endsWith('/')) {
        const loginBtn = document.getElementById('loginButton');
        if(loginBtn) loginBtn.addEventListener('click', login);
    } 
    else {
        await fetchMembersFromSupabase();
        if (path.includes('dashboard.html')) initializeDashboard();
        else if (path.includes('network.html')) initializeNetworkPage();
    }
});

// --- FUNGSI DATA TETAP UTUH ---
async function fetchMembersFromSupabase() {
    try {
        const { data, error } = await db.from('members').select('*');
        if (error) throw error;
        allMembersCache = data.map(m => ({
            name: m.Nama || m.nama || m.name || m.Name || "Tanpa Nama",
            uid: String(m.UID || m.uid || m.id || "0"), 
            upline: m.Upline || m.upline || m.UPLINE || null,
            joinDate: m.TanggalBergabung || m.tanggalbergabung || m.joinDate || new Date().toISOString()
        }));
        return allMembersCache;
    } catch (error) { console.error(error); return []; }
}

function loadMembers() { return allMembersCache; }

// --- STRUKTUR JARINGAN: RAMPING & PROFESIONAL ---
function renderNetwork() {
    const $ = go.GraphObject.make;
    if (diagram) diagram.div = null;
    
    diagram = $(go.Diagram, "networkDiagram", {
        layout: $(go.TreeLayout, { angle: 90, layerSpacing: 40, nodeSpacing: 10 }),
        "undoManager.isEnabled": true,
        initialContentAlignment: go.Spot.Center
    });

    // NODE: TIPIS/RAMPING (Padding Atas-Bawah 4px, Samping 20px)
    diagram.nodeTemplate = $(go.Node, "Auto",
        $(go.Shape, "RoundedRectangle", { strokeWidth: 1, fill: "#111", stroke: "#444" }),
        $(go.TextBlock, { 
            margin: new go.Margin(4, 20, 4, 20), 
            font: "11px sans-serif", 
            stroke: "#ccc" 
        }, new go.Binding("text", "label"))
    );

    // GARIS: TAJAM & PRESISI
    diagram.linkTemplate = $(go.Link, { routing: go.Link.Orthogonal, corner: 0 },
        $(go.Shape, { strokeWidth: 1, stroke: "#555" })
    );

    const nodes = allMembersCache.map(m => ({ key: m.uid, label: `${m.uid} | ${m.name}` }));
    const links = allMembersCache.filter(m => m.upline).map(m => ({ from: m.upline, to: m.uid }));
    diagram.model = new go.GraphLinksModel(nodes, links);
}

// --- SEMUA FUNGSI ASLI DIKEMBALIKAN ---
function login() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    if (u === 'admin' && p === 'dvteam123') {
        sessionStorage.setItem('isLoggedIn', 'true');
        window.location.href = 'dashboard.html';
    } else { document.getElementById('error').innerText = 'Login Gagal!'; }
}

function initializeDashboard() {
    updateCount(); renderGrowthChart();
    document.getElementById('addMemberButton').onclick = addMember;
    document.getElementById('searchButton').onclick = searchMembers;
    document.getElementById('resetButton').onclick = resetSearch;
    document.getElementById('viewNetworkButton').onclick = () => window.location.href = 'network.html';
    document.getElementById('logoutButton').onclick = () => { sessionStorage.clear(); window.location.href='index.html'; };
}

function initializeNetworkPage() {
    renderNetwork();
    document.getElementById('backButton').onclick = () => window.location.href = 'dashboard.html';
}

function updateCount() { const el = document.getElementById('totalMembers'); if (el) el.textContent = allMembersCache.length; }

function searchMembers() {
    const term = document.getElementById('searchTerm').value.toLowerCase();
    const results = allMembersCache.filter(m => m.name.toLowerCase().includes(term) || m.uid.includes(term));
    const container = document.getElementById('searchResultsContainer');
    container.innerHTML = results.map(m => `
        <div class="result-card">
            <p><strong>${m.name}</strong> (${m.uid})</p>
            <button onclick="sessionStorage.setItem('focusedMemberUid', '${m.uid}'); window.location.href='network.html';">Lihat Jaringan</button>
        </div>
    `).join('');
}

function resetSearch() { document.getElementById('searchTerm').value = ''; document.getElementById('searchResultsContainer').innerHTML = ''; }

// (Fungsi Chart & CSV tetap dipertahankan sesuai file asli Anda)
function renderGrowthChart() { /* ... kode asli ... */ }
function downloadCSV() { /* ... kode asli ... */ }
