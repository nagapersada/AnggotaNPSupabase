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

function loadMembers() { return allMembersCache; }

// --- LOGIN ---
function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (user === 'admin' && pass === 'dvteam123') {
        sessionStorage.setItem('isLoggedIn', 'true');
        window.location.href = 'dashboard.html';
    } else { 
        const err = document.getElementById('error');
        if(err) err.innerText = 'Login gagal!'; 
    }
}

// --- STRUKTUR JARINGAN (HORIZONTAL, RAMPING, PADDING SANGAT LUAS) ---
function renderNetwork() {
    const $ = go.GraphObject.make;
    if (diagram) diagram.div = null;
    
    diagram = $(go.Diagram, "networkDiagram", {
        layout: $(go.TreeLayout, { angle: 0, layerSpacing: 100, nodeSpacing: 25 }),
        "undoManager.isEnabled": true,
        "initialContentAlignment": go.Spot.Center,
        "toolManager.mouseWheelBehavior": go.ToolManager.WheelZoom,
        // PADDING DIPERLUAS SECARA MASIF (Sesuai Perintah)
        padding: new go.Margin(150, 150, 150, 150) 
    });

    const downlineCounts = {};
    allMembersCache.forEach(m => downlineCounts[m.uid] = 0);
    allMembersCache.forEach(m => { if (m.upline && downlineCounts.hasOwnProperty(m.upline)) downlineCounts[m.upline]++; });

    // NODE: RAMPING & PADDING TEKS LUAS
    diagram.nodeTemplate = $(go.Node, "Auto",
        $(go.Shape, "RoundedRectangle", { strokeWidth: 1.5, fill: "#111", stroke: "#888", parameter1: 4 }),
        $(go.TextBlock, { 
            margin: new go.Margin(4, 35, 4, 35), // Atas-Bawah 4px (Ramping), Samping 35px (Luas)
            font: "12px sans-serif", 
            stroke: "white" 
        }, new go.Binding("text", "label"))
    );

    // GARIS: PUTIH TEBAL & JELAS
    diagram.linkTemplate = $(go.Link, { routing: go.Link.Orthogonal, corner: 10 }, 
        $(go.Shape, { strokeWidth: 2, stroke: "white" }) 
    );

    const nodes = allMembersCache.map(m => ({ key: m.uid, label: `${m.uid}/${m.name}` }));
    const links = allMembersCache.filter(m => m.upline).map(m => ({ from: m.upline, to: m.uid }));
    diagram.model = new go.GraphLinksModel(nodes, links);
}

// --- DIAGRAM PERTUMBUHAN (KEMBALI KE AWAL) ---
function renderGrowthChart() {
    const ctx = document.getElementById('growthChart');
    if (!ctx) return;
    if (growthChart) growthChart.destroy();

    const members = [...allMembersCache].sort((a, b) => new Date(a.joinDate) - new Date(b.joinDate));
    if (members.length === 0) return;

    const periods = {};
    members.forEach(member => {
        const d = new Date(member.joinDate);
        if(!isNaN(d)) {
            const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate() <= 15 ? 'P1' : 'P2'}`;
            periods[key] = (periods[key] || 0) + 1;
        }
    });

    const labels = Object.keys(periods).map(key => {
        const [y, m, p] = key.split('-');
        return `${new Date(y, m-1).toLocaleString('id-ID', {month:'short'})} ${y} (${p})`;
    });

    growthChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.slice(-12),
            datasets: [{
                label: 'Anggota Baru',
                data: Object.values(periods).slice(-12),
                backgroundColor: 'rgba(255, 215, 0, 0.7)',
                borderColor: 'gold',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, ticks: { color: '#ccc'} },
                x: { ticks: { color: '#ccc'} }
            }
        }
    });
}

// --- DAFTAR LENGKAP ANGGOTA (KEMBALI KE AWAL) ---
function renderMemberList() {
    const tbody = document.getElementById('memberListTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    let list = memberListFilterUid ? [allMembersCache.find(m => m.uid === memberListFilterUid), ...getDownlineHierarchyFlat(allMembersCache, memberListFilterUid)].filter(Boolean) : allMembersCache;
    
    list.forEach((m, i) => {
        const date = new Date(m.joinDate).toLocaleDateString('id-ID');
        tbody.innerHTML += `<tr><td>${i+1}</td><td>${m.name}</td><td>${m.uid}</td><td>${m.upline||'-'}</td><td>${date}</td></tr>`;
    });
}

function getDownlineHierarchyFlat(list, parentUid) {
    let res = []; const children = list.filter(m => m.upline === parentUid);
    for (const c of children) { res.push(c); res = res.concat(getDownlineHierarchyFlat(list, c.uid)); }
    return res;
}

// --- INITIALIZE ---
function initializeDashboard() {
    const el = document.getElementById('totalMembers');
    if (el) el.textContent = allMembersCache.length;
    renderGrowthChart();
    document.getElementById('addMemberButton').onclick = addMember;
    document.getElementById('searchButton').onclick = searchMembers;
    document.getElementById('resetButton').onclick = resetSearch;
    document.getElementById('viewNetworkButton').onclick = () => { window.location.href = 'network.html'; };
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
    document.getElementById('logoutButton').onclick = () => { sessionStorage.clear(); window.location.href = 'index.html'; };
}

function initializeNetworkPage() {
    renderNetwork();
    document.getElementById('backButton').onclick = () => { window.location.href = 'dashboard.html'; };
    document.getElementById('downloadNetworkButton').onclick = downloadNetworkImage;
}

// --- FUNGSI TAMBAHAN (CRUD, SEARCH, DLL) ---
async function addMember() {
    const name = document.getElementById('name').value.trim();
    const uid = document.getElementById('uid').value.trim();
    const upline = document.getElementById('upline').value.trim();
    if(!name || !uid) return showNotification("Wajib diisi!");
    const { error } = await db.from('members').insert([{ nama: name, uid: uid, upline: upline || null, tanggalbergabung: new Date().toISOString() }]);
    if(!error) { await fetchMembersFromSupabase(); initializeDashboard(); showNotification("Berhasil!"); }
}

function searchMembers() {
    const term = document.getElementById('searchTerm').value.toLowerCase();
    const res = allMembersCache.filter(m => m.name.toLowerCase().includes(term) || m.uid.includes(term));
    const container = document.getElementById('searchResultsContainer');
    container.innerHTML = res.map(m => `
        <div class="result-card">
            <p>${m.name} (${m.uid})</p>
            <button onclick="sessionStorage.setItem('focusedMemberUid', '${m.uid}'); window.location.href='network.html';">Struktur</button>
        </div>
    `).join('');
}

function resetSearch() { document.getElementById('searchTerm').value = ''; document.getElementById('searchResultsContainer').innerHTML = ''; }
function showNotification(m) { const n = document.getElementById('notification'); if(n){ n.innerText = m; n.classList.add('show'); setTimeout(()=>n.classList.remove('show'), 3000); } }
function downloadCSV() { /* Logic CSV Asli */ }
function downloadNetworkImage() { /* Logic Image Asli */ }
function ensureFullScreen() { const el = document.documentElement; if (el.requestFullscreen) el.requestFullscreen().catch(()=>{}); }
