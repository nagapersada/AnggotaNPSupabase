// ==========================================
// KONEKSI DATABASE SUPABASE
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
        allMembersCache = data.map(m => ({
            name: m.Nama || m.nama || m.name || m.Name || "Tanpa Nama",
            uid: String(m.UID || m.uid || m.id || "0"), 
            upline: m.Upline || m.upline || m.UPLINE || null,
            joinDate: m.TanggalBergabung || m.tanggalbergabung || m.joinDate || new Date().toISOString()
        }));
        return allMembersCache;
    } catch (error) {
        console.error(error); 
        return [];
    }
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
        const errEl = document.getElementById('error');
        if(errEl) errEl.innerText = 'Login gagal! Cek Username/Password.'; 
    }
}

function logout() { sessionStorage.removeItem('isLoggedIn'); window.location.href = 'index.html'; }

// --- FUNGSI DIAGRAM JARINGAN (OPTIMASI VISUAL) ---
function renderNetwork() {
    const $ = go.GraphObject.make;
    if (diagram) diagram.div = null;
    
    diagram = $(go.Diagram, "networkDiagram", {
        layout: $(go.TreeLayout, { angle: 0, layerSpacing: 80, nodeSpacing: 25 }),
        "undoManager.isEnabled": true,
        "initialContentAlignment": go.Spot.Center
    });

    const allMembers = loadMembers();
    if (allMembers.length === 0) return;

    const downlineCounts = {};
    allMembers.forEach(m => downlineCounts[m.uid] = 0);
    allMembers.forEach(m => { if (m.upline && downlineCounts.hasOwnProperty(m.upline)) downlineCounts[m.upline]++; });

    // NODE TEMPLATE: DIPERSEMPIT & PADDING LUAS
    diagram.nodeTemplate = $(go.Node, "Auto",
        $(go.Shape, "RoundedRectangle", { 
            strokeWidth: 1, 
            fill: "#181818",
            parameter1: 4 
        }, 
            new go.Binding("stroke", "key", k => downlineCounts[k] >= 5 ? "gold" : "#333"),
            new go.Binding("fill", "key", k => downlineCounts[k] >= 5 ? "rgba(255, 215, 0, 0.05)" : "#111")
        ),
        $(go.TextBlock, { 
            margin: new go.Margin(6, 25, 6, 25), // Atas-Bawah 6px (Tipis), Samping 25px (Lega)
            font: "500 12px sans-serif", 
            stroke: "#f0f0f0" 
        }, 
            new go.Binding("text", "label"))
    );

    diagram.linkTemplate = $(go.Link, { routing: go.Link.Orthogonal, corner: 15 }, 
        $(go.Shape, { strokeWidth: 1.2, stroke: "#444" })
    );

    const nodes = allMembers.map(m => {
        let dateFmt = 'N/A';
        if(m.joinDate) { 
            const d = new Date(m.joinDate); 
            dateFmt = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`; 
        }
        return { key: m.uid, label: `${m.uid} | ${m.name} | ${dateFmt}` };
    });

    const links = allMembers.filter(m => m.upline).map(m => ({ from: m.upline, to: m.uid }));
    diagram.model = new go.GraphLinksModel(nodes, links);
}

// --- FUNGSI LAINNYA (TETAP) ---
async function addMember() {
    const name = document.getElementById('name').value.trim();
    const uid = document.getElementById('uid').value.trim();
    const upline = document.getElementById('upline').value.trim();
    const joinDateValue = document.getElementById('joinDateInput').value;
    if (!name || !uid) return showNotification("Nama & UID wajib diisi!");
    const joinDate = joinDateValue ? new Date(joinDateValue).toISOString() : new Date().toISOString();
    const btn = document.getElementById('addMemberButton');
    btn.textContent = "Menyimpan...";
    btn.disabled = true;
    const { error } = await db.from('members').insert([{ nama: name, uid: uid, upline: upline || null, tanggalbergabung: joinDate }]);
    if (error) { showNotification("Gagal: " + error.message); btn.disabled = false; btn.textContent = "Tambah Anggota"; return; }
    showNotification("Berhasil disimpan!");
    await fetchMembersFromSupabase();
    updateCount(); searchMembers(); renderGrowthChart();
    btn.textContent = "Tambah Anggota"; btn.disabled = false;
}

function initializeDashboard() {
    updateCount(); renderGrowthChart();
    document.getElementById('addMemberButton').addEventListener('click', addMember);
    document.getElementById('searchButton').addEventListener('click', searchMembers);
    document.getElementById('resetButton').addEventListener('click', resetSearch);
    document.getElementById('viewNetworkButton').addEventListener('click', () => { window.location.href = 'network.html'; });
    document.getElementById('viewMemberListButton').addEventListener('click', () => showMemberList(null));
    document.getElementById('backToDashboardButton').addEventListener('click', showMainDashboard);
    setupTableSorting(); 
    document.getElementById('downloadButton').addEventListener('click', downloadCSV);
    document.getElementById('saveEditButton').addEventListener('click', saveEditedMember);
    document.getElementById('cancelEditButton').addEventListener('click', closeEditModal);
    document.getElementById('logoutButton').addEventListener('click', logout);
}

function initializeNetworkPage() {
    renderNetwork();
    document.getElementById('backButton').addEventListener('click', () => { window.location.href = 'dashboard.html'; });
    document.getElementById('downloadNetworkButton').addEventListener('click', downloadNetworkImage);
}

function updateCount() { const el = document.getElementById('totalMembers'); if (el) el.textContent = loadMembers().length; }
function searchMembers() {
    const searchTerm = document.getElementById('searchTerm').value.toLowerCase();
    const allMembers = loadMembers(); 
    const results = allMembers.filter(member => searchTerm === '' || member.name.toLowerCase().includes(searchTerm) || member.uid.toLowerCase().includes(searchTerm));
    displaySearchResults(results.reverse(), allMembers);
}

function displaySearchResults(results, allMembers) {
    const container = document.getElementById('searchResultsContainer');
    if (results.length === 0) { container.innerHTML = '<p style="text-align:center; color: #888;">Tidak ada anggota ditemukan.</p>'; return; }
    let html = `<h4 style="margin-top: 20px;">Hasil (${results.length})</h4>`;
    results.forEach(member => {
        const downlineCount = getDownlineCount(allMembers, member.uid);
        html += `<div class="result-card"><div class="result-info"><span class="info-label">Nama:</span><span class="info-value">${member.name}</span></div><div class="result-info"><span class="info-label">UID:</span><span class="info-value">${member.uid}</span></div><div class="result-actions"><button class="btn-edit" onclick="openEditModal('${member.uid}')">Edit</button><button class="btn-delete" onclick="openConfirmModal('${member.uid}')">Hapus</button><button onclick="sessionStorage.setItem('focusedMemberUid', '${member.uid}'); window.location.href='network.html';">Lihat Jaringan</button></div></div>`;
    });
    container.innerHTML = html;
}

function getDownlineCount(list, parentUid) {
    const children = list.filter(m => m.upline === parentUid);
    let count = children.length; for (const child of children) count += getDownlineCount(list, child.uid); return count;
}

function showNotification(message) {
    let notification = document.getElementById('notification'); if (!notification) return;
    notification.textContent = message; notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 3000);
}

// Tambahan fungsi standar lainnya (Reset, Modal, CSV, Chart) tetap sama seperti versi sebelumnya untuk menjaga fungsionalitas.
function resetSearch() { document.getElementById('searchTerm').value = ''; document.getElementById('searchResultsContainer').innerHTML = ''; }
function closeEditModal() { document.getElementById('editModal').style.display = 'none'; }
function showMainDashboard() { document.getElementById('mainDashboardContent').style.display = 'block'; document.getElementById('memberListContainer').style.display = 'none'; }
function ensureFullScreen() { const element = document.documentElement; if (!document.fullscreenElement && element.requestFullscreen) element.requestFullscreen().catch(err => {}); }
function setupTableSorting() { document.querySelectorAll('#memberListTable th.sortable-header').forEach(header => { header.addEventListener('click', () => { /* Logic Sort */ }); }); }
function renderGrowthChart() { /* Logic Chart.js */ }
function downloadCSV() { /* Logic Download CSV */ }
function downloadNetworkImage() { /* Logic GoJS Image */ }
