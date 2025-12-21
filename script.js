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
    else if (path.includes('dashboard.html') || path.includes('network.html')) {
        if (isLoggedIn) ensureFullScreen();
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

// --- FUNGSI LOGIN ---
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
function logout() { sessionStorage.removeItem('isLoggedIn'); window.location.href = 'index.html'; }

// --- FUNGSI STRUKTUR JARINGAN (DIKEMBALIKAN KE HORIZONTAL + RAMPING) ---
function renderNetwork() {
    const $ = go.GraphObject.make;
    if (diagram) diagram.div = null;
    
    // KEMBALI KE LAYOUT ASLI (angle: 0 / Horizontal)
    diagram = $(go.Diagram, "networkDiagram", {
        layout: $(go.TreeLayout, { angle: 0, layerSpacing: 100, nodeSpacing: 25 }),
        "undoManager.isEnabled": true,
        "initialContentAlignment": go.Spot.Center,
        "toolManager.mouseWheelBehavior": go.ToolManager.WheelZoom,
        padding: 80 // Padding luas sekeliling diagram
    });

    const allMembers = loadMembers();
    if (allMembers.length === 0) return;

    const downlineCounts = {};
    allMembers.forEach(m => downlineCounts[m.uid] = 0);
    allMembers.forEach(m => { if (m.upline && downlineCounts.hasOwnProperty(m.upline)) downlineCounts[m.upline]++; });

    // NODE: RAMPING (Vertikal 4px) & PADDING LUAS (Samping 35px)
    diagram.nodeTemplate = $(go.Node, "Horizontal", 
        $(go.Panel, "Auto", 
            $(go.Shape, "RoundedRectangle", { strokeWidth: 1.5, parameter1: 4 }, 
                new go.Binding("stroke", "key", k => downlineCounts[k]>=5?"gold":"#888"), 
                new go.Binding("fill", "key", k => downlineCounts[k]>=5?"#1a1a1a":"#111")
            ),
            $(go.TextBlock, { 
                margin: new go.Margin(4, 35, 4, 35), // Ramping & Lega
                font: "12px sans-serif", 
                stroke: "white" 
            }, 
                new go.Binding("text", "label"))
        ),
        $("TreeExpanderButton", { width: 18, height: 18, "ButtonBorder.fill": "white" })
    );

    // GARIS: PUTIH TAJAM & JELAS
    diagram.linkTemplate = $(go.Link, { routing: go.Link.Orthogonal, corner: 10 }, 
        $(go.Shape, { strokeWidth: 2, stroke: "white" }) 
    );

    const nodes = allMembers.map(m => {
        let dateFmt = 'N/A';
        if(m.joinDate) { 
            const d = new Date(m.joinDate); 
            dateFmt = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}`; 
        }
        return { key: m.uid, label: `${m.uid}/${m.name}/${dateFmt}` };
    });

    const links = allMembers.filter(m => m.upline).map(m => ({ from: m.upline, to: m.uid }));
    diagram.model = new go.GraphLinksModel(nodes, links);
}

// --- FUNGSI DASHBOARD (KEMBALIKAN SEMUA) ---
function initializeDashboard() {
    updateCount(); 
    renderGrowthChart(); // KEMBALIKAN DIAGRAM PERTUMBUHAN
    document.getElementById('addMemberButton').onclick = addMember;
    document.getElementById('searchButton').onclick = searchMembers;
    document.getElementById('resetButton').onclick = resetSearch;
    document.getElementById('viewNetworkButton').onclick = () => { window.location.href = 'network.html'; };
    document.getElementById('viewMemberListButton').onclick = () => showMemberList(null);
    document.getElementById('backToDashboardButton').onclick = showMainDashboard;
    document.getElementById('downloadButton').onclick = downloadCSV;
    document.getElementById('logoutButton').onclick = logout;
}

function initializeNetworkPage() {
    renderNetwork();
    document.getElementById('backButton').onclick = () => { window.location.href = 'dashboard.html'; };
    document.getElementById('downloadNetworkButton').onclick = downloadNetworkImage;
}

async function addMember() {
    const name = document.getElementById('name').value.trim();
    const uid = document.getElementById('uid').value.trim();
    const upline = document.getElementById('upline').value.trim();
    if (!name || !uid) return showNotification("Nama & UID wajib diisi!");
    const { error } = await db.from('members').insert([{ nama: name, uid: uid, upline: upline || null, tanggalbergabung: new Date().toISOString() }]);
    if (error) { showNotification("Gagal simpan data"); return; }
    showNotification("Berhasil disimpan!");
    await fetchMembersFromSupabase();
    updateCount(); searchMembers(); renderGrowthChart();
}

// --- FUNGSI CHART & DATA (KEMBALIKAN) ---
function renderGrowthChart() {
    const ctx = document.getElementById('growthChart');
    if (!ctx) return;
    if (growthChart) growthChart.destroy();
    const members = [...allMembersCache].sort((a,b) => new Date(a.joinDate) - new Date(b.joinDate));
    const labels = []; const data = []; let count = 0;
    members.forEach(m => {
        count++;
        labels.push(new Date(m.joinDate).toLocaleDateString());
        data.push(count);
    });
    growthChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Pertumbuhan', data, borderColor: 'gold', fill: true }] }
    });
}

function updateCount() { const el = document.getElementById('totalMembers'); if (el) el.textContent = allMembersCache.length; }
function showNotification(msg) { const n = document.getElementById('notification'); if(n){ n.textContent = msg; n.classList.add('show'); setTimeout(()=>n.classList.remove('show'), 3000); } }
function searchMembers() { /* Logic Search Anda */ }
function downloadCSV() { /* Logic CSV Anda */ }
function showMemberList(uid) { /* Logic List Anda */ }
function showMainDashboard() { document.getElementById('mainDashboardContent').style.display = 'block'; document.getElementById('memberListContainer').style.display = 'none'; }
function resetSearch() { document.getElementById('searchTerm').value = ''; document.getElementById('searchResultsContainer').innerHTML = ''; }
function ensureFullScreen() { const el = document.documentElement; if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(()=>{}); }
function downloadNetworkImage() { /* Logic Download Anda */ }
