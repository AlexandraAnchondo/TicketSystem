const express = require('express');
const router = express.Router();
const ticketsController = require('../controllers/tickets.controller');
const verificarToken = require('../middlewares/verificarToken');

router.get('/tickets/stats', verificarToken, ticketsController.getTicketStats);
router.get('/tickets/grouped/by-day', verificarToken, ticketsController.getTicketsByDay);
router.get('/tickets/grouped/by-hour', verificarToken, ticketsController.getTicketsByHour);
router.get('/tickets/grouped/by-week', verificarToken, ticketsController.getWeekTickets);
router.get('/tickets/grouped/by-month', verificarToken, ticketsController.getMonthTickets);

router.get('/tickets', verificarToken, ticketsController.getTickets);
router.get('/tickets/:id', verificarToken, ticketsController.getTicketById);
router.post('/tickets', verificarToken, ticketsController.createTicket);
router.put('/tickets/:id', verificarToken, ticketsController.updateTicket);
router.delete('/tickets/:id', verificarToken, ticketsController.deleteTicket);
router.patch('/tickets/:id/status', verificarToken, ticketsController.updateTicketStatus);
router.patch('/tickets/:id/assign', verificarToken, ticketsController.assignTicket);
router.post('/tickets/:id/comments', verificarToken, ticketsController.addTicketComment);

router.get('/areas', verificarToken, ticketsController.getAreas);
router.get('/users', verificarToken, ticketsController.getUsers);

module.exports = router;
