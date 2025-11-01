// server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');

const pool = require('./db');
const resortsRouter = require('./routes/resorts');
const reviewsRouter = require('./routes/reviews');
const bookingsRouter = require('./routes/bookings');
const discountsRouter = require('./routes/discounts');
const revenueRouter = require('./routes/revenue');
const usersRouter = require('./routes/users');
const paymentsRouter = require('./routes/payments');
const notificationsRouter = require('./routes/notifications');
const contactsRouter = require('./routes/contacts');


const app = express();
app.use(cors());
app.use(express.json());

// Swagger configuration
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Resort Management API',
    version: '1.0.0',
    description: 'API cho hệ thống quản lý resort'
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Local server' }
  ],
  components: {
    schemas: {
      Resort: {
        type: 'object',
        required: ['resort_name', 'room_type_id', 'type', 'status', 'category', 'location', 'address'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          resort_name: { type: 'string' },
          room_type_id: { type: 'string', format: 'uuid', description: 'ID loại phòng' },
          type: { type: 'string', description: 'Tên loại phòng' },
          status: {
            type: 'string',
            enum: ['available', 'reserved', 'occupied', 'maintenance'],
            description: 'Trạng thái phòng'
          },
          category: { type: 'string' },
          location: { type: 'string' },
          address: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      User: {
        type: 'object',
        required: ['username', 'email', 'password', 'full_name'],
        properties: {
          id: { type: 'integer' },
          username: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
          full_name: { type: 'string' },
          phone: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'manager', 'staff'], default: 'staff' },
          is_active: { type: 'boolean', default: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      }
    },
      Review: {
      type: 'object',
      required: ['room_id', 'rating', 'comment'],
      properties: {
        review_id: { type: 'integer' },
        room_id: { type: 'string', format: 'uuid' },
        user_id: { type: 'string', format: 'uuid' },
        username: { type: 'string' },
        rating: { type: 'integer', minimum: 1, maximum: 5 },
        comment: { type: 'string' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    }
  }
};

const options = {
  swaggerDefinition,
  apis: ['./routes/*.js']
};

const swaggerSpec = swaggerJSDoc(options);
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount routes
app.use('/api/resorts', resortsRouter);
app.use('/api/reviews', reviewsRouter); 

app.use('/api/bookings', bookingsRouter);
app.use('/api/discounts', discountsRouter);
app.use('/api/revenue', revenueRouter);
app.use('/api/users', usersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/contacts', contactsRouter);

// Root route
app.get('/', (req, res) => {
  res.send('Resort Management API đang chạy');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);
});
