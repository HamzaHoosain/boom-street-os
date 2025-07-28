// frontend/src/components/pos/PosLayout.js

import React from 'react';
import './Pos.css'; // Ensure Pos.css is imported for layout styles

const PosLayout = ({ leftPanel, mainContent, rightPanel }) => {
    // THIS IS THE CRITICAL LOGIC THAT WAS MISSING.
    // We check if the `leftPanel` prop is null.
    // If it is, we add the 'layout-no-sidebar' class to the main container.
    const layoutClass = `pos-main-grid-layout ${!leftPanel ? 'layout-no-sidebar' : ''}`;

    return (
        <div className={layoutClass}>
            {/* Conditionally render the left panel's wrapper div only if the panel exists */}
            {leftPanel && (
                <div className="pos-layout-left-panel">
                    {leftPanel}
                </div>
            )}

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