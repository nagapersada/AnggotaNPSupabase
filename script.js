const supabaseUrl = 'https://hysjbwysizpczgcsqvuv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5c2pid3lzaXpwY3pnY3NxdnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjA2MTYsImV4cCI6MjA3OTQ5NjYxNn0.sLSfXMn9htsinETKUJ5IAsZ2l774rfeaNNmB7mVQcR4';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let allMembersCache = []; 
let diagram = null;

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
        if (path.includes('network.html')) initializeNetworkPage();
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
    } catch (e) { console.error(e); }
}

function login() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    if (u === 'admin' && p === 'dvteam123') {
        sessionStorage.setItem('isLoggedIn', 'true');
        window.location.href = 'dashboard.html';
    } else { alert('Gagal Login'); }
}

function initializeDashboard() {
    const el = document.getElementById('totalMembers');
    if(el) el.textContent = allMembersCache.length;
    document.getElementById('logoutButton').onclick = () => { sessionStorage.clear(); window.location.href='index.html'; };
    document.getElementById('viewNetworkButton').onclick = () => window.location.href='network.html';
}

function initializeNetworkPage() {
    renderNetwork();
    document.getElementById('backButton').onclick = () => window.location.href='dashboard.html';
}

// --- RENDER NETWORK: RAMPING & PRESISI ---
function renderNetwork() {
    const $ = go.GraphObject.make;
    if (diagram) diagram.div = null;
    
    diagram = $(go.Diagram, "networkDiagram", {
        layout: $(go.TreeLayout, { 
            angle: 90, 
            layerSpacing: 40, 
            nodeSpacing: 10,
            alignment: go.TreeLayout.AlignmentCenterChildren
        }),
        "undoManager.isEnabled": true
    });

    // TEMPLATE NODE: SANGAT RAMPING & PADDING LUAS
    diagram.nodeTemplate = $(go.Node, "Auto",
        $(go.Shape, "RoundedRectangle", { 
            strokeWidth: 1, 
            fill: "#111", 
            stroke: "#444",
            parameter1: 2 
        }),
        $(go.TextBlock, { 
            margin: new go.Margin(3, 15, 3, 15), // Sangat ramping secara vertikal
            font: "10px Inter, sans-serif", 
            stroke: "#ccc" 
        }, new go.Binding("text", "label"))
    );

    // GARIS: TAJAM & JELAS
    diagram.linkTemplate = $(go.Link, { 
        routing: go.Link.Orthogonal, 
        corner: 0 
    }, $(go.Shape, { strokeWidth: 1, stroke: "#666" }));

    const nodes = allMembersCache.map(m => ({ 
        key: m.uid, 
        label: `${m.uid} | ${m.name}` 
    }));
    const links = allMembersCache.filter(m => m.upline).map(m => ({ 
        from: m.upline, 
        to: m.uid 
    }));

    diagram.model = new go.GraphLinksModel(nodes, links);
}
