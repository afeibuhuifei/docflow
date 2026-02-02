const authRoutes = require('./auth');
const usersRoutes = require('./users');
const documentsRoutes = require('./documents');
const tasksRoutes = require('./tasks');
const archiveRoutes = require('./archive');
const notificationsRoutes = require('./notifications');
const onlyofficeRoutes = require('./onlyoffice');

module.exports = {
    authRoutes,
    usersRoutes,
    documentsRoutes,
    tasksRoutes,
    archiveRoutes,
    notificationsRoutes,
    onlyofficeRoutes
};
