const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware.authenticate, budgetController.getBudgets);
router.post('/', authMiddleware.authenticate, budgetController.createBudget);
router.put('/:id', authMiddleware.authenticate, budgetController.updateBudget);
router.delete('/:id', budgetController.deleteBudget); // VULNERABILITY: No authentication

module.exports = router;