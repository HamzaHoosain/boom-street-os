// frontend/src/components/common/SearchBar.js
import React from 'react';
import './SearchBar.css'; // We will create this

const SearchBar = ({ searchTerm, setSearchTerm, placeholder }) => {
    return (
        <div className="search-bar-container">
            <input
                type="text"
                className="search-input"
                placeholder={placeholder || "Search..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
    );
};

export default SearchBar;