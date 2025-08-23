// backend/routes/tasks.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/tasks/my-tasks
// @desc    Get all tasks assigned to the currently logged-in user
router.get('/my-tasks', authMiddleware, async (req, res) => {
    const user_id = req.user.id;
    try {
        const query = `
            SELECT t.*, b.name as business_unit_name 
            FROM tasks t
            JOIN business_units b ON t.business_unit_id = b.id
            WHERE t.assigned_to_user_id = $1 AND t.status != 'Completed'
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
router.get('/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
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


// --- THIS IS THE DEFINITIVE FIX FOR THE SYNTAX ERROR ---
// @route   PUT api/tasks/:id/complete
// @desc    Mark a task as complete and trigger the next workflow step
router.put('/:id/complete', authMiddleware, async (req, res) => {
    const { id: taskId } = req.params;
    const { checklistItems } = req.body;
    const client = await db.pool.connect();
    
    try {
        await client.query('BEGIN');
        
        if (checklistItems && checklistItems.length > 0) {
            for (const item of checklistItems) {
                await client.query("UPDATE task_checklist_items SET is_completed = $1 WHERE id = $2", [item.is_completed, item.id]);
            }
        }

        const completedTaskRes = await client.query(
            "UPDATE tasks SET status = 'Completed', completed_at = NOW() WHERE id = $1 RETURNING *", 
            [taskId]
        );
        const completedTask = completedTaskRes.rows[0];

        // WORKFLOW TRIGGER: If a Picking Ticket is completed, create a Delivery Task
        if (completedTask.source_type === 'sales_order') {
            const deliveryTaskTitle = `Deliver Sales Order #${completedTask.source_id}`;
            const deliveryTaskDescription = `Deliver all items for SO #${completedTask.source_id}. Obtain Proof of Delivery.`;
            const assignedToDriverId = 5; // Placeholder User ID for a Driver

            await client.query(
                `INSERT INTO tasks (title, description, business_unit_id, assigned_to_user_id, source_type, source_id, status)
                 VALUES ($1, $2, $3, $4, 'delivery_run', $5, 'Ready for Delivery')`, // New status
                [deliveryTaskTitle, deliveryTaskDescription, completedTask.business_unit_id, assignedToDriverId, completedTask.source_id]
            );

        // WORKFLOW TRIGGER: If a paint mixing task is completed
        } else if (completedTask.source_type === 'sale_item') {
            // Future logic can go here, e.g., notify the cashier
            // For now, simply completing the task is enough.
        } else if (completedTask.source_type === 'delivery_run') {
            // WORKFLOW TRIGGER: If a Delivery task is completed, update the original Sales Order
            await client.query(
                "UPDATE sales_orders SET status = 'Fulfilled' WHERE id = $1", 
                [completedTask.source_id]
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
// --- END OF DEFINITIVE FIX ---


// @route   POST api/tasks
// @desc    Create a new manual task
router.post('/', authMiddleware, async (req, res) => {
    // This route is correct from our previous step and remains unchanged.
    const { title, description, assigned_to_user_id, business_unit_id } = req.body;
    if (!title || !assigned_to_user_id || !business_unit_id) {
        return res.status(400).json({ msg: 'Title, assignee, and business unit are required.' });
    }
    try {
        const query = `INSERT INTO tasks (title, description, assigned_to_user_id, business_unit_id, status) VALUES ($1, $2, $3, $4, 'Pending') RETURNING *`;
        const newTask = await db.query(query, [ title, description || null, assigned_to_user_id, business_unit_id ]);
        res.status(201).json(newTask.rows[0]);
    } catch (err) {
        console.error("Create Manual Task Error:", err.message);
        res.status(500).send("Server Error");
    }
});

// @route   GET api/tasks/:id/checklist
// @desc    Get all checklist items for a specific task
// @access  Private
router.get('/:id/checklist', authMiddleware, async (req, res) => {
    const { id: taskId } = req.params;
    try {
        const query = "SELECT * FROM task_checklist_items WHERE task_id = $1 ORDER BY id";
        const items = await db.query(query, [taskId]);
        res.json(items.rows);
    } catch (err) {
        console.error(`Get Checklist for Task ${taskId} Error:`, err.message);
        res.status(500).send("Server Error");
    }
});


module.exports = router;