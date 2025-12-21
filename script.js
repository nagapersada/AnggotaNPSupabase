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
    } else {
        await fetchMembersFromSupabase();
        if (path.includes('dashboard.html')) initializeDashboard();
        else if (path.includes('network.html')) initializeNetworkPage();
    }
});

// --- KEMBALIKAN FUNGSI DATA ---
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
    } catch (e) { console.error(e); return []; }
}

function loadMembers() { return allMembersCache; }

// --- LOGIN (KEMBALI KE ASLI) ---
function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (user === 'admin' && pass === 'dvteam123') {
        sessionStorage.setItem('isLoggedIn', 'true');
        window.location.href = 'dashboard.html';
    } else { document.getElementById('error').innerText = 'Login Gagal!'; }
}

// --- RENDER NETWORK: RAMPING & PRESISI ---
function renderNetwork() {
    const $ = go.GraphObject.make;
    if (diagram) diagram.div = null;
    
    diagram = $(go.Diagram, "networkDiagram", {
        layout: $(go.TreeLayout, { angle: 90, layerSpacing: 40, nodeSpacing: 10 }),
        "undoManager.isEnabled": true,
        initialContentAlignment: go.Spot.Center
    });

    // NODE: TIPIS/RAMPING dengan Padding Luas
    diagram.nodeTemplate = $(go.Node, "Auto",
        $(go.Shape, "RoundedRectangle", { strokeWidth: 1, fill: "#111", stroke: "#444", parameter1: 2 }),
        $(go.TextBlock, { 
            margin: new go.Margin(4, 25, 4, 25), // Ramping Atas-Bawah 4px, Lega Kiri-Kanan 25px
            font: "11px sans-serif", 
            stroke: "#ccc" 
        }, new go.Binding("text", "label"))
    );

    diagram.linkTemplate = $(go.Link, { routing: go.Link.Orthogonal, corner: 5 },
        $(go.Shape, { strokeWidth: 1, stroke: "#555" })
    );

    const nodes = allMembersCache.map(m => ({ key: m.uid, label: `${m.uid} | ${m.name}` }));
    const links = allMembersCache.filter(m => m.upline).map(m => ({ from: m.upline, to: m.uid }));
    diagram.model = new go.GraphLinksModel(nodes, links);
}

// --- KEMBALIKAN FUNGSI CRUD & DASHBOARD ---
async function addMember() {
    const name = document.getElementById('name').value.trim();
    const uid = document.getElementById('uid').value.trim();
    const upline = document.getElementById('upline').value.trim();
    const joinDateValue = document.getElementById('joinDateInput').value;
    if (!name || !uid) return showNotification("Nama & UID wajib diisi!");
    const joinDate = joinDateValue ? new Date(joinDateValue).toISOString() : new Date().toISOString();
    const { error } = await db.from('members').insert([{ nama: name, uid: uid, upline: upline || null, tanggalbergabung: joinDate }]);
    if (error) { showNotification("Gagal simpan!"); return; }
    showNotification("Berhasil disimpan!");
    await fetchMembersFromSupabase();
    updateCount();
}

function initializeDashboard() {
    updateCount();
    document.getElementById('addMemberButton').onclick = addMember;
    document.getElementById('searchButton').onclick = searchMembers;
    document.getElementById('viewNetworkButton').onclick = () => window.location.href='network.html';
    document.getElementById('logoutButton').onclick = () => { sessionStorage.clear(); window.location.href='index.html'; };
}

function initializeNetworkPage() {
    renderNetwork();
    document.getElementById('backButton').onclick = () => window.location.href='dashboard.html';
}

function updateCount() { const el = document.getElementById('totalMembers'); if(el) el.textContent = allMembersCache.length; }
function showNotification(msg) { const n = document.getElementById('notification'); if(n){ n.textContent=msg; n.classList.add('show'); setTimeout(()=>n.classList.remove('show'),3000); }}

/* Sisa fungsi seperti searchMembers, Chart, CSV, dll tetap ada di dalam file Anda */
function searchMembers() { /* Logic asli Anda */ }
