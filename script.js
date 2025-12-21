// ==========================================
// KONEKSI DATABASE SUPABASE (TETAP)
// ==========================================
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

// --- FUNGSI DATA ---
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

// --- STRUKTUR JARINGAN (RAMPING, GARIS JELAS, PADDING LUAS) ---
function renderNetwork() {
    const $ = go.GraphObject.make;
    if (diagram) diagram.div = null;
    
    diagram = $(go.Diagram, "networkDiagram", {
        layout: $(go.TreeLayout, { angle: 90, layerSpacing: 50, nodeSpacing: 20 }),
        "undoManager.isEnabled": true,
        "toolManager.mouseWheelBehavior": go.ToolManager.WheelZoom, // Aktifkan Zoom
        initialContentAlignment: go.Spot.Center,
        padding: 50 // Padding sekeliling diagram agar node di ujung terlihat
    });

    // NODE: RAMPING & PADDING LUAS (cite: 7)
    diagram.nodeTemplate = $(go.Node, "Auto",
        $(go.Shape, "RoundedRectangle", { 
            strokeWidth: 1.5, 
            fill: "#111", 
            stroke: "#ffd700", // Garis kotak emas agar kontras
            parameter1: 2 
        }),
        $(go.TextBlock, { 
            margin: new go.Margin(4, 25, 4, 25), // Ramping secara vertikal
            font: "11px sans-serif", 
            stroke: "#eee" 
        }, new go.Binding("text", "label"))
    );

    // GARIS: SANGAT JELAS (cite: 7)
    diagram.linkTemplate = $(go.Link, { routing: go.Link.Orthogonal, corner: 0 },
        $(go.Shape, { strokeWidth: 2, stroke: "#ffffff" }) // Garis putih tebal agar terlihat jelas di bg hitam
    );

    const nodes = allMembersCache.map(m => ({ key: m.uid, label: `${m.uid} | ${m.name}` }));
    const links = allMembersCache.filter(m => m.upline).map(m => ({ from: m.upline, to: m.uid }));
    diagram.model = new go.GraphLinksModel(nodes, links);
}

// --- DIAGRAM PERTUMBUHAN (KEMBALI) ---
function renderGrowthChart() {
    const ctx = document.getElementById('growthChart');
    if (!ctx) return;
    if (growthChart) growthChart.destroy();

    const members = [...allMembersCache].sort((a, b) => new Date(a.joinDate) - new Date(b.joinDate));
    const counts = {};
    
    members.forEach(m => {
        const date = new Date(m.joinDate).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
        counts[date] = (counts[date] || 0) + 1;
    });

    growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                label: 'Pertumbuhan Anggota',
                data: Object.values(counts),
                borderColor: '#ffd700',
                backgroundColor: 'rgba(255, 215, 0, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, grid: { color: '#222' }, ticks: { color: '#aaa' } },
                x: { grid: { color: '#222' }, ticks: { color: '#aaa' } }
            },
            plugins: { legend: { labels: { color: '#eee' } } }
        }
    });
}

// --- FUNGSI LOGIN & DASHBOARD ---
function login() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    if (u === 'admin' && p === 'dvteam123') {
        sessionStorage.setItem('isLoggedIn', 'true');
        window.location.href = 'dashboard.html';
    } else { alert('Login Gagal'); }
}

function initializeDashboard() {
    const el = document.getElementById('totalMembers');
    if(el) el.textContent = allMembersCache.length;
    renderGrowthChart(); // Panggil diagram pertumbuhan
    document.getElementById('addMemberButton').onclick = addMember;
    document.getElementById('logoutButton').onclick = () => { sessionStorage.clear(); window.location.href='index.html'; };
    document.getElementById('viewNetworkButton').onclick = () => window.location.href='network.html';
}

function initializeNetworkPage() {
    renderNetwork();
    document.getElementById('backButton').onclick = () => window.location.href='dashboard.html';
}

async function addMember() {
    const name = document.getElementById('name').value;
    const uid = document.getElementById('uid').value;
    const upline = document.getElementById('upline').value;
    if(!name || !uid) return;
    const { error } = await db.from('members').insert([{ nama: name, uid: uid, upline: upline || null, tanggalbergabung: new Date().toISOString() }]);
    if(!error) { await fetchMembersFromSupabase(); initializeDashboard(); }
}
