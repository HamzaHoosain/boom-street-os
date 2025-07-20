// frontend/src/components/pos/JobList.js
import React from 'react';
import './JobList.css'; // We will create this

const JobList = ({ jobs, onSelectJob, selectedJobId, onCreateNew }) => {
    return (
        <div className="job-list-sidebar">
            <div className="job-list-header">
                <h4>Active Job Cards</h4>
                <button onClick={onCreateNew}>+</button>
            </div>
            <ul>
                {jobs.map(job => (
                    <li
                        key={job.id}
                        className={selectedJobId === job.id ? 'active' : ''}
                        onClick={() => onSelectJob(job)}
                    >
                        <strong>Job #{job.id}</strong>
                        <small>{job.vehicle_details}</small>
                    </li>
                ))}
            </ul>
        </div>
    );
};
export default JobList;