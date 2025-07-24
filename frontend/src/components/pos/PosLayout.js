// frontend/src/components/pos/PosLayout.js

import React from 'react';
import './Pos.css'; // Ensure Pos.css is imported for layout styles

const PosLayout = ({ leftPanel, mainContent, rightPanel }) => {
    return (
        <div className="pos-main-grid-layout">
            <div className="pos-layout-left-panel">
                {leftPanel}
            </div>
            <div className="pos-layout-main-content">
                {mainContent}
            </div>
            <div className="pos-layout-right-panel">
                {rightPanel}
            </div>
        </div>
    );
};

export default PosLayout;