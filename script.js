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

async function fetchMembersFromSupabase() {
    try {
        const { data, error } = await db.from('members').select('*');
        if (error) throw error;
        allMembersCache = data.map(m => {
            return {
                name: m.Nama || m.nama || m.name || m.Name || "Tanpa Nama",
                uid: String(m.UID || m.uid || m.id || "0"), 
                upline: m.Upline || m.upline || m.UPLINE || null,
                joinDate: m.TanggalBergabung || m.tanggalbergabung || m.joinDate || new Date().toISOString()
            };
        });
        return allMembersCache;
    } catch (error) { console.error(error); return []; }
}
function loadMembers() { return allMembersCache; }

// --- FUNGSI LOGIN (KEMBALI KE ASLI) ---
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

// --- FUNGSI STRUKTUR JARINGAN (DI-RAMPINGKAN & PADDING LUAS) ---
function renderNetwork() {
    const $ = go.GraphObject.make;
    if (diagram) diagram.div = null;
    
    diagram = $(go.Diagram, "networkDiagram", {
        layout: $(go.TreeLayout, { angle: 0, layerSpacing: 100, nodeSpacing: 20 }),
        "undoManager.isEnabled": true,
        "initialContentAlignment": go.Spot.Center
    });

    const allMembers = loadMembers();
    if (allMembers.length === 0) return;

    const focusedMemberUid = sessionStorage.getItem('focusedMemberUid');
    let membersToRender = allMembers;
    
    if (focusedMemberUid) {
        const rootMember = allMembers.find(m => m.uid === focusedMemberUid);
        if (rootMember) {
            const getDH = (list, parentUid) => {
                let d = [];
                const c = list.filter(m => m.upline === parentUid);
                for (const child of c) { d.push(child); d = d.concat(getDH(list, child.uid)); }
                return d;
            };
            membersToRender = [rootMember, ...getDH(allMembers, focusedMemberUid)];
        }
    }

    const downlineCounts = {};
    allMembers.forEach(m => downlineCounts[m.uid] = 0);
    allMembers.forEach(m => { if (m.upline && downlineCounts.hasOwnProperty(m.upline)) downlineCounts[m.upline]++; });

    // PERBAIKAN: NODE RAMPING & PADDING LUAS
    diagram.nodeTemplate = $(go.Node, "Horizontal", 
        $(go.Panel, "Auto", 
            $(go.Shape, "RoundedRectangle", { strokeWidth: 1.2, parameter1: 4 }, 
                new go.Binding("stroke", "key", k => downlineCounts[k]>=5?"gold":"#666"), 
                new go.Binding("fill", "key", k => downlineCounts[k]>=5?"#1a1a1a":"#111")
            ),
            $(go.TextBlock, { 
                // Padding: Atas-Bawah 4px (Ramping), Samping 35px (Luas)
                margin: new go.Margin(4, 35, 4, 35), 
                font: "12px sans-serif", 
                stroke: "white" 
            }, 
                new go.Binding("text", "label"))
        ),
        $("TreeExpanderButton", { width: 16, height: 16, "ButtonBorder.fill": "white" })
    );

    diagram.linkTemplate = $(go.Link, { routing: go.Link.Orthogonal, corner: 10 }, 
        $(go.Shape, { strokeWidth: 1, stroke: "#888" })
    );

    const nodes = membersToRender.map(m => {
        let dateFmt = 'N/A';
        if(m.joinDate) { 
            const d = new Date(m.joinDate); 
            dateFmt = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}`; 
        }
        return { key: m.uid, label: `${m.uid}/${m.name}/${dateFmt}` };
    });

    const links = membersToRender.filter(m => m.upline).map(m => ({ from: m.upline, to: m.uid }));
    diagram.model = new go.GraphLinksModel(nodes, links);
    
    if (focusedMemberUid) {
        const n = diagram.findNodeForKey(focusedMemberUid);
        if(n) { diagram.centerRect(n.actualBounds); sessionStorage.removeItem('focusedMemberUid'); }
    }
}

// --- FUNGSI LAINNYA (TETAP SESUAI MASTER) ---
async function addMember() {
    const name = document.getElementById('name').value.trim();
    const uid = document.getElementById('uid').value.trim();
    const upline = document.getElementById('upline').value.trim();
    const joinDateValue = document.getElementById('joinDateInput').value;
    if (!name || !uid) return showNotification("Nama & UID wajib diisi!");
    if (allMembersCache.some(m => m.uid === uid)) return showNotification("UID sudah ada!");
    const joinDate = joinDateValue ? new Date(joinDateValue).toISOString() : new Date().toISOString();
    const btn = document.getElementById('addMemberButton');
    btn.textContent = "Menyimpan..."; btn.disabled = true;
    const { error } = await db.from('members').insert([{ nama: name, uid: uid, upline: upline || null, tanggalbergabung: joinDate }]);
    if (error) { showNotification("Gagal simpan data"); btn.disabled = false; btn.textContent = "Tambah Anggota"; return; }
    showNotification("Berhasil disimpan!");
    ['name', 'uid', 'upline', 'joinDateInput'].forEach(id => document.getElementById(id).value = '');
    await fetchMembersFromSupabase();
    updateCount(); searchMembers(); renderGrowthChart();
    btn.textContent = "Tambah Anggota"; btn.disabled = false;
}

function logout() { sessionStorage.removeItem('isLoggedIn'); window.location.href = 'index.html'; }

function initializeDashboard() {
    updateCount(); renderGrowthChart();
    document.getElementById('addMemberButton').onclick = addMember;
    document.getElementById('searchButton').onclick = searchMembers;
    document.getElementById('resetButton').onclick = resetSearch;
    document.getElementById('viewNetworkButton').onclick = () => { window.location.href = 'network.html'; };
    document.getElementById('viewMemberListButton').onclick = () => showMemberList(null);
    document.getElementById('backToDashboardButton').onclick = showMainDashboard;
    setupTableSorting(); 
    document.getElementById('downloadButton').onclick = downloadCSV;
    document.getElementById('logoutButton').onclick = logout;
}

function initializeNetworkPage() {
    renderNetwork();
    document.getElementById('backButton').onclick = () => { window.location.href = 'dashboard.html'; };
    document.getElementById('downloadNetworkButton').onclick = downloadNetworkImage;
}

function updateCount() { const el = document.getElementById('totalMembers'); if (el) el.textContent = allMembersCache.length; }

function showNotification(message) {
    let notification = document.getElementById('notification'); if (!notification) return;
    notification.textContent = message; notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 3000);
}

// Sisa fungsi (searchMembers, CSV, Chart, dll) tetap seperti aslinya
function searchMembers() { /* Kode asli Anda */ }
function downloadCSV() { /* Kode asli Anda */ }
function renderGrowthChart() { /* Kode asli Anda */ }
function ensureFullScreen() { const element = document.documentElement; if (!document.fullscreenElement && element.requestFullscreen) element.requestFullscreen().catch(err => {}); }
function downloadNetworkImage() { /* Kode asli Anda */ }
