// --- FUNGSI DIAGRAM JARINGAN (HANYA MERAMPINGKAN NODE & TAMBAH PADDING) ---
function renderNetwork() {
    const $ = go.GraphObject.make;
    if (diagram) diagram.div = null;
    
    // Konfigurasi layout tetap sesuai master
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

    // PERBAIKAN: NODE DIBUAT RAMPING & PADDING LUAS
    diagram.nodeTemplate = $(go.Node, "Horizontal", 
        $(go.Panel, "Auto", 
            $(go.Shape, "RoundedRectangle", { 
                strokeWidth: 1.2, // Garis lebih tipis agar presisi
                parameter1: 4 
            }, 
                new go.Binding("stroke", "key", k => downlineCounts[k]>=5?"gold":"#666"), 
                new go.Binding("fill", "key", k => downlineCounts[k]>=5?"#1a1a1a":"#111")
            ),
            $(go.TextBlock, { 
                // Margin 4px atas-bawah (sangat ramping), 35px kiri-kanan (padding sangat luas)
                margin: new go.Margin(4, 35, 4, 35), 
                font: "12px sans-serif", 
                stroke: "white" 
            }, 
                new go.Binding("text", "label"))
        ),
        $("TreeExpanderButton", { width: 16, height: 16, "ButtonBorder.fill": "white" })
    );

    // Garis penghubung lebih tipis dan tajam
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
