    // TEMPLATE NODE YANG DIPERBARUI (Lebih Tipis & Padding Luas)
    diagram.nodeTemplate = $(go.Node, "Horizontal",
        { 
            selectionAdorned: false,
            locationSpot: go.Spot.Center 
        },
        $(go.Panel, "Auto", 
            $(go.Shape, "RoundedRectangle", { 
                strokeWidth: 1.5, 
                parameter1: 6 // Roundness sudut
            }, 
                new go.Binding("stroke", "key", k => downlineCounts[k] >= 5 ? "gold" : "#444"), 
                new go.Binding("fill", "key", k => downlineCounts[k] >= 5 ? "rgba(255,215,0,0.1)" : "#161616")
            ),
            $(go.TextBlock, { 
                margin: new go.Margin(6, 20, 6, 20), // Padding: Atas 6px, Samping 20px (Mempersempit ketebalan)
                font: "500 12px Inter, sans-serif", 
                stroke: "#E0E0E0",
                textAlign: "center"
            }, 
                new go.Binding("text", "label"))
        ),
        $("TreeExpanderButton", { 
            width: 14, 
            height: 14, 
            "ButtonBorder.fill": "white",
            "ButtonBorder.stroke": "none",
            "ButtonIcon.stroke": "black"
        })
    );

    // Link template yang lebih halus
    diagram.linkTemplate = $(go.Link, 
        { routing: go.Link.Orthogonal, corner: 15 }, 
        $(go.Shape, { strokeWidth: 1, stroke: "#444" })
    );
