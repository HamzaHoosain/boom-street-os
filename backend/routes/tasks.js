// backend/routes/tasks.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/tasks/my-tasks
// @desc    Get all tasks assigned to the currently logged-in user
// @access  Private
router.get('/my-tasks', authMiddleware, async (req, res) => {
    const user_id = req.user.id;
    try {
        const query = `
            SELECT t.*, b.name as business_unit_name 
            FROM tasks t
            JOIN business_units b ON t.business_unit_id = b.id
            WHERE t.assigned_to_user_id = $1 
              AND t.status != 'Completed'
            ORDER BY t.created_at ASC
        `;
        const tasks = await db.query(query, [user_id]);
        res.json(tasks.rows);
    } catch (err) {
        console.error("Get My Tasks Error:", err.message);
        res.status(500).send("Server Error");
    }
});

// @route   GET api/tasks/:id
// @desc    Get details for a single task
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        // In a real implementation, you'd also check if the user has permission to view this task.
        const task = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
        if (task.rows.length === 0) {
            return res.status(404).json({ msg: "Task not found" });
        }
        res.json(task.rows[0]);
    } catch (err) {
        console.error("Get Task Details Error:", err.message);
        res.status(500).send("Server Error");
    }
});

// @route   PUT api/tasks/:id/complete
// @desc    Mark a task as complete and trigger the next workflow step
// @access  Private
router.put('/:id/complete', authMiddleware, async (req, res) => {
    const { id: taskId } = req.params;
    const { checklistItems } = req.body; // Frontend will send the state of the checklist
    const client = await db.pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Step 1: Update the status of all checklist items for this task
        if (checklistItems && checklistItems.length > 0) {
            for (const item of checklistItems) {
                await client.query("UPDATE task_checklist_items SET is_completed = $1 WHERE id = $2", [item.is_completed, item.id]);
            }
        }

        // Step 2: Mark the primary task as 'Completed'
        const completedTaskRes = await client.query(
            "UPDATE tasks SET status = 'Completed', completed_at = NOW() WHERE id = $1 RETURNING *", 
            [taskId]
        );
        const completedTask = completedTaskRes.rows[0];

        // --- WORKFLOW TRIGGER ---
        // Step 3: Check if this was a "Picking Ticket" task. If so, create the next task.
        if (completedTask.source_type === 'sales_order') {
            const deliveryTaskTitle = `Deliver Sales Order #${completedTask.source_id}`;
            const deliveryTaskDescription = `Deliver all items for SO #${completedTask.source_id}. Obtain Proof of Delivery.`;
            const assignedToDriverId = 5; // Example User ID for a "Driver"

            await client.query(
                `INSERT INTO tasks (title, description, business_unit_id, assigned_to_user_id, source_type, source_id, status)
                 VALUES ($1, $2, $3, $4, 'delivery_run', $5, 'Pending')`,
                [deliveryTaskTitle, deliveryTaskDescription, completedTask.business_unit_id, assignedToDriverId, completedTask.source_id]
            );
        }

        await client.query('COMMIT');
        res.json({ msg: "Task marked as complete and next workflow step initiated." });
    } catch(err) {
        await client.query('ROLLBACK');
        console.error("Complete Task Error:", err.message);
        res.status(500).send("Server Error");
    } finally {
        client.release();
    }
});

// @route   POST api/tasks
// @desc    Create a new manual task
// @access  Private (Managers/Admins)
router.post('/', authMiddleware, async (req, res) => {
    const { title, description, assigned_to_user_id, business_unit_id } = req.body;
    
    if (!title || !assigned_to_user_id || !business_unit_id) {
        return res.status(400).json({ msg: 'Title, assignee, and business unit are required.' });
    }

    try {
        const query = `
            INSERT INTO tasks (title, description, assigned_to_user_id, business_unit_id, status)
            VALUES ($1, $2, $3, $4, 'Pending')
            RETURNING *
        `;
        const newTask = await db.query(query, [
            title,
            description || null,
            assigned_to_user_id,
            business_unit_id
        ]);

        res.status(201).json(newTask.rows[0]);
    } catch (err) {
        // This will catch foreign key violations if the assigned_to_user_id is invalid
        console.error("Create Manual Task Error:", err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;