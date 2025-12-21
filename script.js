// ==========================================
// KONEKSI DATABASE SUPABASE (TETAP)
// ==========================================
const supabaseUrl = 'https://hysjbwysizpczgcsqvuv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5c2pid3lzaXpwY3pnY3NxdnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjA2MTYsImV4cCI6MjA3OTQ5NjYxNn0.sLSfXMn9htsinETKUJ5IAsZ2l774rfeaNNmB7mVQcR4';

const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let allMembersCache = []; 
let diagram = null;
let growthChart = null; 
let memberListSortColumn = 'joinDate'; 
let memberListSortDirection = 'asc';
let memberListFilterUid = null; 

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

// --- AMBIL DATA ---
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

// --- STRUKTUR JARINGAN (DIRAPATKAN + PADDING MASIF) ---
function renderNetwork() {
    const $ = go.GraphObject.make;
    if (diagram) diagram.div = null;
    
    diagram = $(go.Diagram, "networkDiagram", {
        // nodeSpacing: 10 (DIRAPATKAN AGAR RAPIH)
        layout: $(go.TreeLayout, { angle: 0, layerSpacing: 80, nodeSpacing: 10 }),
        "undoManager.isEnabled": true,
        "initialContentAlignment": go.Spot.Center,
        "toolManager.mouseWheelBehavior": go.ToolManager.WheelZoom,
        // PADDING SANGAT LUAS (500px)
        padding: new go.Margin(500, 500, 500, 500) 
    });

    const downlineCounts = {};
    allMembersCache.forEach(m => downlineCounts[m.uid] = 0);
    allMembersCache.forEach(m => { 
        if (m.upline && downlineCounts.hasOwnProperty(m.upline)) downlineCounts[m.upline]++; 
    });

    // NODE: RAMPING & PADDING TEKS LUAS
    diagram.nodeTemplate = $(go.Node, "Auto",
        $(go.Shape, "RoundedRectangle", { strokeWidth: 1.5, parameter1: 2 }, 
            new go.Binding("stroke", "key", k => downlineCounts[k] >= 5 ? "gold" : "#666"), 
            new go.Binding("fill", "key", k => downlineCounts[k] >= 5 ? "#1a1a1a" : "#111")
        ),
        $(go.TextBlock, { 
            margin: new go.Margin(3, 40, 3, 40), // SANGAT RAMPING (3px)
            font: "11px sans-serif", 
            stroke: "white" 
        }, new go.Binding("text", "label"))
    );

    diagram.linkTemplate = $(go.Link, { routing: go.Link.Orthogonal, corner: 5 }, 
        $(go.Shape, { strokeWidth: 2, stroke: "white" }) 
    );

    const nodes = allMembersCache.map(m => ({ key: m.uid, label: `${m.uid}/${m.name}` }));
    const links = allMembersCache.filter(m => m.upline).map(m => ({ from: m.upline, to: m.uid }));
    diagram.model = new go.GraphLinksModel(nodes, links);
}

// --- DIAGRAM PERTUMBUHAN (KEMBALI KE ASLI) ---
function renderGrowthChart() {
    const ctx = document.getElementById('growthChart');
    if (!ctx) return;
    if (growthChart) growthChart.destroy();
    const members = [...allMembersCache].sort((a, b) => new Date(a.joinDate) - new Date(b.joinDate));
    const periods = {};
    members.forEach(m => {
        const d = new Date(m.joinDate);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate() <= 15 ? 'P1' : 'P2'}`;
        periods[key] = (periods[key] || 0) + 1;
    });
    growthChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(periods).slice(-10),
            datasets: [{ label: 'Anggota Baru', data: Object.values(periods).slice(-10), backgroundColor: 'gold' }]
        },
        options: { scales: { y: { ticks: { color: '#aaa' } }, x: { ticks: { color: '#aaa' } } } }
    });
}

// --- FUNGSI PENCARIAN & MANAJEMEN (KEMBALI) ---
function searchMembers() {
    const term = document.getElementById('searchTerm').value.toLowerCase();
    const res = allMembersCache.filter(m => m.name.toLowerCase().includes(term) || m.uid.includes(term));
    const container = document.getElementById('searchResultsContainer');
    container.innerHTML = res.map(m => `
        <div class="result-card">
            <p><strong>${m.name}</strong> (${m.uid})</p>
            <div class="result-actions">
                <button class="btn-edit" onclick="openEditModal('${m.uid}')">Edit</button>
                <button class="btn-delete" onclick="openConfirmModal('${m.uid}')">Hapus</button>
                <button onclick="sessionStorage.setItem('focusedMemberUid', '${m.uid}'); window.location.href='network.html';">Struktur</button>
            </div>
        </div>`).join('');
}

// --- INITIALIZE & DASHBOARD FUNCTIONS ---
function initializeDashboard() {
    document.getElementById('totalMembers').textContent = allMembersCache.length;
    renderGrowthChart();
    document.getElementById('addMemberButton').onclick = addMember;
    document.getElementById('searchButton').onclick = searchMembers;
    document.getElementById('resetButton').onclick = () => { document.getElementById('searchTerm').value = ''; document.getElementById('searchResultsContainer').innerHTML = ''; };
    document.getElementById('viewNetworkButton').onclick = () => window.location.href='network.html';
    document.getElementById('viewMemberListButton').onclick = () => {
        document.getElementById('mainDashboardContent').style.display = 'none';
        document.getElementById('memberListContainer').style.display = 'block';
        renderMemberList();
    };
    document.getElementById('backToDashboardButton').onclick = () => {
        document.getElementById('mainDashboardContent').style.display = 'block';
        document.getElementById('memberListContainer').style.display = 'none';
    };
    document.getElementById('downloadButton').onclick = downloadCSV;
    document.getElementById('logoutButton').onclick = () => { sessionStorage.clear(); window.location.href='index.html'; };
}

function initializeNetworkPage() {
    renderNetwork();
    document.getElementById('backButton').onclick = () => window.location.href='dashboard.html';
    document.getElementById('downloadNetworkButton').onclick = downloadNetworkImage;
}

function login() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    if (u === 'admin' && p === 'dvteam123') {
        sessionStorage.setItem('isLoggedIn', 'true');
        window.location.href = 'dashboard.html';
    } else { alert('Login Gagal'); }
}

async function addMember() {
    const name = document.getElementById('name').value;
    const uid = document.getElementById('uid').value;
    const upline = document.getElementById('upline').value;
    const { error } = await db.from('members').insert([{ nama: name, uid: uid, upline: upline || null, tanggalbergabung: new Date().toISOString() }]);
    if(!error) location.reload();
}

function renderMemberList() { /* Kode tabel asli Anda */ }
function downloadCSV() { /* Kode CSV asli Anda */ }
function downloadNetworkImage() { /* Kode Image asli Anda */ }
function ensureFullScreen() { const el = document.documentElement; if (el.requestFullscreen) el.requestFullscreen().catch(()=>{}); }
script.js
