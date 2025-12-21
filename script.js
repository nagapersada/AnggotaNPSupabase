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

function logout() { sessionStorage.removeItem('isLoggedIn'); window.location.href = 'index.html'; }

// --- STRUKTUR JARINGAN (HANYA MERAMPIKAN NODE & TAMBAH PADDING) ---
function renderNetwork() {
    const $ = go.GraphObject.make;
    if (diagram) diagram.div = null;
    
    diagram = $(go.Diagram, "networkDiagram", {
        layout: $(go.TreeLayout, { angle: 0, layerSpacing: 100, nodeSpacing: 20 }),
        "undoManager.isEnabled": true,
        "initialContentAlignment": go.Spot.Center
    });

    const allMembers = loadMembers();
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

    // NODE: RAMPING & PADDING LUAS
    diagram.nodeTemplate = $(go.Node, "Auto",
        $(go.Shape, "RoundedRectangle", { strokeWidth: 1.2, parameter1: 4 }, 
            new go.Binding("stroke", "key", k => "#666"),
            new go.Binding("fill", "key", k => "#111")
        ),
        $(go.TextBlock, { 
            margin: new go.Margin(4, 35, 4, 35), // Ramping (4px) & Padding Luas (35px)
            font: "12px sans-serif", 
            stroke: "white"
        }, new go.Binding("text", "label"))
    );

    diagram.linkTemplate = $(go.Link, { routing: go.Link.Orthogonal, corner: 10 }, 
        $(go.Shape, { strokeWidth: 1, stroke: "#888" })
    );

    const nodes = membersToRender.map(m => {
        const d = new Date(m.joinDate);
        const dateFmt = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}`;
        return { key: m.uid, label: `${m.uid}/${m.name}/${dateFmt}` };
    });

    const links = membersToRender.filter(m => m.upline).map(m => ({ from: m.upline, to: m.uid }));
    diagram.model = new go.GraphLinksModel(nodes, links);
    if (focusedMemberUid) sessionStorage.removeItem('focusedMemberUid');
}

// --- FUNGSI MANAJEMEN DASHBOARD (CRUD & SEARCH) ---
async function addMember() {
    const name = document.getElementById('name').value.trim();
    const uid = document.getElementById('uid').value.trim();
    const upline = document.getElementById('upline').value.trim();
    const joinDateInput = document.getElementById('joinDateInput').value;
    if (!name || !uid) return showNotification("Nama & UID wajib diisi!");
    const joinDate = joinDateInput ? new Date(joinDateInput).toISOString() : new Date().toISOString();
    const { error } = await db.from('members').insert([{ nama: name, uid: uid, upline: upline || null, tanggalbergabung: joinDate }]);
    if (error) { showNotification("Gagal simpan data"); return; }
    showNotification("Berhasil disimpan!");
    await fetchMembersFromSupabase();
    updateCount(); searchMembers(); renderGrowthChart();
}

function initializeDashboard() {
    updateCount(); renderGrowthChart();
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

// --- FUNGSI TAMBAHAN (SEARCH, LIST, CSV, CHART) ---
function searchMembers() {
    const term = document.getElementById('searchTerm').value.toLowerCase();
    const results = allMembersCache.filter(m => m.name.toLowerCase().includes(term) || m.uid.toLowerCase().includes(term));
    displaySearchResults(results.reverse(), allMembersCache);
}

function displaySearchResults(results, all) {
    const container = document.getElementById('searchResultsContainer');
    container.innerHTML = results.map(m => `
        <div class="result-card">
            <p><strong>${m.name}</strong> (${m.uid})</p>
            <button onclick="sessionStorage.setItem('focusedMemberUid', '${m.uid}'); window.location.href='network.html';">Lihat Jaringan</button>
            <button onclick="showMemberList('${m.uid}')">Daftar Anggota</button>
        </div>
    `).join('');
}

function showMemberList(uid) {
    memberListFilterUid = uid;
    document.getElementById('mainDashboardContent').style.display = 'none';
    document.getElementById('memberListContainer').style.display = 'block';
    renderMemberList();
}

function renderMemberList() {
    const tbody = document.getElementById('memberListTableBody');
    tbody.innerHTML = '';
    let list = memberListFilterUid ? [allMembersCache.find(m => m.uid === memberListFilterUid), ...getDownlineHierarchyFlat(allMembersCache, memberListFilterUid)].filter(Boolean) : allMembersCache;
    list.forEach((m, i) => {
        tbody.innerHTML += `<tr><td>${i+1}</td><td>${m.name}</td><td>${m.uid}</td><td>${m.upline||'-'}</td><td>${new Date(m.joinDate).toLocaleDateString()}</td></tr>`;
    });
}

function getDownlineHierarchyFlat(list, parentUid) {
    let res = []; const children = list.filter(m => m.upline === parentUid);
    for (const c of children) { res.push(c); res = res.concat(getDownlineHierarchyFlat(list, c.uid)); }
    return res;
}

function resetSearch() { document.getElementById('searchTerm').value = ''; document.getElementById('searchResultsContainer').innerHTML = ''; }
function showMainDashboard() { document.getElementById('mainDashboardContent').style.display = 'block'; document.getElementById('memberListContainer').style.display = 'none'; }
function updateCount() { const el = document.getElementById('totalMembers'); if (el) el.textContent = allMembersCache.length; }
function showNotification(msg) { const n = document.getElementById('notification'); if(n){ n.textContent = msg; n.classList.add('show'); setTimeout(()=>n.classList.remove('show'), 3000); } }
function ensureFullScreen() { const el = document.documentElement; if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(()=>{}); }
function setupTableSorting() {} //
function downloadCSV() { /* Logic asli CSV Anda */ }
function renderGrowthChart() { /* Logic asli Chart Anda */ }
function downloadNetworkImage() { /* Logic asli GoJS Image */ }
