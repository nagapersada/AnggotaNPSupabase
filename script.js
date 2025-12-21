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

// --- STRUKTUR JARINGAN (KEMBALI KE ASLI + PADDING MASIF) ---
function renderNetwork() {
    const $ = go.GraphObject.make;
    if (diagram) diagram.div = null;
    
    diagram = $(go.Diagram, "networkDiagram", {
        layout: $(go.TreeLayout, { angle: 0, layerSpacing: 100, nodeSpacing: 25 }),
        "undoManager.isEnabled": true,
        "initialContentAlignment": go.Spot.Center,
        "toolManager.mouseWheelBehavior": go.ToolManager.WheelZoom,
        // PADDING SANGAT LUAS (300px) AGAR BEBAS DI-ZOOM & GESER
        padding: new go.Margin(300, 300, 300, 300) 
    });

    // HITUNG DOWNLINE UNTUK STATUS VIP/GOLD (STATUS ASLI)
    const downlineCounts = {};
    allMembersCache.forEach(m => downlineCounts[m.uid] = 0);
    allMembersCache.forEach(m => { 
        if (m.upline && downlineCounts.hasOwnProperty(m.upline)) downlineCounts[m.upline]++; 
    });

    // NODE: RAMPING + INDIKATOR VIP EMAS (KEMBALI KE LOGIKA MASTER)
    diagram.nodeTemplate = $(go.Node, "Horizontal", 
        $(go.Panel, "Auto", 
            $(go.Shape, "RoundedRectangle", { strokeWidth: 2, parameter1: 4 }, 
                // Jika downline >= 5 maka Emas (VIP), jika tidak maka Abu-abu
                new go.Binding("stroke", "key", k => downlineCounts[k] >= 5 ? "gold" : "#888"), 
                new go.Binding("fill", "key", k => downlineCounts[k] >= 5 ? "#1a1a1a" : "#111")
            ),
            $(go.TextBlock, { 
                margin: new go.Margin(5, 40, 5, 40), // Ramping & Padding Luas
                font: "bold 12px sans-serif", 
                stroke: "white" 
            }, 
                new go.Binding("text", "label"))
        ),
        $("TreeExpanderButton", { width: 18, height: 18, "ButtonBorder.fill": "white" })
    );

    // GARIS PUTIH TEBAL
    diagram.linkTemplate = $(go.Link, { routing: go.Link.Orthogonal, corner: 10 }, 
        $(go.Shape, { strokeWidth: 2, stroke: "white" }) 
    );

    const nodes = allMembersCache.map(m => {
        let dateFmt = 'N/A';
        if(m.joinDate) { 
            const d = new Date(m.joinDate); 
            dateFmt = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}`; 
        }
        return { key: m.uid, label: `${m.uid}/${m.name}/${dateFmt}` };
    });

    const links = allMembersCache.filter(m => m.upline).map(m => ({ from: m.upline, to: m.uid }));
    diagram.model = new go.GraphLinksModel(nodes, links);
}

// --- DIAGRAM PERTUMBUHAN (KEMBALI KE ASLI BAR CHART) ---
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
            labels: Object.keys(periods).map(k => k.replace('-', '/')).slice(-10),
            datasets: [{ label: 'Anggota Baru', data: Object.values(periods).slice(-10), backgroundColor: 'gold' }]
        }
    });
}

// --- FUNGSI DAFTAR ANGGOTA & INITIALIZE ---
function renderMemberList() {
    const tbody = document.getElementById('memberListTableBody');
    if(!tbody) return;
    tbody.innerHTML = allMembersCache.map((m, i) => `
        <tr>
            <td>${i+1}</td>
            <td>${m.name}</td>
            <td>${m.uid}</td>
            <td>${m.upline || '-'}</td>
            <td>${new Date(m.joinDate).toLocaleDateString()}</td>
        </tr>`).join('');
}

function initializeDashboard() {
    document.getElementById('totalMembers').textContent = allMembersCache.length;
    renderGrowthChart();
    document.getElementById('addMemberButton').onclick = addMember;
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
    document.getElementById('logoutButton').onclick = () => { sessionStorage.clear(); window.location.href='index.html'; };
}

function initializeNetworkPage() {
    renderNetwork();
    document.getElementById('backButton').onclick = () => window.location.href='dashboard.html';
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
