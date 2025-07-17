// backend/routes/logistics.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// --- Driver and Vehicle Management ---

// @route   POST api/logistics/drivers
// @desc    Register a user as a driver
// @access  Private
router.post('/drivers', authMiddleware, async (req, res) => {
    const { user_id, phone_number } = req.body;
    try {
        const newDriver = await db.query(
            "INSERT INTO drivers (user_id, phone_number) VALUES ($1, $2) RETURNING *",
            [user_id, phone_number]
        );
        res.status(201).json(newDriver.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/logistics/vehicles
// @desc    Add a new vehicle to the fleet
// @access  Private
router.post('/vehicles', authMiddleware, async (req, res) => {
    const { name, license_plate } = req.body;
    try {
        const newVehicle = await db.query(
            "INSERT INTO vehicles (name, license_plate) VALUES ($1, $2) RETURNING *",
            [name, license_plate]
        );
        res.status(201).json(newVehicle.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// --- Delivery Run Management ---

// @route   POST api/logistics/runs
// @desc    Create a new delivery run for a driver/vehicle
// @access  Private
router.post('/runs', authMiddleware, async (req, res) => {
    const { driver_id, vehicle_id } = req.body;
    try {
        // A new run always starts as 'Planned'
        const newRun = await db.query(
            "INSERT INTO delivery_runs (driver_id, vehicle_id, status) VALUES ($1, $2, 'Planned') RETURNING *",
            [driver_id, vehicle_id]
        );
        res.status(201).json(newRun.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/logistics/runs/:id/stops
// @desc    Add a delivery stop to a specific run
// @access  Private
router.post('/runs/:id/stops', authMiddleware, async (req, res) => {
    const runId = req.params.id;
    // source_type and source_id link this stop to another part of the system (e.g., a specific sale)
    const { address, sequence_order, source_type, source_id, notes } = req.body;
    try {
        const newStop = await db.query(
            "INSERT INTO delivery_stops (delivery_run_id, address, sequence_order, status, source_type, source_id, notes) VALUES ($1, $2, $3, 'Pending', $4, $5, $6) RETURNING *",
            [runId, address, sequence_order, source_type, source_id, notes]
        );
        res.status(201).json(newStop.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});
// --- Live Run Operations ---

// @route   PATCH api/logistics/runs/:id/status
// @desc    Update the status of a delivery run (e.g., start or end it)
// @access  Private
router.patch('/runs/:id/status', authMiddleware, async (req, res) => {
    const runId = req.params.id;
    const { status } = req.body; // e.g., 'In Progress', 'Completed'

    try {
        let query;
        let queryParams = [status, runId];

        if (status === 'In Progress') {
            query = "UPDATE delivery_runs SET status = $1, start_time = NOW() WHERE id = $2 RETURNING *";
        } else if (status === 'Completed') {
            query = "UPDATE delivery_runs SET status = $1, end_time = NOW() WHERE id = $2 RETURNING *";
        } else {
            // For other statuses like 'Cancelled'
            query = "UPDATE delivery_runs SET status = $1 WHERE id = $2 RETURNING *";
        }

        const updatedRun = await db.query(query, queryParams);
        if (updatedRun.rows.length === 0) {
            return res.status(404).json({ msg: 'Delivery run not found.' });
        }
        res.json(updatedRun.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PATCH api/logistics/stops/:id/status
// @desc    Update the status of a single stop
// @access  Private
router.patch('/stops/:id/status', authMiddleware, async (req, res) => {
    const stopId = req.params.id;
    const { status } = req.body; // e.g., 'Completed', 'Failed'

    try {
        const query = "UPDATE delivery_stops SET status = $1, completion_time = NOW() WHERE id = $2 RETURNING *";
        const updatedStop = await db.query(query, [status, stopId]);

        if (updatedStop.rows.length === 0) {
            return res.status(404).json({ msg: 'Delivery stop not found.' });
        }
        res.json(updatedStop.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/logistics/runs/:id/location
// @desc    Receive and store a GPS location point for a run
// @access  Private
router.post('/runs/:id/location', authMiddleware, async (req, res) => {
    const runId = req.params.id;
    const { latitude, longitude } = req.body;

    try {
        const newLocation = await db.query(
            "INSERT INTO gps_locations (delivery_run_id, latitude, longitude) VALUES ($1, $2, $3) RETURNING id",
            [runId, latitude, longitude]
        );
        // Send a 201 Created but with a minimal response to save bandwidth for the driver's device
        res.status(201).json({ msg: 'Location received', locId: newLocation.rows[0].id });
    } catch (err) {
        console.error(err.message);
        // Don't send a detailed error to the driver's device
        res.status(500).send('Server Error');
    }
});
module.exports = router;