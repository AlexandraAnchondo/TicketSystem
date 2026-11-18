const express = require('express');
const router = express.Router();
const ticketsController = require('../controllers/tickets.controller');
const verificarToken = require('../middlewares/verificarToken');

router.get('/get-ticket/stats', verificarToken, ticketsController.getTicketStats);
router.get('/get-tickets/grouped/by-day', verificarToken, ticketsController.getTicketsByDay);
router.get('/get-tickets/grouped/by-hour', verificarToken, ticketsController.getTicketsByHour);
router.get('/get-tickets/grouped/by-week', verificarToken, ticketsController.getWeekTickets);
router.get('/get-tickets/grouped/by-month', verificarToken, ticketsController.getMonthTickets);

router.get('/get-tickets', verificarToken, ticketsController.getTickets);
router.get('/get-ticket/:id', verificarToken, ticketsController.getTicketById);
router.post('/create-ticket', verificarToken, ticketsController.createTicket);
router.put('/update-ticket/:id', verificarToken, ticketsController.updateTicket);
router.delete('/delete-ticket/:id', verificarToken, ticketsController.deleteTicket);
router.patch('/update-ticket/:id/status', verificarToken, ticketsController.updateTicketStatus);
router.patch('/assign-ticket/:id/assign', verificarToken, ticketsController.assignTicket);
router.post('/add-ticket/:id/comments', verificarToken, ticketsController.addTicketComment);
router.patch('/tickets/:ticketId/comments/:commentId', verificarToken, ticketsController.updateTicketComment);

router.get('/me', verificarToken, ticketsController.getCurrentUser);
router.get('/areas', verificarToken, ticketsController.getAreas);
router.get('/activities', verificarToken, ticketsController.getActivities);
router.post('/activities', verificarToken, ticketsController.createActivity);
router.get('/users', verificarToken, ticketsController.getUsers);
router.get('/department-areas', verificarToken, ticketsController.getDepartmentAreas);
router.patch('/users/:id/department-area', verificarToken, ticketsController.updateUserDepartmentArea);

module.exports = router;
